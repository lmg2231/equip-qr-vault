import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  const [inStorage, setInStorage] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalLocation = inStorage ? "Storage" : formData.location;
      let data: any = {
        serial_number: formData.serial_number,
        location: finalLocation,
        status: inStorage ? 'in_storage' : 'active',
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

      const { error, data: response } = await supabase.from(equipmentType).insert([data]).select();
      
      if (error) throw error;
      
      // Generate QR code with the actual database ID
      const insertedItem = response[0];
      const qrUrl = `${window.location.origin}/equipment/${equipmentType}/${insertedItem.id}`;
      const qrCode = await QRCode.toDataURL(qrUrl);
      
      // Update the record with the QR code
      await supabase.from(equipmentType).update({ qr_code: qrCode }).eq('id', insertedItem.id);

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
    setInStorage(false);
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
            <div className="flex items-center justify-between">
              <Label htmlFor="location">Location</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="in_storage"
                  checked={inStorage}
                  onCheckedChange={(checked) => {
                    setInStorage(checked);
                    setFormData({ ...formData, location: checked ? "Storage" : "" });
                  }}
                />
                <Label htmlFor="in_storage" className="text-sm text-muted-foreground">In storage</Label>
              </div>
            </div>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Where is this equipment used?"
              disabled={inStorage}
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
