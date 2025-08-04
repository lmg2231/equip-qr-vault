import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";

interface AddEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddEquipmentDialog = ({ open, onOpenChange, onSuccess }: AddEquipmentDialogProps) => {
  const [equipmentType, setEquipmentType] = useState<"motors" | "gearboxes" | "pumps">("motors");
  const [formData, setFormData] = useState({
    serial_number: "",
    location: "",
    hp: "",
    rpm: "",
    reduction_ratio: "",
    shaft_diameter: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let data: any = {
        serial_number: formData.serial_number,
        location: formData.location,
      };

      if (equipmentType === "motors") {
        data.hp = parseFloat(formData.hp);
        data.rpm = parseInt(formData.rpm);
      } else if (equipmentType === "gearboxes") {
        data.reduction_ratio = formData.reduction_ratio;
        data.shaft_diameter = parseFloat(formData.shaft_diameter);
      } else if (equipmentType === "pumps") {
        data.rpm = parseInt(formData.rpm);
      }

 	  const qrUrl = `${window.location.origin}/equipment/${equipmentType}/${formData.serial_number}`;
	  data.qr_code = await QRCode.toDataURL(qrUrl);


      console.log("Generated QR:", data.qr_code);
      console.log("Final insert payload:", data);

      const { error, data: response } = await supabase.from(equipmentType).insert([data]);
      console.log("Insert response:", response);


      if (error) throw error;

      toast({
        title: "Success",
        description: `${equipmentType.slice(0, -1).charAt(0).toUpperCase() + equipmentType.slice(1, -1)} added successfully`,
      });

      // Reset form
      setFormData({
        serial_number: "",
        location: "",
        hp: "",
        rpm: "",
        reduction_ratio: "",
        shaft_diameter: "",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add equipment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      serial_number: "",
      location: "",
      hp: "",
      rpm: "",
      reduction_ratio: "",
      shaft_diameter: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
          <DialogDescription>
            Add details for a new motor, gearbox, or pump to generate a QR code.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="equipment-type">Equipment Type</Label>
            <Select value={equipmentType} onValueChange={(value: "motors" | "gearboxes" | "pumps") => {
              setEquipmentType(value);
              resetForm();
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select equipment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="motors">Motor</SelectItem>
                <SelectItem value="gearboxes">Gearbox</SelectItem>
                <SelectItem value="pumps">Pump</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial_number">Serial Number</Label>
            <Input
              id="serial_number"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              placeholder="Enter serial number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Where is this equipment used?"
              required
            />
          </div>

          {equipmentType === "motors" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="hp">Horsepower (HP)</Label>
                <Input
                  id="hp"
                  type="number"
                  step="0.1"
                  value={formData.hp}
                  onChange={(e) => setFormData({ ...formData, hp: e.target.value })}
                  placeholder="Enter HP"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rpm">RPM</Label>
                <Input
                  id="rpm"
                  type="number"
                  value={formData.rpm}
                  onChange={(e) => setFormData({ ...formData, rpm: e.target.value })}
                  placeholder="Enter RPM"
                  required
                />
              </div>
            </>
          )}

          {equipmentType === "gearboxes" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reduction_ratio">Reduction Ratio</Label>
                <Input
                  id="reduction_ratio"
                  value={formData.reduction_ratio}
                  onChange={(e) => setFormData({ ...formData, reduction_ratio: e.target.value })}
                  placeholder="e.g., 10:1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shaft_diameter">Shaft Diameter (mm)</Label>
                <Input
                  id="shaft_diameter"
                  type="number"
                  step="0.1"
                  value={formData.shaft_diameter}
                  onChange={(e) => setFormData({ ...formData, shaft_diameter: e.target.value })}
                  placeholder="Enter diameter in mm"
                  required
                />
              </div>
            </>
          )}

          {equipmentType === "pumps" && (
            <div className="space-y-2">
              <Label htmlFor="rpm">RPM</Label>
              <Input
                id="rpm"
                type="number"
                value={formData.rpm}
                onChange={(e) => setFormData({ ...formData, rpm: e.target.value })}
                placeholder="Enter RPM"
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Equipment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
