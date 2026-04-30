"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Tema toggle — 2 state: Açık ↔ Koyu.
 * SSR'de hydration mismatch olmasın diye useSyncExternalStore ile mounted gate.
 */

function useMounted(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        aria-label="Tema"
        disabled
      >
        <Sun className="h-4 w-4 mr-2 opacity-50" />
        <span className="opacity-50">Tema</span>
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={`${isDark ? "Açık" : "Koyu"} temaya geç`}
      aria-label={`Mevcut tema: ${isDark ? "Koyu" : "Açık"}`}
    >
      {isDark ? (
        <Moon className="h-4 w-4 mr-2 shrink-0" />
      ) : (
        <Sun className="h-4 w-4 mr-2 shrink-0" />
      )}
      <span>Tema: {isDark ? "Koyu" : "Açık"}</span>
    </Button>
  );
}
