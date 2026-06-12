import { Gift, Sparkles } from "lucide-react";
import { RewardCodeCard } from "@/components/reward-code-card";
import type { RewardRedemptionSummary } from "@/lib/data";

export function CheckinReward({
  reward,
  description,
  actionLabel,
  meta,
  unlocked,
  redemption,
}: {
  reward: string | null;
  description?: string | null;
  actionLabel?: string;
  meta?: string[];
  unlocked: boolean;
  redemption?: RewardRedemptionSummary | null;
}) {
  if (!reward) {
    return (
      <div className="mt-5 rounded-3xl border border-border bg-muted/50 p-4">
        <p className="text-sm font-black">Sem recompensa ativa</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          O estabelecimento ainda não cadastrou um benefício para check-in.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
          {unlocked ? <Gift className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">
            {unlocked ? "Benefício liberado" : (actionLabel ?? "Benefício com check-in")}
          </p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">{reward}</p>
          {meta?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {meta.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {unlocked && redemption ? (
            <>
              {description ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
              ) : null}
              <RewardCodeCard redemption={redemption} />
            </>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {unlocked
                ? (description ?? "Mostre essa tela no local para resgatar.")
                : "Faça check-in quando chegar e libere essa vantagem."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
