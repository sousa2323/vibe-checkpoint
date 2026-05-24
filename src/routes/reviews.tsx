import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/auth";
import { FeedActionNav } from "@/components/feed-action-nav";
import { PillButton } from "@/components/pill-button";
import { getUserEventReviews, type UserEventReviewSummary } from "@/lib/data";

export const Route = createFileRoute("/reviews")({
  component: ReviewsPage,
});

function ReviewsPage() {
  const navigate = useNavigate();
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  const loadReviews = useServerFn(getUserEventReviews);
  const [reviews, setReviews] = useState<UserEventReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPending) return;
    if (!user?.id) {
      navigate({ to: "/auth" });
      return;
    }

    setLoading(true);
    loadReviews({ data: { userId: user.id } })
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [isPending, loadReviews, navigate, user?.id]);

  return (
    <main className="app-shell bg-background pb-32">
      <header className="px-6 pt-8">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Perfil</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Minhas avaliações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Os rolês que você avaliou depois do check-in.
        </p>
      </header>

      <section className="mt-6 space-y-3 px-6">
        {loading ? (
          <p className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Carregando avaliações...
          </p>
        ) : reviews.length === 0 ? (
          <div className="rounded-3xl border border-border p-6 text-center">
            <p className="font-bold">Nenhuma avaliação ainda</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Faça check-in em um evento e avalie como foi o rolê para aparecer aqui.
            </p>
            <PillButton className="mt-5 w-full" onClick={() => navigate({ to: "/discover" })}>
              Explorar eventos
            </PillButton>
          </div>
        ) : (
          reviews.map((review) => (
            <button
              key={review.id}
              type="button"
              onClick={() =>
                navigate({ to: "/events/$eventId", params: { eventId: review.eventId } })
              }
              className="w-full rounded-3xl bg-muted p-3 text-left"
            >
              <div className="flex gap-3">
                <img
                  src={review.eventImage}
                  alt={review.eventTitle}
                  className="h-20 w-20 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{review.eventTitle}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {review.venueName}, {review.venueNeighborhood}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-amber-400">
                    <Stars value={averageReview(review)} />
                    <span className="ml-1 text-xs font-black text-foreground">
                      {averageReview(review).toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-primary">{review.eventDate}</p>
                </div>
              </div>
              {review.comment ? (
                <p className="mt-3 rounded-2xl bg-background px-3 py-2 text-sm text-muted-foreground">
                  {review.comment}
                </p>
              ) : null}
            </button>
          ))
        )}
      </section>

      <FeedActionNav />
    </main>
  );
}

function averageReview(review: UserEventReviewSummary) {
  return (review.atmosphere + review.music + review.price + review.movement) / 4;
}

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return [1, 2, 3, 4, 5].map((rating) => (
    <Star key={rating} className="h-4 w-4" fill={rating <= rounded ? "currentColor" : "none"} />
  ));
}
