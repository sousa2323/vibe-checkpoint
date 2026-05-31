import { Share2, Ticket } from "lucide-react";
import type { EventSummary } from "@/lib/data";
import { getRewardActionLabel, getRewardMeta } from "@/lib/growth";

export function ShareInviteCard({
  event,
  reward,
  disabled,
  onShare,
}: {
  event: EventSummary;
  reward: string | null;
  disabled?: boolean;
  onShare: () => void;
}) {
  const rewardMeta = getRewardMeta(event);
  const rewardActionLabel = getRewardActionLabel(event);

  return (
    <div className="mt-5 overflow-hidden rounded-3xl bg-ink text-white">
      <div className="relative h-32">
        <img src={event.image} alt="" className="h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-xs font-bold uppercase text-white/70">Convite pronto</p>
          <p className="truncate text-lg font-black">{event.title}</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-3">
          <Ticket className="h-4 w-4 text-emerald-300" />
          <p className="min-w-0 flex-1 text-xs font-semibold leading-relaxed">
            {reward
              ? `Compartilhe no WhatsApp/Instagram com data, local e oferta. ${rewardActionLabel}: ${reward}.`
              : "Compartilhe no WhatsApp/Instagram com data e local do evento."}
          </p>
        </div>
        {rewardMeta.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {rewardMeta.map((item) => (
              <span
                key={item}
                className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white/80"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          onClick={onShare}
          disabled={disabled}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-black text-primary-foreground disabled:bg-white/15 disabled:text-white/55"
        >
          <Share2 className="h-4 w-4" />
          Compartilhar convite
        </button>
      </div>
    </div>
  );
}
