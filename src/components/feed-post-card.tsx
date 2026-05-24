import { Heart, MessageCircle, MapPin, Sparkles } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { UserAvatar } from "@/components/user-avatar";
import type { FeedPostSummary } from "@/lib/data";
import { cn } from "@/lib/utils";

type FeedPostCardProps = {
  post: FeedPostSummary;
  onLike: () => void;
  onOpenComments: () => void;
};

export function FeedPostCard({ post, onLike, onOpenComments }: FeedPostCardProps) {
  const photoUrls = Array.from(new Set(post.photoUrls));

  return (
    <article className="overflow-hidden rounded-[2rem] border border-border bg-card text-card-foreground shadow-[0_18px_50px_-30px_rgba(15,23,42,0.55)]">
      <div className="flex items-center gap-3 p-4">
        <UserAvatar name={post.authorName} imageUrl={post.authorAvatarUrl} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{post.authorName}</p>
          <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {post.venueName}, {post.venueNeighborhood}
            </span>
          </div>
        </div>
        {post.eventTitle ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-primary">
            Agora
          </span>
        ) : null}
      </div>

      {photoUrls.length > 0 ? (
        <Carousel
          className="mx-3 overflow-hidden rounded-[1.5rem]"
          opts={{ loop: photoUrls.length > 1 }}
        >
          <CarouselContent className="-ml-0">
            {photoUrls.map((url, index) => (
              <CarouselItem key={`${url}-${index}`} className="pl-0">
                <img
                  src={url}
                  alt={`Foto ${index + 1} de ${post.authorName}`}
                  className="h-80 w-full object-cover"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {photoUrls.length > 1 ? (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/35 px-2 py-1 backdrop-blur">
              {photoUrls.map((url, index) => (
                <span key={`${url}-dot-${index}`} className="h-1.5 w-1.5 rounded-full bg-white" />
              ))}
            </div>
          ) : null}
        </Carousel>
      ) : null}

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onLike}
            className="transition active:scale-90"
            aria-label={post.liked ? "Remover curtida" : "Curtir postagem"}
          >
            <Heart
              className={cn("h-7 w-7", post.liked ? "text-primary" : "text-foreground")}
              fill={post.liked ? "currentColor" : "none"}
              strokeWidth={2.2}
            />
          </button>
          <button
            type="button"
            onClick={onOpenComments}
            className="transition active:scale-90"
            aria-label="Abrir comentários"
          >
            <MessageCircle className="h-7 w-7" strokeWidth={2.2} />
          </button>
        </div>

        <div className="space-y-1 text-sm">
          <p className="font-black">{formatCount(post.likes, "curtida", "curtidas")}</p>
          <button
            type="button"
            onClick={onOpenComments}
            className="font-semibold text-muted-foreground"
          >
            {post.comments > 0
              ? `Ver ${formatCount(post.comments, "comentário", "comentários")}`
              : "Comentar"}
          </button>
        </div>

        {post.eventTitle ? (
          <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-xs font-bold">
            <Sparkles className="h-4 w-4 text-primary" />
            Curtindo {post.eventTitle}
          </div>
        ) : null}

        {post.caption ? <p className="text-sm leading-relaxed">{post.caption}</p> : null}

        {post.taggedPerson ? (
          <p className="text-xs font-bold text-muted-foreground">Com {post.taggedPerson}</p>
        ) : null}
      </div>
    </article>
  );
}

function formatCount(value: number, singular: string, plural: string) {
  const label = value === 1 ? singular : plural;
  if (value >= 1000) {
    const compact = new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(value);
    return `${compact} ${label}`;
  }

  return `${value} ${label}`;
}
