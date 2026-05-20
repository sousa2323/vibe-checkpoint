import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/map")({
  component: MapView,
});

function MapView() {
  return (
    <main className="app-shell bg-muted pb-32">
      <header className="px-6 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Bares próximos</h1>
        <p className="text-sm text-muted-foreground">
          Veja o que está acontecendo perto de você
        </p>
      </header>

      <div className="mx-6 mt-6 flex h-[60vh] items-center justify-center rounded-3xl bg-foreground/5 text-center text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <MapPin className="h-10 w-10" />
          <p className="text-sm">Mapa em breve</p>
          <p className="text-xs">Geolocalização habilitada na Fase 3</p>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
