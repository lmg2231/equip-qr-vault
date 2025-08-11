import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, Cog, Settings, Wrench } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const EquipmentDetail = () => {
  const { type, id } = useParams<{ type: string; id: string }>();

  const { data: equipment, isLoading, error } = useQuery({
    queryKey: ["equipment", type, id],
    queryFn: async () => {
      if (!type || !id) throw new Error("Missing parameters");
      
      const validTypes = ["motors", "gearboxes", "pumps"] as const;
      if (!validTypes.includes(type as any)) throw new Error("Invalid equipment type");

      const tableName = type as "motors" | "gearboxes" | "pumps";
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!type && !!id,
  });

  const { data: history } = useQuery({
    queryKey: ["status-history", type, id],
    queryFn: async () => {
      if (!type || !id) return [] as any[];
      const tableName = type as 'motors' | 'gearboxes' | 'pumps';
      const { data, error } = await supabase
        .from('equipment_status_history')
        .select('*')
        .eq('equipment_type', tableName)
        .eq('equipment_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!type && !!id,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [reason, setReason] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const formatStatus = (s?: string) => {
    switch (s) {
      case 'active': return 'Active';
      case 'in_storage': return 'In Storage';
      case 'for_repair': return 'For Repair';
      case 'defunct': return 'Defunct';
      default: return 'Unknown';
    }
  };

  const statusDotClass = (s?: string) => {
    switch (s) {
      case 'active': return 'bg-green-500';
      case 'in_storage': return 'bg-yellow-500';
      case 'for_repair': return 'bg-red-500';
      case 'defunct': return 'bg-black';
      default: return 'bg-muted-foreground';
    }
  };

  useEffect(() => {
    if (equipment && type) {
      document.title = `${formatStatus((equipment as any).status)} ${type.slice(0, -1)} - ${equipment.serial_number}`;
    }
  }, [equipment, type]);

  const handleChangeStatus = async () => {
    if (!type || !id || !equipment) return;

    if (equipment.status === 'defunct') {
      toast({ title: 'Not allowed', description: 'Defunct equipment status cannot be changed.', variant: 'destructive' });
      return;
    }

    const target = (newStatus || equipment.status) as 'active' | 'in_storage' | 'for_repair' | 'defunct';

    // Validations
    if (equipment.status === 'active' && target === 'for_repair' && !reason.trim()) {
      toast({ title: 'Reason required', description: 'Provide a reason to move Active → For Repair.' });
      return;
    }
    if (target === 'defunct' && !reason.trim()) {
      toast({ title: 'Reason required', description: 'Provide a reason to mark as Defunct.' });
      return;
    }
    if (target === 'active' && equipment.status === 'in_storage' && !newLocation.trim()) {
      toast({ title: 'Location required', description: 'Provide a new location for Active status.' });
      return;
    }

    const tableName = type as 'motors' | 'gearboxes' | 'pumps';

    // Write history first
    const { error: histError } = await supabase.from('equipment_status_history').insert([
      ({
        equipment_type: tableName,
        equipment_id: id,
        from_status: equipment.status,
        to_status: target,
        reason: reason.trim() || null,
        active_location: (equipment.status === 'active' ? (equipment as any).location : null),
      } as any),
    ]);
    if (histError) {
      toast({ title: 'Error', description: histError.message, variant: 'destructive' });
      return;
    }

    const updates: Record<string, any> = { status: target };

    // Location side-effects
    if (target === 'in_storage') updates.location = 'Storage';
    if (target === 'defunct') updates.location = 'Defunct';

    // When leaving Active, reflect status in location for clarity (except for defunct which is handled above)
    if (equipment.status === 'active' && target !== 'active' && target !== 'defunct') {
      if (target === 'for_repair') updates.location = 'For Repair';
    }

    // When switching to Active from any non-active state, require new location
    if (target === 'active' && equipment.status !== 'active') {
      if (!newLocation.trim()) {
        toast({ title: 'Location required', description: 'Provide a new location for Active status.' });
        return;
      }
      updates.location = newLocation.trim();
    }

    /* OPTIMISTIC UPDATE START */
    const optimistic = { ...(equipment as any), ...updates };
    queryClient.setQueryData(['equipment', type, id], optimistic);
    /* OPTIMISTIC UPDATE END */

    const { data: updData, error: updError } = await supabase.from(tableName)
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (updError) {
      // Revert optimistic cache on error
      queryClient.setQueryData(['equipment', type, id], equipment);

      toast({ title: 'Error', description: updError.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Status updated' });

    setStatusDialogOpen(false);
    setNewStatus("");
    setReason("");
    setNewLocation("");
    await queryClient.invalidateQueries({ queryKey: ['equipment', type, id] });
    await queryClient.refetchQueries({ queryKey: ['equipment', type, id] });
    await queryClient.invalidateQueries({ queryKey: ['status-history', type, id] });
    await queryClient.refetchQueries({ queryKey: ['status-history', type, id] });

    /* FORCE REFRESH BLOCK */
    // Also fetch directly from DB and push into cache
    const { data: fresh, error: refetchErr } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (updData) {
      queryClient.setQueryData(['equipment', type, id], updData);
    }

    if (!refetchErr && fresh) {
      queryClient.setQueryData(['equipment', type, id], fresh);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading equipment details...</p>
        </div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Equipment Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The requested equipment could not be found.
              </p>
              <Button asChild>
                <Link to="/">Return to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getIcon = () => {
    switch (type) {
      case "motors":
        return <Cog className="h-6 w-6" />;
      case "gearboxes":
        return <Settings className="h-6 w-6" />;
      case "pumps":
        return <Wrench className="h-6 w-6" />;
      default:
        return <Cog className="h-6 w-6" />;
    }
  };

  const getSpecifications = () => {
    if (type === "motors" && 'hp' in equipment && 'rpm' in equipment) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">HORSEPOWER</h4>
            <p className="text-2xl font-bold">{equipment.hp} HP</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">RPM</h4>
            <p className="text-2xl font-bold">{equipment.rpm}</p>
          </div>
        </div>
      );
    } else if (type === "gearboxes" && 'reduction_ratio' in equipment && 'shaft_diameter' in equipment) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">REDUCTION RATIO</h4>
            <p className="text-2xl font-bold">{equipment.reduction_ratio}</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">SHAFT DIAMETER</h4>
            <p className="text-2xl font-bold">{equipment.shaft_diameter} mm</p>
          </div>
        </div>
      );
    } else if (type === "pumps" && 'rpm' in equipment) {
      return (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">RPM</h4>
          <p className="text-2xl font-bold">{equipment.rpm}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Equipment List
            </Link>
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getIcon()}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{equipment.serial_number}</CardTitle>
                    <CardDescription className="text-base mt-1">
                      {type.charAt(0).toUpperCase() + (type.endsWith('es') ? type.slice(1, -2) : type.slice(1, -1))} Details
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {type.charAt(0).toUpperCase() + type.slice(1, -1)}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-8">
              {/* Location */}
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">LOCATION</h4>
                  <p className="text-lg font-semibold">{equipment.location}</p>
                </div>
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Specifications</h3>
                <div className="p-6 border rounded-lg">
                  {getSpecifications()}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">ADDED ON</h4>
                      <p className="font-medium">
                        {format(new Date(equipment.created_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-5 w-5 rounded-full ${statusDotClass((equipment as any).status)}`} />
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">STATUS</h4>
                        <p className="font-medium">{formatStatus((equipment as any).status)}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setStatusDialogOpen(true)}>Change status</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Status History</CardTitle>
              <CardDescription>Recent changes with reasons</CardDescription>
            </CardHeader>
            <CardContent>
              {(!history || (history as any[]).length === 0) ? (
                <p className="text-sm text-muted-foreground">No status changes yet.</p>
              ) : (
                <div className="space-y-3">
                  {(history as any[]).map((h: any) => (
                    <div key={h.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{formatStatus(h.from_status)} → {formatStatus(h.to_status)}</p>
                        {h.reason && <p className="text-sm text-muted-foreground mt-1">Reason: {h.reason}</p>}
                        {h.active_location && <p className="text-sm text-muted-foreground mt-1">From location: {h.active_location}</p>}
                      </div>
                      <p className="text-sm text-muted-foreground">{format(new Date(h.created_at), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change status</DialogTitle>
              <DialogDescription>
                Set a new status. Reasons are required for For Repair and Defunct. In Storage sets location to "Storage".
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New status</Label>
                <Select value={newStatus} onValueChange={setNewStatus} disabled={(equipment as any).status === 'defunct'}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" disabled={(equipment as any).status === 'active'}>Active</SelectItem>
                    <SelectItem value="in_storage" disabled={(equipment as any).status === 'in_storage'}>In storage</SelectItem>
                    <SelectItem value="for_repair" disabled={(equipment as any).status === 'for_repair'}>For repair</SelectItem>
                    <SelectItem value="defunct" disabled={(equipment as any).status === 'defunct'}>Defunct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(((equipment as any).status === 'active') && newStatus === 'for_repair') || newStatus === 'defunct' ? (
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason" />
                </div>
              ) : null}

              {((equipment as any).status === 'in_storage') && newStatus === 'active' ? (
                <div className="space-y-2">
                  <Label htmlFor="newLocation">New location</Label>
                  <Input id="newLocation" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Where will this be used?" />
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleChangeStatus} disabled={(equipment as any).status === 'defunct'}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EquipmentDetail;
