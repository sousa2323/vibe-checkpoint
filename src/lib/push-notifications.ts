import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import type { PushPlatform } from "@/lib/data";

let registeredUserId: string | undefined;
let listenersReady = false;
let latestOpenRoute: ((route: string) => void) | undefined;
let latestSaveToken:
  | ((data: { token: string; platform: PushPlatform }) => Promise<void>)
  | undefined;

export async function registerNativePushNotifications({
  userId,
  saveToken,
  openRoute,
}: {
  userId: string;
  saveToken: (data: { token: string; platform: PushPlatform }) => Promise<void>;
  openRoute: (route: string) => void;
}) {
  if (!Capacitor.isNativePlatform()) return;

  latestOpenRoute = openRoute;
  latestSaveToken = saveToken;

  if (registeredUserId === userId) return;

  registeredUserId = userId;

  try {
    if (!listenersReady) {
      listenersReady = true;

      await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
        const route = event.notification.data?.route;
        if (typeof route === "string" && route.startsWith("/")) {
          latestOpenRoute?.(route);
        }
      });

      await PushNotifications.addListener("registration", (token) => {
        void latestSaveToken?.({
          token: token.value,
          platform: normalizePlatform(Capacitor.getPlatform()),
        });
      });
    }

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return;

    await PushNotifications.register();
  } catch {
    registeredUserId = undefined;
  }
}

function normalizePlatform(platform: string): PushPlatform {
  if (platform === "ios" || platform === "android") return platform;
  return "web";
}
