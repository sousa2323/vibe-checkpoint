import { describe, expect, it } from "vitest";
import {
  canEventAcceptExplorerActions,
  canEventAcceptPosts,
  canEventAppearInGroupVoting,
  EVENT_ACTIVE_WINDOW_HOURS,
  EVENT_POST_WINDOW_HOURS,
  getNextWeeklyOccurrence,
  getWeeklyRecurrenceParts,
} from "./event-time";

const hourMs = 60 * 60 * 1000;

describe("canEventAcceptExplorerActions", () => {
  it("accepts actions before the event active window closes", () => {
    const startsAt = "2026-06-02T20:00:00.000Z";
    const now = new Date(startsAt).getTime() + (EVENT_ACTIVE_WINDOW_HOURS - 1) * hourMs;

    expect(canEventAcceptExplorerActions(startsAt, now)).toBe(true);
  });

  it("rejects actions after the event active window closes", () => {
    const startsAt = "2026-06-02T20:00:00.000Z";
    const now = new Date(startsAt).getTime() + EVENT_ACTIVE_WINDOW_HOURS * hourMs;

    expect(canEventAcceptExplorerActions(startsAt, now)).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(canEventAcceptExplorerActions("invalid-date", Date.now())).toBe(false);
  });
});

describe("canEventAcceptPosts", () => {
  it("accepts posts while the post window is open", () => {
    const startsAt = "2026-06-02T20:00:00.000Z";
    const now = new Date(startsAt).getTime() + (EVENT_POST_WINDOW_HOURS - 1) * hourMs;

    expect(canEventAcceptPosts(startsAt, now)).toBe(true);
  });

  it("rejects posts before the event starts", () => {
    const startsAt = "2026-06-02T20:00:00.000Z";
    const now = new Date(startsAt).getTime() - hourMs;

    expect(canEventAcceptPosts(startsAt, now)).toBe(false);
  });

  it("rejects posts after the post window closes", () => {
    const startsAt = "2026-06-02T20:00:00.000Z";
    const now = new Date(startsAt).getTime() + EVENT_POST_WINDOW_HOURS * hourMs;

    expect(canEventAcceptPosts(startsAt, now)).toBe(false);
  });
});

describe("canEventAppearInGroupVoting", () => {
  it("shows future events from today while they are actionable", () => {
    expect(canEventAppearInGroupVoting("2026-06-02T20:00:00.000Z", Date.UTC(2026, 5, 2, 12))).toBe(
      true,
    );
  });

  it("hides events from previous days", () => {
    expect(canEventAppearInGroupVoting("2026-06-01T23:00:00.000Z", Date.UTC(2026, 5, 2, 12))).toBe(
      false,
    );
  });
});

describe("weekly recurrence", () => {
  it("extracts weekday and time from a datetime-local value", () => {
    expect(getWeeklyRecurrenceParts("2026-06-05T20:30")).toEqual({
      weekday: 5,
      time: "20:30:00",
    });
  });

  it("keeps this week's occurrence while it is still active", () => {
    const occurrence = getNextWeeklyOccurrence(
      "2026-06-05T20:00:00.000Z",
      Date.UTC(2026, 5, 6, 12),
    );

    expect(occurrence).toBe("2026-06-05T20:00:00.000Z");
  });

  it("moves to next week after the active window closes", () => {
    const occurrence = getNextWeeklyOccurrence(
      "2026-06-05T20:00:00.000Z",
      Date.UTC(2026, 5, 7, 21),
    );

    expect(occurrence).toBe("2026-06-12T20:00:00.000Z");
  });
});
