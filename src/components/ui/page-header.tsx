import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Lucide icon — modülün rengiyle gösterilir */
  icon?: LucideIcon;
  /** Başlık (h2) */
  title: string;
  /** Alt açıklama */
  description?: string;
  /** Sağ tarafta aksiyonlar (button, link vs.) */
  actions?: React.ReactNode;
  /** İkon + başlık vurgu rengi (CSS variable) */
  accent?: string;
  /** Sayım rozeti — başlık yanında */
  count?: number | string;
  className?: string;
}

/**
 * Standart sayfa başlığı — tüm modül sayfalarında tutarlı.
 * Modül rengiyle ikon + büyük başlık + açıklama + aksiyon slotu.
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  accent,
  count,
  className,
}: Props) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4 pb-1",
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div
            className="grid place-items-center h-10 w-10 rounded-xl shrink-0 mt-0.5"
            style={{
              background: accent
                ? `color-mix(in oklch, ${accent} 14%, transparent)`
                : "var(--muted)",
              boxShadow: accent
                ? `inset 0 0 0 1px color-mix(in oklch, ${accent} 22%, transparent), 0 0 16px -4px color-mix(in oklch, ${accent} 30%, transparent)`
                : undefined,
            }}
          >
            <Icon
              className="h-5 w-5"
              style={accent ? { color: accent } : undefined}
              strokeWidth={2.25}
            />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold tracking-tight leading-tight">
              {title}
            </h2>
            {count !== undefined && (
              <span
                className="text-xs tabular-nums px-2 py-0.5 rounded-md font-medium"
                style={{
                  background: accent
                    ? `color-mix(in oklch, ${accent} 12%, transparent)`
                    : "var(--muted)",
                  color: accent ?? "var(--muted-foreground)",
                }}
              >
                {count}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
