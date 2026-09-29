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
  { href: "/admin/chatbot", label: "Chatbot" },
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
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:gap-8 sm:px-6 sm:py-10">
        <aside className="flex gap-1 overflow-x-auto border-b border-border pb-2 sm:w-48 sm:shrink-0 sm:flex-col sm:gap-1 sm:overflow-visible sm:border-0 sm:pb-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-foreground sm:block sm:w-full sm:shrink"
            >
              {item.label}
            </Link>
          ))}
          <form action={logout} className="shrink-0 sm:mt-4 sm:w-full">
            <button
              type="submit"
              className="block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-surface hover:text-foreground"
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
