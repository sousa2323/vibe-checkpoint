import { ChevronDown } from "lucide-react";
import type { Key, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SwipeCollapseCardProps = {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  resetKey?: Key;
  className?: string;
  iconClassName?: string;
  headerAccessory?: ReactNode;
};

export function SwipeCollapseCard({
  title,
  description,
  icon,
  children,
  defaultOpen = true,
  resetKey,
  className,
  iconClassName,
  headerAccessory,
}: SwipeCollapseCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const swipeStartY = useRef<number | null>(null);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen, resetKey]);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    swipeStartY.current = event.clientY;
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const startY = swipeStartY.current;
    swipeStartY.current = null;

    if (startY === null) return;

    const distance = event.clientY - startY;
    if (Math.abs(distance) < 36) {
      setIsOpen((value) => !value);
      return;
    }

    setIsOpen(distance > 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setIsOpen((value) => !value);
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[2rem] border border-border bg-card p-4 text-card-foreground",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          swipeStartY.current = null;
        }}
        onKeyDown={handleKeyDown}
        className="flex w-full touch-pan-y items-start gap-3 text-left"
      >
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary",
            iconClassName,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black tracking-tight">{title}</p>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {headerAccessory}
          <ChevronDown
            className={cn(
              "h-5 w-5 text-primary transition-transform duration-300",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
