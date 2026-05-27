import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type KeyboardEvent, useEffect, useState } from "react";
import { authClient } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAuthToastMessage } from "@/lib/auth-localization";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return formatAuthToastMessage(error.message);
  if (typeof error === "string") return formatAuthToastMessage(error);
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return formatAuthToastMessage(message);
  }

  return "Não foi possível redefinir a senha. Solicite um novo link e tente novamente.";
}

function cleanRecoveryUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("type");
  url.searchParams.delete("next");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
}

function ResetPassword() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>("Validando link de recuperação...");
  const [linkReady, setLinkReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function prepareRecoverySession() {
      const code = new URL(window.location.href).searchParams.get("code");
      if (!code) {
        setLinkReady(true);
        setStatus(null);
        return;
      }

      try {
        await authClient.exchangeCodeForSession(code);
        if (cancelled) return;
        cleanRecoveryUrl();
        setHasRecoverySession(true);
        setLinkReady(true);
        setStatus(null);
      } catch (error) {
        if (cancelled) return;
        setLinkError(getErrorMessage(error));
        setStatus(null);
      }
    }

    void prepareRecoverySession();

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    if (password.length < 6) {
      setStatus("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("As senhas não conferem.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Salvando nova senha...");

    try {
      await authClient.updatePassword({ password });
      setStatus("Senha atualizada com sucesso. Entrando no app...");
      window.setTimeout(() => navigate({ to: "/post-auth", replace: true }), 900);
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!isSubmitting && linkReady) void submit();
  };

  const hasSession = Boolean(session.data?.user?.id);
  const canUpdatePassword = hasRecoverySession || hasSession;
  const isLoading = !linkReady || (session.isPending && !hasRecoverySession);

  return (
    <main className="app-shell flex flex-col bg-background px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-xl font-black text-white">
          C
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Redefinir senha</h1>
        <p className="text-center text-sm text-muted-foreground">
          Crie uma nova senha para acessar sua conta.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-background p-2">
        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          {linkError ? (
            <div className="grid gap-5">
              <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                {linkError}
              </p>
              <Button
                type="button"
                className="h-10 rounded-xl bg-primary"
                onClick={() => navigate({ to: "/auth", replace: true })}
              >
                Pedir novo link
              </Button>
            </div>
          ) : (
            <div className="grid gap-5">
              <div>
                <h2 className="text-xl font-bold">Nova senha</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Digite e confirme sua nova senha abaixo.
                </p>
              </div>

              {!isLoading && !canUpdatePassword ? (
                <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Link inválido ou expirado. Solicite a recuperação novamente.
                </p>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Nova senha"
                  value={password}
                  disabled={isSubmitting || isLoading || !canUpdatePassword}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={submitOnEnter}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirme a nova senha"
                  value={confirmPassword}
                  disabled={isSubmitting || isLoading || !canUpdatePassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onKeyDown={submitOnEnter}
                />
              </div>

              {status ? (
                <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {status}
                </p>
              ) : null}

              <Button
                type="button"
                className="h-10 rounded-xl bg-primary"
                disabled={isSubmitting || isLoading || !canUpdatePassword}
                onClick={() => void submit()}
              >
                {isSubmitting ? "Salvando..." : "Salvar nova senha"}
              </Button>

              <button
                type="button"
                className="text-sm font-medium text-muted-foreground underline"
                disabled={isSubmitting}
                onClick={() => navigate({ to: "/auth", replace: true })}
              >
                Voltar para entrar
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
