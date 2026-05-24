import { UserRound } from "lucide-react";
import { getInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string;
  imageUrl?: string;
  className?: string;
  imageClassName?: string;
};

export function UserAvatar({ name, imageUrl, className, imageClassName }: UserAvatarProps) {
  const label = name?.trim() || "Usuário";
  const initials = getInitials(label);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-black text-foreground",
        className,
      )}
      aria-label={label}
      title={label}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={label}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <UserRound className="h-1/2 w-1/2" aria-hidden="true" />
      )}
    </div>
  );
}
