import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  CalendarPlus,
  Camera,
  LoaderCircle,
  LogOut,
  Moon,
  Settings,
  Star,
  Store,
  Sun,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient, getAuthUserName } from "@/auth";
import { FeedActionNav } from "@/components/feed-action-nav";
import { PillButton } from "@/components/pill-button";
import { UserAvatar } from "@/components/user-avatar";
import { getInitials } from "@/lib/avatar";
import {
  getOwnerDashboard,
  getUserActivityStats,
  type OwnerDashboard,
  type UserActivityStats,
} from "@/lib/data";
import { isAllowedImageMimeType, uploadMedia } from "@/lib/media";
import {
  type AccountType,
  getUserProfile,
  type UserProfileSummary,
  updateExplorerProfile,
} from "@/lib/profile-actions";
import { useAppTheme } from "@/lib/theme";

export const Route = createFileRoute("/profile")({
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
  const saveExplorerProfile = useServerFn(updateExplorerProfile);
  const loadDashboard = useServerFn(getOwnerDashboard);
  const loadActivityStats = useServerFn(getUserActivityStats);
  const upload = useServerFn(uploadMedia);
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [editError, setEditError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving">("idle");

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
          if (cancelled) return;
          setActivityStats(nextStats);
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
    metadataAccountType,
    navigate,
    user?.id,
  ]);

  const isOwner = accountType === "owner";
  const venue = dashboard?.venue;
  const authUserName = getAuthUserName(user);
  const displayName = isOwner
    ? (venue?.name ?? profile?.venueName ?? "Estabelecimento")
    : (profile?.displayName ?? authUserName ?? "Convidado");
  const displayImage = isOwner ? venue?.image : (profile?.avatarUrl ?? getUserImage(user));

  function openProfileEditor() {
    setEditName(displayName === "Convidado" ? "" : displayName);
    setAvatarFile(null);
    setAvatarPreview(displayImage);
    setEditError(null);
    setIsEditing(true);
  }

  function cancelProfileEditor() {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(undefined);
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
    if (nextName.length < 2) {
      setEditError("Informe um nome com pelo menos 2 caracteres.");
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

  if (loadState === "loading") {
    return (
      <main className="app-shell flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 font-bold">Carregando perfil</p>
        <p className="mt-1 text-sm text-muted-foreground">Buscando seus dados reais.</p>
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
      <header className="flex items-center justify-between px-6 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
        <button
          type="button"
          aria-label="Configuracoes"
          onClick={() => (isOwner ? navigate({ to: "/venue-onboarding" }) : openProfileEditor())}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <div className="mt-6 flex flex-col items-center px-6">
        <ProfileAvatar name={displayName} image={displayImage} />
        <h2 className="mt-3 text-xl font-bold">{displayName}</h2>
        <p className="text-sm text-muted-foreground">
          {user?.email ?? "Entre para salvar eventos"}
        </p>
        <span className="mt-3 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
          {isOwner ? "Estabelecimento" : "Explorador"}
        </span>

        {!isOwner && isEditing ? (
          <section className="mt-6 w-full rounded-3xl border border-border bg-muted/40 p-4">
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

        <div className="mt-6 grid w-full grid-cols-3 gap-2 rounded-3xl bg-muted p-4 text-center">
          {isOwner ? (
            <>
              <Stat label="Salvos" value={String(dashboard?.metrics.savedEvents ?? 0)} />
              <Stat label="Eventos" value={String(dashboard?.metrics.events ?? 0)} />
              <Stat label="Check-ins" value={String(dashboard?.metrics.checkins ?? 0)} />
            </>
          ) : (
            <>
              <Stat label="Check-ins" value={String(activityStats.checkins)} />
              <Stat label="Avaliações" value={String(activityStats.reviews)} />
              <Stat label="Salvos" value={String(activityStats.saved)} />
            </>
          )}
        </div>

        <div className="mt-6 w-full space-y-2">
          {isOwner ? (
            <>
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
                helper="Crie eventos reais no painel."
                onClick={() => navigate({ to: "/venue-dashboard" })}
              />
            </>
          ) : (
            <>
              <Row
                icon={<UserRound className="h-4 w-4" />}
                label="Editar perfil"
                helper="Foto e nome que aparecem no app."
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
          <Row
            icon={isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            label={isDark ? "Modo claro" : "Modo escuro"}
            helper={isDark ? "Voltar para a aparência clara." : "Usar aparência escura no app."}
            onClick={toggleTheme}
          />
          <Row
            icon={<LogOut className="h-4 w-4" />}
            label="Sair"
            helper="Voltar para a tela de entrada."
            onClick={() => void signOut()}
          />
        </div>

        <PillButton
          variant="primary"
          size="lg"
          className="mt-8 w-full"
          onClick={() => navigate({ to: isOwner ? "/venue-dashboard" : "/discover" })}
        >
          {isOwner ? "Abrir painel" : "Voltar para Explorar"}
        </PillButton>
      </div>

      {isOwner ? null : <FeedActionNav />}
    </main>
  );
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
    <div>
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
}: {
  icon: React.ReactNode;
  label: string;
  helper?: string;
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
