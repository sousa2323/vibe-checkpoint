import { Bookmark, MapPin } from "lucide-react";

export interface EventCardProps {
  id: string;
  title: string;
  venue: string;
  date: string;        // "16 Dec"
  price?: string;      // "$1200"
  going?: number;
  image: string;
  live?: boolean;
}

export function EventCard(props: EventCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-muted">
      <img
        src={props.image}
        alt={props.title}
        className="h-72 w-full object-cover"
        loading="lazy"
      />

      {/* Top badges */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        {props.going !== undefined && (
          <div className="flex items-center gap-2 rounded-full bg-foreground/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <div className="flex -space-x-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-4 w-4 rounded-full border border-foreground bg-primary"
                />
              ))}
            </div>
            {props.going} Going
          </div>
        )}
        <button
          type="button"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-foreground shadow-md"
          aria-label="Salvar"
        >
          <Bookmark className="h-4 w-4" />
        </button>
      </div>

      {props.live && (
        <div className="absolute left-4 top-16 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          Ao vivo
        </div>
      )}

      {/* Floating bottom panel */}
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-3xl bg-white p-3 shadow-lg">
        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-foreground text-white">
          <span className="text-[10px] font-medium uppercase opacity-70">
            {props.date.split(" ")[1]}
          </span>
          <span className="text-base font-bold leading-none">
            {props.date.split(" ")[0]}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold leading-tight">{props.title}</h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {props.venue}
          </p>
        </div>
        {props.price && (
          <div className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-sm font-bold">
            {props.price}
          </div>
        )}
      </div>
    </div>
  );
}
