import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LocateFixed, Search, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { authClient, getAuthUserName } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { CommentsSheet } from "@/components/comments-sheet";
import { EventCard } from "@/components/event-card";
import { FeedPostCard } from "@/components/feed-post-card";
import { NativeFeedback } from "@/components/native-feedback";
import { NotificationBellButton } from "@/components/notification-bell-button";
import { PostComposer } from "@/components/post-composer";
import {
  type EventSummary,
  type FeedPostSummary,
  getCheckedInEventIds,
  getEventDetails,
  getEvents,
  getFeedPosts,
  getSavedEventIds,
  reverseLocationLabel,
  searchLocation,
  toggleCheckin,
  togglePostLike,
  toggleSavedEvent,
} from "@/lib/data";
import { canEventAcceptExplorerActions } from "@/lib/event-time";
import {
  canRestoreLocation,
  type Coordinates,
  distanceKm,
  formatDistance,
  readLocationConsent,
  readSavedLocation,
  readSavedRadiusKm,
  requestCurrentLocation,
  saveCurrentLocation,
  saveLocationConsent,
} from "@/lib/location";

export const Route = createFileRoute("/discover")({
  loader: async () => ({
    events: await getEvents(),
    posts: await getFeedPosts({ data: {} }),
  }),
  component: Discover,
});

const establishmentCategories = [
  "bar",
  "restaurante",
  "casa de shows",
  "balada",
  "espaço de eventos",
  "espaco de eventos",
  "café",
  "cafe",
  "pub",
  "outro",
];

const LOCATION_PROMPT_DISMISSED_KEY = "chegaai:location-prompt-dismissed";

function readLocationPromptDismissed() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(LOCATION_PROMPT_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function dismissLocationPrompt() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCATION_PROMPT_DISMISSED_KEY, "true");
  } catch {
    // Prompt dismissal is convenience-only; permission/cache remain the source of truth.
  }
}

function Discover() {
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user;
  const loadCheckedInIds = useServerFn(getCheckedInEventIds);
  const loadEvent = useServerFn(getEventDetails);
  const loadSavedIds = useServerFn(getSavedEventIds);
  const loadPosts = useServerFn(getFeedPosts);
  const reverseLocation = useServerFn(reverseLocationLabel);
  const findLocation = useServerFn(searchLocation);
  const toggleSaved = useServerFn(toggleSavedEvent);
  const checkin = useServerFn(toggleCheckin);
  const likePost = useServerFn(togglePostLike);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState("Brasil");
  const [locating, setLocating] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState(loaderData.events);
  const [posts, setPosts] = useState(loaderData.posts);
  const [radiusKm, setRadiusKm] = useState(() => readSavedRadiusKm());
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) {
      setSavedIds(new Set());
      setCheckedInIds(new Set());
      return;
    }

    Promise.all([
      loadSavedIds({ data: { userId: user.id } }),
      loadCheckedInIds({ data: { userId: user.id } }),
    ])
      .then(([saved, checkedIn]) => {
        setSavedIds(new Set(saved));
        setCheckedInIds(new Set(checkedIn));
      })
      .catch(() => {
        setSavedIds(new Set());
        setCheckedInIds(new Set());
      });
  }, [loadCheckedInIds, loadSavedIds, user?.id]);

  useEffect(() => {
    loadPosts({ data: { userId: user?.id } })
      .then(setPosts)
      .catch(() => undefined);
  }, [loadPosts, user?.id]);

  useEffect(() => {
    function syncRadiusPreference() {
      setRadiusKm(readSavedRadiusKm());
    }

    window.addEventListener("focus", syncRadiusPreference);
    window.addEventListener("storage", syncRadiusPreference);

    return () => {
      window.removeEventListener("focus", syncRadiusPreference);
      window.removeEventListener("storage", syncRadiusPreference);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreLocation() {
      const savedLocation = readSavedLocation();
      if (savedLocation) {
        setLocation({ latitude: savedLocation.latitude, longitude: savedLocation.longitude });
        if (savedLocation.label) setLocationLabel(savedLocation.label);
      }

      const allowed = await canRestoreLocation();
      if (!allowed || cancelled) {
        if (!savedLocation && !readLocationConsent() && !readLocationPromptDismissed()) {
          setShowLocationPrompt(true);
        }
        return;
      }

      setLocating(true);
      try {
        const current = await requestCurrentLocation();
        if (cancelled) return;

        const label = await reverseLocation({ data: current });
        if (cancelled) return;

        setLocation(current);
        setLocationLabel(label ?? savedLocation?.label ?? "Perto de você");
        saveLocationConsent();
        saveCurrentLocation(current, label ?? savedLocation?.label);
        dismissLocationPrompt();
        setShowLocationPrompt(false);
      } catch {
        if (!cancelled && savedLocation?.label) setLocationLabel(savedLocation.label);
        if (!cancelled && !savedLocation && !readLocationPromptDismissed()) {
          setShowLocationPrompt(true);
        }
      } finally {
        if (!cancelled) setLocating(false);
      }
    }

    void restoreLocation();

    return () => {
      cancelled = true;
    };
  }, [reverseLocation]);

  const filteredEvents = useMemo(() => {
    const term = normalizeSearch(search);
    const categoryTerm = matchedCategory(term);
    return events
      .map((event) => enrichEventDistance(event, location))
      .filter((event) => isWithinRadius(event.distanceKm, location, radiusKm))
      .filter((event) => {
        if (!term) return true;
        if (categoryTerm) {
          return [event.category, event.venueCategory].some((value) =>
            normalizeSearch(value ?? "").includes(categoryTerm),
          );
        }

        return [
          event.title,
          event.venue,
          event.category,
          event.venueCategory,
          event.venueNeighborhood,
          event.venueAddress,
        ].some((value) => normalizeSearch(value ?? "").includes(term));
      })
      .sort((a, b) => feedTime(b) - feedTime(a));
  }, [events, location, radiusKm, search]);

  const filteredPosts = useMemo(() => {
    const term = normalizeSearch(search);
    return posts
      .map((post) => enrichPostDistance(post, location))
      .filter((post) => isWithinRadius(post.distanceKm, location, radiusKm))
      .filter((post) => {
        if (!term || matchedCategory(term)) return true;
        return [
          post.caption,
          post.authorName,
          post.venueName,
          post.venueNeighborhood,
          post.venueAddress,
          post.eventTitle,
        ].some((value) => normalizeSearch(value ?? "").includes(term));
      })
      .sort((a, b) => feedTime(b) - feedTime(a));
  }, [location, posts, radiusKm, search]);

  const feedItems = useMemo(() => {
    const eventItems = filteredEvents.map((event) => ({
      type: "event" as const,
      id: event.id,
      distanceKm: event.distanceKm,
      time: feedTime(event),
      item: event,
    }));
    const postItems = filteredPosts.map((post) => ({
      type: "post" as const,
      id: post.id,
      distanceKm: post.distanceKm,
      time: feedTime(post),
      item: post,
    }));

    return [...eventItems, ...postItems].sort((a, b) => b.time - a.time);
  }, [filteredEvents, filteredPosts]);

  async function handleLocationPromptAllow() {
    setLocating(true);
    try {
      const current = await requestCurrentLocation();
      setLocation(current);
      const label = await reverseLocation({ data: current });
      setLocationLabel(label ?? "Perto de você");
      saveLocationConsent();
      saveCurrentLocation(current, label ?? "Perto de você");
      dismissLocationPrompt();
      setShowLocationPrompt(false);
      setStatus("Localização ativada. Eventos próximos primeiro.");
    } catch (cause) {
      dismissLocationPrompt();
      setShowLocationPrompt(false);
      setStatus(cause instanceof Error ? cause.message : "Não foi possível localizar você.");
    } finally {
      setLocating(false);
    }
  }

  function handleLocationPromptDismiss() {
    dismissLocationPrompt();
    setShowLocationPrompt(false);
  }

  function handleLocationPromptManualSearch() {
    dismissLocationPrompt();
    setShowLocationPrompt(false);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  async function handleSmartSearch() {
    const query = search.trim();
    if (!query || matchedCategory(normalizeSearch(query))) return;

    setLocating(true);
    try {
      const result = await findLocation({ data: { query } });
      if (!result) return;

      setLocation({ latitude: result.latitude, longitude: result.longitude });
      setLocationLabel(result.label);
      saveCurrentLocation({ latitude: result.latitude, longitude: result.longitude }, result.label);
      dismissLocationPrompt();
      setShowLocationPrompt(false);
      setStatus("Busca aplicada por endereço. Eventos próximos primeiro.");
    } catch {
      setStatus("Não foi possível buscar esse endereço agora.");
    } finally {
      setLocating(false);
    }
  }

  async function requireUser() {
    if (user?.id) return user.id;
    navigate({ to: "/auth" });
    return null;
  }

  async function onToggleSave(eventId: string) {
    const event = events.find((item) => item.id === eventId);
    if (event && !canEventAcceptExplorerActions(event.startsAt)) {
      setStatus("Esse evento já encerrou. Agora só a avaliação fica disponível.");
      return;
    }

    const userId = await requireUser();
    if (!userId) return;

    const result = await toggleSaved({ data: { userId, eventId } });
    setSavedIds((current) => {
      const next = new Set(current);
      if (result.saved) next.add(eventId);
      else next.delete(eventId);
      return next;
    });
    setStatus(result.saved ? "Evento salvo na agenda." : "Evento removido da agenda.");
  }

  async function onCheckin(eventId: string, venueId: string) {
    const event = events.find((item) => item.id === eventId);
    if (event && !canEventAcceptExplorerActions(event.startsAt)) {
      setStatus("Check-in encerrado para esse evento.");
      return;
    }

    const userId = await requireUser();
    if (!userId) return;

    const result = await checkin({ data: { userId, eventId, venueId } });
    setCheckedInIds((current) => {
      const next = new Set(current);
      if (result.checkedIn) next.add(eventId);
      else next.delete(eventId);
      return next;
    });
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? { ...event, going: Math.max(0, event.going + (result.checkedIn ? 1 : -1)) }
          : event,
      ),
    );
    loadEvent({ data: { eventId, userId } })
      .then((event) => {
        if (!event) return;
        setEvents((current) => current.map((item) => (item.id === event.id ? event : item)));
      })
      .catch(() => undefined);
    setStatus(result.checkedIn ? "Check-in registrado." : "Check-in desfeito.");
  }

  async function onTogglePostLike(postId: string) {
    const userId = await requireUser();
    if (!userId) return;

    const result = await likePost({ data: { userId, postId } });
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: result.liked,
              likes: Math.max(0, post.likes + (result.liked ? 1 : -1)),
            }
          : post,
      ),
    );
  }

  function onCommentAdded(postId: string) {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, comments: post.comments + 1 } : post)),
    );
  }

  return (
    <main className="app-shell bg-background pb-32">
      <NativeFeedback message={status} onClose={() => setStatus(null)} />

      <header className="flex items-start justify-between gap-4 px-6 pt-8">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Encontre eventos em</p>
          <h1 className="line-clamp-2 text-lg font-bold tracking-tight">{locationLabel}</h1>
        </div>
        <NotificationBellButton />
      </header>

      <div className="mt-5 px-6">
        <div className="flex h-12 items-center gap-2 rounded-full bg-muted px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSmartSearch();
            }}
            placeholder="Buscar endereço, categoria ou local"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs font-semibold text-muted-foreground"
            >
              Limpar
            </button>
          ) : null}
        </div>
      </div>

      {showLocationPrompt ? (
        <section className="mx-6 mt-4 rounded-[1.75rem] bg-primary p-4 text-white shadow-[0_18px_44px_rgba(241,58,90,0.2)]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/18">
              <LocateFixed className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black tracking-tight">
                Ative sua localização para ver rolês próximos
              </h2>
              <p className="mt-1 text-sm leading-6 text-white/76">
                O ChegaAí usa sua posição só para ordenar eventos, bares e check-ins perto de você.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => void handleLocationPromptAllow()}
              disabled={locating}
              className="h-10 rounded-full bg-white px-4 text-xs font-black text-ink disabled:opacity-70"
            >
              {locating ? "Localizando..." : "Ativar localização"}
            </button>
            <button
              type="button"
              onClick={handleLocationPromptManualSearch}
              className="h-10 rounded-full bg-white/14 px-4 text-xs font-black text-white ring-1 ring-white/18"
            >
              Buscar bairro
            </button>
            <button
              type="button"
              onClick={handleLocationPromptDismiss}
              className="h-10 rounded-full px-4 text-xs font-black text-white/70"
            >
              Agora não
            </button>
          </div>
        </section>
      ) : null}

      <section className="mx-6 mt-5 rounded-[1.75rem] bg-ink p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <UsersRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">Decidir rolê em grupo</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              Monte uma votação com eventos e compartilhe o link.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/groups/new" })}
            className="rounded-full bg-white px-4 py-2 text-xs font-black text-ink"
          >
            Criar
          </button>
        </div>
      </section>

      {feedItems.length > 0 ? (
        <Section title={`Feed perto de você · ${radiusKm} km`}>
          <div className="space-y-5 px-6">
            {feedItems.map((feedItem) =>
              feedItem.type === "event" ? (
                <EventCard
                  key={`event-${feedItem.id}`}
                  {...feedItem.item}
                  venue={eventVenueLabel(feedItem.item)}
                  saved={savedIds.has(feedItem.item.id)}
                  checkedIn={checkedInIds.has(feedItem.item.id)}
                  actionsDisabled={!canEventAcceptExplorerActions(feedItem.item.startsAt)}
                  onOpenDetails={() =>
                    navigate({ to: "/events/$eventId", params: { eventId: feedItem.item.id } })
                  }
                  onToggleSave={() => onToggleSave(feedItem.item.id)}
                  onCheckin={() => onCheckin(feedItem.item.id, feedItem.item.venueId)}
                />
              ) : (
                <FeedPostCard
                  key={`post-${feedItem.id}`}
                  post={feedItem.item}
                  onLike={() => void onTogglePostLike(feedItem.item.id)}
                  onOpenComments={() => setCommentsPostId(feedItem.item.id)}
                />
              ),
            )}
          </div>
        </Section>
      ) : (
        <EmptyState
          title="Nada no feed ainda"
          text="Eventos publicados e postagens de quem fez check-in vão aparecer aqui."
        />
      )}

      <PostComposer
        open={composerOpen}
        userId={user?.id}
        userName={getAuthUserName(user)}
        userAvatarUrl={getUserImage(user)}
        onOpenChange={setComposerOpen}
        onCreated={(post) => setPosts((current) => [post, ...current])}
        onRequireAuth={() => navigate({ to: "/auth" })}
        onStatus={setStatus}
      />

      <CommentsSheet
        open={Boolean(commentsPostId)}
        postId={commentsPostId}
        userId={user?.id}
        onOpenChange={(open) => {
          if (!open) setCommentsPostId(undefined);
        }}
        onRequireAuth={() => navigate({ to: "/auth" })}
        onAdded={onCommentAdded}
        onStatus={setStatus}
      />

      <BottomNav onFabClick={() => setComposerOpen(true)} />
    </main>
  );
}

type EventWithDistance = EventSummary & { distanceKm?: number };
type FeedPostWithDistance = FeedPostSummary & { distanceKm?: number };

function enrichEventDistance(event: EventSummary, location: Coordinates | null): EventWithDistance {
  if (!location || event.venueLatitude == null || event.venueLongitude == null) return event;

  return {
    ...event,
    distanceKm: distanceKm(location, {
      latitude: event.venueLatitude,
      longitude: event.venueLongitude,
    }),
  };
}

function enrichPostDistance(
  post: FeedPostSummary,
  location: Coordinates | null,
): FeedPostWithDistance {
  if (!location || post.venueLatitude == null || post.venueLongitude == null) return post;

  return {
    ...post,
    distanceKm: distanceKm(location, {
      latitude: post.venueLatitude,
      longitude: post.venueLongitude,
    }),
  };
}

function eventVenueLabel(event: EventWithDistance) {
  const distance = formatDistance(event.distanceKm);
  return distance ? `${distance} · ${event.venue}` : event.venue;
}

function feedTime(item: { createdAt?: string; startsAt?: string }) {
  const value = item.createdAt ?? item.startsAt;
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isWithinRadius(
  distanceKm: number | undefined,
  location: Coordinates | null,
  radiusKm: number,
) {
  if (!location || distanceKm == null) return true;
  return distanceKm <= radiusKm;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchedCategory(term: string) {
  if (!term) return undefined;
  return establishmentCategories.find((category) => normalizeSearch(category).includes(term));
}

function getUserImage(user: unknown) {
  if (!user || typeof user !== "object") return undefined;
  const image = (user as { image?: unknown }).image;
  return typeof image === "string" ? image : undefined;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <div className="mb-3 px-6">
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-6 mt-8 rounded-3xl border border-border p-6 text-center">
      <p className="font-bold">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
