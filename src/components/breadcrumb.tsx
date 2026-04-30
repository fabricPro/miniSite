"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Path → label haritası. Statik segmentler buraya, dinamik (CSR018, D.TRY840 vs.)
 * direkt URL segment'inden alınır.
 */
const STATIC_LABELS: Record<string, string> = {
  arge: "Ar-Ge Talepleri",
  "numune-dokuma": "Numune Dokuma",
  boyahane: "Boyahane",
  iplik: "İplik",
  cozgu: "Çözgü",
  ayarlar: "Ayarlar",
  "islem-tipleri": "İşlem Tipleri",
  yeni: "Yeni",
  kopyala: "Kopya Görünümü",
  pdf: "PDF",
};

/** Modül kökü → renk haritası */
const MOD_COLOR: Record<string, string> = {
  arge: "var(--mod-arge)",
  "numune-dokuma": "var(--mod-numune)",
  boyahane: "var(--mod-boyane)",
  iplik: "var(--mod-iplik)",
  cozgu: "var(--mod-cozgu)",
  ayarlar: "var(--mod-ayarlar)",
};

interface Crumb {
  href: string;
  label: string;
  isLast: boolean;
}

function buildCrumbs(pathname: string): Crumb[] {
  // "/numune-dokuma/D.TRY840" → ["numune-dokuma", "D.TRY840"]
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let acc = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    acc += `/${seg}`;
    const decodedSeg = decodeURIComponent(seg);
    const label = STATIC_LABELS[seg] ?? decodedSeg;
    crumbs.push({
      href: acc,
      label,
      isLast: i === segments.length - 1,
    });
  }
  return crumbs;
}

export function Breadcrumb() {
  const pathname = usePathname();
  const crumbs = React.useMemo(() => buildCrumbs(pathname), [pathname]);

  if (crumbs.length === 0) {
    // Ana sayfa
    return (
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs"
      >
        <Home className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">Pano</span>
      </nav>
    );
  }

  // İlk segment'e göre modül rengi
  const moduleColor = MOD_COLOR[crumbs[0]?.href.replace("/", "")] ?? null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-xs min-w-0"
    >
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground transition-colors flex items-center shrink-0"
        title="Pano"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((c, i) => (
        <React.Fragment key={c.href}>
          <ChevronRight
            className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0"
            aria-hidden
          />
          {c.isLast ? (
            <span
              className={cn(
                "font-mono font-semibold tracking-tight truncate",
                // Son segment dinamik kod ise (CSR/D.TRY ile başlıyor) modül rengi
                /^(CSR|D\.TRY|D\d{6,})/.test(c.label) ? "" : "font-sans"
              )}
              style={
                i === crumbs.length - 1 && moduleColor
                  ? { color: moduleColor }
                  : undefined
              }
            >
              {c.label}
            </span>
          ) : (
            <Link
              href={c.href}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors truncate"
              )}
            >
              {c.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
