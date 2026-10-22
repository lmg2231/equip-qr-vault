import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface Equipment {
  id: string;
  serial_number: string;
  location: string;
  hp?: number;
  rpm?: number;
  reduction_ratio?: string;
  shaft_diameter?: number;
  qr_code?: string;
}

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  type: "motors" | "gearboxes" | "pumps";
}

export const QRCodeDialog = ({ open, onOpenChange, equipment, type }: QRCodeDialogProps) => {
  const [qrUrl, setQrUrl] = useState("");
  const [qrImageSrc, setQrImageSrc] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setQrImageSrc('');
    setQrUrl('');
    if (equipment) {
      const url = `${window.location.origin}/equipment/${type}/${encodeURIComponent(equipment.id)}`;
      setQrUrl(url);
      // Stored qr_code values are untrusted and may encode a different destination.
      QRCode.toDataURL(url, { width: 300, margin: 2 }).then(dataUrl => {
        if (!cancelled) setQrImageSrc(dataUrl);
      }).catch(() => {
        if (!cancelled) setQrImageSrc('');
      });
    }
    return () => { cancelled = true; };
  }, [equipment?.id, type]);

  const handleDownload = () => {
    if (qrImageSrc && equipment) {
      const link = document.createElement('a');
      link.download = `${equipment.serial_number}-qr-code.png`;
      link.href = qrImageSrc;
      link.click();
      
      toast({
        title: "Success",
        description: "QR code downloaded successfully",
      });
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      toast({
        title: "Success",
        description: "URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      });
    }
  };

  const handleOpenUrl = () => {
    window.open(qrUrl, '_blank', 'noopener,noreferrer');
  };

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code for {equipment.serial_number}</DialogTitle>
          <DialogDescription>
            Scan this QR code to view equipment details
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-white rounded-lg">
            {qrImageSrc && (
              <img src={qrImageSrc} alt="QR Code" className="w-[300px] h-[300px]" />
            )}
          </div>
          
          <div className="text-sm text-muted-foreground text-center">
            <p className="break-all">{qrUrl}</p>
          </div>
          
          <div className="flex gap-2 w-full">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleCopyUrl} variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={handleOpenUrl} variant="outline">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
