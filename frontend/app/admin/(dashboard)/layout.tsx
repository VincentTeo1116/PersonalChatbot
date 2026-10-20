import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";
import Spotlight from "@/components/admin/Spotlight";
import { AdminFeedbackProvider } from "@/components/admin/AdminFeedback";
import { logout } from "./actions";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense-in-depth alongside proxy.ts, which already redirects unauthenticated requests to /admin/login before this layout ever renders.
  if (!user) redirect("/admin/login");

  return (
    <AdminFeedbackProvider>
    <div className="relative min-h-screen bg-background text-foreground">
      <Spotlight />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-float-slow absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-indigo-500 opacity-[var(--blob-opacity)] blur-[120px]" />
        <div className="animate-float absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-fuchsia-500 opacity-[var(--blob-opacity)] blur-[100px]" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:flex-row sm:gap-8 sm:px-6 sm:py-10">
        <aside className="sm:w-56 sm:shrink-0">
          <div className="admin-card flex flex-col gap-1 p-3 sm:sticky sm:top-10">
            <Link href="/admin" className="block px-2.5 pb-3 pt-1.5">
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-lg font-bold text-transparent">
                Portfolio
              </span>
              <span className="ml-1.5 text-sm font-medium text-text-secondary">admin</span>
            </Link>
            <AdminNav />
            <div className="mt-2 border-t border-border pt-3">
              <a href="/" target="_blank" rel="noreferrer" className="admin-nav-link">
                View site ↗
              </a>
              <p className="truncate px-2.5 pt-2 text-xs text-text-subtle">{user.email}</p>
              <form action={logout}>
                <button type="submit" className="admin-nav-link w-full text-left">
                  Log out
                </button>
              </form>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
    </AdminFeedbackProvider>
  );
}
