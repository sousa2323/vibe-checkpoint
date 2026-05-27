import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "@/auth";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const { data, isPending } = authClient.useSession();
  const user = data?.user;

  useEffect(() => {
    if (isPending) return;

    let seen = false;
    try {
      seen = localStorage.getItem("chegaai:onboarded") === "1";
      if (user?.id) {
        localStorage.setItem("chegaai:onboarded", "1");
      }
    } catch {
      seen = false;
    }

    const t = setTimeout(() => {
      if (user?.id) {
        navigate({ to: "/post-auth", replace: true });
        return;
      }

      navigate({ to: seen ? "/auth" : "/onboarding", replace: true });
    }, 700);
    return () => clearTimeout(t);
  }, [isPending, navigate, user?.id]);

  return (
    <main className="app-shell flex flex-col items-center justify-center overflow-hidden bg-background px-8 text-foreground">
      <div className="absolute inset-x-0 top-[-120px] mx-auto h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute inset-x-8 bottom-16 h-24 rounded-full bg-foreground/5 blur-2xl" />
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary text-3xl font-black text-white shadow-[0_18px_40px_rgba(241,58,90,0.28)]">
          C
        </div>
        <h1 className="text-3xl font-black tracking-tight">ChegaAí</h1>
        <p className="text-sm text-muted-foreground">Onde a noite acontece agora</p>
        <div className="mt-6 flex w-full min-w-64 gap-3">
          <a
            href="/onboarding"
            className="flex-1 rounded-full bg-primary px-5 py-3 text-center text-sm font-bold text-primary-foreground shadow-sm"
          >
            Começar
          </a>
          <a
            href="/auth"
            className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-center text-sm font-bold text-card-foreground shadow-sm"
          >
            Entrar
          </a>
        </div>
      </div>
    </main>
  );
}
