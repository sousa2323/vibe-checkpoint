import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Bell, CheckCircle2, Heart, Instagram, MapPin, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/auth";
import { CheckinReward } from "@/components/checkin-reward";
import { EventCard } from "@/components/event-card";
import { FeedActionNav } from "@/components/feed-action-nav";
import { NativeFeedback } from "@/components/native-feedback";
import { PillButton } from "@/components/pill-button";
import {
  getVenueDetails,
  toggleCheckin,
  toggleFavoriteVenue,
  toggleVenueFollow,
  toggleSavedEvent,
  type VenueDetail,
} from "@/lib/data";
import {
  buildVenueShareText,
  getCheckinReward,
  getRewardActionLabel,
  getRewardDescription,
  getRewardMeta,
} from "@/lib/growth";

export const Route = createFileRoute("/venues/$venueId")({
  loader: ({ params }) => getVenueDetails({ data: { venueId: params.venueId } }),
  component: VenueDetailPage,
});

function VenueDetailPage() {
  const initialDetail = Route.useLoaderData();
  const { venueId } = Route.useParams();
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user;
  const loadVenue = useServerFn(getVenueDetails);
  const favoriteVenue = useServerFn(toggleFavoriteVenue);
  const followVenue = useServerFn(toggleVenueFollow);
  const saveEvent = useServerFn(toggleSavedEvent);
  const checkin = useServerFn(toggleCheckin);
  const [detail, setDetail] = useState<VenueDetail | null>(initialDetail);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    loadVenue({ data: { venueId, userId: user.id } })
      .then(setDetail)
      .catch(() => undefined);
  }, [loadVenue, user?.id, venueId]);

  async function requireUser() {
    if (user?.id) return user.id;
    navigate({ to: "/auth" });
    return null;
  }

  async function onToggleFavorite() {
    const userId = await requireUser();
    if (!userId || !detail) return;

    const result = await favoriteVenue({ data: { userId, venueId: detail.venue.id } });
    setDetail({
      ...detail,
      venue: {
        ...detail.venue,
        favorited: result.favorited,
        favoriteCount: Math.max(0, (detail.venue.favoriteCount ?? 0) + (result.favorited ? 1 : -1)),
      },
    });
    setStatus(result.favorited ? "Local favoritado." : "Local removido dos favoritos.");
  }

  async function onToggleFollow() {
    const userId = await requireUser();
    if (!userId || !detail) return;

    const result = await followVenue({ data: { userId, venueId: detail.venue.id } });
    setDetail({
      ...detail,
      venue: {
        ...detail.venue,
        followed: result.followed,
        followerCount: Math.max(0, (detail.venue.followerCount ?? 0) + (result.followed ? 1 : -1)),
      },
    });
    setStatus(
      result.followed ? "Você está seguindo este local." : "Você deixou de seguir este local.",
    );
  }

  async function onToggleSave(eventId: string) {
    const userId = await requireUser();
    if (!userId || !detail) return;

    const result = await saveEvent({ data: { userId, eventId } });
    setDetail({
      ...detail,
      events: detail.events.map((event) =>
        event.id === eventId ? { ...event, saved: result.saved } : event,
      ),
    });
    setStatus(result.saved ? "Evento salvo na agenda." : "Evento removido da agenda.");
  }

  async function onCheckin(eventId?: string) {
    const userId = await requireUser();
    if (!userId || !detail) return;

    const result = await checkin({ data: { userId, venueId: detail.venue.id, eventId } });
    setDetail({
      ...detail,
      checkedIn: eventId ? detail.checkedIn : result.checkedIn,
      checkins: Math.max(0, detail.checkins + (result.checkedIn ? 1 : -1)),
      events: eventId
        ? detail.events.map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  checkedIn: result.checkedIn,
                  going: Math.max(0, event.going + (result.checkedIn ? 1 : -1)),
                }
              : event,
          )
        : detail.events,
    });
    loadVenue({ data: { venueId: detail.venue.id, userId } })
      .then(setDetail)
      .catch(() => undefined);
    const reward = getCheckinReward(detail.venue);
    setStatus(
      result.checkedIn && reward
        ? `Check-in registrado. Benefício liberado: ${reward}.`
        : result.checkedIn
          ? "Check-in registrado."
          : "Check-in desfeito.",
    );
  }

  async function shareVenue() {
    if (!detail || typeof window === "undefined") return;
    const url = window.location.href;
    const text = `${detail.venue.name} no ChegaAí`;

    if (navigator.share) {
      await navigator.share({
        title: detail.venue.name,
        text: buildVenueShareText(detail.venue, url),
        url,
      });
      return;
    }

    await navigator.clipboard.writeText(buildVenueShareText(detail.venue, url));
    setStatus("Convite do estabelecimento copiado.");
  }

  if (!detail) {
    return (
      <main className="app-shell bg-background px-6 pb-32 pt-8">
        <p className="text-2xl font-black">Estabelecimento não encontrado</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Esse local pode ter sido removido ou ainda não está público.
        </p>
        <PillButton className="mt-6 w-full" onClick={() => navigate({ to: "/map" })}>
          Ver locais
        </PillButton>
        <FeedActionNav />
      </main>
    );
  }

  const { venue } = detail;
  const checkedIn = Boolean(detail.checkedIn);
  const reward = getCheckinReward(venue);
  const rewardDescription = getRewardDescription(venue);
  const rewardMeta = getRewardMeta(venue);
  const rewardActionLabel = getRewardActionLabel(venue);
  const rewardUnlocked =
    venue.reward?.action === "follow"
      ? Boolean(venue.followed)
      : venue.reward?.action === "save"
        ? Boolean(venue.favorited)
        : venue.reward?.action === "checkin"
          ? checkedIn
          : false;

  return (
    <main className="app-shell bg-background pb-32">
      <NativeFeedback message={status} onClose={() => setStatus(null)} />

      <div className="relative">
        <img src={venue.image} alt={venue.name} className="h-80 w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />
      </div>

      <section className="-mt-8 relative z-10 px-6">
        <div className="flex items-start gap-3">
          <h1 className="min-w-0 flex-1 text-3xl font-black leading-tight tracking-tight">
            {venue.name}
          </h1>
          {venue.instagram ? (
            <a
              href={instagramUrl(venue.instagram)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Abrir Instagram de ${venue.name}`}
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary hover:text-white"
            >
              <Instagram className="h-4 w-4" />
            </a>
          ) : null}
        </div>
        <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {venue.address ?? venue.neighborhood}
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2 rounded-3xl bg-muted p-4 text-center">
          <Stat label="Eventos" value={String(detail.events.length)} />
          <Stat label="Check-ins" value={String(detail.checkins)} />
          <Stat label="Favoritos" value={String(venue.favoriteCount ?? 0)} />
          <Stat label="Seguidores" value={String(venue.followerCount ?? 0)} />
        </div>

        <CheckinReward
          reward={reward}
          description={rewardDescription}
          actionLabel={rewardActionLabel}
          meta={rewardMeta}
          unlocked={rewardUnlocked}
        />

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void onToggleFollow()}
            className={
              venue.followed
                ? "flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-white"
                : "flex h-12 items-center justify-center gap-2 rounded-full bg-muted text-sm font-bold"
            }
          >
            <Bell className="h-4 w-4" fill={venue.followed ? "currentColor" : "none"} />
            {venue.followed ? "Seguindo" : "Seguir"}
          </button>
          <button
            type="button"
            onClick={() => void onToggleFavorite()}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-muted text-sm font-bold"
          >
            <Heart className="h-4 w-4" fill={venue.favorited ? "currentColor" : "none"} />
            {venue.favorited ? "Favorito" : "Favoritar"}
          </button>
          <button
            type="button"
            onClick={() => void shareVenue()}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-muted text-sm font-bold"
          >
            <Share2 className="h-4 w-4" />
            Enviar
          </button>
          <button
            type="button"
            onClick={() => void onCheckin()}
            className={
              checkedIn
                ? "flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-500 text-sm font-bold text-white shadow-[0_10px_24px_-14px_rgba(16,185,129,0.95)] ring-2 ring-emerald-500/20"
                : "flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-white"
            }
          >
            {checkedIn ? <BadgeCheck className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {checkedIn ? "Confirmado" : "Check-in"}
          </button>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 px-6">
          <h2 className="text-base font-bold tracking-tight">Próximos eventos</h2>
        </div>
        <div className="space-y-4 px-6">
          {detail.events.length === 0 ? (
            <div className="rounded-3xl border border-border p-6 text-center">
              <p className="font-bold">Nenhum evento publicado</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Quando esse local publicar eventos, eles aparecem aqui.
              </p>
            </div>
          ) : (
            detail.events.map((event) => (
              <EventCard
                key={event.id}
                {...event}
                onOpenDetails={() =>
                  navigate({ to: "/events/$eventId", params: { eventId: event.id } })
                }
                onToggleSave={() => void onToggleSave(event.id)}
                onCheckin={() => void onCheckin(event.id)}
              />
            ))
          )}
        </div>
      </section>

      <FeedActionNav />
    </main>
  );
}

function instagramUrl(value: string) {
  const username = value.trim().replace(/^@+/, "");
  return `https://www.instagram.com/${encodeURIComponent(username)}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-black">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
