import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, MapPin, MoreHorizontal, Sparkles, UserRound } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/user-avatar";
import type { FeedPostSummary, UserMentionSummary } from "@/lib/data";
import { cn } from "@/lib/utils";

type FeedPostCardProps = {
  post: FeedPostSummary;
  onLike: () => void;
  onOpenComments: () => void;
  onOpenActions?: () => void;
};

export function FeedPostCard({ post, onLike, onOpenComments, onOpenActions }: FeedPostCardProps) {
  const photoUrls = Array.from(new Set(post.photoUrls));
  const relativeTime = formatPostRelativeTime(post.createdAt);
  const taggedUsers = getPostTaggedUsers(post);

  return (
    <article className="overflow-hidden rounded-[2rem] border border-border bg-card text-card-foreground shadow-[0_18px_50px_-30px_rgba(15,23,42,0.55)]">
      <div className="flex items-center gap-3 p-4">
        <UserAvatar name={post.authorName} imageUrl={post.authorAvatarUrl} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <span className="font-black">{post.authorName}</span>
            {relativeTime ? (
              <span className="font-semibold text-muted-foreground"> · {relativeTime}</span>
            ) : null}
          </p>
          <Link
            to="/venues/$venueId"
            params={{ venueId: post.venueId }}
            aria-label={`Abrir perfil de ${post.venueName}`}
            className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {post.venueName}, {post.venueNeighborhood}
            </span>
          </Link>
          {post.eventTitle ? (
            <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Curtindo {post.eventTitle}</span>
            </div>
          ) : null}
        </div>
        {onOpenActions ? (
          <button
            type="button"
            onClick={onOpenActions}
            aria-label="Abrir opções do post"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-muted active:scale-95"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2.4} />
          </button>
        ) : null}
      </div>

      {photoUrls.length > 0 ? (
        <Carousel
          className="relative mx-3 overflow-hidden rounded-[1.5rem]"
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
          {taggedUsers.length > 0 ? <TaggedPeopleBadge taggedUsers={taggedUsers} /> : null}
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

        <div className="space-y-2 text-sm">
          <p className="font-black">{formatCount(post.likes, "curtida", "curtidas")}</p>

          {post.caption ? (
            <p className="leading-relaxed text-foreground">
              <span className="font-black">{post.authorName}</span> {post.caption}
            </p>
          ) : null}

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
      </div>
    </article>
  );
}

function TaggedPeopleBadge({ taggedUsers }: { taggedUsers: UserMentionSummary[] }) {
  const label = taggedUsers.map(mentionLabel).join(", ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Ver pessoas marcadas: ${label}`}
          className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/75 bg-black/55 text-white shadow-lg backdrop-blur transition active:scale-95"
        >
          <UserRound className="h-4.5 w-4.5" strokeWidth={2.4} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-auto rounded-2xl border-white/10 bg-zinc-950 px-3 py-2 text-white shadow-2xl"
      >
        <div className="space-y-1">
          {taggedUsers.map((user) => (
            <p key={user.userId} className="text-sm font-extrabold">
              {mentionLabel(user)}
            </p>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getPostTaggedUsers(post: FeedPostSummary): UserMentionSummary[] {
  if (post.taggedUsers?.length) return post.taggedUsers;
  if (!post.taggedUserId) return [];

  return [
    {
      userId: post.taggedUserId,
      username: post.taggedPerson?.replace(/^@/, "") || undefined,
      displayName: post.taggedPerson,
    },
  ];
}

function mentionLabel(user: UserMentionSummary) {
  return user.username ? `@${user.username}` : (user.displayName ?? "");
}

function formatCount(value: number, singular: string, plural: string) {
  const label = value === 1 ? singular : plural;
  if (value >= 1000) {
    const compact = new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(value);
    return `${compact} ${label}`;
  }

  return `${value} ${label}`;
}

function formatPostRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return "";

  const diffMs = Date.now() - createdAt;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} sem`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} m`;

  return `${Math.floor(diffDays / 365)} a`;
}
