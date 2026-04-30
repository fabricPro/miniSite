import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Giriş — Numune Master" };

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 60% 50% at 20% 0%, color-mix(in oklch, var(--mod-numune) 18%, transparent), transparent 60%),
          radial-gradient(ellipse 50% 40% at 80% 100%, color-mix(in oklch, var(--mod-iplik) 15%, transparent), transparent 60%),
          radial-gradient(ellipse 40% 30% at 50% 50%, color-mix(in oklch, var(--mod-arge) 10%, transparent), transparent 70%)
        `,
      }}
    >
      <div className="w-full max-w-sm space-y-6 relative">
        <div className="text-center space-y-3">
          {/* Logo — sidebar'dakinin büyüğü */}
          <div className="flex justify-center">
            <div
              className="grid place-items-center h-14 w-14 rounded-2xl ring-1 ring-inset ring-white/15"
              style={{
                background:
                  "linear-gradient(135deg, var(--mod-numune), var(--mod-iplik))",
                boxShadow: `
                  0 0 0 1px color-mix(in oklch, var(--mod-numune) 30%, transparent),
                  0 8px 32px -4px color-mix(in oklch, var(--mod-iplik) 50%, transparent),
                  0 0 64px -8px color-mix(in oklch, var(--mod-numune) 50%, transparent)
                `,
              }}
            >
              <Sparkles
                className="h-6 w-6 text-white"
                strokeWidth={2.5}
                style={{
                  filter: "drop-shadow(0 0 6px rgba(255,255,255,0.5))",
                }}
              />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Numune Master</h1>
            <p className="text-sm text-muted-foreground mt-1">
              R&D süreç yönetimi
            </p>
          </div>
        </div>
        <Suspense
          fallback={
            <div className="h-64 bg-card rounded-xl border border-border/60" />
          }
        >
          <LoginForm />
        </Suspense>
        <p className="text-center text-[11px] text-muted-foreground">
          Yetkisiz erişim engellenmiştir
        </p>
      </div>
    </div>
  );
}
