import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const seen =
      typeof window !== "undefined" &&
      localStorage.getItem("chegaai:onboarded") === "1";
    const t = setTimeout(() => {
      navigate({ to: seen ? "/auth" : "/onboarding" });
    }, 900);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <main className="app-shell flex flex-col items-center justify-center bg-foreground text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-3xl font-black">
          C
        </div>
        <h1 className="text-3xl font-black tracking-tight">ChegaAí</h1>
        <p className="text-sm text-white/60">Onde a noite acontece agora</p>
      </div>
    </main>
  );
}
