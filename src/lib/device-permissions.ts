import { Camera } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";

export type DevicePermissionKind = "location" | "camera" | "photos" | "notifications";

export type DevicePermissionState = "granted" | "limited" | "prompt" | "denied" | "unavailable";

export type DevicePermissionStatuses = Record<DevicePermissionKind, DevicePermissionState>;

export async function getDevicePermissionStatuses(): Promise<DevicePermissionStatuses> {
  const [location, camera, photos, notifications] = await Promise.all([
    getLocationPermissionState(),
    getCameraPermissionState(),
    getPhotosPermissionState(),
    getNotificationsPermissionState(),
  ]);

  return { location, camera, photos, notifications };
}

export async function requestDevicePermission(
  kind: DevicePermissionKind,
): Promise<DevicePermissionState> {
  if (kind === "location") return requestLocationPermissionState();
  if (kind === "camera") return requestCameraPermissionState();
  if (kind === "photos") return requestPhotosPermissionState();
  return requestNotificationsPermissionState();
}

// Permissões pedidas automaticamente no primeiro uso nativo (após o login), uma após a
// outra. A de notificação já é pedida pelo fluxo de push; aqui cobrimos o restante.
const INITIAL_NATIVE_PERMISSION_ORDER: DevicePermissionKind[] = ["location", "camera", "photos"];
const INITIAL_NATIVE_PERMISSIONS_STORAGE_KEY = "chegaai:initial-native-permissions:v1";

export async function requestInitialNativePermissions(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (localStorage.getItem(INITIAL_NATIVE_PERMISSIONS_STORAGE_KEY) === "done") return;
  } catch {
    // localStorage indisponível: segue e tenta pedir mesmo assim.
  }

  let statuses: DevicePermissionStatuses;
  try {
    statuses = await getDevicePermissionStatuses();
  } catch {
    return;
  }

  // Sequencial: cada caixa nativa só abre depois que a anterior é respondida. Só pede o
  // que ainda está em "prompt" (não reabre o que o usuário já concedeu ou negou).
  for (const kind of INITIAL_NATIVE_PERMISSION_ORDER) {
    if (statuses[kind] !== "prompt") continue;
    try {
      await requestDevicePermission(kind);
    } catch {
      // Falha numa permissão não impede pedir as próximas.
    }
  }

  try {
    localStorage.setItem(INITIAL_NATIVE_PERMISSIONS_STORAGE_KEY, "done");
  } catch {
    // Sem persistência: na pior das hipóteses tentamos de novo num próximo login.
  }
}

async function getLocationPermissionState(): Promise<DevicePermissionState> {
  if (!Capacitor.isNativePlatform() && !navigator.geolocation) return "unavailable";

  try {
    if (Capacitor.isNativePlatform()) {
      const permission = await Geolocation.checkPermissions();
      return normalizePermission(permission.location, permission.coarseLocation);
    }

    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      return normalizePermission(permission.state);
    }

    return "prompt";
  } catch {
    return "unavailable";
  }
}

async function requestLocationPermissionState(): Promise<DevicePermissionState> {
  try {
    if (Capacitor.isNativePlatform()) {
      const permission = await Geolocation.requestPermissions();
      return normalizePermission(permission.location, permission.coarseLocation);
    }

    if (!navigator.geolocation) return "unavailable";

    await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      });
    });

    return "granted";
  } catch {
    return getLocationPermissionState();
  }
}

async function getCameraPermissionState(): Promise<DevicePermissionState> {
  if (!Capacitor.isNativePlatform() && !navigator.mediaDevices?.getUserMedia) return "unavailable";

  try {
    if (Capacitor.isNativePlatform()) {
      const permission = await Camera.checkPermissions();
      return normalizePermission(permission.camera);
    }

    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: "camera" as PermissionName });
      return normalizePermission(permission.state);
    }

    return "prompt";
  } catch {
    return "prompt";
  }
}

async function requestCameraPermissionState(): Promise<DevicePermissionState> {
  try {
    if (Capacitor.isNativePlatform()) {
      const permission = await Camera.requestPermissions({ permissions: ["camera"] });
      return normalizePermission(permission.camera);
    }

    if (!navigator.mediaDevices?.getUserMedia) return "unavailable";

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return "granted";
  } catch {
    return getCameraPermissionState();
  }
}

async function getPhotosPermissionState(): Promise<DevicePermissionState> {
  try {
    if (!Capacitor.isNativePlatform()) return "prompt";

    const permission = await Camera.checkPermissions();
    return normalizePermission(permission.photos);
  } catch {
    return "unavailable";
  }
}

async function requestPhotosPermissionState(): Promise<DevicePermissionState> {
  try {
    if (!Capacitor.isNativePlatform()) return "prompt";

    const permission = await Camera.requestPermissions({ permissions: ["photos"] });
    return normalizePermission(permission.photos);
  } catch {
    return getPhotosPermissionState();
  }
}

async function getNotificationsPermissionState(): Promise<DevicePermissionState> {
  try {
    if (Capacitor.isNativePlatform()) {
      const [pushPermission, localPermission] = await Promise.all([
        PushNotifications.checkPermissions(),
        LocalNotifications.checkPermissions(),
      ]);

      return normalizeRequiredPermissions(pushPermission.receive, localPermission.display);
    }

    if (!("Notification" in window)) return "unavailable";
    return normalizePermission(Notification.permission);
  } catch {
    return "unavailable";
  }
}

async function requestNotificationsPermissionState(): Promise<DevicePermissionState> {
  try {
    if (Capacitor.isNativePlatform()) {
      const [pushPermission, localPermission] = await Promise.all([
        PushNotifications.requestPermissions(),
        LocalNotifications.requestPermissions(),
      ]);

      return normalizeRequiredPermissions(pushPermission.receive, localPermission.display);
    }

    if (!("Notification" in window)) return "unavailable";
    return normalizePermission(await Notification.requestPermission());
  } catch {
    return getNotificationsPermissionState();
  }
}

function normalizePermission(...states: Array<string | undefined>): DevicePermissionState {
  if (states.some((state) => state === "granted")) return "granted";
  if (states.some((state) => state === "limited")) return "limited";
  if (states.some((state) => state === "prompt" || state === "prompt-with-rationale")) {
    return "prompt";
  }
  if (states.some((state) => state === "denied")) return "denied";
  return "unavailable";
}

function normalizeRequiredPermissions(...states: Array<string | undefined>): DevicePermissionState {
  if (states.every((state) => state === "granted")) return "granted";
  if (states.some((state) => state === "denied")) return "denied";
  if (states.some((state) => state === "limited")) return "limited";
  if (states.some((state) => state === "prompt" || state === "prompt-with-rationale")) {
    return "prompt";
  }
  return "unavailable";
}
