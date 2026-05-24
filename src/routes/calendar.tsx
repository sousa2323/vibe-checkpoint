import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BellRing } from "lucide-react";
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
        <h1 className="text-2xl font-bold tracking-tight">Meus eventos</h1>
        <p className="text-sm text-muted-foreground">Eventos reais salvos por você</p>
      </header>

      <div className="mt-6 space-y-3 px-6">
        {!user ? (
          <EmptyState
            title="Entre para ver sua agenda"
            text="Os eventos salvos ficam vinculados ao seu cadastro."
            action="Entrar"
            onClick={() => navigate({ to: "/auth" })}
          />
        ) : loading ? (
          <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Carregando...</p>
        ) : events.length === 0 ? (
          <EmptyState
            title="Nenhum evento salvo"
            text="Salve eventos na tela Explorar para montar sua agenda."
            action="Explorar eventos"
            onClick={() => navigate({ to: "/discover" })}
          />
        ) : (
          events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => navigate({ to: "/events/$eventId", params: { eventId: event.id } })}
              className="flex w-full items-center gap-3 rounded-2xl bg-muted p-3 text-left"
            >
              <img
                src={event.image}
                alt={event.title}
                className="h-16 w-16 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{event.title}</p>
                <p className="truncate text-xs text-muted-foreground">{event.venue}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-primary">{event.date}</p>
                  {agendaReminderLabel(event.startsAt) ? (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                      <BellRing className="h-3 w-3" />
                      {agendaReminderLabel(event.startsAt)}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <FeedActionNav />
    </main>
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
