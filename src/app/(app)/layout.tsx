import { auth, signOut } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SidebarNav } from "@/components/sidebar-nav";
import { Breadcrumb } from "@/components/breadcrumb";
import { LogOut, Sparkles } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-4 py-4 flex items-center gap-2.5">
          <div
            className="grid place-items-center h-9 w-9 rounded-xl shrink-0 ring-1 ring-inset ring-white/15"
            style={{
              background:
                "linear-gradient(135deg, var(--mod-numune), var(--mod-iplik))",
              boxShadow: `
                0 0 0 1px color-mix(in oklch, var(--mod-numune) 30%, transparent),
                0 4px 20px -4px color-mix(in oklch, var(--mod-iplik) 50%, transparent),
                0 0 32px -8px color-mix(in oklch, var(--mod-numune) 40%, transparent)
              `,
            }}
          >
            <Sparkles
              className="h-4 w-4 text-white"
              strokeWidth={2.5}
              style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.5))" }}
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold tracking-tight text-sm leading-tight">
              Numune Master
            </h1>
            <p className="text-[10px] text-muted-foreground leading-tight">
              R&D Süreç Yönetimi
            </p>
          </div>
        </div>
        <Separator />
        <SidebarNav />
        <Separator />
        <div className="p-2.5 space-y-1.5">
          {/* Kompakt user card */}
          <div
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
            style={{
              background: "color-mix(in oklch, var(--sidebar-accent) 60%, transparent)",
            }}
          >
            <div
              className="grid place-items-center h-7 w-7 rounded-full shrink-0 text-[10px] font-semibold text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--mod-numune), var(--mod-arge))",
              }}
            >
              {session?.user?.email?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">
                {session?.user?.name ?? "Kullanıcı"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {session?.user?.email ?? "—"}
              </p>
            </div>
          </div>
          <ThemeToggle />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Slim top bar — breadcrumb + opsiyonel sayfa aksiyonları */}
        <header className="h-10 border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-20 flex items-center px-4 sm:px-6 shrink-0">
          <Breadcrumb />
        </header>
        <div className="flex-1 min-h-0 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
