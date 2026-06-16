import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import type { AnyRouter } from "@tanstack/react-router";

let registered = false;
let latestRouter: AnyRouter | undefined;

/**
 * Faz o botão físico de voltar do Android navegar para a página anterior dentro
 * do app, em vez de fechar o app. Só sai do app quando não há histórico para onde
 * voltar (`canGoBack === false`).
 */
export async function registerNativeBackButton(router: AnyRouter) {
  if (!Capacitor.isNativePlatform()) return;

  latestRouter = router;

  if (registered) return;
  registered = true;

  await App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      latestRouter?.history.back();
    } else {
      void App.exitApp();
    }
  });
}
