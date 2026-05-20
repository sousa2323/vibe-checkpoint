import { createFileRoute } from "@tanstack/react-router";
import { Bell, MessageCircle, Search, SlidersHorizontal } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { EventCard } from "@/components/event-card";
import { mockEvents, mockSpills } from "@/lib/mock-data";

export const Route = createFileRoute("/discover")({
  component: Discover,
});

function Discover() {
  return (
    <main className="app-shell bg-background pb-32">
      <header className="flex items-start justify-between px-6 pt-8">
        <div>
          <p className="text-xs text-muted-foreground">Encontre eventos em</p>
          <p className="text-lg font-bold tracking-tight">São Paulo, Brasil</p>
        </div>
        <div className="flex items-center gap-2">
          <IconBtn>
            <MessageCircle className="h-5 w-5" />
          </IconBtn>
          <IconBtn>
            <Bell className="h-5 w-5" />
          </IconBtn>
        </div>
      </header>

      <div className="mt-5 flex items-center gap-2 px-6">
        <div className="flex h-12 flex-1 items-center gap-2 rounded-full bg-muted px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Buscar"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button className="text-xs font-medium text-muted-foreground">
            Ver tudo
          </button>
        </div>
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-white">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      <Section title="Evento Popular" action="Ver tudo">
        <div className="px-6">
          <EventCard {...mockEvents[0]} />
        </div>
      </Section>

      <Section title="Acontecendo agora" action="Ver tudo">
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-6">
          {mockEvents.slice(1).map((e) => (
            <div key={e.id} className="w-72 shrink-0">
              <EventCard {...e} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Contas para dividir">
        <div className="space-y-2 px-6">
          {mockSpills.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-2xl bg-muted p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Vence: {s.dueDate}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{s.amount}</p>
                <p className="text-[10px] text-muted-foreground">Valor a pagar</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <BottomNav />
    </main>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between px-6">
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        {action && (
          <button className="text-xs font-medium text-muted-foreground">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground">
      {children}
    </button>
  );
}
