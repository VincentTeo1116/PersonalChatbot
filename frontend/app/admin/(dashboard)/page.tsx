import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";

async function countOf(supabase: SupabaseClient, table: string) {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

const STATS = [
  { table: "projects", label: "Projects", href: "/admin/projects", icon: "📦" },
  { table: "education", label: "Education", href: "/admin/education", icon: "🎓" },
  { table: "work_experience", label: "Work experience", href: "/admin/experience", icon: "💼" },
  { table: "research", label: "Research papers", href: "/admin/research", icon: "📄" },
  { table: "testimonials", label: "Testimonials", href: "/admin/testimonials", icon: "💬" },
  { table: "hackathon_photos", label: "Hackathon photos", href: "/admin/hackathons", icon: "🏆" },
  { table: "meeting_requests", label: "Meeting requests", href: "/admin/meeting-requests", icon: "📅" },
  { table: "chat_logs", label: "Chatbot questions", href: "/admin/chatbot", icon: "🤖" },
];

export default async function AdminHome() {
  const supabase = await createClient();
  const counts = await Promise.all(STATS.map((s) => countOf(supabase, s.table)));

  return (
    <div>
      <PageHeader eyebrow="Overview" title="Welcome back" description="A quick look at what's live on your portfolio right now." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Link key={s.table} href={s.href} className="admin-card group p-5 transition-transform hover:-translate-y-0.5">
            <span className="text-2xl">{s.icon}</span>
            <p className="mt-3 text-2xl font-bold text-foreground">{counts[i]}</p>
            <p className="mt-0.5 text-sm text-text-secondary group-hover:text-foreground">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="admin-card mt-6 p-5">
        <p className="text-sm font-semibold text-foreground">Need to update your profile or FYP?</p>
        <p className="mt-1 text-sm text-text-secondary">Those sections hold a single record each, so there&apos;s nothing to count -- jump straight in.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/profile" className="admin-btn admin-btn-primary">Edit profile</Link>
          <Link href="/admin/fyp" className="admin-btn admin-btn-ghost">Edit Final Year Project</Link>
        </div>
      </div>
    </div>
  );
}
