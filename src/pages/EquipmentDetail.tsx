import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, Cog, Settings, Wrench } from "lucide-react";
import { format } from "date-fns";

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
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!type && !!id,
  });

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
                      {type.charAt(0).toUpperCase() + type.slice(1, -1)} Details
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
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <div className="h-5 w-5 rounded-full bg-green-500" />
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">STATUS</h4>
                      <p className="font-medium">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EquipmentDetail;