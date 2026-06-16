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

  // Mantém as callbacks sempre apontando para o usuário logado atual, para que o
  // evento `registration` salve o token sob o userId correto mesmo após trocar de conta.
  latestOpenRoute = openRoute;
  latestSaveToken = saveToken;

  // Já registrado com sucesso para este mesmo usuário: nada a fazer.
  if (registeredUserId === userId) return;

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

    // Só pede permissão quando o SO ainda não decidiu. No Android o popup só
    // aparece nesse estado; pedir repetidamente após decisão não reabre o popup.
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== "granted") {
      // Não marca como registrado: permite nova tentativa em outro login/perfil.
      return;
    }

    if (Capacitor.getPlatform() === "android") {
      await PushNotifications.createChannel({
        id: "default",
        name: "Novidades",
        description: "Notificações de novidades, eventos e avisos do ChegaAi",
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: true,
      });
    }

    // Sempre re-registra ao trocar de usuário: reemite o evento `registration`,
    // garantindo que o token atual seja salvo para o userId logado agora.
    await PushNotifications.register();

    registeredUserId = userId;
  } catch {
    registeredUserId = undefined;
  }
}

function normalizePlatform(platform: string): PushPlatform {
  if (platform === "ios" || platform === "android") return platform;
  return "web";
}
