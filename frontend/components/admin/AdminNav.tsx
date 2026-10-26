"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const ICON_PROPS = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const ICONS: Record<string, ReactNode> = {
  profile: <svg {...ICON_PROPS}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></svg>,
  education: <svg {...ICON_PROPS}><path d="M2 8l10-4 10 4-10 4-10-4Z" /><path d="M6 10.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.5" /></svg>,
  experience: <svg {...ICON_PROPS}><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  projects: <svg {...ICON_PROPS}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>,
  research: <svg {...ICON_PROPS}><path d="M6 2h9l4 4v16H6V2Z" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>,
  fyp: <svg {...ICON_PROPS}><path d="M9 2h6M10 2v5.5L5.5 17a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 7.5V2" /></svg>,
  testimonials: <svg {...ICON_PROPS}><path d="M4 5h16v10H9l-5 4V5Z" /></svg>,
  hackathons: <svg {...ICON_PROPS}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5H5a2 2 0 0 0 0 4h3M16 5h3a2 2 0 0 1 0 4h-3M12 13v3M9 20h6M10 16h4v4h-4v-4Z" /></svg>,
  meetings: <svg {...ICON_PROPS}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>,
  chatbot: <svg {...ICON_PROPS}><rect x="3" y="5" width="18" height="12" rx="3" /><path d="M8 21l3-4h2l3 4M8 10h8M8 13h5" /></svg>,
};

const NAV = [
  { href: "/admin/profile", label: "Profile", icon: "profile" },
  { href: "/admin/education", label: "Education", icon: "education" },
  { href: "/admin/experience", label: "Experience", icon: "experience" },
  { href: "/admin/projects", label: "Projects", icon: "projects" },
  { href: "/admin/research", label: "Research", icon: "research" },
  { href: "/admin/fyp", label: "Final Year Project", icon: "fyp" },
  { href: "/admin/testimonials", label: "Testimonials", icon: "testimonials" },
  { href: "/admin/hackathons", label: "Hackathons", icon: "hackathons" },
  { href: "/admin/meeting-requests", label: "Meeting requests", icon: "meetings" },
  { href: "/admin/chatbot", label: "Chatbot", icon: "chatbot" },
  { href: "/admin/seo", label: "SEO & measurement", icon: "research" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible [scrollbar-width:none]">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-nav-link shrink-0 sm:shrink ${active ? "admin-nav-link-active" : ""}`}
          >
            {ICONS[item.icon]}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
