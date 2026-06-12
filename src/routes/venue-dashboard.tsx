import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarPlus,
  CheckCircle2,
  EyeOff,
  Eye,
  Gift,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Megaphone,
  Pencil,
  ScanLine,
  Settings,
  Share2,
  Star,
  Ticket,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { authClient } from "@/auth";
import { AppCurrencyField, AppDateTimeField, AppSelect } from "@/components/app-form-controls";
import { EventCard } from "@/components/event-card";
import { NativeFeedback } from "@/components/native-feedback";
import { OwnerNav } from "@/components/owner-nav";
import { PillButton } from "@/components/pill-button";
import { QrScannerDialog } from "@/components/qr-scanner-dialog";
import { SwipeCollapseCard } from "@/components/swipe-collapse-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createEventForOwner,
  createVenueUpdate,
  deleteEventForOwner,
  getOwnerDashboard,
  redeemRewardCode,
  type EventSummary,
  type OwnerDashboard,
  type RedeemRewardResult,
  upsertOwnerReward,
  updateEventForOwner,
} from "@/lib/data";
import { fileToBase64, validateImageFile } from "@/lib/file";
import { parseCurrencyToCents } from "@/lib/currency";
import { uploadMedia } from "@/lib/media";
import { requireAuthenticatedRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/venue-dashboard")({
  beforeLoad: requireAuthenticatedRoute,
  component: VenueDashboard,
});

function VenueDashboard() {
  const navigate = useNavigate();
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  const loadDashboard = useServerFn(getOwnerDashboard);
  const upload = useServerFn(uploadMedia);
  const createEvent = useServerFn(createEventForOwner);
  const updateEvent = useServerFn(updateEventForOwner);
  const deleteEvent = useServerFn(deleteEventForOwner);
  const saveReward = useServerFn(upsertOwnerReward);
  const redeemCode = useServerFn(redeemRewardCode);
  const publishUpdate = useServerFn(createVenueUpdate);
  const [dashboard, setDashboard] = useState<OwnerDashboard>({
    venue: null,
    metrics: { views: 0, events: 0, checkins: 0, savedEvents: 0, followers: 0, reviews: 0 },
    events: [],
    updates: [],
    reviews: { total: 0, average: 0, atmosphere: 0, music: 0, price: 0, movement: 0, recent: [] },
    crm: {
      totalCustomers: 0,
      segments: [
        { key: "all", label: "Todos", count: 0 },
        { key: "recurring", label: "Recorrentes", count: 0 },
        { key: "inactive", label: "Sumidos 30d", count: 0 },
        { key: "saved-not-visited", label: "Salvaram e não foram", count: 0 },
        { key: "recent", label: "Recentes", count: 0 },
        { key: "low-rating", label: "Avaliaram mal", count: 0 },
        { key: "follower-not-visited", label: "Seguidores sem check-in", count: 0 },
      ],
      customers: [],
    },
    rewardRedemptions: { redeemed: 0, pending: 0, recent: [] },
  });
  const [crmSegment, setCrmSegment] =
    useState<OwnerDashboard["crm"]["segments"][number]["key"]>("all");
  const [showEventForm, setShowEventForm] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventSummary | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [discoveryPreview, setDiscoveryPreview] = useState<EventSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemFeedback, setRedeemFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const refreshDashboard = useCallback(
    async (userId = user?.id, options?: { showLoading?: boolean }) => {
      if (!userId) return;
      if (options?.showLoading) setLoadState("loading");
      try {
        const nextDashboard = await loadDashboard({ data: { userId } });
        setDashboard(nextDashboard);
        setDiscoveryPreview((current) =>
          current ? (nextDashboard.events.find((event) => event.id === current.id) ?? null) : null,
        );
        setEditingEvent((current) =>
          current ? (nextDashboard.events.find((event) => event.id === current.id) ?? null) : null,
        );
        if (options?.showLoading) setLoadState("ready");
      } catch (cause) {
        if (options?.showLoading) setLoadState("error");
        throw cause;
      }
    },
    [loadDashboard, user?.id],
  );

  useEffect(() => {
    if (isPending) return;
    if (!user?.id) {
      navigate({ to: "/auth" });
      return;
    }
    refreshDashboard(user.id, { showLoading: true }).catch(() => undefined);
  }, [isPending, navigate, refreshDashboard, user?.id]);

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("Publicando evento...");
    setError(null);

    if (!user?.id) {
      navigate({ to: "/auth" });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const startsAt = String(formData.get("startsAt") ?? "");
    const price = String(formData.get("price") ?? "").trim();
    const recurrenceType = formData.get("recurrenceType") === "weekly" ? "weekly" : "none";
    const image = formData.get("image") instanceof File ? (formData.get("image") as File) : null;
    const imageError = validateImageFile(image);

    if (!title || !category || !startsAt) {
      setStatus(null);
      setError("Preencha título, categoria e data do evento.");
      return;
    }

    if (imageError || !image) {
      setStatus(null);
      setError(imageError);
      return;
    }

    try {
      const base64 = await fileToBase64(image);
      const media = await upload({
        data: {
          userId: user.id,
          mimeType: image.type,
          base64,
        },
      });
      const priceCents = parseCurrencyToCents(price);

      await createEvent({
        data: {
          userId: user.id,
          title,
          category,
          description: description || undefined,
          startsAt,
          priceCents: Number.isFinite(priceCents) ? priceCents : undefined,
          imageUrl: media.mediaUrl,
          recurrenceType,
        },
      });

      form.reset();
      setShowEventForm(false);
      setPreview(null);
      setStatus("Evento publicado.");
      await refreshDashboard(user.id);
    } catch (cause) {
      setStatus(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar o evento.");
    }
  }

  async function submitEditEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("Salvando alterações...");
    setError(null);

    if (!user?.id) {
      navigate({ to: "/auth" });
      return;
    }
    if (!editingEvent) {
      setStatus(null);
      setError("Selecione um evento para editar.");
      return;
    }

    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const startsAt = String(formData.get("startsAt") ?? "");
    const price = String(formData.get("price") ?? "").trim();
    const recurrenceType = formData.get("recurrenceType") === "weekly" ? "weekly" : "none";
    const imageField = formData.get("image");
    const image = imageField instanceof File && imageField.size > 0 ? imageField : null;

    if (!title || !category || !startsAt) {
      setStatus(null);
      setError("Preencha título, categoria e data do evento.");
      return;
    }

    const imageError = image ? validateImageFile(image) : null;
    if (imageError) {
      setStatus(null);
      setError(imageError);
      return;
    }

    try {
      let imageUrl: string | undefined;
      if (image) {
        const base64 = await fileToBase64(image);
        const media = await upload({
          data: {
            userId: user.id,
            mimeType: image.type,
            base64,
          },
        });
        imageUrl = media.mediaUrl;
      }

      const priceCents = parseCurrencyToCents(price);
      await updateEvent({
        data: {
          userId: user.id,
          eventId: editingEvent.id,
          title,
          category,
          description: description || undefined,
          startsAt,
          priceCents,
          imageUrl,
          recurrenceType,
        },
      });

      form.reset();
      setEditingEvent(null);
      setEditPreview(null);
      setStatus("Evento atualizado.");
      await refreshDashboard(user.id);
    } catch (cause) {
      setStatus(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível editar o evento.");
    }
  }

  function startEditing(event: EventSummary) {
    setStatus(null);
    setError(null);
    setShowEventForm(false);
    setDiscoveryPreview(null);
    setEditPreview(null);
    setEditingEvent(event);
  }

  function onDeleteEvent(event: EventSummary) {
    if (!user?.id) {
      navigate({ to: "/auth" });
      return;
    }

    setStatus(null);
    setError(null);
    setDeleteTarget(event);
  }

  async function confirmDeleteEvent() {
    if (!user?.id || !deleteTarget) return;

    setStatus("Excluindo evento...");
    setError(null);
    setIsDeleting(true);

    try {
      await deleteEvent({ data: { userId: user.id, eventId: deleteTarget.id } });
      setEditingEvent((current) => (current?.id === deleteTarget.id ? null : current));
      setDiscoveryPreview((current) => (current?.id === deleteTarget.id ? null : current));
      setDeleteTarget(null);
      setStatus("Evento excluído.");
      await refreshDashboard(user.id);
    } catch (cause) {
      setStatus(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível excluir o evento.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function shareEvent(event: EventSummary) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/events/${event.id}`;
    const text = `${event.title} no ${event.venueName}`;

    if (navigator.share) {
      await navigator.share({ title: event.title, text, url });
      return;
    }

    await navigator.clipboard.writeText(url);
    setStatus("Link do evento copiado.");
  }

  async function submitReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Salvando recompensa...");
    setError(null);

    if (!user?.id) {
      navigate({ to: "/auth" });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const action = String(formData.get("action") ?? "checkin") as
      | "checkin"
      | "save"
      | "share"
      | "follow";
    const statusValue = String(formData.get("status") ?? "active") as "active" | "inactive";
    const eventIdValue = String(formData.get("eventId") ?? "__all__");
    const maxRedemptionsValue = String(formData.get("maxRedemptions") ?? "").trim();
    const validUntil = String(formData.get("validUntil") ?? "");
    const maxRedemptions = maxRedemptionsValue ? Number(maxRedemptionsValue) : undefined;

    if (!title || !description) {
      setStatus(null);
      setError("Informe título e instruções de resgate da recompensa.");
      return;
    }

    if (maxRedemptions !== undefined && (!Number.isFinite(maxRedemptions) || maxRedemptions <= 0)) {
      setStatus(null);
      setError("O limite de resgates precisa ser maior que zero.");
      return;
    }

    try {
      await saveReward({
        data: {
          userId: user.id,
          title,
          description,
          action,
          status: statusValue,
          eventId: eventIdValue === "__all__" ? undefined : eventIdValue,
          maxRedemptions,
          validUntil: validUntil || undefined,
        },
      });
      setStatus(
        statusValue === "active"
          ? "Recompensa ativa para clientes."
          : "Recompensa salva como inativa.",
      );
      await refreshDashboard(user.id);
    } catch (cause) {
      setStatus(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a recompensa.");
    }
  }

  async function submitRedeemCode(code: string): Promise<boolean> {
    if (!user?.id) {
      navigate({ to: "/auth" });
      return false;
    }

    setRedeeming(true);
    setRedeemFeedback(null);
    try {
      const result = await redeemCode({ data: { userId: user.id, code } });
      if (result.result === "redeemed") {
        setRedeemFeedback({
          tone: "success",
          message: `Resgate confirmado: ${result.rewardTitle ?? "benefício"} para ${result.customerName ?? "cliente"}.`,
        });
        refreshDashboard(user.id).catch(() => undefined);
        return true;
      }

      const messages: Record<Exclude<RedeemRewardResult, "redeemed">, string> = {
        not_found: "Código não encontrado. Confira com o cliente.",
        already_redeemed: result.redeemedAt
          ? `Esse código já foi usado em ${redemptionDateFormatter.format(new Date(result.redeemedAt))}.`
          : "Esse código já foi usado.",
        expired: "Esse código expirou junto com a promoção.",
        reward_inactive: "Esse código é de uma promoção que não está mais ativa.",
      };
      setRedeemFeedback({ tone: "error", message: messages[result.result] });
      return false;
    } catch (cause) {
      setRedeemFeedback({
        tone: "error",
        message: cause instanceof Error ? cause.message : "Não foi possível validar agora.",
      });
      return false;
    } finally {
      setRedeeming(false);
    }
  }

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("Publicando novidade...");
    setError(null);

    if (!user?.id) {
      navigate({ to: "/auth" });
      return;
    }

    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const kind = String(formData.get("kind") ?? "news") as "news" | "promo" | "event";

    if (!title || !body) {
      setStatus(null);
      setError("Informe título e mensagem da novidade.");
      return;
    }

    try {
      await publishUpdate({ data: { userId: user.id, title, body, kind } });
      form.reset();
      setStatus("Novidade publicada para seguidores.");
      await refreshDashboard(user.id);
    } catch (cause) {
      setStatus(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar a novidade.");
    }
  }

  const venue = dashboard.venue;

  if (loadState === "loading") {
    return (
      <main className="app-shell flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 font-bold">Carregando painel</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Buscando os dados reais do seu estabelecimento.
        </p>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="app-shell flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <p className="font-bold">Não foi possível carregar o painel</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tente abrir novamente em alguns instantes.
        </p>
        <PillButton
          className="mt-5 w-full"
          onClick={() => refreshDashboard(user?.id, { showLoading: true })}
        >
          Tentar novamente
        </PillButton>
      </main>
    );
  }

  return (
    <main className="app-shell bg-background pb-28">
      <NativeFeedback message={status} onClose={() => setStatus(null)} />

      <header className="px-6 pt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Painel do estabelecimento
            </p>
            <h1 className="mt-1 truncate text-2xl font-black tracking-tight">
              {venue?.name ?? "Cadastre seu estabelecimento"}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {venue?.neighborhood ?? "Dados reais do local"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Configurações"
            onClick={() => navigate({ to: "/profile" })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {!venue ? (
          <div className="mt-5 rounded-3xl border border-primary/20 bg-primary/10 p-4">
            <p className="font-bold">Finalize o cadastro do local</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Crie um estabelecimento real antes de publicar eventos.
            </p>
            <PillButton
              size="sm"
              className="mt-4 w-full"
              onClick={() => navigate({ to: "/venue-onboarding" })}
            >
              Cadastrar estabelecimento
            </PillButton>
          </div>
        ) : null}
      </header>

      <section className="mt-6 grid grid-cols-4 gap-2 px-6">
        <Metric
          icon={<Ticket className="h-4 w-4" />}
          label="Eventos"
          value={dashboard.metrics.events}
        />
        <Metric
          icon={<Eye className="h-4 w-4" />}
          label="Salvos"
          value={dashboard.metrics.savedEvents}
        />
        <Metric
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Check-ins"
          value={dashboard.metrics.checkins}
        />
        <Metric
          icon={<Star className="h-4 w-4" />}
          label="Reviews"
          value={dashboard.metrics.reviews}
        />
      </section>

      {error ? <p className="mx-6 mt-4 text-sm font-semibold text-primary">{error}</p> : null}

      {venue ? (
        <section className="mt-4 grid grid-cols-2 gap-2 px-6">
          <Insight
            label="Seguidores"
            value={String(dashboard.metrics.followers)}
            helper="Pessoas que seguem o local."
          />
          <Insight
            label="Mais salvo"
            value={dashboard.topSavedEvent?.title ?? "Sem salvos"}
            helper={
              dashboard.topSavedEvent
                ? `${dashboard.topSavedEvent.saved} salvamentos`
                : "Compartilhe seus eventos."
            }
          />
        </section>
      ) : null}

      {venue ? <FollowerUpdatePanel updates={dashboard.updates} onSubmit={submitUpdate} /> : null}

      {venue ? (
        <RewardPanel
          reward={dashboard.reward ?? null}
          events={dashboard.events}
          onSubmit={submitReward}
        />
      ) : null}

      {venue ? (
        <RedeemCodePanel
          stats={dashboard.rewardRedemptions}
          maxRedemptions={dashboard.reward?.maxRedemptions}
          busy={redeeming}
          feedback={redeemFeedback}
          onSubmit={submitRedeemCode}
        />
      ) : null}

      {venue ? <OwnerReviewsPanel reviews={dashboard.reviews} /> : null}

      {venue ? (
        <OwnerCrmPanel
          crm={dashboard.crm}
          activeSegment={crmSegment}
          onSegmentChange={setCrmSegment}
        />
      ) : null}

      <section className="mt-7 px-6">
        <PillButton
          type="button"
          size="lg"
          className="w-full"
          disabled={!venue}
          onClick={() => {
            setEditingEvent(null);
            setDiscoveryPreview(null);
            setShowEventForm((value) => !value);
          }}
        >
          <CalendarPlus className="h-5 w-5" />
          {showEventForm ? "Fechar publicação" : "Publicar evento"}
        </PillButton>

        {showEventForm ? (
          <form
            onSubmit={submitEvent}
            className="mt-4 space-y-3 rounded-3xl border border-border p-4"
          >
            <ImageField preview={preview} setPreview={setPreview} setError={setError} />
            <Field label="Título" name="title" placeholder="Nome real do evento" required />
            <AppSelect
              label="Categoria"
              name="category"
              placeholder="Selecione a categoria"
              options={EVENT_CATEGORY_OPTIONS}
            />
            <AppDateTimeField label="Primeira data e horário" name="startsAt" required />
            <RecurringEventField />
            <AppCurrencyField label="Preço" name="price" />
            <label className="block">
              <span className="text-sm font-semibold">Descrição</span>
              <textarea
                name="description"
                rows={3}
                className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="O que vai acontecer?"
              />
            </label>
            <PillButton type="submit" size="lg" className="w-full">
              Publicar
            </PillButton>
          </form>
        ) : null}
      </section>

      <section className="mt-7">
        <div className="mb-3 px-6">
          <h2 className="text-base font-bold tracking-tight">Próximos eventos</h2>
        </div>
        <div className="space-y-2 px-6">
          {editingEvent ? (
            <EditEventPanel
              event={editingEvent}
              preview={editPreview}
              setPreview={setEditPreview}
              setError={setError}
              onCancel={() => {
                setEditingEvent(null);
                setEditPreview(null);
              }}
              onSubmit={submitEditEvent}
            />
          ) : null}

          {discoveryPreview ? (
            <DiscoveryPreview event={discoveryPreview} onClose={() => setDiscoveryPreview(null)} />
          ) : null}

          {dashboard.events.length === 0 ? (
            <div className="rounded-3xl border border-border p-6 text-center">
              <p className="font-bold">Nenhum evento publicado</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Publique seu primeiro evento real para aparecer no Explorar.
              </p>
            </div>
          ) : (
            dashboard.events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                isPreviewing={discoveryPreview?.id === event.id}
                onEdit={() => startEditing(event)}
                onDelete={() => onDeleteEvent(event)}
                onShare={() => void shareEvent(event)}
                onPreview={() => {
                  setEditingEvent(null);
                  setShowEventForm(false);
                  setDiscoveryPreview((current) => (current?.id === event.id ? null : event));
                }}
              />
            ))
          )}
        </div>
      </section>

      <OwnerNav
        onCreate={() => (venue ? setShowEventForm(true) : navigate({ to: "/venue-onboarding" }))}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="mx-auto max-w-[340px] rounded-3xl border-none p-5">
          <DialogHeader className="text-left">
            <DialogTitle>Excluir evento?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {deleteTarget
                ? `"${deleteTarget.title}" deixará de aparecer no painel, no Explorar e na agenda dos usuários.`
                : "Este evento deixará de aparecer no app."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 grid grid-cols-2 gap-2 space-x-0 sm:space-x-0">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="h-12 rounded-full bg-muted text-sm font-bold disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void confirmDeleteEvent()}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-white disabled:opacity-60"
            >
              {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function formatForDateTimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function updateKindLabel(kind: "news" | "promo" | "event") {
  if (kind === "promo") return "Promoção";
  if (kind === "event") return "Evento";
  return "Aviso";
}

const REWARD_ACTION_OPTIONS = [
  { value: "checkin", label: "Check-in" },
  { value: "save", label: "Salvar evento" },
  { value: "share", label: "Compartilhar" },
  { value: "follow", label: "Seguir local" },
];

const EVENT_CATEGORY_OPTIONS = [
  { value: "Música ao vivo", label: "Música ao vivo" },
  { value: "DJ / Festa", label: "DJ / Festa" },
  { value: "Comédia", label: "Comédia" },
  { value: "Gastronomia", label: "Gastronomia" },
  { value: "Happy hour", label: "Happy hour" },
  { value: "Show", label: "Show" },
  { value: "Sertanejo", label: "Sertanejo" },
  { value: "Pagode", label: "Pagode" },
  { value: "Eletrônica", label: "Eletrônica" },
  { value: "Outro", label: "Outro" },
];

const REWARD_STATUS_OPTIONS = [
  { value: "active", label: "Ativa" },
  { value: "inactive", label: "Inativa" },
];

const UPDATE_KIND_OPTIONS = [
  { value: "news", label: "Aviso" },
  { value: "promo", label: "Promoção" },
  { value: "event", label: "Evento" },
];

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background">
        {icon}
      </div>
      <p className="mt-3 text-lg font-black">{value}</p>
      <p className="text-[10px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

function Insight({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-border p-3">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{helper}</p>
    </div>
  );
}

function FollowerUpdatePanel({
  updates,
  onSubmit,
}: {
  updates: OwnerDashboard["updates"];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="mx-6 mt-5">
      <SwipeCollapseCard
        title="Novidades para seguidores"
        description="Publique avisos rápidos para quem segue seu local: promoção de hoje, mudança de horário ou atração confirmada."
        icon={<Megaphone className="h-5 w-5" />}
      >
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <AppSelect label="Tipo" name="kind" options={UPDATE_KIND_OPTIONS} defaultValue="news" />
          <Field label="Título" name="title" placeholder="Ex: Lista grátis até 22h" required />
          <label className="block">
            <span className="text-sm font-semibold">Mensagem</span>
            <textarea
              name="body"
              rows={3}
              required
              maxLength={240}
              className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Conte a novidade em poucas palavras."
            />
          </label>
          <PillButton type="submit" size="lg" className="w-full">
            Publicar para seguidores
          </PillButton>
        </form>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase text-muted-foreground">Últimas publicações</p>
          {updates.length === 0 ? (
            <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
              Nenhuma novidade publicada ainda.
            </p>
          ) : (
            updates.map((update) => (
              <div key={update.id} className="rounded-2xl bg-muted p-3">
                <p className="text-xs font-bold uppercase text-primary">
                  {updateKindLabel(update.kind)}
                </p>
                <p className="mt-1 font-bold">{update.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {update.body}
                </p>
              </div>
            ))
          )}
        </div>
      </SwipeCollapseCard>
    </section>
  );
}

function RewardPanel({
  reward,
  events,
  onSubmit,
}: {
  reward: OwnerDashboard["reward"];
  events: EventSummary[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const rewardId = reward?.id;
  const isFlashReward = Boolean(reward?.validUntil || reward?.maxRedemptions);
  const eventOptions = useMemo(
    () => [
      { value: "__all__", label: "Todos os eventos do local" },
      ...events.map((event) => ({ value: event.id, label: `${event.title} · ${event.date}` })),
    ],
    [events],
  );

  return (
    <section className="mt-5 px-6">
      <SwipeCollapseCard
        title="Promoção relâmpago"
        description="Crie ofertas temporárias como dose dupla, lista grátis ou desconto para os primeiros check-ins."
        icon={<Gift className="h-5 w-5" />}
        iconClassName="bg-emerald-500 text-white"
        defaultOpen={!rewardId}
        resetKey={rewardId ?? "empty"}
        headerAccessory={
          reward ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
              {isFlashReward ? "Relâmpago" : reward.status === "active" ? "Ativa" : "Inativa"}
            </span>
          ) : null
        }
      >
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <Field
            label="Oferta"
            name="title"
            placeholder="Ex: Dose dupla até 21h"
            defaultValue={reward?.title ?? ""}
            required
          />
          <div className="rounded-2xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
            Para virar relâmpago, preencha uma validade, um limite de resgates ou os dois. Esses
            dados aparecem no app e no convite compartilhado.
          </div>
          <AppSelect
            label="Onde essa promoção vale"
            name="eventId"
            defaultValue={reward?.eventId ?? "__all__"}
            triggerClassName="border-border"
            options={eventOptions}
          />
          <label className="block">
            <span className="text-sm font-semibold">Como resgatar</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={reward?.description ?? ""}
              className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-background px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Ex: Mostre o check-in no balcão antes das 21h. Válido enquanto durar o estoque."
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <AppSelect
              label="Ação"
              name="action"
              defaultValue={reward?.action ?? "checkin"}
              triggerClassName="border-border"
              options={REWARD_ACTION_OPTIONS}
            />
            <AppSelect
              label="Status"
              name="status"
              defaultValue={reward?.status ?? "active"}
              triggerClassName="border-border"
              options={REWARD_STATUS_OPTIONS}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Primeiros resgates"
              name="maxRedemptions"
              type="number"
              min="1"
              placeholder="Ex: 30"
              defaultValue={reward?.maxRedemptions ? String(reward.maxRedemptions) : ""}
            />
            <AppDateTimeField
              label="Válida até"
              name="validUntil"
              triggerClassName="border-border"
              defaultValue={reward?.validUntil ? formatForDateTimeInput(reward.validUntil) : ""}
            />
          </div>
          <PillButton type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90">
            Salvar promoção
          </PillButton>
        </form>
      </SwipeCollapseCard>
    </section>
  );
}

const redemptionDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function RedeemCodePanel({
  stats,
  maxRedemptions,
  busy,
  feedback,
  onSubmit,
}: {
  stats: OwnerDashboard["rewardRedemptions"];
  maxRedemptions?: number;
  busy: boolean;
  feedback: { tone: "success" | "error"; message: string } | null;
  onSubmit: (code: string) => Promise<boolean>;
}) {
  const [code, setCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const redeemed = await onSubmit(code);
    if (redeemed) setCode("");
  }

  function handleScan(scanned: string) {
    setCode(scanned);
    void onSubmit(scanned).then((redeemed) => {
      if (redeemed) setCode("");
    });
  }

  return (
    <section className="mt-5 px-6">
      <div className="rounded-[1.75rem] border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Resgates</p>
            <h2 className="mt-1 text-lg font-black tracking-tight">Validar código do cliente</h2>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-black">
            {stats.redeemed}
            {maxRedemptions ? ` de ${maxRedemptions}` : ""}{" "}
            {stats.redeemed === 1 && !maxRedemptions ? "resgatado" : "resgatados"}
          </span>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          O cliente recebe um código de 6 caracteres ao liberar a promoção. Digite o código ou leia
          o QR mostrado por ele para confirmar o resgate.
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 6),
              )
            }
            placeholder="ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label="Código de resgate do cliente"
            className="h-12 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-center font-mono text-lg font-black uppercase tracking-[0.3em] outline-none placeholder:text-muted-foreground/40"
          />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            aria-label="Escanear QR code do cliente"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted"
          >
            <ScanLine className="h-5 w-5" />
          </button>
          <PillButton type="submit" disabled={busy || code.length !== 6} className="shrink-0">
            {busy ? "Validando..." : "Validar"}
          </PillButton>
        </form>

        <QrScannerDialog
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScan}
        />

        {feedback ? (
          <p
            className={
              feedback.tone === "success"
                ? "mt-3 rounded-2xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-700"
                : "mt-3 rounded-2xl bg-primary/10 p-3 text-sm font-bold text-primary"
            }
          >
            {feedback.message}
          </p>
        ) : null}

        {stats.pending > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {stats.pending === 1
              ? "1 código pendente emitido."
              : `${stats.pending} códigos pendentes emitidos.`}
          </p>
        ) : null}

        {stats.recent.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold uppercase text-muted-foreground">Últimas validações</p>
            {stats.recent.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-muted p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{entry.customerName}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {entry.rewardTitle}
                    {" · "}
                    {redemptionDateFormatter.format(new Date(entry.redeemedAt))}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs font-black text-muted-foreground">
                  {entry.code}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function OwnerReviewsPanel({ reviews }: { reviews: OwnerDashboard["reviews"] }) {
  return (
    <section className="mt-5 px-6">
      <div className="rounded-[1.75rem] border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Avaliações</p>
            <h2 className="mt-1 text-lg font-black tracking-tight">Feedback dos clientes</h2>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-black">
            {reviews.total} {reviews.total === 1 ? "review" : "reviews"}
          </span>
        </div>

        {reviews.total === 0 ? (
          <p className="mt-4 rounded-2xl bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
            As avaliações aparecerão aqui depois que clientes fizerem check-in e avaliarem seus
            eventos.
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-[1fr_2fr] gap-3 rounded-3xl bg-muted p-3">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-background p-3 text-center">
                <p className="text-3xl font-black">{reviews.average.toFixed(1)}</p>
                <div className="mt-1 flex text-amber-400">
                  <StarRow value={reviews.average} />
                </div>
                <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">Média</p>
              </div>
              <div className="space-y-2">
                <ReviewBar label="Ambiente" value={reviews.atmosphere} />
                <ReviewBar label="Música" value={reviews.music} />
                <ReviewBar label="Preço" value={reviews.price} />
                <ReviewBar label="Movimento" value={reviews.movement} />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                Comentários recentes
              </p>
              {reviews.recent.map((review) => (
                <div key={review.id} className="rounded-2xl bg-muted p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{review.eventTitle}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {review.authorName} · {formatReviewDate(review.updatedAt)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-background px-2 py-1 text-xs font-black">
                      <Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" />
                      {averageReviewScore(review).toFixed(1)}
                    </span>
                  </div>
                  {review.comment ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {review.comment}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Sem comentário escrito.</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function OwnerCrmPanel({
  crm,
  activeSegment,
  onSegmentChange,
}: {
  crm: OwnerDashboard["crm"];
  activeSegment: OwnerDashboard["crm"]["segments"][number]["key"];
  onSegmentChange: (segment: OwnerDashboard["crm"]["segments"][number]["key"]) => void;
}) {
  const customers = crm.customers.filter((customer) => customer.segments.includes(activeSegment));
  const activeLabel =
    crm.segments.find((segment) => segment.key === activeSegment)?.label ?? "Todos";

  return (
    <section className="mt-5 px-6">
      <div className="rounded-[1.75rem] border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">CRM</p>
            <h2 className="mt-1 text-lg font-black tracking-tight">Clientes do local</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Veja quem segue, salva, avalia ou aparece no seu estabelecimento.
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-muted p-3">
            <p className="text-2xl font-black">{crm.totalCustomers}</p>
            <p className="text-xs text-muted-foreground">clientes mapeados</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3">
            <p className="truncate text-sm font-black text-primary">{activeLabel}</p>
            <p className="text-xs text-muted-foreground">segmento ativo</p>
          </div>
        </div>

        <div className="relative mt-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-card to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-card to-transparent" />
          <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto scroll-px-1 px-1 pb-2">
            {crm.segments.map((segment) => (
              <button
                key={segment.key}
                type="button"
                onClick={() => onSegmentChange(segment.key)}
                className={`shrink-0 snap-start rounded-full px-3 py-2 text-xs font-black transition ${
                  segment.key === activeSegment
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {segment.label} · {segment.count}
              </button>
            ))}
          </div>
        </div>

        {crm.totalCustomers === 0 ? (
          <p className="mt-4 rounded-2xl bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
            O CRM aparece quando clientes seguem o local, salvam eventos, fazem check-in ou avaliam.
          </p>
        ) : customers.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
            Nenhum cliente neste segmento ainda.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {customers.map((customer) => (
              <div key={customer.userId} className="rounded-2xl bg-muted p-3">
                <div className="flex items-start gap-3">
                  {customer.avatarUrl ? (
                    <img
                      src={customer.avatarUrl}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-sm font-black">
                      {customerInitials(customer.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{customer.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {customer.lastCheckin
                            ? `Último check-in ${formatCrmDate(customer.lastCheckin)}`
                            : customer.lastInteraction
                              ? `Última ação ${formatCrmDate(customer.lastInteraction)}`
                              : "Sem ação recente"}
                        </p>
                      </div>
                      {customer.averageRating > 0 ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-background px-2 py-1 text-xs font-black">
                          <Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" />
                          {customer.averageRating.toFixed(1)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <CrmMiniMetric label="check-ins" value={customer.checkins} />
                      <CrmMiniMetric label="salvos" value={customer.savedEvents} />
                      <CrmMiniMetric label="reviews" value={customer.reviews} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {customer.followed ? <CrmTag>Segue</CrmTag> : null}
                      {customer.favorited ? <CrmTag>Favoritou</CrmTag> : null}
                      {customer.checkins >= 2 ? <CrmTag>Recorrente</CrmTag> : null}
                      {customer.savedEvents > 0 && customer.checkins === 0 ? (
                        <CrmTag>Precisa convite</CrmTag>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CrmMiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-background px-2 py-2">
      <p className="text-sm font-black">{value}</p>
      <p className="text-[10px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

function CrmTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-background px-2 py-1 text-[10px] font-black text-muted-foreground">
      {children}
    </span>
  );
}

function customerInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C"
  );
}

function formatCrmDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(value),
  );
}

function ReviewBar({ label, value }: { label: string; value: number }) {
  const width = `${Math.min(100, Math.max(0, (value / 5) * 100))}%`;

  return (
    <div>
      <div className="flex items-center justify-between text-xs font-bold">
        <span>{label}</span>
        <span>{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full bg-primary" style={{ width }} />
      </div>
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  const rounded = Math.round(value);
  return [1, 2, 3, 4, 5].map((rating) => (
    <Star key={rating} className="h-4 w-4" fill={rating <= rounded ? "currentColor" : "none"} />
  ));
}

function averageReviewScore(review: OwnerDashboard["reviews"]["recent"][number]) {
  return (review.atmosphere + review.music + review.price + review.movement) / 4;
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(value),
  );
}

function EventRow({
  event,
  isPreviewing,
  onEdit,
  onDelete,
  onShare,
  onPreview,
}: {
  event: EventSummary;
  isPreviewing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
      <img src={event.image} alt={event.title} className="h-16 w-16 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{event.title}</p>
        <p className="truncate text-xs text-muted-foreground">{event.venue}</p>
        <p className="mt-1 text-xs font-semibold text-primary">{event.date}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onPreview}
          aria-label={isPreviewing ? "Fechar prévia" : "Ver como usuário"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-background"
        >
          {isPreviewing ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar evento"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-background"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onShare}
          aria-label="Compartilhar evento"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-background"
        >
          <Share2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir evento"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-primary"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DiscoveryPreview({ event, onClose }: { event: EventSummary; onClose: () => void }) {
  return (
    <div className="space-y-3 rounded-3xl border border-border p-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-sm font-bold">Prévia no Explorar</p>
          <p className="text-xs text-muted-foreground">Como o usuário vai ver esse evento.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar prévia"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <EventCard
        id={event.id}
        title={event.title}
        venue={event.venue}
        date={event.date}
        going={event.going}
        image={event.image}
        price={event.price}
        live={event.live}
      />
    </div>
  );
}

function EditEventPanel({
  event,
  preview,
  setPreview,
  setError,
  onCancel,
  onSubmit,
}: {
  event: EventSummary;
  preview: string | null;
  setPreview: (value: string | null) => void;
  setError: (value: string | null) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-3xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">Editar evento</p>
          <p className="text-xs text-muted-foreground">Atualize o que aparece no Explorar.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar edição"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <OptionalImageField
        currentImage={event.image}
        preview={preview}
        setPreview={setPreview}
        setError={setError}
      />
      <Field label="Título" name="title" defaultValue={event.title} required />
      <AppSelect
        label="Categoria"
        name="category"
        defaultValue={event.category}
        placeholder="Selecione a categoria"
        options={EVENT_CATEGORY_OPTIONS}
      />
      <AppDateTimeField
        label="Primeira data e horário"
        name="startsAt"
        defaultValue={formatForDateTimeInput(event.startsAt)}
        required
      />
      <RecurringEventField defaultChecked={event.recurrenceType === "weekly"} />
      <AppCurrencyField label="Preço" name="price" defaultCents={event.priceCents} />
      <label className="block">
        <span className="text-sm font-semibold">Descrição</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={event.description ?? ""}
          className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
          placeholder="O que vai acontecer?"
        />
      </label>
      <PillButton type="submit" size="lg" className="w-full">
        Salvar alterações
      </PillButton>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
  step,
  min,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        step={step}
        min={min}
        defaultValue={defaultValue}
        className="mt-1.5 h-12 w-full rounded-2xl border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}

function RecurringEventField({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-border p-3">
      <input
        type="checkbox"
        name="recurrenceType"
        value="weekly"
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 rounded border-border accent-primary"
      />
      <span>
        <span className="block text-sm font-bold">Repetir semanalmente neste dia da semana</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          A data acima define o dia da semana e o horário. Se escolher sexta às 20h, o evento volta
          toda sexta às 20h e encerra após 24h.
        </span>
      </span>
    </label>
  );
}

function OptionalImageField({
  currentImage,
  preview,
  setPreview,
  setError,
}: {
  currentImage: string;
  preview: string | null;
  setPreview: (value: string | null) => void;
  setError: (value: string | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">Imagem do evento</span>
      <span className="mt-1.5 flex min-h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center">
        <img
          src={preview ?? currentImage}
          alt=""
          className="h-36 w-full rounded-2xl object-cover"
        />
        <span className="mt-2 text-xs text-muted-foreground">Toque para trocar a imagem</span>
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            const imageError = file ? validateImageFile(file) : null;
            setError(imageError);
            setPreview(file && !imageError ? URL.createObjectURL(file) : null);
          }}
        />
      </span>
    </label>
  );
}

function ImageField({
  preview,
  setPreview,
  setError,
}: {
  preview: string | null;
  setPreview: (value: string | null) => void;
  setError: (value: string | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">Imagem real do evento</span>
      <span className="mt-1.5 flex min-h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center">
        {preview ? (
          <img src={preview} alt="" className="h-36 w-full rounded-2xl object-cover" />
        ) : (
          <>
            <ImagePlus className="h-7 w-7 text-muted-foreground" />
            <span className="mt-2 text-sm font-semibold">Enviar imagem</span>
            <span className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP até 2MB</span>
          </>
        )}
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          required
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            setError(validateImageFile(file));
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
      </span>
    </label>
  );
}
