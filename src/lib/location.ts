import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type SavedLocation = Coordinates & {
  label?: string;
  savedAt: number;
};

const LOCATION_CONSENT_KEY = "chegaai:location-consent";
const LOCATION_CACHE_KEY = "chegaai:last-location";
const RADIUS_PREFERENCE_KEY = "chegaai:radius-km";
const LOCATION_MAX_AGE_MS = 30 * 60 * 1000;
export const DEFAULT_RADIUS_KM = 10;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 50;

export function hasCoordinates(value: { latitude?: number | null; longitude?: number | null }) {
  return typeof value.latitude === "number" && typeof value.longitude === "number";
}

export function distanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km?: number) {
  if (km == null || Number.isNaN(km)) return undefined;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`;
}

export async function requestCurrentLocation() {
  if (Capacitor.isNativePlatform()) return requestNativeCurrentLocation();

  return requestBrowserCurrentLocation();
}

export async function canRestoreLocation() {
  const savedConsent = readLocationConsent();

  if (Capacitor.isNativePlatform()) {
    if (!savedConsent) return false;

    try {
      const permission = await Geolocation.checkPermissions();
      return permission.location === "granted" || permission.coarseLocation === "granted";
    } catch {
      return false;
    }
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) return false;

  if (navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      return permission.state === "granted" || (savedConsent && permission.state !== "denied");
    } catch {
      return savedConsent;
    }
  }

  return savedConsent;
}

function requestBrowserCurrentLocation() {
  return new Promise<Coordinates>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocalização indisponível neste dispositivo."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () =>
        reject(new Error("Permita a localização ou digite uma região para ver locais próximos.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

async function requestNativeCurrentLocation() {
  try {
    const permission = await Geolocation.checkPermissions();
    if (permission.location !== "granted" && permission.coarseLocation !== "granted") {
      const requested = await Geolocation.requestPermissions();
      if (requested.location !== "granted" && requested.coarseLocation !== "granted") {
        throw new Error("Permita a localização ou digite uma região para ver locais próximos.");
      }
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (cause) {
    if (cause instanceof Error && cause.message) throw cause;
    throw new Error("Permita a localização ou digite uma região para ver locais próximos.");
  }
}

export function readLocationConsent() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(LOCATION_CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveLocationConsent() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCATION_CONSENT_KEY, "true");
  } catch {
    // Browser permission remains the source of truth if storage fails.
  }
}

export function readSavedLocation() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SavedLocation>;
    if (
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number" ||
      typeof parsed.savedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > LOCATION_MAX_AGE_MS) return null;

    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      label: typeof parsed.label === "string" ? parsed.label : undefined,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveCurrentLocation(location: Coordinates, label?: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      LOCATION_CACHE_KEY,
      JSON.stringify({ ...location, label, savedAt: Date.now() }),
    );
  } catch {
    // Ignore storage failures; current session state still works.
  }
}

export function readSavedRadiusKm() {
  if (typeof window === "undefined") return DEFAULT_RADIUS_KM;

  try {
    return clampRadiusKm(Number(window.localStorage.getItem(RADIUS_PREFERENCE_KEY)));
  } catch {
    return DEFAULT_RADIUS_KM;
  }
}

export function saveRadiusKm(radiusKm: number) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(RADIUS_PREFERENCE_KEY, String(clampRadiusKm(radiusKm)));
  } catch {
    // Ignore storage failures; current session state still works.
  }
}

export function clampRadiusKm(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_RADIUS_KM;
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, Math.round(value)));
}

export function directionsUrl(destination: Coordinates, label?: string) {
  const query = encodeURIComponent(
    label
      ? `${label} ${destination.latitude},${destination.longitude}`
      : `${destination.latitude},${destination.longitude}`,
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
