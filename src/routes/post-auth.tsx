import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient, getAuthUserName } from "@/auth";
import { type AccountType, getUserProfile, saveUserProfile } from "@/lib/profile-actions";

export const Route = createFileRoute("/post-auth")({
  component: PostAuth,
});

function getStoredAccountType(): AccountType {
  const mode = localStorage.getItem("chegaai:auth-mode");
  const signupType = localStorage.getItem("chegaai:signup-account-type");

  if (mode === "signup" && signupType === "owner") return "owner";
  return "explorer";
}

function PostAuth() {
  const navigate = useNavigate();
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  const getProfile = useServerFn(getUserProfile);
  const saveProfile = useServerFn(saveUserProfile);
  const [message, setMessage] = useState("Preparando sua experiência...");

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
      setMessage("Encontrando seu perfil no ChegaAí...");
      const authUserName = getAuthUserName(currentUser);
      try {
        localStorage.setItem("chegaai:onboarded", "1");
      } catch {
        // Browsers can block storage in stricter privacy modes.
      }

      const profile = await getProfile({ data: { userId: currentUser.id } });
      const storedAccountType = getStoredAccountType();
      const accountType =
        storedAccountType === "owner" && profile?.accountType !== "owner"
          ? "owner"
          : (profile?.accountType ?? storedAccountType);

      localStorage.removeItem("chegaai:signup-account-type");
      localStorage.removeItem("chegaai:auth-mode");

      if (accountType === "owner") {
        if (profile?.accountType !== "owner") {
          await saveProfile({
            data: {
              userId: currentUser.id,
              accountType: "owner",
              displayName: authUserName,
              onboardingCompleted: false,
            },
          });
        }

        if (!cancelled) {
          navigate({
            to:
              profile?.accountType === "owner" && profile.onboardingCompleted
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
          onboardingCompleted: true,
        },
      });

      if (!cancelled) {
        navigate({ to: "/discover", replace: true });
      }
    }

    routeByProfile().catch(() => {
      const fallbackType = getStoredAccountType();
      navigate({
        to: fallbackType === "owner" ? "/venue-onboarding" : "/discover",
        replace: true,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [getProfile, navigate, saveProfile, user]);

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
