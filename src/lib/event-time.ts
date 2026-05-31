export const EVENT_ACTIVE_WINDOW_HOURS = 6;

const EVENT_ACTIVE_WINDOW_MS = EVENT_ACTIVE_WINDOW_HOURS * 60 * 60 * 1000;

export function canEventAcceptExplorerActions(startsAt: string, now = Date.now()) {
  const startsAtTime = new Date(startsAt).getTime();
  if (!Number.isFinite(startsAtTime)) return false;

  return now < startsAtTime + EVENT_ACTIVE_WINDOW_MS;
}

export function canEventAppearInGroupVoting(startsAt: string, now = Date.now()) {
  const startsAtDate = new Date(startsAt);
  const startsAtTime = startsAtDate.getTime();
  if (!Number.isFinite(startsAtTime)) return false;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return startsAtTime >= today.getTime() && canEventAcceptExplorerActions(startsAt, now);
}
