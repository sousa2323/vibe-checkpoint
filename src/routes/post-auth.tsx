import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, TriangleAlert, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient, getAuthUserName } from "@/auth";
import { type AccountType, getUserProfile, saveUserProfile } from "@/lib/profile-actions";

export const Route = createFileRoute("/post-auth")({
  component: PostAuth,
});

function toAccountType(value: unknown): AccountType {
  return value === "owner" ? "owner" : "explorer";
}

function getUrlAccountType(): AccountType {
  if (typeof window === "undefined") return "explorer";

  try {
    const params = new URLSearchParams(window.location.search);
    return toAccountType(params.get("account_type") ?? params.get("accountType"));
  } catch {
    return "explorer";
  }
}

function getStoredAccountType(): AccountType {
  let mode: string | null = null;
  let signupType: string | null = null;

  try {
    mode = localStorage.getItem("chegaai:auth-mode");
    signupType = localStorage.getItem("chegaai:signup-account-type");
  } catch {
    return "explorer";
  }

  if (mode === "login") return "explorer";
  return toAccountType(signupType);
}

function getMetadataAccountType(user: unknown): AccountType {
  if (!user || typeof user !== "object" || !("user_metadata" in user)) return "explorer";

  const metadata = user.user_metadata;
  if (!metadata || typeof metadata !== "object") return "explorer";

  const metadataRecord = metadata as Record<string, unknown>;
  return toAccountType(metadataRecord.account_type ?? metadataRecord.accountType);
}

function getMetadataUsername(user: unknown) {
  if (!user || typeof user !== "object" || !("user_metadata" in user)) return undefined;

  const metadata = user.user_metadata;
  if (!metadata || typeof metadata !== "object") return undefined;

  const username = (metadata as Record<string, unknown>).username;
  return typeof username === "string" ? username : undefined;
}

function getRequestedAccountType(user: unknown): AccountType {
  const requestedTypes = [
    getUrlAccountType(),
    getStoredAccountType(),
    getMetadataAccountType(user),
  ];
  return requestedTypes.includes("owner") ? "owner" : "explorer";
}

type PostAuthErrorKind = "connection" | "session";

function isConnectionError(cause: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (cause instanceof Error) {
    const message = cause.message.toLowerCase();
    return (
      message.includes("failed to fetch") ||
      message.includes("load failed") ||
      message.includes("network") ||
      message.includes("fetch")
    );
  }
  return false;
}

function clearStoredAuthIntent() {
  try {
    localStorage.removeItem("chegaai:signup-account-type");
    localStorage.removeItem("chegaai:auth-mode");
  } catch {
    // Browsers can block storage in stricter privacy modes.
  }
}

function PostAuth() {
  const navigate = useNavigate();
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  const getProfile = useServerFn(getUserProfile);
  const saveProfile = useServerFn(saveUserProfile);
  const [message, setMessage] = useState("Preparando sua experiência...");
  const [errorKind, setErrorKind] = useState<PostAuthErrorKind | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (isPending || user) return;

    const timeout = window.setTimeout(() => {
      navigate({ to: "/auth", replace: true });
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [isPending, navigate, user]);

  useEffect(() => {
    if (!user?.id) return;
    const currentUser = user;

    let cancelled = false;

    async function routeByProfile() {
      setErrorKind(null);
      setMessage("Encontrando seu perfil no ChegaAí...");
      const authUserName = getAuthUserName(currentUser);
      const authUsername = getMetadataUsername(currentUser);
      try {
        localStorage.setItem("chegaai:onboarded", "1");
      } catch {
        // Browsers can block storage in stricter privacy modes.
      }

      const profile = await getProfile({ data: { userId: currentUser.id } });
      const requestedAccountType = getRequestedAccountType(currentUser);
      const hasApprovedOwnerProfile = profile?.accountType === "owner";
      const accountType =
        requestedAccountType === "owner" && !hasApprovedOwnerProfile
          ? "owner"
          : (profile?.accountType ?? requestedAccountType);

      if (accountType === "owner") {
        if (profile?.accountType !== "owner") {
          await saveProfile({
            data: {
              userId: currentUser.id,
              accountType: "explorer",
              displayName: authUserName,
              onboardingCompleted: true,
            },
          });
        }

        clearStoredAuthIntent();

        if (!cancelled) {
          navigate({
            to:
              hasApprovedOwnerProfile && profile.onboardingCompleted
                ? "/venue-dashboard"
                : "/venue-onboarding",
            replace: true,
          });
        }
        return;
      }

      await saveProfile({
        data: {
          userId: currentUser.id,
          accountType: "explorer",
          displayName: authUserName,
          username: authUsername,
          onboardingCompleted: true,
        },
      });

      clearStoredAuthIntent();

      if (!cancelled) {
        navigate({ to: "/discover", replace: true });
      }
    }

    routeByProfile().catch((cause) => {
      if (cancelled) return;
      setErrorKind(isConnectionError(cause) ? "connection" : "session");
    });

    return () => {
      cancelled = true;
    };
  }, [getProfile, navigate, retryKey, saveProfile, user]);

  if (errorKind) {
    const isConnection = errorKind === "connection";

    return (
      <main className="app-shell flex flex-col items-center justify-center bg-background px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-ink text-white">
          {isConnection ? (
            <WifiOff className="h-7 w-7" />
          ) : (
            <TriangleAlert className="h-7 w-7" />
          )}
        </div>
        <h1 className="mt-6 text-2xl font-black tracking-tight">
          {isConnection ? "Sem conexão" : "Algo deu errado"}
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {isConnection
            ? "Verifique sua internet e tente de novo para continuar."
            : "Não foi possível confirmar sua sessão. Tente novamente."}
        </p>
        <div className="mt-5 flex w-full max-w-xs flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setErrorKind(null);
              setRetryKey((current) => current + 1);
            }}
            className="rounded-full bg-ink px-4 py-3 text-sm font-bold text-white"
          >
            Tentar novamente
          </button>
          {!isConnection ? (
            <button
              type="button"
              onClick={() => navigate({ to: "/auth", replace: true })}
              className="rounded-full bg-muted px-4 py-3 text-sm font-bold text-foreground"
            >
              Entrar novamente
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell flex flex-col items-center justify-center bg-background px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-ink text-white">
        <LoaderCircle className="h-7 w-7 animate-spin" />
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tight">Quase lá</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{message}</p>
    </main>
  );
}
