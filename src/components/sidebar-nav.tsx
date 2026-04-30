"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  Scissors,
  Palette,
  Spool,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ModuleColor =
  | "primary"
  | "arge"
  | "numune"
  | "boyane"
  | "iplik"
  | "cozgu"
  | "ayarlar";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  color: ModuleColor;
  disabled?: boolean;
}

interface NavGroup {
  label: string | null; // null → grup başlığı yok
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/", label: "Pano", icon: LayoutDashboard, color: "primary" },
    ],
  },
  {
    label: "Süreçler",
    items: [
      { href: "/arge", label: "Ar-Ge Talepleri", icon: FlaskConical, color: "arge" },
      { href: "/numune-dokuma", label: "Numune Dokuma", icon: Scissors, color: "numune" },
      { href: "/iplik", label: "İplik", icon: Spool, color: "iplik", disabled: true },
      { href: "/boyahane", label: "Boyahane", icon: Palette, color: "boyane" },
      { href: "/cozgu", label: "Çözgü", icon: Scissors, color: "cozgu", disabled: true },
    ],
  },
  {
    label: "Yönetim",
    items: [
      { href: "/ayarlar", label: "Ayarlar", icon: Settings, color: "ayarlar" },
    ],
  },
];

/** Modül rengini CSS variable'a map'le */
const COLOR_VAR: Record<ModuleColor, string> = {
  primary: "var(--primary)",
  arge: "var(--mod-arge)",
  numune: "var(--mod-numune)",
  boyane: "var(--mod-boyane)",
  iplik: "var(--mod-iplik)",
  cozgu: "var(--mod-cozgu)",
  ayarlar: "var(--mod-ayarlar)",
};

export function SidebarNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function renderItem({ href, label, icon: Icon, color, disabled }: NavItem) {
        const active = !disabled && isActive(href);
        const colorVar = COLOR_VAR[color];
        return (
          <Link
            key={href}
            href={disabled ? "#" : href}
            aria-disabled={disabled}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
              disabled && "text-muted-foreground/40 cursor-not-allowed",
              !disabled && !active &&
                "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 hover:translate-x-0.5",
              active &&
                "text-sidebar-foreground font-medium bg-sidebar-accent"
            )}
            style={
              active
                ? ({
                    boxShadow: `
                      inset 3px 0 0 0 ${colorVar},
                      0 0 0 1px color-mix(in oklch, ${colorVar} 25%, transparent),
                      0 4px 16px -4px color-mix(in oklch, ${colorVar} 50%, transparent),
                      0 0 24px -8px color-mix(in oklch, ${colorVar} 35%, transparent)
                    `,
                  } as React.CSSProperties)
                : undefined
            }
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-all shrink-0",
                !active && !disabled && "group-hover:scale-110"
              )}
              style={
                active
                  ? ({
                      color: colorVar,
                      filter: `drop-shadow(0 0 6px color-mix(in oklch, ${colorVar} 60%, transparent))`,
                    } as React.CSSProperties)
                  : undefined
              }
            />
            <span className="flex-1 truncate">{label}</span>
            {disabled && (
              <span className="ml-auto text-[10px] text-muted-foreground/60">
                yakında
              </span>
            )}
            {active && (
              <span
                className="ml-auto h-1.5 w-1.5 rounded-full animate-pulse-glow"
                style={
                  {
                    background: colorVar,
                    boxShadow: `0 0 8px ${colorVar}, 0 0 16px color-mix(in oklch, ${colorVar} 50%, transparent)`,
                    "--glow-color": colorVar,
                  } as React.CSSProperties
                }
                aria-hidden
              />
            )}
          </Link>
        );
  }

  return (
    <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
      {NAV_GROUPS.map((group, idx) => (
        <div key={idx} className="space-y-0.5">
          {group.label && (
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </div>
          )}
          {group.items.map((item) => (
            <React.Fragment key={item.href}>{renderItem(item)}</React.Fragment>
          ))}
        </div>
      ))}
    </nav>
  );
}
