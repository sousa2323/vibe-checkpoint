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
    // Preload em rotas com link permanece válido por 30s, evitando refetch
    // imediato ao navegar logo após o preload.
    defaultPreloadStaleTime: 30_000,
    // Mostra o skeleton da rota rapidamente em vez de congelar a tela anterior.
    defaultPendingMs: 150,
    defaultPendingMinMs: 300,
  });

  return router;
};
