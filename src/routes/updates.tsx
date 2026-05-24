import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CalendarClock, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/auth";
import { FeedActionNav } from "@/components/feed-action-nav";
import {
  type AgendaReminderSummary,
  getAgendaReminders,
  getFollowerUpdates,
  markNotificationsSeen,
  type VenueUpdateSummary,
} from "@/lib/data";

export const Route = createFileRoute("/updates")({
  component: UpdatesPage,
});

function UpdatesPage() {
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user;
  const loadUpdates = useServerFn(getFollowerUpdates);
  const loadReminders = useServerFn(getAgendaReminders);
  const markSeen = useServerFn(markNotificationsSeen);
  const [updates, setUpdates] = useState<VenueUpdateSummary[]>([]);
  const [reminders, setReminders] = useState<AgendaReminderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setUpdates([]);
      setReminders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      loadUpdates({ data: { userId: user.id } }),
      loadReminders({ data: { userId: user.id } }),
    ])
      .then(([nextUpdates, nextReminders]) => {
        setUpdates(nextUpdates);
        setReminders(nextReminders);
        return markSeen({ data: { userId: user.id } });
      })
      .catch(() => {
        setUpdates([]);
        setReminders([]);
      })
      .finally(() => setLoading(false));
  }, [loadReminders, loadUpdates, markSeen, user?.id]);

  return (
    <main className="app-shell bg-background pb-32">
      <header className="px-6 pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novidades</h1>
            <p className="text-sm text-muted-foreground">Avisos dos locais que você segue</p>
          </div>
        </div>
      </header>

      <div className="mt-6 space-y-3 px-6">
        {!user ? (
          <EmptyState
            title="Entre para ver novidades"
            text="Siga bares e casas de show para receber avisos, promos e eventos por aqui."
            action="Entrar"
            onClick={() => navigate({ to: "/auth" })}
          />
        ) : loading ? (
          <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Carregando...</p>
        ) : reminders.length === 0 && updates.length === 0 ? (
          <EmptyState
            title="Nenhuma novidade ainda"
            text="Siga seus locais favoritos para acompanhar promoções e avisos publicados por eles."
            action="Explorar locais"
            onClick={() => navigate({ to: "/map" })}
          />
        ) : (
          <>
            {reminders.map((reminder) => (
              <button
                key={reminder.id}
                type="button"
                onClick={() =>
                  navigate({ to: "/events/$eventId", params: { eventId: reminder.eventId } })
                }
                className="w-full rounded-3xl border border-primary/20 bg-primary/5 p-4 text-left"
              >
                <div className="flex gap-3">
                  <img
                    src={reminder.image}
                    alt={reminder.title}
                    className="h-14 w-14 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        <CalendarClock className="h-3 w-3" />
                        Agenda
                      </span>
                      <span className="truncate text-xs font-semibold text-primary">
                        {reminderLabel(reminder.startsAt)}
                      </span>
                    </div>
                    <p className="mt-2 font-black leading-tight">{reminder.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Seu evento salvo começa {reminderLabel(reminder.startsAt).toLowerCase()}.
                    </p>
                    <p className="mt-3 text-xs font-semibold text-muted-foreground">
                      {reminder.venue} · {reminder.date}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {updates.map((update) => (
              <button
                key={update.id}
                type="button"
                onClick={() =>
                  navigate({ to: "/venues/$venueId", params: { venueId: update.venueId } })
                }
                className="w-full rounded-3xl border border-border p-4 text-left"
              >
                <div className="flex gap-3">
                  <img
                    src={update.venueImage}
                    alt={update.venueName}
                    className="h-14 w-14 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        {updateKindLabel(update.kind)}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {update.venueName}
                      </span>
                    </div>
                    <p className="mt-2 font-black leading-tight">{update.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {update.body}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-muted-foreground">
                      {update.venueNeighborhood}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      <FeedActionNav />
    </main>
  );
}

function updateKindLabel(kind: VenueUpdateSummary["kind"]) {
  if (kind === "promo") return "Promoção";
  if (kind === "event") return "Evento";
  return "Aviso";
}

function reminderLabel(startsAt: string) {
  const diffMs = new Date(startsAt).getTime() - Date.now();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `Em ${Math.max(1, diffMinutes)} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Em ${diffHours} h`;

  return "Amanhã";
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
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Megaphone className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-4 font-bold">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <button type="button" onClick={onClick} className="mt-4 text-sm font-bold text-primary">
        {action}
      </button>
    </div>
  );
}
