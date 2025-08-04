import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Eye, Trash2, Grid3X3, List, ArrowUpDown } from "lucide-react";
import { QRCodeDialog } from "./QRCodeDialog";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QRCode from "qrcode";

interface Equipment {
  id: string;
  serial_number: string;
  location: string;
  created_at: string;
  hp?: number;
  rpm?: number;
  reduction_ratio?: string;
  shaft_diameter?: number;
  qr_code?: string;
}

interface EquipmentListProps {
  equipment: Equipment[];
  type: "motors" | "gearboxes" | "pumps";
  onUpdate: () => void;
  isFiltered?: boolean;
}

export const EquipmentList = ({ equipment, type, onUpdate, isFiltered = false }: EquipmentListProps) => {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const { toast } = useToast();

  const sortedEquipment = useMemo(() => {
    return [...equipment].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === "newest" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });
  }, [equipment, sortOrder]);

  const handleGenerateQR = async (item: Equipment) => {
    try {
      let qrCodeData = item.qr_code;
      
      if (!qrCodeData) {
        // Generate QR code if it doesn't exist
        const url = `${window.location.origin}/equipment/${type}/${item.id}`;
        qrCodeData = await QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        // Save QR code to database
        const { error } = await supabase
          .from(type)
          .update({ qr_code: qrCodeData })
          .eq('id', item.id);
          
        if (error) {
          console.error('Error saving QR code:', error);
        } else {
          item.qr_code = qrCodeData;
        }
      }
      
      setSelectedEquipment(item);
      setQrDialogOpen(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (item: Equipment) => {
    const url = `${window.location.origin}/equipment/${type}/${item.id}`;
    window.open(url, '_blank');
  };

  const handleDelete = async (item: Equipment) => {
    try {
      const { error } = await supabase.from(type).delete().eq('id', item.id);
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Equipment deleted successfully",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete equipment",
        variant: "destructive",
      });
    }
  };

  const getSpecifications = (item: Equipment) => {
    if (type === "motors") {
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="font-medium">HP:</span> {item.hp}</div>
          <div><span className="font-medium">RPM:</span> {item.rpm}</div>
        </div>
      );
    } else if (type === "gearboxes") {
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="font-medium">Ratio:</span> {item.reduction_ratio}</div>
          <div><span className="font-medium">Shaft Ø:</span> {item.shaft_diameter}mm</div>
        </div>
      );
    } else if (type === "pumps") {
      return (
        <div className="text-sm">
          <span className="font-medium">RPM:</span> {item.rpm}
        </div>
      );
    }
  };

  if (equipment.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-muted-foreground text-center">
            {isFiltered ? (
              <>
                <h3 className="font-medium mb-2">No results found</h3>
                <p className="text-sm">Try adjusting your filters to see more results</p>
              </>
            ) : (
              <>
                <h3 className="font-medium mb-2">No {type} found</h3>
                <p className="text-sm">Add your first {type.slice(0, -1)} to get started</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* View Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Select value={sortOrder} onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Recently Added</SelectItem>
              <SelectItem value="oldest">Oldest Added</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={
        viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "space-y-4"
      }>
        {sortedEquipment.map((item) => (
          <Card key={item.id} className={`hover:shadow-lg transition-shadow ${
            viewMode === "list" ? "flex flex-row" : ""
          }`}>
            <CardHeader className={viewMode === "list" ? "flex-shrink-0" : ""}>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{item.serial_number}</CardTitle>
                  <CardDescription className="mt-1 flex flex-col gap-1">
                    <Badge variant="secondary">{item.location}</Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className={`${viewMode === "list" ? "flex-1 flex items-center justify-between" : ""}`}>
              {viewMode === "grid" ? (
                <div className="space-y-4">
                  {getSpecifications(item)}
                  {item.qr_code && (
                    <img
                      src={item.qr_code}
                      alt="QR Code"
                      className="w-36 h-36 object-contain border rounded"
                    />
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateQR(item)}
                      className="flex-1"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Code
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {type !== "motors" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {item.serial_number}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1">
                    {getSpecifications(item)}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateQR(item)}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {type !== "motors" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {item.serial_number}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <QRCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        equipment={selectedEquipment}
        type={type}
      />
    </>
  );
};
