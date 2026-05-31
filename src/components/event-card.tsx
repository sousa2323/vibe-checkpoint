import {
  BadgeCheck,
  Bookmark,
  CheckCircle2,
  Flame,
  MapPin,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import type { UserAvatarSummary } from "@/lib/data";

export interface EventCardProps {
  id: string;
  title: string;
  venue: string;
  date: string;
  going?: number;
  image: string;
  price?: string;
  live?: boolean;
  actionsDisabled?: boolean;
  saved?: boolean;
  checkedIn?: boolean;
  attendees?: UserAvatarSummary[];
  onOpenDetails?: () => void;
  onToggleSave?: () => void;
  onCheckin?: () => void;
}

export function EventCard(props: EventCardProps) {
  const [day, month = ""] = props.date.split(" ");
  const going = props.going;
  const attendees = props.attendees?.slice(0, 3) ?? [];
  const socialProof = getSocialProof(props);
  const actionsDisabled = Boolean(props.actionsDisabled);

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-muted"
      role={props.onOpenDetails ? "button" : undefined}
      tabIndex={props.onOpenDetails ? 0 : undefined}
      onClick={props.onOpenDetails}
      onKeyDown={(event) => {
        if (!props.onOpenDetails) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          props.onOpenDetails();
        }
      }}
    >
      <img
        src={props.image}
        alt={props.title}
        className="h-80 w-full object-cover"
        loading="lazy"
      />

      {/* Top badges */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        {going !== undefined && (
          <div className="flex items-center gap-2 rounded-full bg-ink/85 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur">
            {going > 0 ? (
              <div className="flex -space-x-1.5" aria-hidden="true">
                {attendees.map((attendee) => (
                  <UserAvatar
                    key={attendee.userId}
                    name={attendee.name}
                    imageUrl={attendee.avatarUrl}
                    className="h-5 w-5 border-2 border-foreground bg-card text-[9px] text-card-foreground"
                  />
                ))}
                {going > attendees.length && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-foreground bg-card text-[9px] font-black text-card-foreground">
                    +{going - attendees.length}
                  </div>
                )}
              </div>
            ) : (
              <UsersRound className="h-4 w-4" aria-hidden="true" />
            )}
            {confirmedLabel(going)}
          </div>
        )}
        <button
          type="button"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-card-foreground shadow-md"
          aria-label={props.saved ? "Remover dos salvos" : "Salvar"}
          onClick={(event) => {
            event.stopPropagation();
            if (actionsDisabled) return;
            props.onToggleSave?.();
          }}
          disabled={!props.onToggleSave || actionsDisabled}
        >
          <Bookmark className="h-4 w-4" fill={props.saved ? "currentColor" : "none"} />
        </button>
      </div>

      {(props.live || socialProof) && (
        <div className="absolute left-4 top-16 flex max-w-[calc(100%-2rem)] flex-col items-start gap-2">
          {props.live && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/20">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Ao vivo agora
            </div>
          )}
          {socialProof && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black text-ink shadow-lg backdrop-blur">
              {socialProof.tone === "hot" ? (
                <Flame className="h-3.5 w-3.5 text-primary" fill="currentColor" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              )}
              <span className="truncate">{socialProof.label}</span>
            </div>
          )}
        </div>
      )}

      {/* Floating bottom panel */}
      <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-[1.7rem] border border-border bg-card p-3 text-card-foreground shadow-[0_18px_40px_-22px_rgba(15,23,42,0.9)]">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink text-white">
          <span className="text-[10px] font-medium uppercase opacity-70">{month}</span>
          <span className="text-lg font-black leading-none">{day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-black leading-tight">{props.title}</h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {props.venue}
          </p>
        </div>
        {props.price && (
          <div className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-sm font-black">
            {props.price}
          </div>
        )}
        {props.onCheckin && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (actionsDisabled) return;
              props.onCheckin?.();
            }}
            aria-label={props.checkedIn ? "Desfazer check-in" : "Fazer check-in"}
            disabled={actionsDisabled}
            className={
              actionsDisabled
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                : props.checkedIn
                  ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_18px_-10px_rgba(16,185,129,0.9)]"
                  : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white"
            }
          >
            {props.checkedIn ? (
              <BadgeCheck className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function confirmedLabel(going: number) {
  if (going === 0) return "Seja o primeiro";
  if (going === 1) return "1 confirmado";
  return `${going} confirmados`;
}

function getSocialProof(props: EventCardProps) {
  const going = props.going ?? 0;

  if (props.live && going >= 12) {
    return { label: `${going} pessoas no movimento agora`, tone: "hot" as const };
  }

  if (going >= 24) {
    return { label: "Alta procura na região", tone: "hot" as const };
  }

  if (going >= 8) {
    return { label: "Grupo formando para esse rolê", tone: "warm" as const };
  }

  if (props.live) {
    return { label: "Movimento começou por aqui", tone: "warm" as const };
  }

  if (going >= 3) {
    return { label: `${going} pessoas já marcaram presença`, tone: "warm" as const };
  }

  return null;
}
