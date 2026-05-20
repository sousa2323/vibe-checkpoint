import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "dark" | "light" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]",
  dark: "bg-foreground text-white hover:opacity-90 active:scale-[0.98]",
  light: "bg-white text-foreground hover:bg-muted active:scale-[0.98]",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-muted active:scale-[0.98]",
  ghost: "bg-transparent text-foreground hover:bg-muted",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-[15px]",
  lg: "h-14 px-8 text-base",
};

export const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
PillButton.displayName = "PillButton";
