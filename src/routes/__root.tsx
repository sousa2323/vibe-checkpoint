import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { authClient } from "@/auth";
import type { PushPlatform } from "@/lib/data";
import { requestInitialNativePermissions } from "@/lib/device-permissions";
import { registerNativeBackButton } from "@/lib/native-back-button";
import { registerNativePushNotifications } from "@/lib/push-notifications";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { THEME_STORAGE_KEY } from "../lib/theme";
import appCss from "../styles.css?url";

const browserProcessEnvScript = `globalThis.process=globalThis.process||{};globalThis.process.env=Object.assign({NODE_ENV:${JSON.stringify(
  import.meta.env.PROD ? "production" : "development",
)},TSS_ROUTER_BASEPATH:""},globalThis.process.env||{});`;

const initialThemeScript = `(function(){try{var key=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var stored=localStorage.getItem(key);var theme=stored==='light'||stored==='dark'?stored:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',theme==='dark');var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme==='dark'?'#0D0D0D':'#F13A5A');}catch(error){}})();`;

declare global {
  interface Window {
    __CHEGAAI_CAPACITOR_INITIAL_PATH?: string;
  }
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado por aqui. Tente novamente ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "ChegaAí — Eventos e bares ao vivo, agora" },
      {
        name: "description",
        content:
          "Descubra bares, pubs e eventos acontecendo agora perto de você. Check-in rápido, música ao vivo em tempo real e divisão de contas com amigos.",
      },
      { name: "theme-color", content: "#F13A5A" },
      { property: "og:title", content: "ChegaAí" },
      {
        property: "og:description",
        content: "Eventos e bares ao vivo, agora.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initialThemeScript }} />
        <script dangerouslySetInnerHTML={{ __html: browserProcessEnvScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const { data } = authClient.useSession();
  const userId = data?.user?.id;

  useEffect(() => {
    void registerNativeBackButton(router);
  }, [router]);

  useEffect(() => {
    const initialPath = window.__CHEGAAI_CAPACITOR_INITIAL_PATH;
    if (!initialPath || initialPath === "/") return;

    delete window.__CHEGAAI_CAPACITOR_INITIAL_PATH;
    window.history.replaceState(window.history.state, "", initialPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  useEffect(() => {
    if (!userId) {
      console.info("[push] Root has no authenticated user; native push registration skipped.");
      return;
    }

    console.info("[push] Root requesting native push registration.", {
      userIdLength: userId.length,
    });

    void (async () => {
      // Notificação primeiro (igual hoje), depois localização → câmera → galeria, em
      // sequência, para não abrir caixas nativas concorrentes.
      await registerNativePushNotifications({
        userId,
        saveToken: ({ token, platform }) => saveNativePushToken({ userId, token, platform }),
        openRoute: (route) => {
          void router.navigate({ to: route as never });
        },
      });
      await requestInitialNativePermissions();
    })();
  }, [router, userId]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

async function saveNativePushToken({
  userId,
  token,
  platform,
}: {
  userId: string;
  token: string;
  platform: PushPlatform;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  console.info(
    `[push] Saving native push token via Supabase. ${JSON.stringify({
      platform,
      tokenLength: token.length,
      routeUserIdMatchesSession: sessionData.session?.user.id === userId,
      hasAccessToken: Boolean(sessionData.session?.access_token),
    })}`,
  );

  const { data: savedRows, error: upsertError } = await supabase
    .from("push_tokens")
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        last_seen_at: new Date().toISOString(),
      } as never,
      { onConflict: "token" },
    )
    .select("user_id,platform,last_seen_at");

  if (upsertError) throw withSupabaseErrorContext("upsert push token", upsertError);

  const { data: persistedRows, error: selectError } = await supabase
    .from("push_tokens")
    .select("user_id,platform,last_seen_at")
    .eq("user_id", userId)
    .eq("platform", platform)
    .eq("token", token)
    .limit(1);

  if (selectError) throw withSupabaseErrorContext("select saved push token", selectError);

  if (!persistedRows?.length) throw new Error("Push token was not persisted after upsert.");

  const { count: deletedTokenCount, error: deleteError } = await supabase
    .from("push_tokens")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("platform", platform)
    .neq("token", token);

  if (deleteError) throw withSupabaseErrorContext("delete stale push tokens", deleteError);

  console.info(
    `[push] Native push token persistence verified. ${JSON.stringify({
      upsertedRows: savedRows?.length ?? 0,
      persistedRows: persistedRows.length,
      deletedStaleTokens: deletedTokenCount ?? 0,
    })}`,
  );
}

function withSupabaseErrorContext(operation: string, error: unknown) {
  const details = error as {
    message?: unknown;
    code?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const message = typeof details.message === "string" ? details.message : "Unknown Supabase error";
  const contextualError = new Error(`${operation}: ${message}`);
  contextualError.cause = {
    code: details.code,
    details: details.details,
    hint: details.hint,
  };
  return contextualError;
}
