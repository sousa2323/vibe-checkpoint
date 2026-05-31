import { Link, useLocation } from "@tanstack/react-router";
import { CalendarPlus, Store, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function OwnerNav({ onCreate }: { onCreate: () => void }) {
  const { pathname } = useLocation();
  const dashboardActive = pathname === "/venue-dashboard";
  const profileActive = pathname === "/profile";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4">
      <div className="pointer-events-auto relative mx-4 flex w-full max-w-[420px] items-center justify-around rounded-full bg-ink px-8 py-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
        <Link
          to="/venue-dashboard"
          className={cn(
            "flex flex-col items-center gap-0.5 text-[10px] transition-colors",
            dashboardActive ? "text-white" : "text-white/50",
          )}
        >
          <Store className="h-5 w-5" strokeWidth={dashboardActive ? 2.5 : 2} />
          <span className="font-medium">Painel</span>
        </Link>

        <div className="w-14" aria-hidden />

        <Link
          to="/profile"
          className={cn(
            "flex flex-col items-center gap-0.5 text-[10px] transition-colors",
            profileActive ? "text-white" : "text-white/50",
          )}
        >
          <User className="h-5 w-5" strokeWidth={profileActive ? 2.5 : 2} />
          <span className="font-medium">Perfil</span>
        </Link>

        <button
          type="button"
          onClick={onCreate}
          aria-label="Publicar evento"
          className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/3 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-4 ring-background transition-transform active:scale-95"
        >
          <CalendarPlus className="h-7 w-7" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
