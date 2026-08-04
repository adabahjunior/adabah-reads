import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong" | "yellow" | "dark";
}

export function GlassCard({
  className,
  variant = "default",
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-6 transition-all duration-300",
        variant === "default" && "glass-card",
        variant === "strong" && "glass-card-strong",
        variant === "yellow" && "card-yellow",
        variant === "dark" && "card-dark",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
