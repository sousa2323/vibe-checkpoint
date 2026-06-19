import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import type { PushPlatform } from "@/lib/data";

const ANDROID_NOTIFICATION_CHANNEL_ID = "chegaai_alerts_v1";
// Canal antigo criado em importância baixa (travada pelo Android). Apagamos para
// migrar todo mundo para o canal HIGH novo e não deixar duas entradas em Configurações.
const ANDROID_LEGACY_NOTIFICATION_CHANNEL_ID = "default";
const ANDROID_TOKEN_ROTATION_STORAGE_KEY = "chegaai:android-push-token-rotation:v2";
const LOG_PREFIX = "[push]";

function logInfo(message: string, data?: unknown) {
  console.info(`${LOG_PREFIX} ${message}${formatLogData(data)}`);
}

function logWarn(message: string, data?: unknown) {
  console.warn(`${LOG_PREFIX} ${message}${formatLogData(data)}`);
}

function formatLogData(data: unknown): string {
  if (data === undefined) return "";
  if (data instanceof Error) {
    const cause = data.cause === undefined ? "" : ` ${safeStringify(data.cause)}`;
    return ` ${data.message}${cause}`;
  }

  return ` ${safeStringify(data)}`;
}

function safeStringify(data: unknown) {
  try {
    return JSON.stringify(data);
  } catch (_error) {
    return "[unserializable]";
  }
}

function routeFromData(data: unknown): string | undefined {
  const route = (data as { route?: unknown } | null | undefined)?.route;
  if (typeof route !== "string") return undefined;

  const normalized = route.trim();
  if (!normalized.startsWith("/") || normalized.includes("//") || normalized.includes("\\")) {
    return undefined;
  }

  if (["/", "/discover", "/updates", "/calendar", "/profile", "/map"].includes(normalized)) {
    return normalized;
  }

  return /^\/(events|venues|groups)\/[a-zA-Z0-9_-]+$/.test(normalized) ? normalized : undefined;
}

let registeredUserId: string | undefined;
let listenersReady = false;
let latestOpenRoute: ((route: string) => void) | undefined;
let latestSaveToken:
  | ((data: { token: string; platform: PushPlatform }) => Promise<void>)
  | undefined;
let latestUserId: string | undefined;
let androidNotificationPresentationReady = false;
let registrationInFlightUserId: string | undefined;

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

  // Mantém as callbacks sempre apontando para o usuário logado atual, para que o
  // evento `registration` salve o token sob o userId correto mesmo após trocar de conta.
  latestOpenRoute = openRoute;
  latestSaveToken = saveToken;
  latestUserId = userId;

  if (registrationInFlightUserId === userId) return;

  try {
    registrationInFlightUserId = userId;

    if (!listenersReady) {
      listenersReady = true;
      logInfo("Registering native push listeners.");

      await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
        const route = routeFromData(event.notification.data);
        if (route) latestOpenRoute?.(route);
      });

      await PushNotifications.addListener("registration", (token) => {
        const platform = normalizePlatform(Capacitor.getPlatform());
        logInfo("Native push token received.", {
          platform,
          tokenLength: token.value.length,
        });

        void latestSaveToken?.({ token: token.value, platform })
          .then(() => {
            registeredUserId = latestUserId;
            logInfo("Native push token saved.");
          })
          .catch((error) => {
            registeredUserId = undefined;
            logWarn("Failed to save native push token.", error);
          });
      });

      await PushNotifications.addListener("registrationError", (error) => {
        registeredUserId = undefined;
        logWarn("Native push registration failed.", error);
      });

      // Foreground Android delivery is handled by the native push plugin/system
      // presentation. Avoid re-scheduling locally, which duplicates notifications.
    }

    // Só pede permissão quando o SO ainda não decidiu. No Android o popup só
    // aparece nesse estado; pedir repetidamente após decisão não reabre o popup.
    let permission = await PushNotifications.checkPermissions();
    logInfo("Native push permission state.", permission);
    if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
      permission = await PushNotifications.requestPermissions();
      logInfo("Native push permission requested.", permission);
    }

    if (permission.receive !== "granted") {
      // Não marca como registrado: permite nova tentativa em outro login/perfil.
      logWarn("Native push permission is not granted.", permission);
      return;
    }

    if (Capacitor.getPlatform() === "android") {
      await ensureAndroidNotificationPresentation();
      await rotateAndroidPushTokenOnce();
    }

    // Sempre re-registra ao trocar de usuário: reemite o evento `registration`,
    // garantindo que o token atual seja salvo para o userId logado agora.
    logInfo("Calling native push register.", {
      platform: Capacitor.getPlatform(),
      userChanged: registeredUserId !== userId,
    });
    await PushNotifications.register();
  } catch (error) {
    registeredUserId = undefined;
    logWarn("Failed to start native push registration.", error);
  } finally {
    if (registrationInFlightUserId === userId) registrationInFlightUserId = undefined;
  }
}

async function rotateAndroidPushTokenOnce() {
  if (Capacitor.getPlatform() !== "android") return;
  if (localStorage.getItem(ANDROID_TOKEN_ROTATION_STORAGE_KEY) === "done") return;

  try {
    logInfo("Rotating Android push token once before registration.");
    await PushNotifications.unregister();
    await wait(1_500);
  } catch (error) {
    logWarn("Failed to rotate Android push token before registration.", error);
  } finally {
    localStorage.setItem(ANDROID_TOKEN_ROTATION_STORAGE_KEY, "done");
  }
}

async function ensureAndroidNotificationPresentation() {
  if (Capacitor.getPlatform() !== "android") return true;
  if (androidNotificationPresentationReady) return true;

  let localPermission = await LocalNotifications.checkPermissions();
  if (localPermission.display === "prompt" || localPermission.display === "prompt-with-rationale") {
    localPermission = await LocalNotifications.requestPermissions();
  }

  if (localPermission.display !== "granted") return false;

  // Remove o canal antigo de baixa importância. Como a importância de um canal é
  // travada na primeira criação, não dá para "promover" o "default"; criamos um novo.
  try {
    await PushNotifications.deleteChannel({ id: ANDROID_LEGACY_NOTIFICATION_CHANNEL_ID });
    await LocalNotifications.deleteChannel({ id: ANDROID_LEGACY_NOTIFICATION_CHANNEL_ID });
  } catch (error) {
    logWarn("Failed to delete legacy notification channel.", error);
  }

  const channel = {
    id: ANDROID_NOTIFICATION_CHANNEL_ID,
    name: "Novidades",
    description: "Notificações de novidades, eventos e avisos do ChegaAi",
    importance: 4 as const,
    visibility: 1 as const,
    vibration: true,
    lights: true,
  };

  await PushNotifications.createChannel(channel);
  await LocalNotifications.createChannel(channel);

  androidNotificationPresentationReady = true;
  return true;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePlatform(platform: string): PushPlatform {
  if (platform === "ios" || platform === "android") return platform;
  return "web";
}
