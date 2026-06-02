import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, Store } from "lucide-react";
import { type KeyboardEvent, useEffect, useState } from "react";
import { authClient } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAuthToastMessage } from "@/lib/auth-localization";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  component: Auth,
});

type Tab = "login" | "signup";
type AccountType = "explorer" | "owner";
const publicAppOrigin = "https://vibe-checkpoint.vercel.app";
const legalConsentVersion = "2026-06-02";

function writeSignupIntent(accountType: AccountType) {
  try {
    localStorage.setItem("chegaai:auth-mode", "signup");
    localStorage.setItem("chegaai:signup-account-type", accountType);
  } catch {
    // Browsers can block storage in stricter privacy modes.
  }
}

function getPostAuthRedirectUrl(accountType: AccountType) {
  const url = new URL("/post-auth", window.location.origin);
  url.searchParams.set("account_type", accountType);
  return url.toString();
}

function getPasswordResetRedirectUrl() {
  const origin = ["https://localhost", "capacitor://localhost"].includes(window.location.origin)
    ? publicAppOrigin
    : window.location.origin;

  return new URL("/reset-password", origin).toString();
}

function Auth() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const { data, isPending } = session;
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
    try {
      localStorage.setItem("chegaai:auth-mode", tab);
      if (tab === "signup") {
        localStorage.setItem("chegaai:signup-account-type", accountType);
      } else {
        localStorage.removeItem("chegaai:signup-account-type");
      }
    } catch {
      // Browsers can block storage in stricter privacy modes.
    }
  }, [accountType, tab]);

  const selectAccountType = (type: AccountType) => {
    setAccountType(type);
    writeSignupIntent(type);
  };

  const finishLogin = async () => {
    await session.refetch();
    navigate({ to: "/post-auth", replace: true });
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

        {tab === "login" ? (
          <LoginForm onCreateAccount={() => setTab("signup")} onSignedIn={finishLogin} />
        ) : (
          <SignupForm accountType={accountType} onSignedUp={finishLogin} />
        )}
      </div>
    </main>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return formatAuthToastMessage(error.message);
  if (typeof error === "string") return formatAuthToastMessage(error);
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return formatAuthToastMessage(message);
  }

  return "Não foi possível entrar. Confira email e senha e tente novamente.";
}

function LoginForm({
  onCreateAccount,
  onSignedIn,
}: {
  onCreateAccount: () => void;
  onSignedIn: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const emailParam = url.searchParams.get("email");
    if (emailParam) setEmail(emailParam);

    if (url.searchParams.has("email") || url.searchParams.has("password")) {
      url.searchParams.delete("email");
      url.searchParams.delete("password");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, []);

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setStatus("Informe email e senha para entrar.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Entrando...");

    try {
      await authClient.signIn.email({
        email: trimmedEmail,
        password,
      });

      await onSignedIn();
    } catch (error) {
      setStatus(getErrorMessage(error));
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPasswordRecovery = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatus("Informe seu email para recuperar a senha.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Enviando link de recuperação...");

    try {
      await authClient.resetPassword.email({
        email: trimmedEmail,
        redirectTo: getPasswordResetRedirectUrl(),
      });
      setStatus("Enviamos um link para redefinir sua senha. Confira seu email.");
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (isSubmitting) return;
    if (isRecoveringPassword) void submitPasswordRecovery();
    else void submit();
  };

  if (isRecoveringPassword) {
    return (
      <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Recuperar senha</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Informe seu email e enviaremos um link para criar uma nova senha.
          </p>
        </div>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="recovery-email">Email</Label>
            <Input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              disabled={isSubmitting}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={submitOnEnter}
            />
          </div>

          {status ? (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{status}</p>
          ) : null}

          <Button
            type="button"
            className="h-10 rounded-xl bg-primary"
            disabled={isSubmitting}
            onClick={() => void submitPasswordRecovery()}
          >
            {isSubmitting ? "Enviando..." : "Enviar link"}
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Lembrou a senha?{" "}
          <button
            type="button"
            className="font-medium text-foreground underline"
            disabled={isSubmitting}
            onClick={() => {
              setIsRecoveringPassword(false);
              setStatus(null);
            }}
          >
            Voltar para entrar
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Entrar</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre com seu email para acessar sua conta.
        </p>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            value={email}
            disabled={isSubmitting}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={submitOnEnter}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Senha</Label>
            <button
              type="button"
              className="text-sm hover:underline"
              disabled={isSubmitting}
              onClick={() => {
                setIsRecoveringPassword(true);
                setStatus(null);
              }}
            >
              Esqueceu sua senha?
            </button>
          </div>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Senha"
            value={password}
            disabled={isSubmitting}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={submitOnEnter}
          />
        </div>

        {status ? (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{status}</p>
        ) : null}

        <Button
          type="button"
          className="h-10 rounded-xl bg-primary"
          disabled={isSubmitting}
          onClick={() => void submit()}
        >
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ainda não tem uma conta?{" "}
        <button
          type="button"
          className="font-medium text-foreground underline"
          disabled={isSubmitting}
          onClick={onCreateAccount}
        >
          Criar conta
        </button>
      </p>
    </div>
  );
}

function SignupForm({
  accountType,
  onSignedUp,
}: {
  accountType: AccountType;
  onSignedUp: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail || !password) {
      setStatus("Informe email e senha para criar sua conta.");
      return;
    }

    if (!acceptedLegal) {
      setStatus("Leia e aceite os Termos de Uso e a Política de Privacidade para criar sua conta.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Criando conta...");

    try {
      writeSignupIntent(accountType);

      const result = await authClient.signUp.email({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName || undefined,
            account_type: accountType,
            accountType,
            legal_consent_version: legalConsentVersion,
            legal_consent_at: new Date().toISOString(),
            terms_accepted: true,
            privacy_accepted: true,
          },
          emailRedirectTo: getPostAuthRedirectUrl(accountType),
        },
      });

      if (result.needsEmailConfirmation) {
        setStatus("Conta criada. Confira seu email para confirmar o acesso.");
        setPassword("");
        return;
      }

      await onSignedUp();
    } catch (error) {
      setStatus(getErrorMessage(error));
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!isSubmitting) void submit();
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Criar conta</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use email e senha para entrar no ChegaAí.
        </p>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="signup-name">Nome</Label>
          <Input
            id="signup-name"
            name="name"
            autoComplete="name"
            placeholder="Seu nome"
            value={name}
            disabled={isSubmitting}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={submitOnEnter}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            value={email}
            disabled={isSubmitting}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={submitOnEnter}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="signup-password">Senha</Label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Senha"
            value={password}
            disabled={isSubmitting}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={submitOnEnter}
          />
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-primary"
            checked={acceptedLegal}
            disabled={isSubmitting}
            onChange={(event) => setAcceptedLegal(event.currentTarget.checked)}
          />
          <span className="text-muted-foreground">
            Li e aceito os{" "}
            <Link to="/terms" className="font-bold text-foreground underline underline-offset-4">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link to="/privacy" className="font-bold text-foreground underline underline-offset-4">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>

        {status ? (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{status}</p>
        ) : null}

        <Button
          type="button"
          className="h-10 rounded-xl bg-primary"
          disabled={isSubmitting || !acceptedLegal}
          onClick={() => void submit()}
        >
          {isSubmitting ? "Criando..." : "Criar conta"}
        </Button>
      </div>
    </div>
  );
}
