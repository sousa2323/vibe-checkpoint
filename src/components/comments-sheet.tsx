import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, MessageCircle, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { addPostComment, getPostComments, type PostCommentSummary } from "@/lib/data";

type CommentsSheetProps = {
  open: boolean;
  postId?: string;
  userId?: string;
  onOpenChange: (open: boolean) => void;
  onRequireAuth: () => void;
  onAdded: (postId: string) => void;
  onStatus: (message: string) => void;
};

export function CommentsSheet({
  open,
  postId,
  userId,
  onOpenChange,
  onRequireAuth,
  onAdded,
  onStatus,
}: CommentsSheetProps) {
  const loadComments = useServerFn(getPostComments);
  const createComment = useServerFn(addPostComment);
  const [comments, setComments] = useState<PostCommentSummary[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !postId) return;

    let cancelled = false;
    setLoading(true);
    loadComments({ data: { postId } })
      .then((nextComments) => {
        if (!cancelled) setComments(nextComments);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadComments, open, postId]);

  async function submit() {
    if (!postId) return;
    if (!userId) {
      onRequireAuth();
      return;
    }

    const text = body.trim();
    if (!text) return;

    setSending(true);
    try {
      const comment = await createComment({ data: { userId, postId, body: text } });
      setComments((current) => [...current, comment]);
      setBody("");
      onAdded(postId);
    } catch (cause) {
      onStatus(cause instanceof Error ? cause.message : "Não foi possível comentar agora.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 top-auto grid max-h-[86vh] max-w-[420px] translate-y-0 grid-rows-[auto_1fr_auto] gap-0 overflow-hidden rounded-t-[2rem] border-0 p-0 sm:top-[50%] sm:translate-y-[-50%] sm:rounded-[2rem]">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="text-xl font-black">Comentários</DialogTitle>
          <DialogDescription>
            {comments.length === 1 ? "1 comentário" : `${comments.length} comentários`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
              <LoaderCircle className="h-7 w-7 animate-spin" />
              <p className="mt-3 text-sm font-semibold">Carregando comentários</p>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <UserAvatar
                    name={comment.authorName}
                    imageUrl={comment.authorAvatarUrl}
                    className="h-9 w-9 text-xs"
                  />
                  <div className="min-w-0 flex-1 rounded-2xl bg-muted px-3 py-2">
                    <p className="text-sm font-black">{comment.authorName}</p>
                    <p className="mt-1 text-sm leading-relaxed">{comment.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-44 flex-col items-center justify-center rounded-3xl bg-muted text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-black">Ainda sem comentários</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Seja a primeira pessoa a comentar.
              </p>
            </div>
          )}
        </div>

        <form
          className="flex items-center gap-2 border-t border-border bg-background p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Adicionar comentário..."
            className="min-w-0 flex-1 rounded-full bg-muted px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            maxLength={280}
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            aria-label="Enviar comentário"
          >
            {sending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
