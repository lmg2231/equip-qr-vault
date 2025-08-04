import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface AddEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddEquipmentDialog = ({ open, onOpenChange, onSuccess }: AddEquipmentDialogProps) => {
  const [formData, setFormData] = useState({
    serial_number: "",
    location: "",
    hp: "",
    rpm: "",
  });
  const [equipmentType, setEquipmentType] = useState<"motors" | "gearboxes" | "pumps">("motors");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Step 1: Insert without QR code
      const { data: insertData, error: insertError } = await supabase
        .from(equipmentType)
        .insert([
          {
            serial_number: formData.serial_number,
            location: formData.location,
            hp: equipmentType === 'motors' ? parseFloat(formData.hp) : null,
            rpm: parseInt(formData.rpm),
            type: equipmentType,
          }
        ])
        .select();
      if (insertError) throw insertError;
      const newItem = insertData?.[0];
      if (!newItem) throw new Error("Could not retrieve inserted row");

      // Generate QR code URL and image
      const qrUrl = `${window.location.origin}/equipment/${equipmentType}/${newItem.id}`;
      const qrCode = await QRCode.toDataURL(qrUrl);

      // Step 2: Update the row with QR code
      const { error: updateError } = await supabase
        .from(equipmentType)
        .update({ qr_code: qrCode })
        .eq("id", newItem.id);
      if (updateError) throw updateError;

      toast({ title: "Success", description: "Equipment added with QR code" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
          <DialogDescription>Enter equipment details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select onValueChange={(val) => setEquipmentType(val as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="motors">Motor</SelectItem>
                <SelectItem value="gearboxes">Gearbox</SelectItem>
                <SelectItem value="pumps">Pump</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Serial Number</Label>
            <Input
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              placeholder="Enter serial number"
              required
            />
          </div>

          <div>
            <Label>Location</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter location"
              required
            />
          </div>

          {equipmentType === 'motors' && (
            <div>
              <Label>HP</Label>
              <Input
                type="number"
                value={formData.hp}
                onChange={(e) => setFormData({ ...formData, hp: e.target.value })}
                placeholder="Enter horsepower"
                required
              />
            </div>
          )}

          {equipmentType !== 'gearboxes' && (
            <div>
              <Label>RPM</Label>
              <Input
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
              {loading ? 'Adding...' : 'Add Equipment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
