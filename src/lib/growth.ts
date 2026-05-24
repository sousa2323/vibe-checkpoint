import type { EventSummary, VenueSummary } from "@/lib/data";

const rewardActionLabels = {
  checkin: "Benefício com check-in",
  save: "Benefício ao salvar",
  share: "Benefício ao compartilhar",
  follow: "Benefício ao seguir",
} as const;

const shortDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function getCheckinReward(target: EventSummary | VenueSummary) {
  return target.reward?.title ?? null;
}

export function getRewardDescription(target: EventSummary | VenueSummary) {
  return target.reward?.description ?? null;
}

export function getRewardActionLabel(target: EventSummary | VenueSummary) {
  const action = target.reward?.action ?? "checkin";
  return rewardActionLabels[action];
}

export function getRewardMeta(target: EventSummary | VenueSummary) {
  const reward = target.reward;
  if (!reward) return [];

  const meta: string[] = [];
  if (reward.validUntil) {
    const validUntil = new Date(reward.validUntil);
    if (!Number.isNaN(validUntil.getTime())) {
      meta.push(`Até ${shortDateTimeFormatter.format(validUntil)}`);
    }
  }
  if (reward.maxRedemptions) meta.push(`Primeiros ${reward.maxRedemptions}`);
  if (reward.validUntil || reward.maxRedemptions) meta.unshift("Relâmpago");
  return meta;
}

export function getRewardShareLine(target: EventSummary | VenueSummary) {
  const reward = getCheckinReward(target);
  if (!reward) return null;

  const meta = getRewardMeta(target);
  const suffix = meta.length ? ` (${meta.join(" · ")})` : "";
  return `${getRewardActionLabel(target)} libera: ${reward}${suffix}.`;
}

export function buildEventShareText(event: EventSummary, url: string) {
  const lines = [
    `Bora nesse rolê? ${event.title}`,
    `${event.venueName} · ${event.venueNeighborhood}`,
    `${event.date}${event.price ? ` · ${event.price}` : ""}`,
  ];

  const rewardLine = getRewardShareLine(event);
  if (rewardLine) lines.push(rewardLine);
  lines.push(url);
  return lines.join("\n");
}

export function buildVenueShareText(venue: VenueSummary, url: string) {
  const lines = [
    `Conhece esse lugar? ${venue.name}`,
    `${venue.address ?? venue.neighborhood}`,
    `${venue.liveEvents} eventos ao vivo · ${venue.checkins} check-ins`,
  ];

  const rewardLine = getRewardShareLine(venue);
  if (rewardLine) lines.push(rewardLine);
  lines.push(url);
  return lines.join("\n");
}
