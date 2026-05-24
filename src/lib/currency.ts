const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrencyInput(cents?: number | null) {
  if (cents == null || !Number.isFinite(cents)) return "";
  return brlFormatter.format(cents / 100);
}

export function parseCurrencyToCents(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;

  const cents = Number(digits);
  return Number.isFinite(cents) ? cents : undefined;
}
