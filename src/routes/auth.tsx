import { AuthView } from "@neondatabase/auth-ui";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/auth";
import { ptBRAuthLocalization } from "@/lib/auth-localization";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  component: Auth,
});

type Tab = "login" | "signup";
type AccountType = "explorer" | "owner";

function Auth() {
  const navigate = useNavigate();
  const { data, isPending } = authClient.useSession();
  const [tab, setTab] = useState<Tab>("login");
  const [accountType, setAccountType] = useState<AccountType>("explorer");

  useEffect(() => {
    if (isPending || !data?.user?.id) return;

    try {
      localStorage.setItem("chegaai:onboarded", "1");
    } catch {
      // Browsers can block storage in stricter privacy modes.
    }

    navigate({ to: "/post-auth", replace: true });
  }, [data?.user?.id, isPending, navigate]);

  useEffect(() => {
    localStorage.setItem("chegaai:auth-mode", tab);
    if (tab === "signup") {
      localStorage.setItem("chegaai:signup-account-type", accountType);
    }
  }, [accountType, tab]);

  const selectAccountType = (type: AccountType) => {
    setAccountType(type);
    localStorage.setItem("chegaai:signup-account-type", type);
  };

  return (
    <main className="app-shell flex flex-col bg-background px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-xl font-black text-white">
          C
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Bem-vindo ao ChegaAí</h1>
        <p className="text-sm text-muted-foreground">Eventos e bares ao vivo, agora</p>
      </div>

      <div className="mb-6 flex rounded-full bg-muted p-1">
        {(["login", "signup"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-full py-2.5 text-sm font-semibold transition-all",
              tab === t ? "bg-ink text-white" : "text-muted-foreground",
            )}
          >
            {t === "login" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-background p-2">
        {tab === "signup" ? (
          <div className="border-b border-border px-6 pb-5 pt-4">
            <p className="text-sm font-semibold text-foreground">Como você vai usar o ChegaAí?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => selectAccountType("explorer")}
                aria-pressed={accountType === "explorer"}
                className={cn(
                  "flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                  accountType === "explorer"
                    ? "border-ink bg-ink text-white shadow-sm"
                    : "border-border bg-muted/40 text-foreground hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    accountType === "explorer" ? "bg-white/15" : "bg-background",
                  )}
                >
                  <MapPin className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">Quero descobrir lugares</span>
                  <span
                    className={cn(
                      "mt-1 block text-xs leading-snug",
                      accountType === "explorer" ? "text-white/70" : "text-muted-foreground",
                    )}
                  >
                    Encontre bares, eventos ao vivo e rolês perto de você.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectAccountType("owner")}
                aria-pressed={accountType === "owner"}
                className={cn(
                  "flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                  accountType === "owner"
                    ? "border-ink bg-ink text-white shadow-sm"
                    : "border-border bg-muted/40 text-foreground hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    accountType === "owner" ? "bg-white/15" : "bg-background",
                  )}
                >
                  <Store className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">Tenho um estabelecimento</span>
                  <span
                    className={cn(
                      "mt-1 block text-xs leading-snug",
                      accountType === "owner" ? "text-white/70" : "text-muted-foreground",
                    )}
                  >
                    Divulgue seu local, publique eventos e acompanhe check-ins.
                  </span>
                </span>
              </button>
            </div>
          </div>
        ) : null}

        <AuthView
          pathname={tab === "login" ? "sign-in" : "sign-up"}
          redirectTo="/post-auth"
          localization={ptBRAuthLocalization}
          socialLayout="horizontal"
        />
      </div>
    </main>
  );
}
