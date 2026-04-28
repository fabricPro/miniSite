import Link from "next/link";
import { auth, signOut } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  FlaskConical,
  Scissors,
  Palette,
  Spool,
  Settings,
  LogOut,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Pano", icon: LayoutDashboard },
  { href: "/arge", label: "Ar-Ge Talepleri", icon: FlaskConical },
  { href: "/numune-dokuma", label: "Numune Dokuma", icon: Scissors },
  { href: "/iplik", label: "İplik", icon: Spool, disabled: true },
  { href: "/boyahane", label: "Boyahane", icon: Palette },
  { href: "/cozgu", label: "Çözgü", icon: Scissors, disabled: true },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <aside className="w-64 shrink-0 border-r bg-white dark:bg-slate-900 flex flex-col">
        <div className="p-4">
          <h1 className="font-semibold tracking-tight">Numune Master</h1>
          <p className="text-xs text-muted-foreground">R&D Süreç Yönetimi</p>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, disabled }) => (
            <Link
              key={href}
              href={disabled ? "#" : href}
              aria-disabled={disabled}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                disabled
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {disabled && <span className="ml-auto text-[10px]">yakında</span>}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-3 space-y-2">
          <div className="text-xs text-muted-foreground">
            {session?.user?.email ?? "—"}
          </div>
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

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
