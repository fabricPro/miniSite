import * as React from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** CSS variable or color string — oklch / hex / hsl */
  color: string;
  size?: "xs" | "sm";
  className?: string;
  children: React.ReactNode;
  /** Sol tarafta küçük renkli nokta (parlama efekti ile) */
  withDot?: boolean;
  /** Etrafta yumuşak renkli aura (urgency için) */
  withGlow?: boolean;
}

/**
 * Yumuşak vurgulu badge — modern SaaS / Linear / Notion vibes.
 * Solid background yerine: %14 transparent tint + colored text + ince border.
 */
export function SoftBadge({
  color,
  size = "sm",
  className,
  children,
  withDot,
  withGlow,
}: Props) {
  const sizeClass =
    size === "xs"
      ? "px-1.5 py-0 text-[10px] leading-4"
      : "px-2 py-0.5 text-xs leading-5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium transition-all whitespace-nowrap",
        sizeClass,
        className
      )}
      style={{
        background: `color-mix(in oklch, ${color} 14%, transparent)`,
        color: color,
        border: `1px solid color-mix(in oklch, ${color} 26%, transparent)`,
        boxShadow: withGlow
          ? `0 0 14px -2px color-mix(in oklch, ${color} 40%, transparent)`
          : undefined,
      }}
    >
      {withDot && (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{
            background: color,
            boxShadow: `0 0 6px color-mix(in oklch, ${color} 70%, transparent)`,
          }}
          aria-hidden
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
