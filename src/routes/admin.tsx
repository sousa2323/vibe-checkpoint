import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  Eye,
  History,
  LoaderCircle,
  LockKeyhole,
  Search,
  ShieldCheck,
  Store,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { toast } from "sonner";
import { authClient } from "@/auth";
import {
  getAdminAuditLogs,
  getAdminDashboard,
  getAdminUserDetail,
  getAdminUsers,
  type AdminAuditLogSummary,
  type AdminDashboard,
  type AdminNamedItem,
  type AdminTextItem,
  type AdminUserDetail,
  type AdminUserSummary,
  type PrivacyRequestStatus,
  type PrivacyRequestSummary,
  updatePrivacyRequestStatus,
} from "@/lib/admin-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type AdminTab = "overview" | "users" | "privacy" | "audit";

const tabs: Array<{ value: AdminTab; label: string }> = [
  { value: "overview", label: "Visão geral" },
  { value: "users", label: "Usuários" },
  { value: "privacy", label: "LGPD" },
  { value: "audit", label: "Auditoria" },
];

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
  const loadUsers = useServerFn(getAdminUsers);
  const loadUserDetail = useServerFn(getAdminUserDetail);
  const loadAuditLogs = useServerFn(getAdminAuditLogs);
  const updatePrivacy = useServerFn(updatePrivacyRequestStatus);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [userSearch, setUserSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const refreshDashboard = useCallback(
    async (userId = user?.id) => {
      if (!userId) return;
      setLoadState("loading");
      try {
        const nextDashboard = await loadDashboard({ data: { userId } });
        setDashboard(nextDashboard);
        setAuditLogs(nextDashboard.auditLogs);
        setNotes(notesFromPrivacy(nextDashboard.privacyRequests));
        setLoadState("ready");
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Não foi possível carregar o admin.";
        setLoadState(message.includes("autorizado") ? "denied" : "error");
      }
    },
    [loadDashboard, user?.id],
  );

  const refreshUsers = useCallback(
    async (query = userSearch, userId = user?.id) => {
      if (!userId) return;
      setUsersLoading(true);
      try {
        const nextUsers = await loadUsers({ data: { userId, query } });
        setUsers(nextUsers);
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Não foi possível buscar usuários.";
        toast.error(message);
      } finally {
        setUsersLoading(false);
      }
    },
    [loadUsers, user?.id, userSearch],
  );

  const refreshAuditLogs = useCallback(
    async (userId = user?.id) => {
      if (!userId) return;
      try {
        const nextLogs = await loadAuditLogs({ data: { userId } });
        setAuditLogs(nextLogs);
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Não foi possível carregar auditoria.";
        toast.error(message);
      }
    },
    [loadAuditLogs, user?.id],
  );

  useEffect(() => {
    if (isPending) return;
    if (!user?.id) {
      navigate({ to: "/auth" });
      return;
    }
    void refreshDashboard(user.id);
    void refreshUsers("", user.id);
  }, [isPending, navigate, refreshDashboard, refreshUsers, user?.id]);

  async function openUserDetail(targetUserId: string) {
    if (!user?.id) return;
    setDetailLoadingId(targetUserId);
    try {
      const detail = await loadUserDetail({ data: { userId: user.id, targetUserId } });
      setSelectedUser(detail);
      setActiveTab("users");
      void refreshAuditLogs(user.id);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível abrir usuário.";
      toast.error(message);
    } finally {
      setDetailLoadingId(null);
    }
  }

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
      void refreshAuditLogs(user.id);
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
            Configuração do servidor indisponível. Tente novamente ou revise o ambiente.
          </p>
          <button
            type="button"
            className="mt-5 h-11 rounded-full bg-primary px-5 text-sm font-black text-white"
            onClick={() => void refreshDashboard()}
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/35 text-foreground">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-primary">Admin ChegaAí</p>
                <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                  Operação, privacidade e auditoria
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-muted-foreground">
                  Busque usuários, revise pedidos LGPD e acompanhe ações administrativas sem acessar
                  o banco manualmente.
                </p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-muted px-4 py-3 lg:min-w-72">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground">
                <UserRound className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">
                  {dashboard.admin.displayName ?? dashboard.admin.email ?? "Admin"}
                </p>
                <p className="mt-0.5 truncate text-xs font-bold text-muted-foreground">
                  {dashboard.admin.role}
                </p>
              </div>
            </div>
          </div>
        </header>

        <nav className="sticky top-3 z-20 mt-4 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card/95 p-1 shadow-sm backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={cn(
                "h-10 shrink-0 rounded-xl px-4 text-sm font-black transition",
                activeTab === tab.value
                  ? "bg-ink text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" ? (
          <OverviewTab dashboard={dashboard} onOpenUser={(userId) => void openUserDetail(userId)} />
        ) : null}

        {activeTab === "users" ? (
          <UsersTab
            users={users}
            search={userSearch}
            loading={usersLoading}
            detail={selectedUser}
            detailLoadingId={detailLoadingId}
            onSearchChange={setUserSearch}
            onSearch={() => void refreshUsers()}
            onOpenUser={(userId) => void openUserDetail(userId)}
            onCloseDetail={() => setSelectedUser(null)}
          />
        ) : null}

        {activeTab === "privacy" ? (
          <PrivacyTab
            requests={dashboard.privacyRequests}
            notes={notes}
            savingId={savingId}
            onRefresh={() => void refreshDashboard()}
            onNoteChange={(id, note) => setNotes((current) => ({ ...current, [id]: note }))}
            onStatusChange={(request, status) => void changePrivacyStatus(request, status)}
          />
        ) : null}

        {activeTab === "audit" ? (
          <AuditTab logs={auditLogs} onRefresh={() => void refreshAuditLogs()} />
        ) : null}
      </div>
    </main>
  );
}

function OverviewTab({
  dashboard,
  onOpenUser,
}: {
  dashboard: AdminDashboard;
  onOpenUser: (userId: string) => void;
}) {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          <MetricCard icon={<UsersRound />} label="Usuários" value={dashboard.metrics.users} />
          <MetricCard icon={<Store />} label="Estabelecimentos" value={dashboard.metrics.venues} />
          <MetricCard icon={<CalendarDays />} label="Eventos" value={dashboard.metrics.events} />
          <MetricCard
            icon={<ShieldCheck />}
            label="LGPD pendentes"
            value={dashboard.metrics.privacyPending}
            signal
          />
        </div>

        <div className="mt-8">
          <SectionHeader
            title="Pedidos LGPD recentes"
            description="Resumo dos pedidos que também aparecem na aba LGPD."
          />
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-3xl border border-border">
            {dashboard.privacyRequests.slice(0, 5).map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-2 bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={request.status} />
                    <p className="truncate text-sm font-black">{request.email ?? "Sem email"}</p>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {request.requestType}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-semibold text-muted-foreground">
                  {formatDate(request.createdAt)}
                </p>
              </div>
            ))}
            {!dashboard.privacyRequests.length ? <EmptyBlock text="Nenhum pedido LGPD." /> : null}
          </div>
        </div>
      </section>

      <aside className="rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-5 xl:sticky xl:top-24 xl:self-start">
        <SectionHeader title="Últimos usuários" description="Cadastros recentes no app." />
        <div className="mt-4 space-y-2">
          {dashboard.recentUsers.length ? (
            dashboard.recentUsers.map((profile) => (
              <UserCard
                key={profile.userId}
                profile={profile}
                compact
                onOpen={() => onOpenUser(profile.userId)}
              />
            ))
          ) : (
            <EmptyBlock text="Nenhum perfil encontrado." />
          )}
        </div>
      </aside>
    </div>
  );
}

function UsersTab({
  users,
  search,
  loading,
  detail,
  detailLoadingId,
  onSearchChange,
  onSearch,
  onOpenUser,
  onCloseDetail,
}: {
  users: AdminUserSummary[];
  search: string;
  loading: boolean;
  detail: AdminUserDetail | null;
  detailLoadingId: string | null;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onOpenUser: (userId: string) => void;
  onCloseDetail: () => void;
}) {
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
      <section className="rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <SectionHeader title="Usuários" description="Busque por nome, email ou tipo." />
          {loading ? <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> : null}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 ring-primary/25 transition-with-motion focus-within:ring-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Nome, email ou tipo"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-full bg-ink px-4 text-sm font-black text-white"
          >
            Buscar
          </button>
        </form>

        <div className="mt-4 space-y-2 lg:max-h-[calc(100dvh-15rem)] lg:overflow-y-auto lg:pr-1">
          {users.map((profile) => (
            <UserCard
              key={profile.userId}
              profile={profile}
              loading={detailLoadingId === profile.userId}
              onOpen={() => onOpenUser(profile.userId)}
            />
          ))}
          {!users.length ? <EmptyBlock text="Nenhum usuário encontrado." /> : null}
        </div>
      </section>

      <section className="min-w-0 rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-5">
        {detail ? <UserDetail detail={detail} onClose={onCloseDetail} /> : <UserDetailEmpty />}
      </section>
    </div>
  );
}

function UserCard({
  profile,
  compact,
  loading,
  onOpen,
}: {
  profile: AdminUserSummary;
  compact?: boolean;
  loading?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full rounded-2xl bg-muted p-3 text-left transition hover:bg-surface active:scale-[0.99]"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{profile.displayName ?? "Usuário sem nome"}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {profile.accountType === "owner" ? "Estabelecimento" : "Explorador"}
          </p>
          {profile.email ? (
            <p className="mt-2 truncate text-xs text-muted-foreground">{profile.email}</p>
          ) : null}
          {!compact ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Última atividade: {formatDate(profile.lastActivityAt)}
            </p>
          ) : null}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-sm">
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </span>
      </div>
    </button>
  );
}

function UserDetail({ detail, onClose }: { detail: AdminUserDetail; onClose: () => void }) {
  const profile = detail.profile;
  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <UserRound className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black tracking-tight">
              {profile.displayName ?? "Usuário sem nome"}
            </h2>
            <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">
              {profile.email ?? "Sem email"}
            </p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              {profile.accountType === "owner" ? "Estabelecimento" : "Explorador"} · cadastro em{" "}
              {formatDate(profile.createdAt)}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="h-10 rounded-full bg-muted px-4 text-sm font-black text-foreground"
          onClick={onClose}
        >
          Fechar detalhe
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <SmallCount label="Salvos" value={detail.counts.savedEvents} />
        <SmallCount label="Check-ins" value={detail.counts.checkins} />
        <SmallCount label="Avaliações" value={detail.counts.reviews} />
        <SmallCount label="Posts" value={detail.counts.posts} />
        <SmallCount label="LGPD" value={detail.counts.privacyRequests} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <ItemSection title="Eventos salvos" items={detail.savedEvents} />
        <ItemSection title="Check-ins" items={detail.checkins} />
        <TextSection title="Avaliações" items={detail.reviews} />
        <TextSection title="Posts" items={detail.posts} />
        <TextSection title="Comentários" items={detail.comments} />
        <TextSection title="Grupos" items={detail.groupPlans} />
        <ItemSection title="Estabelecimentos" items={detail.ownedVenues} />
        <ItemSection title="Eventos criados" items={detail.ownedEvents} />
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-background p-4">
        <h3 className="text-sm font-black">Pedidos LGPD do usuário</h3>
        <div className="mt-3 space-y-2">
          {detail.privacyRequests.map((request) => (
            <div key={request.id} className="rounded-2xl bg-card p-3">
              <StatusBadge status={request.status} />
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                {request.requestType} · {formatDate(request.createdAt)}
              </p>
            </div>
          ))}
          {!detail.privacyRequests.length ? (
            <EmptyBlock text="Nenhum pedido LGPD deste usuário." />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UserDetailEmpty() {
  return (
    <div className="flex min-h-96 items-center justify-center rounded-[1.5rem] bg-muted p-6 text-center">
      <div className="max-w-sm">
        <UserRound className="mx-auto h-9 w-9 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-black tracking-tight">Selecione um usuário</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Abra o detalhe para ver dados existentes no app e registrar a ação na auditoria.
        </p>
      </div>
    </div>
  );
}

function PrivacyTab({
  requests,
  notes,
  savingId,
  onRefresh,
  onNoteChange,
  onStatusChange,
}: {
  requests: PrivacyRequestSummary[];
  notes: Record<string, string>;
  savingId: string | null;
  onRefresh: () => void;
  onNoteChange: (id: string, note: string) => void;
  onStatusChange: (request: PrivacyRequestSummary, status: PrivacyRequestStatus) => void;
}) {
  return (
    <section className="mt-5 rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          title="Pedidos LGPD"
          description="Revise pedidos de exclusão antes de anonimizar ou remover dados."
        />
        <button
          type="button"
          className="h-10 rounded-full bg-muted px-4 text-sm font-black text-foreground"
          onClick={onRefresh}
        >
          Atualizar
        </button>
      </div>

      {requests.length ? (
        <div className="mt-4 space-y-3 lg:space-y-0 lg:overflow-hidden lg:rounded-3xl lg:border lg:border-border">
          <div className="hidden grid-cols-[1fr_150px_170px_190px] gap-3 bg-muted px-4 py-3 text-xs font-black text-muted-foreground lg:grid">
            <span>Pedido</span>
            <span>Status</span>
            <span>Criado em</span>
            <span>Ação</span>
          </div>
          {requests.map((request) => (
            <PrivacyRequestRow
              key={request.id}
              request={request}
              note={notes[request.id] ?? ""}
              saving={savingId === request.id}
              onNoteChange={(note) => onNoteChange(request.id, note)}
              onStatusChange={(status) => onStatusChange(request, status)}
            />
          ))}
        </div>
      ) : (
        <EmptyBlock text="Nenhum pedido LGPD registrado ainda." />
      )}
    </section>
  );
}

function AuditTab({ logs, onRefresh }: { logs: AdminAuditLogSummary[]; onRefresh: () => void }) {
  return (
    <section className="mt-5 rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          title="Auditoria admin"
          description="Registro das ações feitas por administradores."
        />
        <button
          type="button"
          className="h-10 rounded-full bg-muted px-4 text-sm font-black text-foreground"
          onClick={onRefresh}
        >
          Atualizar
        </button>
      </div>

      <div className="mt-4 divide-y divide-border overflow-hidden rounded-3xl border border-border">
        {logs.map((log) => (
          <div key={log.id} className="bg-background p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <History className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-black">{translateAuditAction(log.action)}</p>
                </div>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {formatAuditSentence(log)}
                </p>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">
                {formatDate(log.createdAt)}
              </p>
            </div>
          </div>
        ))}
        {!logs.length ? <EmptyBlock text="Nenhuma ação admin registrada ainda." /> : null}
      </div>
    </section>
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
    <div className="flex items-center gap-4 rounded-[1.5rem] bg-muted p-4">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full [&_svg]:h-5 [&_svg]:w-5",
          signal ? "bg-primary/10 text-primary" : "bg-card text-foreground",
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight">{value}</p>
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-black tracking-tight">{title}</h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-muted-foreground">
        {description}
      </p>
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
        <p className="mt-3 truncate text-sm font-black">{request.email ?? "Sem email"}</p>
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

function ItemSection({ title, items }: { title: string; items: AdminNamedItem[] }) {
  return (
    <section className="rounded-3xl border border-border bg-background p-4">
      <h3 className="text-sm font-black">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl bg-muted p-3">
            <p className="truncate text-sm font-black">{item.label}</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {[item.helper, formatDate(item.createdAt)].filter(Boolean).join(" · ")}
            </p>
          </div>
        ))}
        {!items.length ? <EmptyBlock text="Nada encontrado." /> : null}
      </div>
    </section>
  );
}

function TextSection({ title, items }: { title: string; items: AdminTextItem[] }) {
  return (
    <section className="rounded-3xl border border-border bg-background p-4">
      <h3 className="text-sm font-black">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl bg-muted p-3">
            <p className="truncate text-sm font-black">{item.label}</p>
            {item.text ? (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {item.text}
              </p>
            ) : null}
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {formatDate(item.createdAt)}
            </p>
          </div>
        ))}
        {!items.length ? <EmptyBlock text="Nada encontrado." /> : null}
      </div>
    </section>
  );
}

function SmallCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border bg-background p-4">
      <p className="text-2xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-xs font-bold text-muted-foreground">{label}</p>
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

function EmptyBlock({ text }: { text: string }) {
  return (
    <p className="rounded-3xl bg-muted p-4 text-sm font-semibold text-muted-foreground">{text}</p>
  );
}

function notesFromPrivacy(requests: PrivacyRequestSummary[]) {
  return Object.fromEntries(requests.map((request) => [request.id, request.internalNote ?? ""]));
}

function translateAuditAction(action: string) {
  if (action === "privacy_request_status_updated") return "Pedido LGPD atualizado";
  if (action === "user_detail_opened") return "Detalhe de usuário aberto";
  return action;
}

function formatAuditSentence(log: AdminAuditLogSummary) {
  const admin = log.adminName ?? log.adminEmail ?? "Admin";
  const target = log.entityLabel ?? humanEntityName(log.entityType);
  if (log.action === "user_detail_opened") return `${admin} abriu o detalhe de ${target}.`;
  if (log.action === "privacy_request_status_updated") {
    return `${admin} atualizou um pedido LGPD${log.entityLabel ? ` de ${log.entityLabel}` : ""}.`;
  }
  return `${admin} realizou uma ação em ${target}.`;
}

function humanEntityName(entityType: string) {
  if (entityType === "user") return "um usuário";
  if (entityType === "privacy_request") return "um pedido LGPD";
  return "um registro";
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
