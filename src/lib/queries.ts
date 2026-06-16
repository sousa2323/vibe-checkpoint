import { queryOptions } from "@tanstack/react-query";
import { getEventDetails, getEvents, getFeedPosts, getVenues, getVenueDetails } from "./data";

// queryOptions reaproveitáveis para alimentar tanto os loaders das rotas
// (via queryClient.ensureQueryData) quanto componentes. ensureQueryData devolve
// os dados do cache instantaneamente quando já existem, tornando a navegação de
// volta para uma tela já visitada imediata — sem refazer a query pesada.

export const eventsQuery = () =>
  queryOptions({
    queryKey: ["events"],
    queryFn: () => getEvents(),
  });

export const feedPostsQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["feed-posts", userId ?? null],
    queryFn: () => getFeedPosts({ data: userId ? { userId } : {} }),
  });

export const venuesQuery = () =>
  queryOptions({
    queryKey: ["venues"],
    queryFn: () => getVenues(),
  });

export const eventDetailsQuery = (eventId: string, userId?: string) =>
  queryOptions({
    queryKey: ["event-details", eventId, userId ?? null],
    queryFn: () => getEventDetails({ data: { eventId, userId } }),
  });

export const venueDetailsQuery = (venueId: string, userId?: string) =>
  queryOptions({
    queryKey: ["venue-details", venueId, userId ?? null],
    queryFn: () => getVenueDetails({ data: { venueId, userId } }),
  });
