import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/bottom-nav";
import { mockEvents } from "@/lib/mock-data";

export const Route = createFileRoute("/calendar")({
  component: CalendarView,
});

function CalendarView() {
  return (
    <main className="app-shell bg-background pb-32">
      <header className="px-6 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Meus eventos</h1>
        <p className="text-sm text-muted-foreground">Salvos e confirmados</p>
      </header>

      <div className="mt-6 space-y-3 px-6">
        {mockEvents.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-3 rounded-2xl bg-muted p-3"
          >
            <img
              src={e.image}
              alt=""
              className="h-16 w-16 rounded-2xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{e.title}</p>
              <p className="truncate text-xs text-muted-foreground">{e.venue}</p>
              <p className="mt-1 text-xs font-semibold text-primary">{e.date}</p>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
