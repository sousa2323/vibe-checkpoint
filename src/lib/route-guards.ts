import { redirect } from "@tanstack/react-router";
import { authClient } from "@/auth";

export async function requireAuthenticatedRoute() {
  if (typeof window === "undefined") return;

  const session = await authClient.getSession().catch(() => null);
  if (!session?.user?.id) {
    throw redirect({ to: "/auth", replace: true });
  }
}
