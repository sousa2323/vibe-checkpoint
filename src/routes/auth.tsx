import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PillButton } from "@/components/pill-button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  component: Auth,
});

type Tab = "login" | "signup";

function Auth() {
  const [tab, setTab] = useState<Tab>("login");
  const [accountType, setAccountType] = useState<"cliente" | "dono">("cliente");
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Mock: vai para Discover
    navigate({ to: "/discover" });
  }

  return (
    <main className="app-shell flex flex-col bg-background px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-xl font-black text-white">
          C
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Bem-vindo ao ChegaAí</h1>
        <p className="text-sm text-muted-foreground">
          Eventos e bares ao vivo, agora
        </p>
      </div>

      <div className="mb-6 flex rounded-full bg-muted p-1">
        {(["login", "signup"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-full py-2.5 text-sm font-semibold transition-all",
              tab === t ? "bg-foreground text-white" : "text-muted-foreground",
            )}
          >
            {t === "login" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {tab === "signup" && (
          <>
            <Input placeholder="Seu nome" />
            <div className="grid grid-cols-2 gap-2">
              {(["cliente", "dono"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAccountType(t)}
                  className={cn(
                    "rounded-2xl border p-3 text-left text-sm font-medium transition-all",
                    accountType === t
                      ? "border-foreground bg-foreground text-white"
                      : "border-border bg-background text-foreground",
                  )}
                >
                  <div className="font-bold">
                    {t === "cliente" ? "Cliente" : "Estabelecimento"}
                  </div>
                  <div className="mt-0.5 text-[11px] opacity-70">
                    {t === "cliente" ? "Descobrir eventos" : "Divulgar meu local"}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <Input type="email" placeholder="E-mail" required />
        <Input type="password" placeholder="Senha" required />

        {tab === "login" && (
          <button
            type="button"
            className="mb-1 self-end text-xs font-medium text-muted-foreground"
          >
            Esqueci minha senha
          </button>
        )}

        <PillButton type="submit" variant="primary" size="lg" className="mt-2">
          {tab === "login" ? "Entrar" : "Criar conta"}
        </PillButton>

        <PillButton type="button" variant="outline" size="lg">
          Continuar com Google
        </PillButton>
      </form>
    </main>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-12 w-full rounded-full bg-muted px-5 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
    />
  );
}
