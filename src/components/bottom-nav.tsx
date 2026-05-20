import { Link, useLocation } from "@tanstack/react-router";
import { Compass, MapPin, Calendar, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/map", icon: MapPin, label: "Map" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/profile", icon: User, label: "Profile" },
] as const;

export function BottomNav({ onFabClick }: { onFabClick?: () => void }) {
  const { pathname } = useLocation();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4">
      <div className="pointer-events-auto relative mx-4 flex w-full max-w-[420px] items-center justify-between rounded-full bg-foreground px-6 py-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
        {items.slice(0, 2).map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
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

        <div className="w-14" aria-hidden />

        {items.slice(2).map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
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

        <button
          type="button"
          onClick={onFabClick}
          aria-label="Check-in rápido"
          className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/3 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-4 ring-background transition-transform active:scale-95"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
