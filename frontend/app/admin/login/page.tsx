"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float-slow absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-500 opacity-[var(--blob-opacity)] blur-[120px]" />
        <div className="animate-float absolute bottom-0 right-1/4 h-[260px] w-[260px] rounded-full bg-fuchsia-500 opacity-[var(--blob-opacity)] blur-[100px]" />
      </div>

      <form action={action} className="admin-card w-full max-w-sm space-y-4 p-8">
        <div>
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-xl font-bold text-transparent">
            Portfolio
          </span>
          <span className="ml-1.5 text-base font-medium text-text-secondary">admin</span>
        </div>

        <div>
          <label htmlFor="email" className="admin-label">Email</label>
          <input id="email" name="email" type="email" required autoComplete="username" className="admin-input" />
        </div>

        <div>
          <label htmlFor="password" className="admin-label">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="admin-input" />
        </div>

        {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

        <button type="submit" disabled={pending} className="admin-btn admin-btn-primary w-full">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
