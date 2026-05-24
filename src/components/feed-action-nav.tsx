import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { NativeFeedback } from "@/components/native-feedback";
import { PostComposer } from "@/components/post-composer";
import type { FeedPostSummary } from "@/lib/data";

export function FeedActionNav({
  onPostCreated,
}: {
  onPostCreated?: (post: FeedPostSummary) => void;
}) {
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user;
  const [composerOpen, setComposerOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <>
      <NativeFeedback message={status} onClose={() => setStatus(null)} />
      <PostComposer
        open={composerOpen}
        userId={user?.id}
        userName={user?.name}
        userAvatarUrl={getUserImage(user)}
        onOpenChange={setComposerOpen}
        onCreated={(post) => onPostCreated?.(post)}
        onRequireAuth={() => navigate({ to: "/auth" })}
        onStatus={setStatus}
      />
      <BottomNav onFabClick={() => setComposerOpen(true)} />
    </>
  );
}

function getUserImage(user: unknown) {
  if (!user || typeof user !== "object") return undefined;
  const image = (user as { image?: unknown }).image;
  return typeof image === "string" ? image : undefined;
}
