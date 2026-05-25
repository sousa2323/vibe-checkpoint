import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { toast as sonnerToast } from "sonner";

import { authClient } from "../auth";
import { formatAuthToastMessage, ptBRAuthLocalization } from "../lib/auth-localization";
import { THEME_STORAGE_KEY } from "../lib/theme";
import appCss from "../styles.css?url";

type NativeToast = {
  message?: unknown;
  variant?: "default" | "success" | "error" | "warning" | "info";
};

function showNativeToast({ message, variant = "default" }: NativeToast) {
  const formattedMessage = formatAuthToastMessage(message);

  if (variant === "default") {
    sonnerToast(formattedMessage);
    return;
  }

  sonnerToast[variant](formattedMessage);
}

function AuthLink({
  href,
  ...props
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return <Link to={href} {...props} />;
}

function toRouterPath(to: string) {
  const url = new URL(to, window.location.origin);
  return `${url.pathname}${url.search}${url.hash}`;
}

const browserProcessEnvScript = `globalThis.process=globalThis.process||{};globalThis.process.env=Object.assign({NODE_ENV:${JSON.stringify(
  import.meta.env.PROD ? "production" : "development",
)},TSS_ROUTER_BASEPATH:""},globalThis.process.env||{});`;

const initialThemeScript = `(function(){try{var key=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var stored=localStorage.getItem(key);var theme=stored==='light'||stored==='dark'?stored:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',theme==='dark');var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme==='dark'?'#0D0D0D':'#F13A5A');}catch(error){}})();`;

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

  return (
    <QueryClientProvider client={queryClient}>
      <NeonAuthUIProvider
        authClient={authClient}
        localization={ptBRAuthLocalization}
        navigate={(to) => router.navigate({ to: toRouterPath(to) })}
        replace={(to) => router.navigate({ to: toRouterPath(to), replace: true })}
        Link={AuthLink}
        onSessionChange={() => router.invalidate()}
        toast={showNativeToast}
      >
        <Outlet />
      </NeonAuthUIProvider>
    </QueryClientProvider>
  );
}
