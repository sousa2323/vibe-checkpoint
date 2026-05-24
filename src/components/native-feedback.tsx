import { CheckCircle2, ClipboardCheck, Info, LoaderCircle, XCircle } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type FeedbackTone = "success" | "danger" | "info" | "loading";

interface NativeFeedbackProps {
  message: string | null;
  onClose?: () => void;
}

const toneClasses: Record<FeedbackTone, string> = {
  success: "bg-emerald-500 text-white shadow-[0_18px_35px_-18px_rgba(16,185,129,0.95)]",
  danger: "bg-ink text-white shadow-[0_18px_35px_-18px_rgba(0,0,0,0.65)]",
  info: "bg-card text-card-foreground shadow-[0_18px_35px_-18px_rgba(0,0,0,0.22)] ring-1 ring-border",
  loading: "bg-ink text-white shadow-[0_18px_35px_-18px_rgba(0,0,0,0.65)]",
};

function getTone(message: string): FeedbackTone {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("...") ||
    normalized.includes("salvando") ||
    normalized.includes("publicando")
  ) {
    return "loading";
  }

  if (
    normalized.includes("removido") ||
    normalized.includes("desfeito") ||
    normalized.includes("excluído")
  ) {
    return "danger";
  }

  if (
    normalized.includes("salvo") ||
    normalized.includes("registrado") ||
    normalized.includes("copiado") ||
    normalized.includes("favoritado") ||
    normalized.includes("publicado") ||
    normalized.includes("atualizado")
  ) {
    return "success";
  }

  return "info";
}

function FeedbackIcon({ tone, message }: { tone: FeedbackTone; message: string }) {
  if (tone === "loading") return <LoaderCircle className="h-4 w-4 animate-spin" />;
  if (message.toLowerCase().includes("copiado")) return <ClipboardCheck className="h-4 w-4" />;
  if (tone === "success") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "danger") return <XCircle className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

export function NativeFeedback({ message, onClose }: NativeFeedbackProps) {
  useEffect(() => {
    if (!message || !onClose) return;

    const timeout = window.setTimeout(onClose, 2400);
    return () => window.clearTimeout(timeout);
  }, [message, onClose]);

  if (!message) return null;

  const tone = getTone(message);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 pt-[env(safe-area-inset-top)]">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex min-h-12 w-full max-w-[420px] items-center gap-3 rounded-full px-4 py-3 text-sm font-bold backdrop-blur-md animate-in fade-in slide-in-from-top-3",
          toneClasses[tone],
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
          <FeedbackIcon tone={tone} message={message} />
        </span>
        <span className="min-w-0 flex-1 truncate">{message}</span>
      </div>
    </div>
  );
}
