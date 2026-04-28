import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Giriş — Numune Master" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Numune Master</h1>
          <p className="text-sm text-muted-foreground">R&D süreç yönetimi</p>
        </div>
        <Suspense fallback={<div className="h-64 bg-white dark:bg-slate-900 rounded-lg border" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
