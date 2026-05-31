import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, CalendarDays, Clock3, LoaderCircle, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/auth";
import { FeedActionNav } from "@/components/feed-action-nav";
import { type EventSummary, getSavedEvents } from "@/lib/data";

export const Route = createFileRoute("/calendar")({
  component: CalendarView,
});

function CalendarView() {
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user;
  const loadSavedEvents = useServerFn(getSavedEvents);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const agenda = buildAgenda(events);

  useEffect(() => {
    if (!user?.id) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadSavedEvents({ data: { userId: user.id } })
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [loadSavedEvents, user?.id]);

  return (
    <main className="app-shell bg-background pb-32">
      <header className="px-6 pt-8">
        <p className="text-xs font-semibold text-muted-foreground">Agenda</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight">Meus eventos</h1>
            <p className="mt-1 max-w-[28ch] text-sm leading-relaxed text-muted-foreground">
              Os rolês salvos, organizados pelo que vem agora.
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>
      </header>

      <div className="mt-6 px-6">
        {!user ? (
          <EmptyState
            title="Entre para ver sua agenda"
            text="Os eventos salvos ficam vinculados ao seu cadastro."
            action="Entrar"
            onClick={() => navigate({ to: "/auth" })}
          />
        ) : loading ? (
          <LoadingState />
        ) : events.length === 0 ? (
          <EmptyState
            title="Nenhum evento salvo"
            text="Salve eventos na tela Explorar para montar sua agenda."
            action="Explorar eventos"
            onClick={() => navigate({ to: "/discover" })}
          />
        ) : (
          <div className="space-y-8">
            <AgendaOverview agenda={agenda} />

            {agenda.nextEvent ? (
              <NextEventCard
                event={agenda.nextEvent}
                onOpen={() =>
                  navigate({ to: "/events/$eventId", params: { eventId: agenda.nextEvent!.id } })
                }
              />
            ) : null}

            <AgendaSection
              title="Próximos salvos"
              events={agenda.upcoming}
              emptyText="Quando você salvar eventos futuros, eles aparecem aqui."
              onOpen={(eventId) => navigate({ to: "/events/$eventId", params: { eventId } })}
            />

            {agenda.past.length > 0 ? (
              <AgendaSection
                title="Já passaram"
                events={agenda.past}
                muted
                onOpen={(eventId) => navigate({ to: "/events/$eventId", params: { eventId } })}
              />
            ) : null}
          </div>
        )}
      </div>

      <FeedActionNav />
    </main>
  );
}

function buildAgenda(events: EventSummary[]) {
  const now = Date.now();
  const sorted = [...events].sort(
    (first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
  );
  const upcoming = sorted.filter((event) => new Date(event.startsAt).getTime() >= now);
  const past = sorted.filter((event) => new Date(event.startsAt).getTime() < now).reverse();

  return {
    upcoming,
    past,
    nextEvent: upcoming[0],
    todayCount: upcoming.filter((event) => isToday(event.startsAt)).length,
  };
}

function AgendaOverview({ agenda }: { agenda: ReturnType<typeof buildAgenda> }) {
  return (
    <section className="grid grid-cols-3 gap-2">
      <AgendaStat label="Salvos" value={agenda.upcoming.length + agenda.past.length} />
      <AgendaStat label="Hoje" value={agenda.todayCount} />
      <AgendaStat label="Passados" value={agenda.past.length} />
    </section>
  );
}

function AgendaStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted px-3 py-3">
      <p className="text-xl font-black tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function NextEventCard({ event, onOpen }: { event: EventSummary; onOpen: () => void }) {
  const reminder = agendaReminderLabel(event.startsAt);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black tracking-tight">Próximo na agenda</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
          {formatShortDate(event.startsAt)}
        </span>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="group w-full overflow-hidden rounded-[1.75rem] bg-ink text-left text-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.9)] transition-transform active:scale-[0.99]"
      >
        <div className="relative h-44">
          <img
            src={event.image}
            alt={event.title}
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-4 bottom-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {reminder ? (
                <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-black text-white">
                  <BellRing className="h-3.5 w-3.5" />
                  {reminder}
                </span>
              ) : null}
              <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-ink">
                {formatTime(event.startsAt)}
              </span>
            </div>
            <p className="line-clamp-2 text-xl font-black leading-tight tracking-tight">
              {event.title}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white/75">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.venue}</span>
            </p>
          </div>
        </div>
      </button>
    </section>
  );
}

function AgendaSection({
  title,
  events,
  emptyText,
  muted,
  onOpen,
}: {
  title: string;
  events: EventSummary[];
  emptyText?: string;
  muted?: boolean;
  onOpen: (eventId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black tracking-tight">{title}</h2>
        <span className="text-xs font-bold text-muted-foreground">{events.length}</span>
      </div>

      {events.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border px-4 py-5 text-sm leading-relaxed text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <AgendaEventRow
              key={event.id}
              event={event}
              muted={muted}
              onOpen={() => onOpen(event.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AgendaEventRow({
  event,
  muted,
  onOpen,
}: {
  event: EventSummary;
  muted?: boolean;
  onOpen: () => void;
}) {
  const reminder = agendaReminderLabel(event.startsAt);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-3xl bg-muted p-3 text-left transition-colors hover:bg-muted/80 active:scale-[0.99]"
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-background px-2 py-2">
        <span className="text-[11px] font-black text-primary">{formatDay(event.startsAt)}</span>
        <span className="mt-0.5 text-[10px] font-bold text-muted-foreground">
          {formatMonth(event.startsAt)}
        </span>
      </div>

      <img src={event.image} alt={event.title} className="h-16 w-16 rounded-2xl object-cover" />

      <div className="min-w-0 flex-1">
        <p className={muted ? "truncate font-black text-foreground/70" : "truncate font-black"}>
          {event.title}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{event.venue}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold text-foreground/70">
            <Clock3 className="h-3.5 w-3.5" />
            {formatTime(event.startsAt)}
          </span>
          {reminder ? (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
              <BellRing className="h-3 w-3" />
              {reminder}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 rounded-3xl bg-muted p-4 text-sm font-semibold text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Carregando sua agenda...
      </p>
      {[1, 2].map((item) => (
        <div key={item} className="flex items-center gap-3 rounded-3xl bg-muted p-3">
          <div className="h-16 w-16 rounded-2xl bg-background" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded-full bg-background" />
            <div className="h-3 w-1/2 rounded-full bg-background" />
          </div>
        </div>
      ))}
    </div>
  );
}

function agendaReminderLabel(startsAt: string) {
  const diffMs = new Date(startsAt).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes <= 0 || diffMinutes > 24 * 60) return null;
  if (diffMinutes < 60) return `Começa em ${Math.max(1, diffMinutes)} min`;

  const diffHours = Math.round(diffMinutes / 60);
  return `Começa em ${diffHours} h`;
}

function isToday(startsAt: string) {
  const date = new Date(startsAt);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatDay(startsAt: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(new Date(startsAt));
}

function formatMonth(startsAt: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(startsAt))
    .replace(".", "");
}

function formatShortDate(startsAt: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(startsAt))
    .replace(".", "");
}

function formatTime(startsAt: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(startsAt),
  );
}

function EmptyState({
  title,
  text,
  action,
  onClick,
}: {
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-3xl border border-border p-6 text-center">
      <p className="font-bold">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <button type="button" onClick={onClick} className="mt-4 text-sm font-bold text-primary">
        {action}
      </button>
    </div>
  );
}
