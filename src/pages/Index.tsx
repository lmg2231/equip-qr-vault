import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Cog, Wrench, Settings } from "lucide-react";
import { AddEquipmentDialog } from "@/components/AddEquipmentDialog";
import { EquipmentList } from "@/components/EquipmentList";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [equipmentType, setEquipmentType] = useState<"motors" | "gearboxes" | "pumps">("motors");

  // Fetch equipment data
  const { data: motors = [], refetch: refetchMotors } = useQuery({
    queryKey: ["motors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("motors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: gearboxes = [], refetch: refetchGearboxes } = useQuery({
    queryKey: ["gearboxes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gearboxes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pumps = [], refetch: refetchPumps } = useQuery({
    queryKey: ["pumps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pumps").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleAddEquipment = () => {
    setAddDialogOpen(true);
  };

  const handleRefetch = () => {
    refetchMotors();
    refetchGearboxes();
    refetchPumps();
  };

  // Filter equipment based on search term
  const filterEquipment = (equipment: any[]) => {
    if (!searchTerm) return equipment;
    return equipment.filter(item => 
      item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hp?.toString().includes(searchTerm) ||
      item.rpm?.toString().includes(searchTerm) ||
      item.reduction_ratio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shaft_diameter?.toString().includes(searchTerm)
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Equipment QR Manager</h1>
            <p className="text-muted-foreground mt-2">Manage motors, gearboxes, and pumps with QR codes</p>
          </div>
          <Button onClick={handleAddEquipment} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Equipment
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by serial number, location, specifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Motors</CardTitle>
              <Cog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{motors.length}</div>
              <p className="text-xs text-muted-foreground">Total registered motors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gearboxes</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gearboxes.length}</div>
              <p className="text-xs text-muted-foreground">Total registered gearboxes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pumps</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pumps.length}</div>
              <p className="text-xs text-muted-foreground">Total registered pumps</p>
            </CardContent>
          </Card>
        </div>

        {/* Equipment Tabs */}
        <Tabs defaultValue="motors" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="motors" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              Motors
            </TabsTrigger>
            <TabsTrigger value="gearboxes" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Gearboxes
            </TabsTrigger>
            <TabsTrigger value="pumps" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Pumps
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="motors" className="mt-6">
            <EquipmentList 
              equipment={filterEquipment(motors)} 
              type="motors"
              onUpdate={handleRefetch}
            />
          </TabsContent>
          
          <TabsContent value="gearboxes" className="mt-6">
            <EquipmentList 
              equipment={filterEquipment(gearboxes)} 
              type="gearboxes"
              onUpdate={handleRefetch}
            />
          </TabsContent>
          
          <TabsContent value="pumps" className="mt-6">
            <EquipmentList 
              equipment={filterEquipment(pumps)} 
              type="pumps"
              onUpdate={handleRefetch}
            />
          </TabsContent>
        </Tabs>
      </div>

      <AddEquipmentDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen}
        onSuccess={handleRefetch}
      />
    </div>
  );
};

export default Index;