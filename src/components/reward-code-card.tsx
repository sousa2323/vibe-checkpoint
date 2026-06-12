import { useMemo } from "react";
import { BadgeCheck, QrCode } from "lucide-react";
import { renderSVG } from "uqr";
import type { RewardRedemptionSummary } from "@/lib/data";

const redeemedAtFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function RewardCodeCard({ redemption }: { redemption: RewardRedemptionSummary }) {
  const qrSvg = useMemo(() => renderSVG(redemption.code, { ecc: "M" }), [redemption.code]);
  const formattedCode = `${redemption.code.slice(0, 3)} ${redemption.code.slice(3)}`;

  if (redemption.status === "redeemed") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-3">
        <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" />
        <p className="text-xs font-bold text-emerald-700">
          Benefício resgatado
          {redemption.redeemedAt
            ? ` em ${redeemedAtFormatter.format(new Date(redemption.redeemedAt))}`
            : ""}
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4">
      <div className="flex items-center gap-4">
        <div
          aria-hidden
          className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white p-1.5 [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
            <QrCode className="h-3.5 w-3.5" />
            Código de resgate
          </p>
          <p className="mt-1 font-mono text-2xl font-black tracking-[0.18em]">{formattedCode}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Mostre este código no balcão para resgatar.
          </p>
        </div>
      </div>
    </div>
  );
}
