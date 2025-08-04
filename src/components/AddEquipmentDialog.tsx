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
    reduction_ratio: "",
    shaft_diameter: "",
  });
  const [equipmentType, setEquipmentType] = useState<"motors" | "gearboxes" | "pumps">("motors");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Build explicit insert object (no spread)
      const base = {
        serial_number: formData.serial_number,
        location: formData.location,
        type: equipmentType,
      };
      let dataToInsert: any = { ...base };
      if (equipmentType === "motors") {
        dataToInsert.hp = parseFloat(formData.hp);
        dataToInsert.rpm = parseInt(formData.rpm, 10);
      } else if (equipmentType === "gearboxes") {
        dataToInsert.reduction_ratio = formData.reduction_ratio;
        dataToInsert.shaft_diameter = parseFloat(formData.shaft_diameter);
      } else if (equipmentType === "pumps") {
        dataToInsert.rpm = parseInt(formData.rpm, 10);
      }

      // Step 1: Insert without QR
      const { data: insertData, error: insertError } = await supabase
        .from(equipmentType)
        .insert([dataToInsert])
        .select()
        .single();
      if (insertError) throw insertError;
      const newItem = insertData;
      if (!newItem || !newItem.id) throw new Error("Failed to retrieve inserted ID");

      // Generate QR linking to the detail page
      const qrUrl = `${window.location.origin}/equipment/${equipmentType}/${newItem.id}`;
      const qrImageData = await QRCode.toDataURL(qrUrl);

      // Step 2: Update the inserted row with QR
      const { error: updateError } = await supabase
        .from(equipmentType)
        .update({ qr_code: qrImageData })
        .eq("id", newItem.id);
      if (updateError) throw updateError;

      // Success flow
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
          <DialogDescription>
            Fill in the details to add a new piece of equipment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type</n            <Select onValueChange={(val) => setEquipmentType(val as any)}>
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
          {equipmentType === "motors" && (
            <> ... motor fields ... </>
          )}
          {equipmentType === "gearboxes" && (
            <> ... gearbox fields ... </>
          )}
          {equipmentType === "pumps" && (
            <> ... pump fields ... </>
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
}
