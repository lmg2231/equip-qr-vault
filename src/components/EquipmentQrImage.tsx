import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function EquipmentQrImage({ id, type }: { id: string; type: "motors" | "gearboxes" | "pumps" }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let cancelled = false;
    setSrc("");
    const url = `${window.location.origin}/equipment/${type}/${encodeURIComponent(id)}`;
    QRCode.toDataURL(url, { width: 144, margin: 2 }).then(value => {
      if (!cancelled) setSrc(value);
    }).catch(() => { if (!cancelled) setSrc(""); });
    return () => { cancelled = true; };
  }, [id, type]);
  return src ? <img src={src} alt="QR Code" className="w-36 h-36 object-contain border rounded" /> : null;
}
