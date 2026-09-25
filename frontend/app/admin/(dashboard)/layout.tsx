import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

const NAV = [
  { href: "/admin/profile", label: "Profile" },
  { href: "/admin/education", label: "Education" },
  { href: "/admin/experience", label: "Experience" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/research", label: "Research" },
  { href: "/admin/hackathons", label: "Hackathons" },
];

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense-in-depth alongside proxy.ts, which already redirects unauthenticated
  // requests to /admin/login before this layout ever renders.
  if (!user) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
        <aside className="w-48 shrink-0 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <form action={logout}>
            <button
              type="submit"
              className="mt-4 block w-full rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-surface hover:text-foreground"
            >
              Log out
            </button>
          </form>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
