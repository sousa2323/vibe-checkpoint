import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Mantém os dados em cache "frescos" por 1 min e na memória por 5 min,
        // para que voltar a uma tela já visitada renderize na hora, sem refazer
        // as queries pesadas que vão pela rede até o backend.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Dispara o loader da rota ao mostrar intenção (toque/hover) num <Link>,
    // para que a tela abra com os dados já em cache em vez de esperar a rede.
    defaultPreload: "intent",
    // Preload em rotas com link permanece válido por 30s, evitando refetch
    // imediato ao navegar logo após o preload.
    defaultPreloadStaleTime: 30_000,
    // Mostra o skeleton da rota rapidamente em vez de congelar a tela anterior.
    defaultPendingMs: 150,
    defaultPendingMinMs: 300,
  });

  // Medição de performance de navegação — APENAS em desenvolvimento.
  // O Vite troca `import.meta.env.DEV` por `false` no build de produção e
  // remove este bloco (dead-code elimination), então nunca chega ao usuário.
  if (import.meta.env.DEV) {
    const starts = new Map<string, number>();
    router.subscribe("onBeforeNavigate", (event) => {
      if (!event.pathChanged && !event.hrefChanged) return;
      starts.set(event.toLocation.href, performance.now());
    });
    router.subscribe("onResolved", (event) => {
      const start = starts.get(event.toLocation.href);
      if (start === undefined) return;
      starts.delete(event.toLocation.href);
      console.log(`[nav] ${event.toLocation.href} — ${Math.round(performance.now() - start)}ms`);
    });
  }

  return router;
};
