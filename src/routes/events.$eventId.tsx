import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Share2,
  Star,
  Store,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { authClient } from "@/auth";
import { CheckinReward } from "@/components/checkin-reward";
import { FeedActionNav } from "@/components/feed-action-nav";
import { NativeFeedback } from "@/components/native-feedback";
import { PillButton } from "@/components/pill-button";
import { ShareInviteCard } from "@/components/share-invite-card";
import {
  getEventDetails,
  getUserEventReview,
  getSavedEventIds,
  toggleCheckin,
  toggleSavedEvent,
  upsertEventReview,
  type EventReviewSummary,
  type EventSummary,
} from "@/lib/data";
import {
  buildEventShareText,
  getCheckinReward,
  getRewardActionLabel,
  getRewardDescription,
  getRewardMeta,
} from "@/lib/growth";

export const Route = createFileRoute("/events/$eventId")({
  loader: ({ params }) => getEventDetails({ data: { eventId: params.eventId } }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const initialEvent = Route.useLoaderData();
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user;
  const loadEvent = useServerFn(getEventDetails);
  const loadReview = useServerFn(getUserEventReview);
  const loadSavedIds = useServerFn(getSavedEventIds);
  const saveReview = useServerFn(upsertEventReview);
  const toggleSaved = useServerFn(toggleSavedEvent);
  const checkin = useServerFn(toggleCheckin);
  const [event, setEvent] = useState<EventSummary | null>(initialEvent);
  const [saved, setSaved] = useState(Boolean(initialEvent?.saved));
  const [review, setReview] = useState<EventReviewSummary | null>(null);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(DEFAULT_REVIEW_DRAFT);
  const [editingReview, setEditingReview] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    loadEvent({ data: { eventId, userId: user.id } })
      .then((nextEvent) => {
        setEvent(nextEvent);
        setSaved(Boolean(nextEvent?.saved));
      })
      .catch(() => undefined);
  }, [eventId, loadEvent, user?.id]);

  useEffect(() => {
    if (!user?.id || !event) return;
    loadSavedIds({ data: { userId: user.id } })
      .then((ids) => setSaved(ids.includes(event.id)))
      .catch(() => undefined);
  }, [event, loadSavedIds, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setReview(null);
      setReviewDraft(DEFAULT_REVIEW_DRAFT);
      return;
    }

    loadReview({ data: { userId: user.id, eventId } })
      .then((nextReview) => {
        setReview(nextReview);
        setReviewDraft(reviewToDraft(nextReview));
        setEditingReview(false);
      })
      .catch(() => undefined);
  }, [eventId, loadReview, user?.id]);

  async function requireUser() {
    if (user?.id) return user.id;
    navigate({ to: "/auth" });
    return null;
  }

  async function onToggleSave() {
    if (!event) return;
    const userId = await requireUser();
    if (!userId) return;

    const result = await toggleSaved({ data: { userId, eventId: event.id } });
    setSaved(result.saved);
    setStatus(result.saved ? "Evento salvo na agenda." : "Evento removido da agenda.");
  }

  async function onCheckin() {
    if (!event) return;
    const userId = await requireUser();
    if (!userId) return;

    const result = await checkin({ data: { userId, eventId: event.id, venueId: event.venueId } });
    setEvent((current) =>
      current
        ? {
            ...current,
            checkedIn: result.checkedIn,
            going: Math.max(0, current.going + (result.checkedIn ? 1 : -1)),
          }
        : current,
    );
    loadEvent({ data: { eventId: event.id, userId } })
      .then((nextEvent) => {
        if (nextEvent) setEvent(nextEvent);
      })
      .catch(() => undefined);
    setStatus(
      result.checkedIn && reward
        ? `Check-in registrado. Benefício liberado: ${reward}.`
        : result.checkedIn
          ? "Check-in registrado."
          : "Check-in desfeito.",
    );
  }

  async function shareEvent() {
    if (!event || typeof window === "undefined") return;
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({ title: event.title, text: buildEventShareText(event, url), url });
      return;
    }

    await navigator.clipboard.writeText(buildEventShareText(event, url));
    setStatus("Convite do evento copiado.");
  }

  async function submitReview(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!event) return;

    const userId = await requireUser();
    if (!userId) return;

    if (!isEventReviewAvailable(event.startsAt)) {
      setStatus("A avaliação será liberada depois que o evento terminar.");
      return;
    }

    if (!isReviewDraftComplete(reviewDraft)) {
      setStatus("Escolha notas de 1 a 5 em todos os critérios.");
      return;
    }

    setReviewSaving(true);
    try {
      const nextReview = await saveReview({
        data: {
          userId,
          eventId: event.id,
          ...reviewDraft,
        },
      });
      setReview(nextReview);
      setReviewDraft(reviewToDraft(nextReview));
      setEditingReview(false);
      setStatus(review ? "Avaliação atualizada." : "Avaliação enviada. Valeu pelo feedback!");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Não foi possível avaliar agora.");
    } finally {
      setReviewSaving(false);
    }
  }

  if (!event) {
    return (
      <main className="app-shell bg-background px-6 pb-32 pt-8">
        <p className="text-2xl font-black">Evento não encontrado</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Esse evento pode ter sido encerrado ou removido pelo estabelecimento.
        </p>
        <PillButton className="mt-6 w-full" onClick={() => navigate({ to: "/discover" })}>
          Voltar para Explorar
        </PillButton>
        <FeedActionNav />
      </main>
    );
  }

  const checkedIn = Boolean(event.checkedIn);
  const reviewAvailable = isEventReviewAvailable(event.startsAt);
  const reward = getCheckinReward(event);
  const rewardDescription = getRewardDescription(event);
  const rewardMeta = getRewardMeta(event);
  const rewardActionLabel = getRewardActionLabel(event);

  return (
    <main className="app-shell bg-background pb-32">
      <NativeFeedback message={status} onClose={() => setStatus(null)} />

      <div className="relative">
        <img src={event.image} alt={event.title} className="h-80 w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-bold">
          {event.category}
        </div>
      </div>

      <section className="-mt-8 relative z-10 px-6">
        <h1 className="text-3xl font-black leading-tight tracking-tight">{event.title}</h1>
        <Link
          to="/venues/$venueId"
          params={{ venueId: event.venueId }}
          className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground"
        >
          <Store className="h-4 w-4" />
          {event.venueName}
        </Link>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Info icon={<CalendarDays className="h-4 w-4" />} label="Data" value={event.date} />
          <Info
            icon={<MapPin className="h-4 w-4" />}
            label="Bairro"
            value={event.venueNeighborhood}
          />
        </div>

        {event.description ? (
          <p className="mt-5 rounded-3xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        ) : null}

        <CheckinReward
          reward={reward}
          description={rewardDescription}
          actionLabel={rewardActionLabel}
          meta={rewardMeta}
          unlocked={checkedIn}
        />

        <div className="mt-6 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => void onToggleSave()}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-muted text-sm font-bold"
          >
            <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
            {saved ? "Salvo" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => void shareEvent()}
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

        <ShareInviteCard event={event} reward={reward} onShare={() => void shareEvent()} />

        <ReviewPanel
          checkedIn={checkedIn}
          draft={reviewDraft}
          editing={editingReview}
          review={review}
          reviewAvailable={reviewAvailable}
          saving={reviewSaving}
          onChange={setReviewDraft}
          onEdit={() => setEditingReview(true)}
          onSubmit={submitReview}
        />
      </section>

      <FeedActionNav />
    </main>
  );
}

type ReviewDraft = {
  atmosphere: number;
  music: number;
  price: number;
  movement: number;
  comment: string;
};

const DEFAULT_REVIEW_DRAFT: ReviewDraft = {
  atmosphere: 0,
  music: 0,
  price: 0,
  movement: 0,
  comment: "",
};

const REVIEW_UNLOCK_DELAY_HOURS = 6;

function isEventReviewAvailable(startsAt: string) {
  const startsAtTime = new Date(startsAt).getTime();
  if (!Number.isFinite(startsAtTime)) return false;

  return Date.now() >= startsAtTime + REVIEW_UNLOCK_DELAY_HOURS * 60 * 60 * 1000;
}

function reviewToDraft(review: EventReviewSummary | null): ReviewDraft {
  if (!review) return DEFAULT_REVIEW_DRAFT;

  return {
    atmosphere: review.atmosphere,
    music: review.music,
    price: review.price,
    movement: review.movement,
    comment: review.comment ?? "",
  };
}

function ReviewPanel({
  checkedIn,
  draft,
  editing,
  review,
  reviewAvailable,
  saving,
  onChange,
  onEdit,
  onSubmit,
}: {
  checkedIn: boolean;
  draft: ReviewDraft;
  editing: boolean;
  review: EventReviewSummary | null;
  reviewAvailable: boolean;
  saving: boolean;
  onChange: (draft: ReviewDraft) => void;
  onEdit: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const readyToSubmit = checkedIn && reviewAvailable && isReviewDraftComplete(draft) && !saving;

  if (review && !editing) {
    return (
      <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Review rápido</p>
            <h2 className="mt-1 text-lg font-black tracking-tight">Avaliação enviada</h2>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            Avaliado
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <ReviewScore label="Ambiente" value={review.atmosphere} />
          <ReviewScore label="Música" value={review.music} />
          <ReviewScore label="Preço" value={review.price} />
          <ReviewScore label="Movimento" value={review.movement} />
        </div>
        {review.comment ? (
          <p className="mt-3 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            {review.comment}
          </p>
        ) : null}
        <button type="button" onClick={onEdit} className="mt-4 text-sm font-black text-primary">
          Editar avaliação
        </button>
      </section>
    );
  }

  if (!reviewAvailable) {
    return (
      <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Review rápido</p>
        <h2 className="mt-1 text-lg font-black tracking-tight">Avaliação ainda não liberada</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Você poderá avaliar esse rolê depois que o evento terminar.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Review rápido</p>
          <h2 className="mt-1 text-lg font-black tracking-tight">Como foi esse rolê?</h2>
        </div>
        {review ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            Avaliado
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Dê notas simples para ajudar outras pessoas a decidirem o próximo rolê.
      </p>

      {!checkedIn ? (
        <p className="mt-4 rounded-2xl bg-muted p-3 text-sm font-semibold text-muted-foreground">
          Faça check-in no evento para liberar a avaliação.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <RatingField
          label="Ambiente"
          value={draft.atmosphere}
          disabled={!checkedIn || saving}
          onChange={(atmosphere) => onChange({ ...draft, atmosphere })}
        />
        <RatingField
          label="Música"
          value={draft.music}
          disabled={!checkedIn || saving}
          onChange={(music) => onChange({ ...draft, music })}
        />
        <RatingField
          label="Preço"
          value={draft.price}
          disabled={!checkedIn || saving}
          onChange={(price) => onChange({ ...draft, price })}
        />
        <RatingField
          label="Movimento"
          value={draft.movement}
          disabled={!checkedIn || saving}
          onChange={(movement) => onChange({ ...draft, movement })}
        />

        <label className="block">
          <span className="text-sm font-bold">Comentário opcional</span>
          <textarea
            value={draft.comment}
            onChange={(event) => onChange({ ...draft, comment: event.currentTarget.value })}
            disabled={!checkedIn || saving}
            maxLength={240}
            rows={3}
            className="mt-2 w-full resize-none rounded-2xl bg-muted px-4 py-3 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
            placeholder="Ex: fila rápida, som bom, preço justo..."
          />
        </label>

        <PillButton type="submit" className="w-full" disabled={!readyToSubmit}>
          {saving ? "Salvando..." : review ? "Atualizar avaliação" : "Enviar avaliação"}
        </PillButton>
      </form>
    </section>
  );
}

function isReviewDraftComplete(draft: ReviewDraft) {
  return [draft.atmosphere, draft.music, draft.price, draft.movement].every(
    (value) => value >= 1 && value <= 5,
  );
}

function ReviewScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1 font-black">
        <Star className="h-4 w-4 text-amber-400" fill="currentColor" />
        {value}/5
      </p>
    </div>
  );
}

function RatingField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold">{label}</span>
      <div className="flex items-center gap-1" aria-label={`${label}: ${value} de 5`}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onChange(rating)}
            className="flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-60"
            aria-label={`${rating} de 5`}
          >
            <Star
              className={
                rating <= value ? "h-5 w-5 text-amber-400" : "h-5 w-5 text-muted-foreground"
              }
              fill={rating <= value ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-2 truncate font-black">{value}</p>
    </div>
  );
}
