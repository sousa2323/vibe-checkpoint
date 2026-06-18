import { Link, useLocation } from "@tanstack/react-router";
import { Compass, MapPin, Calendar, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/discover", icon: Compass, label: "Explorar" },
  { to: "/map", icon: MapPin, label: "Mapa" },
  { to: "/calendar", icon: Calendar, label: "Agenda" },
  { to: "/profile", icon: User, label: "Perfil" },
] as const;

export function BottomNav({ onFabClick }: { onFabClick?: () => void }) {
  const { pathname } = useLocation();
  const showFab = Boolean(onFabClick);
  const leftItems = showFab ? items.slice(0, 2) : items;
  const rightItems = showFab ? items.slice(2) : [];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4">
      <div className="pointer-events-auto relative mx-4 flex w-full max-w-[420px] items-center justify-between rounded-full bg-ink px-6 py-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
        {leftItems.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              preload="viewport"
              className={cn(
                "flex flex-col items-center gap-0.5 text-[10px] transition-colors",
                active ? "text-white" : "text-white/50",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}

        {showFab ? <div className="w-14" aria-hidden /> : null}

        {rightItems.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              preload="viewport"
              className={cn(
                "flex flex-col items-center gap-0.5 text-[10px] transition-colors",
                active ? "text-white" : "text-white/50",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}

        {showFab ? (
          <button
            type="button"
            onClick={onFabClick}
            aria-label="Criar postagem"
            className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/3 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-4 ring-background transition-transform active:scale-95"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
