import { EquipmentQrImage } from "./EquipmentQrImage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Eye, Grid3X3, List } from "lucide-react";
import { QRCodeDialog } from "./QRCodeDialog";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export const EquipmentList = ({ equipment, type, isFiltered = false }: EquipmentListProps) => {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const sortedEquipment = useMemo(() => {
    return [...equipment].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === "newest" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });
  }, [equipment, sortOrder]);

  const handleGenerateQR = (item: Equipment) => {
    setSelectedEquipment(item);
    setQrDialogOpen(true);
  };

  const handleViewDetails = (item: Equipment) => {
    const url = `${window.location.origin}/equipment/${type}/${item.id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
            <CardHeader className={viewMode === "list" ? "shrink-0" : ""}>
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
                  <EquipmentQrImage id={item.id} type={type} />
                  
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

