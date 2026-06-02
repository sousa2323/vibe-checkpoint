import { describe, expect, it } from "vitest";
import {
  clampRadiusKm,
  DEFAULT_RADIUS_KM,
  directionsUrl,
  distanceKm,
  formatDistance,
  hasCoordinates,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
} from "./location";

describe("hasCoordinates", () => {
  it("requires latitude and longitude numbers", () => {
    expect(hasCoordinates({ latitude: -23.55, longitude: -46.63 })).toBe(true);
    expect(hasCoordinates({ latitude: -23.55 })).toBe(false);
    expect(hasCoordinates({ latitude: null, longitude: -46.63 })).toBe(false);
  });
});

describe("distanceKm", () => {
  it("returns zero for equal coordinates", () => {
    const point = { latitude: -23.5505, longitude: -46.6333 };

    expect(distanceKm(point, point)).toBeCloseTo(0);
  });

  it("calculates distance between nearby city points", () => {
    const se = { latitude: -23.5505, longitude: -46.6333 };
    const pinheiros = { latitude: -23.5614, longitude: -46.7016 };

    expect(distanceKm(se, pinheiros)).toBeGreaterThan(6);
    expect(distanceKm(se, pinheiros)).toBeLessThan(8);
  });
});

describe("formatDistance", () => {
  it("formats meters below 1 km", () => {
    expect(formatDistance(0.42)).toBe("420 m");
  });

  it("formats kilometers using Brazilian decimal separator", () => {
    expect(formatDistance(2.4)).toBe("2,4 km");
    expect(formatDistance(12.4)).toBe("12 km");
  });

  it("returns undefined for absent or invalid distances", () => {
    expect(formatDistance()).toBeUndefined();
    expect(formatDistance(Number.NaN)).toBeUndefined();
  });
});

describe("clampRadiusKm", () => {
  it("clamps radius preferences to the MVP bounds", () => {
    expect(clampRadiusKm(-2)).toBe(MIN_RADIUS_KM);
    expect(clampRadiusKm(999)).toBe(MAX_RADIUS_KM);
    expect(clampRadiusKm(12.6)).toBe(13);
    expect(clampRadiusKm(Number.NaN)).toBe(DEFAULT_RADIUS_KM);
  });
});

describe("directionsUrl", () => {
  it("builds a Google Maps search URL with coordinates and optional label", () => {
    expect(directionsUrl({ latitude: -23.55, longitude: -46.63 }, "Bar Aurora")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Bar%20Aurora%20-23.55%2C-46.63",
    );
  });
});
