import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { toast } from "sonner";
import { authClient } from "@/auth";
import {
  getAdminDashboard,
  type AdminDashboard,
  type PrivacyRequestStatus,
  type PrivacyRequestSummary,
  updatePrivacyRequestStatus,
} from "@/lib/admin-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const statusOptions: Array<{ value: PrivacyRequestStatus; label: string }> = [
  { value: "pending", label: "Pendente" },
  { value: "in_review", label: "Em revisão" },
  { value: "resolved", label: "Resolvido" },
  { value: "rejected", label: "Rejeitado" },
];

function AdminPage() {
  const navigate = useNavigate();
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  const loadDashboard = useServerFn(getAdminDashboard);
  const updatePrivacy = useServerFn(updatePrivacyRequestStatus);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = useCallback(
    async (userId = user?.id) => {
      if (!userId) return;
      setLoadState("loading");
      try {
        const nextDashboard = await loadDashboard({ data: { userId } });
        setDashboard(nextDashboard);
        setNotes(
          Object.fromEntries(
            nextDashboard.privacyRequests.map((request) => [
              request.id,
              request.internalNote ?? "",
            ]),
          ),
        );
        setLoadState("ready");
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Não foi possível carregar o admin.";
        setLoadState(message.includes("autorizado") ? "denied" : "error");
      }
    },
    [loadDashboard, user?.id],
  );

  useEffect(() => {
    if (isPending) return;
    if (!user?.id) {
      navigate({ to: "/auth" });
      return;
    }
    void refresh(user.id);
  }, [isPending, navigate, refresh, user?.id]);

  async function changePrivacyStatus(request: PrivacyRequestSummary, status: PrivacyRequestStatus) {
    if (!user?.id || savingId) return;
    setSavingId(request.id);
    try {
      const updated = await updatePrivacy({
        data: {
          userId: user.id,
          requestId: request.id,
          status,
          internalNote: notes[request.id],
        },
      });
      setDashboard((current) =>
        current
          ? {
              ...current,
              metrics: {
                ...current.metrics,
                privacyPending: current.privacyRequests.filter((item) =>
                  item.id === updated.id ? updated.status === "pending" : item.status === "pending",
                ).length,
              },
              privacyRequests: current.privacyRequests.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setNotes((current) => ({ ...current, [updated.id]: updated.internalNote ?? "" }));
      toast.success("Pedido LGPD atualizado.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Não foi possível atualizar o pedido.";
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  }

  if (loadState === "loading" || isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-black">Carregando painel admin</p>
        </div>
      </main>
    );
  }

  if (loadState === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-sm rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-xl font-black tracking-tight">Acesso restrito</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Seu usuário não está cadastrado como admin do ChegaAí.
          </p>
          <button
            type="button"
            className="mt-5 h-11 rounded-full bg-primary px-5 text-sm font-black text-white"
            onClick={() => navigate({ to: "/profile" })}
          >
            Voltar ao perfil
          </button>
        </div>
      </main>
    );
  }

  if (!dashboard || loadState === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-sm rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-black tracking-tight">Admin indisponível</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Verifique `DATABASE_URL` e tente novamente.
          </p>
          <button
            type="button"
            className="mt-5 h-11 rounded-full bg-primary px-5 text-sm font-black text-white"
            onClick={() => void refresh()}
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 rounded-[2rem] bg-ink p-5 text-white shadow-[0_20px_60px_-36px_rgba(5,5,5,0.8)] sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/75">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin ChegaAí
            </span>
            <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Operação, privacidade e moderação em um só painel.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-white/65">
              Versão web responsiva para administrar pedidos LGPD e acompanhar os principais números
              do app.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 text-sm font-bold text-white/80 sm:min-w-52">
            <p className="truncate text-white">
              {dashboard.admin.displayName ?? dashboard.admin.email ?? "Admin"}
            </p>
            <p className="mt-1 truncate text-xs text-white/55">{dashboard.admin.role}</p>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={<UsersRound />} label="Usuários" value={dashboard.metrics.users} />
          <MetricCard icon={<Store />} label="Estabelecimentos" value={dashboard.metrics.venues} />
          <MetricCard icon={<CalendarDays />} label="Eventos" value={dashboard.metrics.events} />
          <MetricCard
            icon={<ShieldCheck />}
            label="LGPD pendentes"
            value={dashboard.metrics.privacyPending}
            signal
          />
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight">Pedidos LGPD</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Revise pedidos de exclusão antes de anonimizar ou remover dados.
                </p>
              </div>
              <button
                type="button"
                className="h-10 rounded-full bg-muted px-4 text-sm font-black text-foreground"
                onClick={() => void refresh()}
              >
                Atualizar
              </button>
            </div>

            {dashboard.privacyRequests.length ? (
              <div className="mt-5 space-y-3 lg:space-y-0 lg:overflow-hidden lg:rounded-3xl lg:border lg:border-border">
                <div className="hidden grid-cols-[1fr_150px_170px_190px] gap-3 bg-muted px-4 py-3 text-xs font-black text-muted-foreground lg:grid">
                  <span>Pedido</span>
                  <span>Status</span>
                  <span>Criado em</span>
                  <span>Ação</span>
                </div>
                {dashboard.privacyRequests.map((request) => (
                  <PrivacyRequestRow
                    key={request.id}
                    request={request}
                    note={notes[request.id] ?? ""}
                    saving={savingId === request.id}
                    onNoteChange={(note) =>
                      setNotes((current) => ({ ...current, [request.id]: note }))
                    }
                    onStatusChange={(status) => void changePrivacyStatus(request, status)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl bg-muted p-5 text-sm font-semibold text-muted-foreground">
                Nenhum pedido LGPD registrado ainda.
              </div>
            )}
          </section>

          <aside className="rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-5">
            <h2 className="text-xl font-black tracking-tight">Últimos usuários</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastros recentes em `user_profiles`.
            </p>
            <div className="mt-5 space-y-3">
              {dashboard.recentUsers.length ? (
                dashboard.recentUsers.map((profile) => (
                  <div key={profile.userId} className="rounded-3xl bg-muted p-4">
                    <p className="truncate text-sm font-black">
                      {profile.displayName ?? "Usuário sem nome"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {profile.accountType === "owner" ? "Estabelecimento" : "Explorador"}
                    </p>
                    {profile.email ? (
                      <p className="mt-2 truncate text-xs text-muted-foreground">{profile.email}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-3xl bg-muted p-4 text-sm font-semibold text-muted-foreground">
                  Nenhum perfil encontrado.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  signal,
}: {
  icon: ReactElement;
  label: string;
  value: number;
  signal?: boolean;
}) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-sm">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full [&_svg]:h-5 [&_svg]:w-5",
          signal ? "bg-primary/10 text-primary" : "bg-muted text-foreground",
        )}
      >
        {icon}
      </div>
      <p className="mt-5 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

function PrivacyRequestRow({
  request,
  note,
  saving,
  onNoteChange,
  onStatusChange,
}: {
  request: PrivacyRequestSummary;
  note: string;
  saving: boolean;
  onNoteChange: (note: string) => void;
  onStatusChange: (status: PrivacyRequestStatus) => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-background p-4 lg:grid lg:grid-cols-[1fr_150px_170px_190px] lg:gap-3 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} />
          <p className="text-xs font-bold text-muted-foreground">{request.requestType}</p>
        </div>
        <p className="mt-3 truncate text-sm font-black">{request.email ?? request.userId}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{request.userId}</p>
        {request.reason ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{request.reason}</p>
        ) : null}
        <textarea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Observação interna"
          className="mt-3 min-h-20 w-full resize-none rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none ring-primary/25 transition focus:ring-4"
        />
      </div>

      <div className="mt-3 lg:mt-0">
        <label className="text-xs font-black text-muted-foreground lg:hidden">Status</label>
        <select
          value={request.status}
          onChange={(event) => onStatusChange(event.target.value as PrivacyRequestStatus)}
          disabled={saving}
          className="mt-1 h-11 w-full rounded-full border border-border bg-card px-3 text-sm font-black outline-none ring-primary/25 transition focus:ring-4 disabled:opacity-60 lg:mt-0"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 text-sm font-semibold text-muted-foreground lg:mt-0">
        {formatDate(request.createdAt)}
      </div>

      <div className="mt-3 lg:mt-0">
        <button
          type="button"
          disabled={saving}
          className="h-11 w-full rounded-full bg-ink px-4 text-sm font-black text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onStatusChange(request.status)}
        >
          {saving ? "Salvando..." : "Salvar nota"}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PrivacyRequestStatus }) {
  const label = statusOptions.find((option) => option.value === status)?.label ?? status;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-black",
        status === "pending" ? "bg-primary/10 text-primary" : undefined,
        status === "in_review" ? "bg-amber-500/10 text-amber-700" : undefined,
        status === "resolved" ? "bg-emerald-500/10 text-emerald-700" : undefined,
        status === "rejected" ? "bg-muted text-muted-foreground" : undefined,
      )}
    >
      {label}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
