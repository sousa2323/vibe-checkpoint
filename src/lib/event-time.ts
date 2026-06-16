export const EVENT_ACTIVE_WINDOW_HOURS = 24;
export const EVENT_ASSUMED_DURATION_HOURS = 6;
export const EVENT_POST_GRACE_HOURS = 2;
export const EVENT_POST_WINDOW_HOURS = EVENT_ASSUMED_DURATION_HOURS + EVENT_POST_GRACE_HOURS;

const EVENT_ACTIVE_WINDOW_MS = EVENT_ACTIVE_WINDOW_HOURS * 60 * 60 * 1000;
const EVENT_POST_WINDOW_MS = EVENT_POST_WINDOW_HOURS * 60 * 60 * 1000;

export type EventRecurrenceType = "none" | "weekly";

export function getWeeklyRecurrenceParts(startsAt: string) {
  const match = startsAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const weekday = date.getDay();
  if (!Number.isFinite(weekday)) return null;

  return {
    weekday,
    time: `${hour}:${minute}:00`,
  };
}

export function getNextWeeklyOccurrence(startsAt: string, now = Date.now()) {
  const startsAtDate = new Date(startsAt);
  const startsAtTime = startsAtDate.getTime();
  if (!Number.isFinite(startsAtTime)) return null;

  const current = new Date(now);
  const occurrence = new Date(current);
  occurrence.setHours(startsAtDate.getHours(), startsAtDate.getMinutes(), 0, 0);

  const dayOffset = startsAtDate.getDay() - current.getDay();
  occurrence.setDate(current.getDate() + dayOffset);

  if (occurrence.getTime() <= now - EVENT_ACTIVE_WINDOW_MS) {
    occurrence.setDate(occurrence.getDate() + 7);
  }

  return occurrence.toISOString();
}

export function canEventAcceptExplorerActions(startsAt: string, now = Date.now()) {
  const startsAtTime = new Date(startsAt).getTime();
  if (!Number.isFinite(startsAtTime)) return false;

  return now < startsAtTime + EVENT_ACTIVE_WINDOW_MS;
}

export function canEventAcceptPosts(startsAt: string, now = Date.now()) {
  const startsAtTime = new Date(startsAt).getTime();
  if (!Number.isFinite(startsAtTime)) return false;

  return now >= startsAtTime && now < startsAtTime + EVENT_POST_WINDOW_MS;
}

export function canEventAppearInGroupVoting(startsAt: string, now = Date.now()) {
  const startsAtDate = new Date(startsAt);
  const startsAtTime = startsAtDate.getTime();
  if (!Number.isFinite(startsAtTime)) return false;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return startsAtTime >= today.getTime() && canEventAcceptExplorerActions(startsAt, now);
}
