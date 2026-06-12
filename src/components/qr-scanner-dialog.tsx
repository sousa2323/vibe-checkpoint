import { useEffect, useRef, useState } from "react";
import type QrScanner from "qr-scanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function QrScannerDialog({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    setError(null);

    let disposed = false;
    let scanner: QrScanner | null = null;

    (async () => {
      try {
        const { default: Scanner } = await import("qr-scanner");
        if (disposed || !videoRef.current) return;

        scanner = new Scanner(
          videoRef.current,
          (result) => {
            const code = result.data
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, 6);
            if (code.length !== 6) return;
            scanner?.stop();
            onScanRef.current(code);
            onCloseRef.current();
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            returnDetailedScanResult: true,
          },
        );
        await scanner.start();
      } catch (cause) {
        if (disposed) return;
        const name = cause instanceof DOMException ? cause.name : "";
        setError(
          name === "NotAllowedError"
            ? "Permita o acesso à câmera nas configurações do aparelho ou digite o código manualmente."
            : "Não foi possível abrir a câmera. Digite o código manualmente.",
        );
      }
    })();

    return () => {
      disposed = true;
      scanner?.stop();
      scanner?.destroy();
      scanner = null;
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Escanear código do cliente</DialogTitle>
          <DialogDescription>
            Aponte a câmera para o QR code mostrado pelo cliente.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="rounded-2xl bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
