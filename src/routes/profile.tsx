import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Capacitor } from "@capacitor/core";
import {
  AtSign,
  Bell,
  Building2,
  CalendarPlus,
  Camera,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Images,
  LoaderCircle,
  LocateFixed,
  LogOut,
  MapPinOff,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Store,
  Sun,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient, getAuthUserName } from "@/auth";
import { ExplorerPreferencesForm } from "@/components/explorer-preferences-form";
import { FeedActionNav } from "@/components/feed-action-nav";
import { OwnerNav } from "@/components/owner-nav";
import { PillButton } from "@/components/pill-button";
import { UserAvatar } from "@/components/user-avatar";
import { getInitials } from "@/lib/avatar";
import { getAdminAccess } from "@/lib/admin-actions";
import {
  getOwnerDashboard,
  getUserActivityStats,
  type OwnerDashboard,
  type UserActivityStats,
} from "@/lib/data";
import { isAllowedImageMimeType, uploadMedia } from "@/lib/media";
import {
  type DevicePermissionKind,
  type DevicePermissionState,
  type DevicePermissionStatuses,
  getDevicePermissionStatuses,
  requestDevicePermission,
} from "@/lib/device-permissions";
import { clearSavedLocationPreferences } from "@/lib/location";
import { exportUserData, requestAccountDeletion } from "@/lib/privacy-actions";
import {
  type AccountType,
  DEFAULT_EXPLORER_PREFERENCES,
  EMPTY_EXPLORER_PREFERENCE_OPTIONS,
  type ExplorerPreferenceOptions,
  type ExplorerPreferences,
  checkUsernameAvailability,
  getExplorerPreferenceOptions,
  getUserProfile,
  summarizeExplorerPreferences,
  type UserProfileSummary,
  updateExplorerProfile,
  updateExplorerPreferences,
} from "@/lib/profile-actions";
import { requireAuthenticatedRoute } from "@/lib/route-guards";
import { useAppTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  beforeLoad: requireAuthenticatedRoute,
  component: Profile,
});

function getMetadataAccountType(user: unknown): AccountType {
  if (!user || typeof user !== "object" || !("user_metadata" in user)) return "explorer";

  const metadata = user.user_metadata;
  if (!metadata || typeof metadata !== "object") return "explorer";

  const metadataRecord = metadata as Record<string, unknown>;
  const accountType = metadataRecord.account_type ?? metadataRecord.accountType;
  return accountType === "owner" ? "owner" : "explorer";
}

function Profile() {
  const navigate = useNavigate();
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  const getProfile = useServerFn(getUserProfile);
  const checkUsername = useServerFn(checkUsernameAvailability);
  const saveExplorerProfile = useServerFn(updateExplorerProfile);
  const saveExplorerPreferences = useServerFn(updateExplorerPreferences);
  const loadExplorerPreferenceOptions = useServerFn(getExplorerPreferenceOptions);
  const loadDashboard = useServerFn(getOwnerDashboard);
  const loadActivityStats = useServerFn(getUserActivityStats);
  const upload = useServerFn(uploadMedia);
  const exportData = useServerFn(exportUserData);
  const requestDeletion = useServerFn(requestAccountDeletion);
  const checkAdminAccess = useServerFn(getAdminAccess);
  const { isDark, toggleTheme } = useAppTheme();
  const metadataAccountType = getMetadataAccountType(user);
  const [accountType, setAccountType] = useState<AccountType>("explorer");
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null);
  const [activityStats, setActivityStats] = useState<UserActivityStats>({
    checkins: 0,
    reviews: 0,
    saved: 0,
  });
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{
    state: "idle" | "checking" | "available" | "unavailable" | "invalid";
    message: string;
  }>({ state: "idle", message: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [editError, setEditError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving">("idle");
  const [privacyAction, setPrivacyAction] = useState<"idle" | "exporting" | "requestingDeletion">(
    "idle",
  );
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportedJson, setExportedJson] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportDownloadUrl, setExportDownloadUrl] = useState("");
  const [exportViewUrl, setExportViewUrl] = useState("");
  const [exportFileName, setExportFileName] = useState("");
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [preferencesDialogOpen, setPreferencesDialogOpen] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferenceOptions, setPreferenceOptions] = useState<ExplorerPreferenceOptions>(
    EMPTY_EXPLORER_PREFERENCE_OPTIONS,
  );

  useEffect(() => {
    if (isPending) return;
    if (!user?.id) {
      navigate({ to: "/auth" });
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      if (!user?.id) return;
      setLoadState("loading");

      try {
        const nextProfile = await getProfile({ data: { userId: user.id } });
        if (cancelled) return;

        if (metadataAccountType === "owner" && nextProfile?.accountType !== "owner") {
          navigate({ to: "/post-auth", replace: true });
          return;
        }

        if (nextProfile?.accountType === "owner" && !nextProfile.onboardingCompleted) {
          navigate({ to: "/venue-onboarding", replace: true });
          return;
        }

        const nextAccountType = nextProfile?.accountType ?? "explorer";
        setProfile(nextProfile);
        setAccountType(nextAccountType);

        if (nextAccountType === "owner") {
          const nextDashboard = await loadDashboard({ data: { userId: user.id } });
          if (cancelled) return;
          setDashboard(nextDashboard);
        } else {
          const nextStats = normalizeActivityStats(
            await loadActivityStats({ data: { userId: user.id } }),
          );
          const nextPreferenceOptions = await loadExplorerPreferenceOptions();
          if (cancelled) return;
          setActivityStats(nextStats);
          setPreferenceOptions(nextPreferenceOptions);
          setDashboard(null);
        }

        setLoadState("ready");
      } catch {
        if (!cancelled) {
          setProfile(null);
          setDashboard(null);
          setLoadState("error");
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [
    getProfile,
    isPending,
    loadActivityStats,
    loadDashboard,
    loadExplorerPreferenceOptions,
    metadataAccountType,
    navigate,
    user?.id,
  ]);

  useEffect(() => {
    if (isPending || !user?.id) return;

    let cancelled = false;
    checkAdminAccess({ data: { userId: user.id } })
      .then((result) => {
        if (!cancelled) setHasAdminAccess(result.isAdmin);
      })
      .catch(() => {
        if (!cancelled) setHasAdminAccess(false);
      });

    return () => {
      cancelled = true;
    };
  }, [checkAdminAccess, isPending, user?.id]);

  const isOwner = accountType === "owner";
  const venue = dashboard?.venue;
  const authUserName = getAuthUserName(user);
  const displayName = isOwner
    ? (venue?.name ?? profile?.venueName ?? "Estabelecimento")
    : (profile?.displayName ?? authUserName ?? "Convidado");
  const displayUsername = !isOwner ? profile?.username : undefined;
  const displayImage = isOwner ? venue?.image : (profile?.avatarUrl ?? getUserImage(user));

  useEffect(() => {
    if (!isEditing || isOwner || !user?.id) {
      setUsernameStatus({ state: "idle", message: "" });
      return;
    }

    const normalizedUsername = formatExplorerUsername(editUsername);
    if (!normalizedUsername) {
      setUsernameStatus({ state: "idle", message: "" });
      return;
    }

    if (normalizedUsername.length < 3) {
      setUsernameStatus({ state: "invalid", message: "Use pelo menos 3 caracteres." });
      return;
    }

    if (normalizedUsername === profile?.username) {
      setUsernameStatus({ state: "available", message: "Nome de usuário atual." });
      return;
    }

    let cancelled = false;
    setUsernameStatus({ state: "checking", message: "Verificando disponibilidade..." });
    const timeout = window.setTimeout(() => {
      checkUsername({ data: { username: normalizedUsername, userId: user.id } })
        .then((result) => {
          if (cancelled) return;
          setUsernameStatus({
            state: result.available ? "available" : "unavailable",
            message: result.message,
          });
        })
        .catch((cause) => {
          if (cancelled) return;
          setUsernameStatus({
            state: "invalid",
            message: cause instanceof Error ? cause.message : "Nome de usuário inválido.",
          });
        });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [checkUsername, editUsername, isEditing, isOwner, profile?.username, user?.id]);

  function openProfileEditor() {
    setEditName(displayName === "Convidado" ? "" : displayName);
    setEditUsername(profile?.username ?? "");
    setUsernameStatus({ state: "idle", message: "" });
    setAvatarFile(null);
    setAvatarPreview(displayImage);
    setEditError(null);
    setIsEditing(true);
  }

  function cancelProfileEditor() {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(undefined);
    setUsernameStatus({ state: "idle", message: "" });
    setEditError(null);
  }

  function selectAvatar(file: File | null) {
    if (!file) return;

    const fileError = validateImageFile(file);
    setEditError(fileError);
    if (fileError) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function saveProfile() {
    if (!user?.id || saveState === "saving") return;

    const nextName = editName.trim();
    const nextUsername = formatExplorerUsername(editUsername);
    if (nextName.length < 2) {
      setEditError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }

    if (nextUsername.length < 3) {
      setEditError("Informe um nome de usuário com pelo menos 3 caracteres.");
      return;
    }

    setSaveState("saving");
    setEditError(null);

    try {
      let avatarUrl = profile?.avatarUrl;
      if (avatarFile) {
        const base64 = await fileToBase64(avatarFile);
        const media = await upload({
          data: {
            userId: user.id,
            mimeType: avatarFile.type,
            base64,
          },
        });
        avatarUrl = media.mediaUrl;
      }

      const nextProfile = await saveExplorerProfile({
        data: {
          userId: user.id,
          displayName: nextName,
          username: nextUsername,
          avatarUrl,
        },
      });

      setProfile(nextProfile);
      setAccountType(nextProfile.accountType);
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(undefined);
      toast.success("Perfil atualizado.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível salvar o perfil.";
      setEditError(message);
      toast.error(message);
    } finally {
      setSaveState("idle");
    }
  }

  async function signOut() {
    await authClient.signOut();
    navigate({ to: "/auth" });
  }

  function clearLocalLocation() {
    clearSavedLocationPreferences();
    toast.success("Localização salva removida deste dispositivo.");
  }

  async function downloadMyData() {
    if (!user?.id || privacyAction !== "idle") return;

    const nextFileName = `chegaai-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    setExportedJson("");
    setExportError("");
    setExportFileName(nextFileName);
    setExportDownloadUrl(buildPrivacyExportUrl(user.id, user.email, displayName, accountType));
    setExportViewUrl(buildPrivacyExportUrl(user.id, user.email, displayName, accountType, "view"));
    setExportDialogOpen(true);
    setPrivacyAction("exporting");

    try {
      const payload = await exportData({
        data: {
          userId: user.id,
          email: user.email,
          name: displayName,
          accountType,
        },
      });
      const json = JSON.stringify(payload, null, 2);
      setExportedJson(json);
      toast.success("Exportação pronta.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Não foi possível exportar os dados.";
      setExportError(message);
      toast.error(message);
    } finally {
      setPrivacyAction("idle");
    }
  }

  async function copyExportJson() {
    if (!exportedJson) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportedJson);
      } else {
        const input = document.createElement("textarea");
        input.value = exportedJson;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      toast.success("JSON copiado.");
    } catch {
      toast.error("Não foi possível copiar os dados.");
    }
  }

  async function requestMyAccountDeletion() {
    if (!user?.id || privacyAction !== "idle") return;

    setPrivacyAction("requestingDeletion");
    try {
      const result = await requestDeletion({ data: { userId: user.id, email: user.email } });
      setDeletionDialogOpen(false);
      toast.success(`Solicitação registrada. Protocolo: ${result.id.slice(0, 8)}.`);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Não foi possível registrar a solicitação.";
      toast.error(message);
    } finally {
      setPrivacyAction("idle");
    }
  }

  async function saveRolerPreferences(preferences: ExplorerPreferences) {
    if (!user?.id || preferencesSaving) return;

    setPreferencesSaving(true);
    try {
      const savedPreferences = await saveExplorerPreferences({
        data: { userId: user.id, preferences },
      });
      setProfile((current) =>
        current ? { ...current, explorerPreferences: savedPreferences } : current,
      );
      setPreferencesDialogOpen(false);
      toast.success("Preferências de rolê salvas.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível salvar preferências.");
    } finally {
      setPreferencesSaving(false);
    }
  }

  if (loadState === "loading") {
    return (
      <main className="app-shell flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 font-bold">Carregando perfil</p>
        <p className="mt-1 text-sm text-muted-foreground">Só um instante...</p>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="app-shell flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <p className="font-bold">Não foi possível carregar o perfil</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tente abrir novamente em alguns instantes.
        </p>
        <PillButton className="mt-5 w-full" onClick={() => window.location.reload()}>
          Tentar novamente
        </PillButton>
      </main>
    );
  }

  return (
    <main className="app-shell bg-background pb-32">
      <header className="px-6 pt-8">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            {isOwner ? "Estabelecimento" : "Perfil"}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            {isOwner ? "Seu painel" : "Sua conta"}
          </h1>
        </div>
      </header>

      <div className="mt-5 space-y-7 px-6">
        <ProfileHero
          isOwner={isOwner}
          name={displayName}
          username={displayUsername}
          image={displayImage}
          email={user?.email}
          venue={venue}
          onPrimary={() => navigate({ to: isOwner ? "/venue-dashboard" : "/discover" })}
        />

        {!isOwner && isEditing ? (
          <section className="rounded-3xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black">Editar perfil</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Atualize sua foto e como seu nome aparece no ChegaAí.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelProfileEditor}
                className="text-xs font-bold text-muted-foreground"
              >
                Cancelar
              </button>
            </div>

            <label className="mt-5 flex cursor-pointer flex-col items-center rounded-3xl bg-background p-4 text-center">
              <span className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-muted text-xl font-black">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Prévia do perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{getInitials(editName || displayName)}</span>
                )}
                <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                  <Camera className="h-4 w-4" />
                </span>
              </span>
              <span className="mt-3 text-sm font-bold">Trocar foto</span>
              <span className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP até 2MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => selectAvatar(event.currentTarget.files?.[0] ?? null)}
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold">Nome</span>
              <span className="mt-2 flex items-center gap-3 rounded-2xl bg-background px-4 py-3">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.currentTarget.value)}
                  placeholder="Seu nome"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
                />
              </span>
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold">Nome de usuário</span>
              <span className="mt-2 flex items-center gap-3 rounded-2xl bg-background px-4 py-3">
                <AtSign className="h-4 w-4 text-muted-foreground" />
                <input
                  value={editUsername}
                  onChange={(event) =>
                    setEditUsername(formatExplorerUsername(event.currentTarget.value))
                  }
                  placeholder="seuusuario"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
                />
                {usernameStatus.state === "available" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : usernameStatus.state === "unavailable" || usernameStatus.state === "invalid" ? (
                  <XCircle className="h-4 w-4 text-primary" />
                ) : null}
              </span>
              <span
                className={cn(
                  "mt-2 block text-xs font-semibold",
                  usernameStatus.state === "available"
                    ? "text-emerald-600"
                    : usernameStatus.state === "unavailable" || usernameStatus.state === "invalid"
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {usernameStatus.message || "Será usado como seu @ no ChegaAí."}
              </span>
            </label>

            {editError ? (
              <p className="mt-3 text-sm font-semibold text-primary">{editError}</p>
            ) : null}

            <PillButton
              type="button"
              variant="primary"
              size="lg"
              className="mt-5 w-full"
              disabled={saveState === "saving"}
              onClick={() => void saveProfile()}
            >
              {saveState === "saving" ? "Salvando..." : "Salvar alterações"}
            </PillButton>
          </section>
        ) : null}

        <ProfileStats isOwner={isOwner} dashboard={dashboard} activityStats={activityStats} />

        {isOwner ? <OwnerSummary dashboard={dashboard} /> : null}

        <div className="space-y-3">
          {isOwner ? (
            <>
              <SectionLabel title="Gestão do local" />
              <Row
                icon={<Store className="h-4 w-4" />}
                label={venue?.name ?? profile?.venueName ?? "Painel do estabelecimento"}
                helper="Acompanhe presença, eventos e perfil público."
                onClick={() => navigate({ to: "/venue-dashboard" })}
              />
              <Row
                icon={<Building2 className="h-4 w-4" />}
                label="Dados do estabelecimento"
                helper="Nome, endereço e função no local."
                onClick={() => navigate({ to: "/venue-onboarding" })}
              />
              <Row
                icon={<CalendarPlus className="h-4 w-4" />}
                label="Publicar evento"
                helper="Crie eventos no painel."
                onClick={() => navigate({ to: "/venue-dashboard" })}
              />
            </>
          ) : (
            <>
              <SectionLabel title="Atividade do explorador" />
              <Row
                icon={<UserRound className="h-4 w-4" />}
                label="Editar perfil"
                helper="Foto, nome e @ que aparecem no app."
                onClick={openProfileEditor}
              />
              <Row
                icon={<Star className="h-4 w-4" />}
                label="Minhas avaliações"
                helper="Veja os rolês que você avaliou."
                onClick={() => navigate({ to: "/reviews" })}
              />
            </>
          )}
        </div>

        <div className="space-y-3">
          <SectionLabel title="Preferências" />
          {!isOwner ? (
            <Row
              icon={<SlidersHorizontal className="h-4 w-4" />}
              label="Preferências de rolê"
              helper={summarizeExplorerPreferences(profile?.explorerPreferences)}
              onClick={() => setPreferencesDialogOpen(true)}
            />
          ) : null}
          <Row
            icon={isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            label={isDark ? "Modo claro" : "Modo escuro"}
            helper={isDark ? "Voltar para a aparência clara." : "Usar aparência escura no app."}
            onClick={toggleTheme}
          />
          <DevicePermissionsSection />
          <Row
            icon={<MapPinOff className="h-4 w-4" />}
            label="Limpar localização salva"
            helper="Remove consentimento, localização recente e raio deste dispositivo."
            onClick={clearLocalLocation}
          />
        </div>

        <div className="space-y-3">
          <SectionLabel title="Conta" />
          {hasAdminAccess ? (
            <Row
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Painel admin"
              helper="Administrar app, pedidos LGPD e operação."
              onClick={() => navigate({ to: "/admin" })}
            />
          ) : null}
          <Row
            icon={<Download className="h-4 w-4" />}
            label={privacyAction === "exporting" ? "Gerando exportação..." : "Baixar meus dados"}
            helper="Gera um arquivo JSON com dados básicos da conta e atividades."
            disabled={privacyAction !== "idle"}
            onClick={() => void downloadMyData()}
          />
          <Row
            icon={<LogOut className="h-4 w-4" />}
            label="Sair"
            helper="Voltar para a tela de entrada."
            onClick={() => void signOut()}
          />
          <Row
            icon={<Trash2 className="h-4 w-4" />}
            label={
              privacyAction === "requestingDeletion"
                ? "Registrando solicitação..."
                : "Solicitar exclusão da conta"
            }
            helper="Abre um pedido LGPD para revisão e exclusão/anonimização dos dados."
            disabled={privacyAction !== "idle"}
            danger
            onClick={() => setDeletionDialogOpen(true)}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            A exclusão definitiva ainda passa por revisão para preservar dados exigidos por lei,
            segurança e conteúdo público que precise ser anonimizado.
          </p>
        </div>

        <div className="pt-1 text-center text-xs text-muted-foreground">
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => navigate({ to: "/privacy" })}
          >
            Política de Privacidade
          </button>
          <span className="px-1.5">·</span>
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => navigate({ to: "/terms" })}
          >
            Termos de Uso
          </button>
        </div>
      </div>

      {isOwner ? (
        <OwnerNav onCreate={() => navigate({ to: "/venue-dashboard" })} />
      ) : (
        <FeedActionNav />
      )}

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="bottom-0 top-auto max-w-[420px] translate-y-0 gap-0 rounded-t-[2rem] border-0 p-0 shadow-[0_-18px_44px_rgba(5,5,5,0.18)] sm:top-[50%] sm:translate-y-[-50%] sm:rounded-[2rem]">
          <div className="p-5 pb-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </span>
            <DialogHeader className="mt-4 space-y-2 text-left">
              <DialogTitle className="text-xl font-black tracking-tight">
                {privacyAction === "exporting"
                  ? "Gerando seus dados"
                  : exportError
                    ? "Não foi possível gerar a prévia"
                    : "Seus dados estão prontos"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Escolha como acessar o arquivo JSON. Em alguns navegadores móveis, o download só
                funciona quando você toca diretamente no botão abaixo.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="border-y border-border bg-muted/50 px-5 py-4">
            <p className="truncate text-sm font-black">{exportFileName || "meus-dados.json"}</p>
            {privacyAction === "exporting" ? (
              <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" />
                Gerando seus dados...
              </p>
            ) : exportError ? (
              <p className="mt-1 text-xs font-semibold leading-relaxed text-primary">
                {exportError}
              </p>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Se o download não abrir, use “Abrir JSON” ou “Copiar JSON”.
              </p>
            )}
          </div>

          <div className="space-y-2 p-5">
            {exportDownloadUrl ? (
              <a
                href={exportDownloadUrl}
                download={exportFileName || "chegaai-meus-dados.json"}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(241,58,90,0.28)] transition-transform active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                Baixar arquivo JSON
              </a>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              {exportViewUrl ? (
                <a
                  href={exportViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-muted px-3 text-sm font-black text-foreground transition-opacity active:opacity-80"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir JSON
                </a>
              ) : null}
              <button
                type="button"
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-muted px-3 text-sm font-black text-foreground transition-opacity active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!exportedJson || privacyAction === "exporting"}
                onClick={() => void copyExportJson()}
              >
                <Copy className="h-4 w-4" />
                Copiar JSON
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deletionDialogOpen} onOpenChange={setDeletionDialogOpen}>
        <DialogContent className="bottom-0 top-auto max-w-[420px] translate-y-0 gap-0 rounded-t-[2rem] border-0 p-0 shadow-[0_-18px_44px_rgba(5,5,5,0.18)] sm:top-[50%] sm:translate-y-[-50%] sm:rounded-[2rem]">
          <div className="p-5 pb-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Trash2 className="h-5 w-5" />
            </span>
            <DialogHeader className="mt-4 space-y-2 text-left">
              <DialogTitle className="text-xl font-black tracking-tight">
                Solicitar exclusão da conta?
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Isso registra um pedido LGPD para a equipe revisar seus dados antes da exclusão
                definitiva. A conta não é apagada automaticamente nesta etapa.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="border-y border-border bg-muted/50 px-5 py-4">
            <p className="text-sm font-black">O que acontece agora</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>Seu pedido fica registrado com status pendente.</li>
              <li>Dados públicos, eventos e estabelecimento podem precisar de anonimização.</li>
              <li>Obrigações legais e de segurança podem limitar a remoção imediata.</li>
            </ul>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-2 space-x-0 p-5 sm:space-x-0">
            <button
              type="button"
              className="h-12 rounded-full bg-muted px-4 text-sm font-black text-foreground transition-opacity active:opacity-80"
              disabled={privacyAction !== "idle"}
              onClick={() => setDeletionDialogOpen(false)}
            >
              Manter conta
            </button>
            <button
              type="button"
              className="h-12 rounded-full bg-primary px-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(241,58,90,0.28)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={privacyAction !== "idle"}
              onClick={() => void requestMyAccountDeletion()}
            >
              {privacyAction === "requestingDeletion" ? "Registrando..." : "Registrar pedido"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={preferencesDialogOpen} onOpenChange={setPreferencesDialogOpen}>
        <DialogContent className="bottom-0 top-auto max-h-[88vh] max-w-[420px] translate-y-0 gap-0 overflow-hidden rounded-t-[2rem] border-0 p-0 shadow-[0_-18px_44px_rgba(5,5,5,0.18)] sm:top-[50%] sm:translate-y-[-50%] sm:rounded-[2rem]">
          <div className="p-5 pb-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <DialogHeader className="mt-4 space-y-2 text-left">
              <DialogTitle className="text-xl font-black tracking-tight">
                Preferências de rolê
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Escolha bairros, estilos e clima para o app priorizar locais que combinam com você.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="max-h-[68vh] overflow-y-auto px-5 pb-5">
            <ExplorerPreferencesForm
              value={profile?.explorerPreferences ?? DEFAULT_EXPLORER_PREFERENCES}
              options={preferenceOptions}
              optionsContext="os locais cadastrados no ChegaAí"
              onSubmit={saveRolerPreferences}
              submitting={preferencesSaving}
            />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function formatExplorerUsername(value: string) {
  return value
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 30);
}

function ProfileHero({
  isOwner,
  name,
  username,
  image,
  email,
  venue,
  onPrimary,
}: {
  isOwner: boolean;
  name: string;
  username?: string;
  image?: string;
  email?: string;
  venue?: OwnerDashboard["venue"];
  onPrimary: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] bg-ink text-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.9)]">
      <div className="relative min-h-[220px] p-5">
        {image ? (
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />

        <div className="relative flex min-h-[180px] flex-col justify-end">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-black text-white/80">
                {isOwner ? "Conta de estabelecimento" : "Conta de explorador"}
              </span>
              <h2 className="mt-4 line-clamp-2 text-2xl font-black leading-tight tracking-tight">
                {name}
              </h2>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-white/70">
                {isOwner ? <Store className="h-3.5 w-3.5 shrink-0" /> : null}
                <span className="truncate">
                  {isOwner
                    ? (venue?.neighborhood ?? venue?.city ?? "Gerencie sua presença no app")
                    : username
                      ? `@${username}`
                      : (email ?? "Salve eventos e registre seus rolês")}
                </span>
              </p>
            </div>

            <ProfileAvatar name={name} image={image} />
          </div>

          <button
            type="button"
            onClick={onPrimary}
            className="mt-5 h-12 rounded-full bg-primary px-5 text-sm font-black text-white shadow-[0_18px_40px_rgba(241,58,90,0.28)] transition-transform active:scale-[0.98]"
          >
            {isOwner ? "Abrir painel" : "Voltar para Explorar"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ProfileStats({
  isOwner,
  dashboard,
  activityStats,
}: {
  isOwner: boolean;
  dashboard: OwnerDashboard | null;
  activityStats: UserActivityStats;
}) {
  const stats = isOwner
    ? [
        { label: "Salvos", value: dashboard?.metrics.savedEvents ?? 0 },
        { label: "Eventos", value: dashboard?.metrics.events ?? 0 },
        { label: "Check-ins", value: dashboard?.metrics.checkins ?? 0 },
      ]
    : [
        { label: "Check-ins", value: activityStats.checkins },
        { label: "Avaliações", value: activityStats.reviews },
        { label: "Salvos", value: activityStats.saved },
      ];

  return (
    <section className="grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <Stat key={stat.label} label={stat.label} value={String(stat.value)} />
      ))}
    </section>
  );
}

function OwnerSummary({ dashboard }: { dashboard: OwnerDashboard | null }) {
  return (
    <section className="grid grid-cols-2 gap-2">
      <div className="rounded-3xl bg-muted p-4">
        <p className="text-xs font-bold text-muted-foreground">Seguidores</p>
        <p className="mt-2 text-2xl font-black tracking-tight">
          {dashboard?.metrics.followers ?? 0}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Pessoas acompanhando o local.
        </p>
      </div>
      <div className="rounded-3xl bg-muted p-4">
        <p className="text-xs font-bold text-muted-foreground">Próximo evento</p>
        <p className="mt-2 line-clamp-2 text-sm font-black leading-tight">
          {dashboard?.nextEvent?.title ?? "Nenhum publicado"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {dashboard?.nextEvent?.date ?? "Publique para aparecer no Explorar."}
        </p>
      </div>
    </section>
  );
}

function SectionLabel({ title }: { title: string }) {
  return <h2 className="text-sm font-black tracking-tight">{title}</h2>;
}

function getUserImage(user: unknown) {
  if (!user || typeof user !== "object") return undefined;
  const image = (user as { image?: unknown }).image;
  return typeof image === "string" ? image : undefined;
}

function normalizeActivityStats(
  stats: Partial<UserActivityStats> | null | undefined,
): UserActivityStats {
  return {
    checkins: toStatNumber(stats?.checkins),
    reviews: toStatNumber(stats?.reviews),
    saved: toStatNumber(stats?.saved),
  };
}

function toStatNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildPrivacyExportUrl(
  userId: string,
  email: string | undefined,
  name: string,
  accountType: AccountType,
  mode?: "view",
) {
  const params = new URLSearchParams({ userId, name, accountType });
  if (email) params.set("email", email);
  if (mode) params.set("mode", mode);
  return `/api/privacy/export?${params.toString()}`;
}

function validateImageFile(file: File) {
  if (!isAllowedImageMimeType(file.type)) return "Envie uma imagem JPG, PNG ou WebP.";
  if (file.size > 2 * 1024 * 1024) return "A imagem deve ter até 2MB.";
  return null;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function ProfileAvatar({ name, image }: { name: string; image?: string }) {
  return (
    <UserAvatar
      name={name}
      imageUrl={image}
      className="h-24 w-24 bg-muted text-xl text-foreground"
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-20 flex-col items-center justify-center rounded-3xl bg-muted px-3 py-4 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({
  icon,
  label,
  helper,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  helper?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl bg-muted px-4 py-3.5 text-left text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-60",
        danger ? "text-primary" : undefined,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {helper ? (
          <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
            {helper}
          </span>
        ) : null}
      </span>
    </button>
  );
}

const permissionItems: Array<{
  kind: DevicePermissionKind;
  icon: React.ReactNode;
  label: string;
  helper: string;
}> = [
  {
    kind: "location",
    icon: <LocateFixed className="h-3.5 w-3.5" />,
    label: "Localização",
    helper: "Eventos perto de você",
  },
  {
    kind: "camera",
    icon: <Camera className="h-3.5 w-3.5" />,
    label: "Câmera",
    helper: "Fotos e QR code",
  },
  {
    kind: "photos",
    icon: <Images className="h-3.5 w-3.5" />,
    label: "Galeria",
    helper: "Escolher imagens",
  },
  {
    kind: "notifications",
    icon: <Bell className="h-3.5 w-3.5" />,
    label: "Notificações",
    helper: "Avisos importantes",
  },
];

function DevicePermissionsSection() {
  const [statuses, setStatuses] = useState<DevicePermissionStatuses | null>(null);
  const [requesting, setRequesting] = useState<DevicePermissionKind | null>(null);
  const visiblePermissionItems = Capacitor.isNativePlatform()
    ? permissionItems
    : permissionItems.filter((item) => item.kind !== "photos" && item.kind !== "notifications");

  useEffect(() => {
    let cancelled = false;

    getDevicePermissionStatuses()
      .then((nextStatuses) => {
        if (!cancelled) setStatuses(nextStatuses);
      })
      .catch(() => {
        if (!cancelled) setStatuses(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function requestPermission(kind: DevicePermissionKind) {
    if (requesting) return;

    setRequesting(kind);
    try {
      const nextState = await requestDevicePermission(kind);
      const nextStatuses = await getDevicePermissionStatuses();
      setStatuses(nextStatuses);
      toastPermissionResult(nextState);
    } catch {
      toast.error("Não foi possível verificar essa permissão agora.");
    } finally {
      setRequesting(null);
    }
  }

  return (
    <section className="rounded-[1.6rem] border border-border/70 bg-background/40 px-3 py-3">
      <div className="px-0.5 pb-2.5">
        <h3 className="text-sm font-extrabold tracking-tight">Permissões</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Acessos usados pelos recursos do app.
        </p>
      </div>
      <div className="divide-y divide-border/60">
        {visiblePermissionItems.map((item) => (
          <PermissionRow
            key={item.kind}
            {...item}
            state={statuses?.[item.kind] ?? "unavailable"}
            loading={!statuses || requesting === item.kind}
            onClick={() => void requestPermission(item.kind)}
          />
        ))}
      </div>
    </section>
  );
}

function PermissionRow({
  icon,
  label,
  helper,
  state,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  helper: string;
  state: DevicePermissionState;
  loading: boolean;
  onClick: () => void;
}) {
  const isActionable = state === "prompt" || state === "denied" || state === "limited";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || state === "unavailable"}
      className="flex w-full items-center gap-2.5 py-2.5 text-left transition-colors hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{label}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{helper}</span>
      </span>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold",
          permissionStatusClassName(state),
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
        {loading ? "Vendo..." : permissionLabel(state)}
      </span>
      {isActionable ? <span className="sr-only">Tocar para solicitar permissão</span> : null}
    </button>
  );
}

function permissionLabel(state: DevicePermissionState) {
  if (state === "granted") return "Ativa";
  if (state === "limited") return "Limitada";
  if (state === "prompt") return "Pedir";
  if (state === "denied") return "Bloqueada";
  return "Indisp.";
}

function permissionStatusClassName(state: DevicePermissionState) {
  if (state === "granted") return "text-emerald-600 dark:text-emerald-300";
  if (state === "limited") return "text-amber-600 dark:text-amber-300";
  if (state === "prompt") return "text-primary";
  return "text-muted-foreground";
}

function toastPermissionResult(state: DevicePermissionState) {
  if (state === "granted") {
    toast.success("Permissão ativa.");
    return;
  }

  if (state === "limited") {
    toast.message("Permissão limitada. Você pode ajustar isso nas configurações do aparelho.");
    return;
  }

  if (state === "denied") {
    toast.message("Permissão bloqueada. Abra as configurações do aparelho para liberar.");
    return;
  }

  if (state === "prompt") {
    toast.message("Toque novamente quando quiser liberar essa permissão.");
    return;
  }

  toast.error("Permissão indisponível neste dispositivo.");
}
