import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Archive, Bell, CalendarClock, ChevronDown, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/auth";
import { FeedActionNav } from "@/components/feed-action-nav";
import {
  archiveNotification,
  archiveReadNotifications,
  getNotifications,
  markNotificationsSeen,
  type NotificationSummary,
} from "@/lib/data";

export const Route = createFileRoute("/updates")({
  component: UpdatesPage,
});

function UpdatesPage() {
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user;
  const loadNotifications = useServerFn(getNotifications);
  const markSeen = useServerFn(markNotificationsSeen);
  const archiveOne = useServerFn(archiveNotification);
  const archiveRead = useServerFn(archiveReadNotifications);
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOlder, setShowOlder] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadNotifications({ data: { userId: user.id } })
      .then((nextNotifications) => {
        setNotifications(nextNotifications);
        return markSeen({ data: { userId: user.id } }).then(() => {
          setNotifications((current) =>
            current.map((notification) => ({ ...notification, read: true })),
          );
        });
      })
      .catch(() => {
        setNotifications([]);
      })
      .finally(() => setLoading(false));
  }, [loadNotifications, markSeen, user?.id]);

  const archiveNotificationItem = (notificationId: string) => {
    if (!user?.id) return;

    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );
    void archiveOne({ data: { userId: user.id, notificationId } });
  };

  const archiveSeenNotifications = () => {
    if (!user?.id) return;

    setNotifications((current) => current.filter((notification) => !notification.read));
    setShowOlder(false);
    void archiveRead({ data: { userId: user.id } });
  };

  const recentNotifications = notifications.slice(0, 3);
  const olderNotifications = notifications.slice(3);

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
        ) : notifications.length === 0 ? (
          <EmptyState
            title="Nenhuma novidade ainda"
            text="Siga seus locais favoritos para acompanhar promoções e avisos publicados por eles."
            action="Explorar locais"
            onClick={() => navigate({ to: "/map" })}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 rounded-3xl bg-muted px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                {notifications.length} {notifications.length === 1 ? "aviso" : "avisos"} na sua
                lista
              </p>
              <button
                type="button"
                onClick={archiveSeenNotifications}
                className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
              >
                <Archive className="h-3.5 w-3.5" />
                Limpar visualizadas
              </button>
            </div>

            {recentNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onOpen={() => openNotification(notification, navigate)}
                onArchive={() => archiveNotificationItem(notification.id)}
              />
            ))}

            {olderNotifications.length > 0 ? (
              <section className="rounded-3xl border border-border">
                <button
                  type="button"
                  onClick={() => setShowOlder((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <span>
                    <span className="block text-sm font-black">Novidades anteriores</span>
                    <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                      {olderNotifications.length}{" "}
                      {olderNotifications.length === 1 ? "item" : "itens"}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition ${showOlder ? "rotate-180" : ""}`}
                  />
                </button>

                {showOlder ? (
                  <div className="space-y-3 border-t border-border p-3">
                    {olderNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        compact
                        onOpen={() => openNotification(notification, navigate)}
                        onArchive={() => archiveNotificationItem(notification.id)}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </div>

      <FeedActionNav />
    </main>
  );
}

function NotificationItem({
  notification,
  compact = false,
  onOpen,
  onArchive,
}: {
  notification: NotificationSummary;
  compact?: boolean;
  onOpen: () => void;
  onArchive: () => void;
}) {
  return (
    <article className="rounded-3xl border border-border p-4 text-left">
      <div className="flex gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex gap-3">
            {notification.image ? (
              <img
                src={notification.image}
                alt={notification.title}
                className={`${compact ? "h-12 w-12" : "h-14 w-14"} rounded-2xl object-cover`}
              />
            ) : (
              <span
                className={`${compact ? "h-12 w-12" : "h-14 w-14"} flex shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary`}
              >
                <Bell className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  {notification.type === "event_reminder" ? (
                    <CalendarClock className="h-3 w-3" />
                  ) : null}
                  {notificationTypeLabel(notification.type)}
                </span>
                {!notification.read ? <span className="h-2 w-2 rounded-full bg-red-500" /> : null}
              </div>
              <p className="mt-2 font-black leading-tight">{notification.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {notification.body}
              </p>
              <p className="mt-3 text-xs font-semibold text-muted-foreground">
                {formatNotificationDate(notification.createdAt)}
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onArchive}
          aria-label="Arquivar novidade"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground"
        >
          <Archive className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function notificationTypeLabel(type: NotificationSummary["type"]) {
  if (type === "event_reminder") return "Agenda";
  if (type === "post_comment") return "Comentário";
  if (type === "group_activity") return "Grupo";
  if (type === "reward") return "Recompensa";
  return "Novidade";
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(value))
    .replace(".", "");
}

function openNotification(
  notification: NotificationSummary,
  navigate: ReturnType<typeof useNavigate>,
) {
  if (notification.targetType === "event") {
    navigate({ to: "/events/$eventId", params: { eventId: notification.targetId } });
    return;
  }

  if (notification.targetType === "venue") {
    navigate({ to: "/venues/$venueId", params: { venueId: notification.targetId } });
    return;
  }

  if (notification.targetType === "group") {
    navigate({ to: "/groups/$groupId", params: { groupId: notification.targetId } });
    return;
  }

  navigate({ to: "/updates" });
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
