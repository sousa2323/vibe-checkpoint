import { describe, expect, it } from "vitest";
import {
  canEventAcceptExplorerActions,
  canEventAppearInGroupVoting,
  EVENT_ACTIVE_WINDOW_HOURS,
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
