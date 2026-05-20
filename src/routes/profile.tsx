import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, Star } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { PillButton } from "@/components/pill-button";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();

  return (
    <main className="app-shell bg-background pb-32">
      <header className="flex items-center justify-between px-6 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <div className="mt-6 flex flex-col items-center px-6">
        <div className="h-24 w-24 rounded-full bg-muted" />
        <h2 className="mt-3 text-xl font-bold">Convidado</h2>
        <p className="text-sm text-muted-foreground">guest@chegaai.app</p>

        <div className="mt-6 grid w-full grid-cols-3 gap-2 rounded-3xl bg-muted p-4 text-center">
          <Stat label="Check-ins" value="0" />
          <Stat label="Avaliações" value="0" />
          <Stat label="Salvos" value="3" />
        </div>

        <div className="mt-6 w-full space-y-2">
          <Row icon={<Star className="h-4 w-4" />} label="Minhas avaliações" />
          <Row icon={<LogOut className="h-4 w-4" />} label="Sair" onClick={() => navigate({ to: "/auth" })} />
        </div>

        <PillButton
          variant="primary"
          size="lg"
          className="mt-8 w-full"
          onClick={() => navigate({ to: "/discover" })}
        >
          Voltar para Discover
        </PillButton>
      </div>

      <BottomNav />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-muted px-4 py-3.5 text-left text-sm font-medium"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background">
        {icon}
      </span>
      {label}
    </button>
  );
}
