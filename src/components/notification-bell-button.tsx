import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/auth";
import { getUnreadNotificationCount } from "@/lib/data";
import { cn } from "@/lib/utils";

export function NotificationBellButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user;
  const loadUnreadCount = useServerFn(getUnreadNotificationCount);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    loadUnreadCount({ data: { userId: user.id } })
      .then(setUnreadCount)
      .catch(() => setUnreadCount(0));
  }, [loadUnreadCount, user?.id]);

  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/updates" })}
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground transition-colors active:scale-95",
        className,
      )}
      aria-label="Abrir novidades"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 ? <NotificationBadge count={unreadCount} /> : null}
    </button>
  );
}

function NotificationBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-5 text-white ring-2 ring-background">
      {count > 9 ? "9+" : count}
    </span>
  );
}
