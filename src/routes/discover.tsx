import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, LocateFixed, Search, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { authClient, getAuthUserName } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { CommentsSheet } from "@/components/comments-sheet";
import { EventCard } from "@/components/event-card";
import { FeedPostCard } from "@/components/feed-post-card";
import { NativeFeedback } from "@/components/native-feedback";
import { NotificationBellButton } from "@/components/notification-bell-button";
import { PostComposer } from "@/components/post-composer";
import { UserMentionMultiPicker } from "@/components/user-mention-picker";
import {
  type EventSummary,
  type FeedPostSummary,
  type UserMentionSummary,
  deleteUserPost,
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
  updateUserPost,
} from "@/lib/data";
import { canEventAcceptExplorerActions } from "@/lib/event-time";
import { uploadMedia } from "@/lib/media";
import { eventsQuery, feedPostsQuery } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  loader: async ({ context }) => {
    const [events, posts] = await Promise.all([
      context.queryClient.ensureQueryData(eventsQuery()),
      context.queryClient.ensureQueryData(feedPostsQuery()),
    ]);
    return { events, posts };
  },
  pendingComponent: DiscoverPending,
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
const REGION_ALERTS_KEY = "chegaai:region-alerts";
const maxPostPhotos = 3;
const optimizedImageMimeType = "image/jpeg";
const maxOptimizedImageBytes = 1.85 * 1024 * 1024;
const maxOptimizedImageDimension = 1600;

type EditPhotoPreview = {
  id: string;
  file: File;
  previewUrl: string;
};

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

function saveRegionAlert(label: string, radiusKm: number) {
  if (typeof window === "undefined") return;

  try {
    const stored = window.localStorage.getItem(REGION_ALERTS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    const alerts = Array.isArray(parsed) ? parsed : [];
    const key = `${label}:${radiusKm}`;
    const next = [
      { key, label, radiusKm, createdAt: new Date().toISOString() },
      ...alerts.filter((alert) => {
        if (!alert || typeof alert !== "object") return false;
        return (alert as { key?: unknown }).key !== key;
      }),
    ].slice(0, 8);

    window.localStorage.setItem(REGION_ALERTS_KEY, JSON.stringify(next));
  } catch {
    // Region alerts are a local convenience; the feed still works without them.
  }
}

function DiscoverPending() {
  return (
    <main className="app-shell flex flex-col bg-background">
      <div className="space-y-4 px-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-full" />
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}

function Discover() {
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user;
  const loadCheckedInIds = useServerFn(getCheckedInEventIds);
  const loadEvent = useServerFn(getEventDetails);
  const loadEvents = useServerFn(getEvents);
  const loadSavedIds = useServerFn(getSavedEventIds);
  const loadPosts = useServerFn(getFeedPosts);
  const reverseLocation = useServerFn(reverseLocationLabel);
  const findLocation = useServerFn(searchLocation);
  const toggleSaved = useServerFn(toggleSavedEvent);
  const checkin = useServerFn(toggleCheckin);
  const likePost = useServerFn(togglePostLike);
  const updatePost = useServerFn(updateUserPost);
  const deletePost = useServerFn(deleteUserPost);
  const upload = useServerFn(uploadMedia);
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
  const [actionsPost, setActionsPost] = useState<FeedPostSummary | null>(null);
  const [editingPost, setEditingPost] = useState<FeedPostSummary | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editExistingPhotoUrls, setEditExistingPhotoUrls] = useState<string[]>([]);
  const [editNewPhotos, setEditNewPhotos] = useState<EditPhotoPreview[]>([]);
  const [editTaggedUsers, setEditTaggedUsers] = useState<UserMentionSummary[]>([]);
  const [postActionLoading, setPostActionLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

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

  // Igual aos posts: re-busca eventos a cada montagem para que eventos recém
  // publicados por estabelecimentos apareçam no feed sem recarregar o app.
  useEffect(() => {
    loadEvents()
      .then(setEvents)
      .catch(() => undefined);
  }, [loadEvents]);

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
      .filter(
        (post) => post.userId === user?.id || isWithinRadius(post.distanceKm, location, radiusKm),
      )
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
  }, [location, posts, radiusKm, search, user?.id]);

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
    setStatus(
      result.checkedIn && result.redemption
        ? `Check-in registrado. Seu código de resgate: ${result.redemption.code}.`
        : result.checkedIn
          ? "Check-in registrado."
          : "Check-in desfeito.",
    );
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

  function openPostActions(post: FeedPostSummary) {
    if (post.userId !== user?.id) return;
    setActionsPost(post);
  }

  function openEditPost(post: FeedPostSummary) {
    setActionsPost(null);
    setEditingPost(post);
    setEditCaption(post.caption);
    cleanupEditNewPhotos();
    setEditExistingPhotoUrls(Array.from(new Set(post.photoUrls)).slice(0, maxPostPhotos));
    setEditNewPhotos([]);
    setEditTaggedUsers(getPostTaggedUsers(post));
  }

  function cleanupEditNewPhotos() {
    setEditNewPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
  }

  function closeEditPost() {
    setEditingPost(null);
    setEditTaggedUsers([]);
    setEditExistingPhotoUrls([]);
    cleanupEditNewPhotos();
  }

  function addEditPhotoFiles(files: FileList | File[] | null) {
    if (!files) return;
    const currentCount = editExistingPhotoUrls.length + editNewPhotos.length;
    const remaining = maxPostPhotos - currentCount;
    if (remaining <= 0) return;

    const nextFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remaining);
    if (nextFiles.length === 0) return;

    setEditNewPhotos((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeEditExistingPhoto(url: string) {
    setEditExistingPhotoUrls((current) => current.filter((photoUrl) => photoUrl !== url));
  }

  function removeEditNewPhoto(photoId: string) {
    setEditNewPhotos((current) => {
      const removed = current.find((photo) => photo.id === photoId);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((photo) => photo.id !== photoId);
    });
  }

  async function onDeletePost(post: FeedPostSummary) {
    const userId = await requireUser();
    if (!userId || post.userId !== userId) return;

    setPostActionLoading(true);
    try {
      await deletePost({ data: { userId, postId: post.id } });
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setActionsPost(null);
      setStatus("Post excluído.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Não foi possível excluir o post.");
    } finally {
      setPostActionLoading(false);
    }
  }

  async function onSubmitEditPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPost) return;

    const userId = await requireUser();
    if (!userId || editingPost.userId !== userId) return;

    setPostActionLoading(true);
    try {
      const uploadedPhotoUrls: string[] = [];
      for (const photo of editNewPhotos) {
        const optimizedPhoto = await withClientTimeout(
          optimizeImageForUpload(photo.file),
          15000,
          "Tempo esgotado ao preparar a imagem. Tente outra foto.",
        );
        const base64 = await fileToBase64(optimizedPhoto);
        const result = await withClientTimeout(
          upload({ data: { userId, mimeType: optimizedPhoto.type, base64 } }),
          30000,
          "Tempo esgotado ao enviar a imagem. Tente novamente.",
        );
        uploadedPhotoUrls.push(result.mediaUrl);
      }

      const photoUrls = [...editExistingPhotoUrls, ...uploadedPhotoUrls].slice(0, maxPostPhotos);
      const updatedPost = await updatePost({
        data: {
          userId,
          postId: editingPost.id,
          caption: editCaption,
          photoUrls,
          taggedPerson: editTaggedUsers[0] ? mentionLabel(editTaggedUsers[0]) : undefined,
          taggedUserId: editTaggedUsers[0]?.userId,
          taggedUsers: editTaggedUsers,
        },
      });
      setPosts((current) =>
        current.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
      );
      closeEditPost();
      setStatus("Post atualizado.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Não foi possível editar o post.");
    } finally {
      setPostActionLoading(false);
    }
  }

  function openNearbyMap() {
    navigate({ to: "/map" });
  }

  function activateRegionAlert() {
    saveRegionAlert(locationLabel, radiusKm);
    setStatus(`Aviso salvo para ${locationLabel}.`);
  }

  return (
    <main className="app-shell bg-background pb-32">
      <NativeFeedback message={status} onClose={() => setStatus(null)} />

      <header className="flex items-center justify-between gap-4 px-6 pt-8">
        <BrandLogo className="h-10 w-auto max-w-[2rem]" />
        <NotificationBellButton />
      </header>

      <div className="mt-5 px-6">
        <p className="text-xs font-semibold text-muted-foreground">Eventos em</p>
        <h1 className="mt-0.5 line-clamp-2 text-lg font-black tracking-tight">{locationLabel}</h1>
      </div>

      <div className="mt-4 px-6">
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
                  onOpenActions={
                    feedItem.item.userId === user?.id
                      ? () => openPostActions(feedItem.item)
                      : undefined
                  }
                />
              ),
            )}
          </div>
        </Section>
      ) : (
        <EmptyState
          title="Nada no feed ainda"
          text="Eventos publicados e posts de check-in vão aparecer aqui. Enquanto isso, veja locais próximos no mapa."
          locationLabel={locationLabel}
          radiusKm={radiusKm}
          onOpenMap={openNearbyMap}
          onActivateAlert={activateRegionAlert}
        />
      )}

      <PostComposer
        open={composerOpen}
        userId={user?.id}
        userName={getAuthUserName(user)}
        userAvatarUrl={getUserImage(user)}
        onOpenChange={setComposerOpen}
        onCreated={(post) =>
          setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)])
        }
        onRequireAuth={() => navigate({ to: "/auth" })}
        onStatus={setStatus}
      />

      <Dialog open={Boolean(actionsPost)} onOpenChange={(open) => !open && setActionsPost(null)}>
        <DialogContent className="max-w-[min(35rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-3xl border-0 bg-background p-0 shadow-2xl [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Opções do post</DialogTitle>
            <DialogDescription>Editar ou excluir sua publicação.</DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-border text-center text-sm">
            <button
              type="button"
              disabled={!actionsPost || postActionLoading}
              onClick={() => actionsPost && void onDeletePost(actionsPost)}
              className="block h-12 w-full font-bold text-primary transition hover:bg-muted disabled:opacity-60"
            >
              {postActionLoading ? "Excluindo..." : "Excluir"}
            </button>
            <button
              type="button"
              disabled={!actionsPost || postActionLoading}
              onClick={() => actionsPost && openEditPost(actionsPost)}
              className="block h-12 w-full transition hover:bg-muted disabled:opacity-60"
            >
              Editar
            </button>
            <DialogClose className="block h-12 w-full transition hover:bg-muted">
              Cancelar
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingPost)}
        onOpenChange={(open) => {
          if (!open && !postActionLoading) {
            closeEditPost();
          }
        }}
      >
        <DialogContent className="max-w-[min(33rem,calc(100vw-2rem))] rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle>Editar post</DialogTitle>
            <DialogDescription>Atualize a legenda e quem estava com você.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmitEditPost} className="space-y-3">
            <label className="block">
              <span className="text-sm font-semibold">Legenda</span>
              <textarea
                value={editCaption}
                onChange={(event) => setEditCaption(event.target.value)}
                rows={4}
                className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                placeholder="Escreva algo sobre esse rolê"
              />
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Fotos</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {editExistingPhotoUrls.length + editNewPhotos.length}/{maxPostPhotos}
                </span>
              </div>

              {editExistingPhotoUrls.length > 0 || editNewPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {editExistingPhotoUrls.map((url) => (
                    <EditablePostPhoto
                      key={url}
                      src={url}
                      alt="Foto atual do post"
                      onRemove={() => removeEditExistingPhoto(url)}
                    />
                  ))}
                  {editNewPhotos.map((photo) => (
                    <EditablePostPhoto
                      key={photo.id}
                      src={photo.previewUrl}
                      alt="Nova foto do post"
                      onRemove={() => removeEditNewPhoto(photo.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm font-semibold text-muted-foreground">
                  Nenhuma foto no post.
                </div>
              )}

              <input
                ref={editPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  addEditPhotoFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={
                  postActionLoading ||
                  editExistingPhotoUrls.length + editNewPhotos.length >= maxPostPhotos
                }
                onClick={() => editPhotoInputRef.current?.click()}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border text-sm font-bold transition hover:bg-muted disabled:opacity-60"
              >
                <ImagePlus className="h-4 w-4" />
                Adicionar foto
              </button>
            </div>
            <UserMentionMultiPicker
              currentUserId={user?.id}
              label="Com quem?"
              selectedUsers={editTaggedUsers}
              onSelectedUsersChange={setEditTaggedUsers}
              placeholder="@amigo"
              inputClassName="rounded-2xl border border-border bg-transparent focus-within:ring-2 focus-within:ring-primary"
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={postActionLoading}
                onClick={closeEditPost}
                className="h-11 rounded-full border border-border text-sm font-bold transition hover:bg-muted disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={postActionLoading}
                className="h-11 rounded-full bg-primary text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {postActionLoading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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

function EditablePostPhoto({
  src,
  alt,
  onRemove,
}: {
  src: string;
  alt: string;
  onRemove: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-muted">
      <img src={src} alt={alt} className="aspect-square w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover foto"
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur transition active:scale-95"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function getPostTaggedUsers(post: FeedPostSummary): UserMentionSummary[] {
  if (post.taggedUsers?.length) return post.taggedUsers;
  if (!post.taggedUserId) return [];

  return [
    {
      userId: post.taggedUserId,
      username: post.taggedPerson?.replace(/^@/, "") || undefined,
      displayName: post.taggedPerson,
    },
  ];
}

function mentionLabel(user: UserMentionSummary) {
  return user.username ? `@${user.username}` : (user.displayName ?? "");
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

async function optimizeImageForUpload(file: File) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");

  const baseScale = Math.min(
    1,
    maxOptimizedImageDimension / image.width,
    maxOptimizedImageDimension / image.height,
  );
  let width = Math.max(1, Math.round(image.width * baseScale));
  let height = Math.max(1, Math.round(image.height * baseScale));
  const qualities = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];
  let smallestBlob: Blob | null = null;

  for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, optimizedImageMimeType, quality);
      if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
      if (blob.size <= maxOptimizedImageBytes) {
        return new File([blob], `${fileNameWithoutExtension(file.name) || "foto"}.jpg`, {
          type: optimizedImageMimeType,
          lastModified: Date.now(),
        });
      }
    }

    width = Math.max(1, Math.round(width * 0.75));
    height = Math.max(1, Math.round(height * 0.75));
  }

  if (!smallestBlob || smallestBlob.size > maxOptimizedImageBytes) {
    throw new Error("Não foi possível otimizar essa imagem. Tente outra foto.");
  }

  return new File([smallestBlob], `${fileNameWithoutExtension(file.name) || "foto"}.jpg`, {
    type: optimizedImageMimeType,
    lastModified: Date.now(),
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível carregar a imagem."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível preparar a imagem."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function fileNameWithoutExtension(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

async function withClientTimeout<T>(
  promise: PromiseLike<T>,
  milliseconds: number,
  message: string,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
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

function BrandLogo({ className }: { className: string }) {
  return (
    <>
      <img
        src="/img/logo_chegaai2.png"
        alt="ChegaAí"
        className={`${className} object-contain dark:hidden`}
      />
      <img
        src="/img/logo_chegaai.png"
        alt=""
        aria-hidden="true"
        className={`${className} hidden object-contain dark:block`}
      />
    </>
  );
}

function EmptyState({
  title,
  text,
  locationLabel,
  radiusKm,
  onOpenMap,
  onActivateAlert,
}: {
  title: string;
  text: string;
  locationLabel: string;
  radiusKm: number;
  onOpenMap: () => void;
  onActivateAlert: () => void;
}) {
  return (
    <div className="mx-6 mt-8 rounded-3xl border border-border p-6 text-center">
      <p className="font-bold">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <button
        type="button"
        onClick={onOpenMap}
        className="mt-5 h-10 rounded-full bg-muted px-5 text-xs font-black text-foreground transition active:scale-[0.98]"
      >
        Ver no mapa
      </button>
      <div className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        {locationLabel} · {radiusKm} km
      </div>
      <button
        type="button"
        onClick={onActivateAlert}
        className="mt-2 text-xs font-black text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
      >
        Receber aviso quando tiver rolê aqui
      </button>
    </div>
  );
}
