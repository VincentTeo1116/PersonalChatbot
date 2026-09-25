"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import type { Profile, Project, Publication } from "@/lib/types";

const SECTIONS = [
  { id: "top", label: "Home" },
  { id: "about", label: "About & Education" },
  { id: "experience", label: "Working Experience" },
  { id: "projects", label: "Projects" },
  { id: "research", label: "Research" },
  { id: "hackathons", label: "Hackathons" },
  { id: "contact", label: "Contact" },
];

export default function CommandPalette({
  profile,
  projects,
  research,
}: {
  profile: Profile;
  projects: Project[];
  research: Publication[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onExternalOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("portfolio:open-palette", onExternalOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("portfolio:open-palette", onExternalOpen);
    };
  }, []);

  const close = () => setOpen(false);

  const goTo = (hash: string) => {
    window.location.hash = hash;
    close();
  };

  const openAssistant = () => {
    close();
    window.location.hash = "contact";
    // The widget script attaches itself to window.portfolioChatbot once loaded.
    (window as unknown as { portfolioChatbot?: { open?: () => void } }).portfolioChatbot?.open?.();
  };

  const openTerminal = () => {
    close();
    window.dispatchEvent(new CustomEvent("portfolio:open-terminal"));
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="animate-fade-in fixed inset-0 z-[10000] flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 pt-[12vh]"
      shouldFilter
    >
      <div className="animate-fade-in-scale w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <span className="text-text-subtle">{"⌘K"}</span>
          <Command.Input
            autoFocus
            placeholder="Jump to a section, project, or action…"
            className="h-14 flex-1 bg-transparent text-sm text-foreground placeholder:text-text-subtle outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-subtle">esc</kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-text-subtle">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-subtle">
            {SECTIONS.map((s) => (
              <Command.Item
                key={s.id}
                value={`navigate ${s.label}`}
                onSelect={() => goTo(s.id)}
                className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary data-[selected=true]:bg-indigo-500/15 data-[selected=true]:text-foreground"
              >
                {s.label}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-border" />

          <Command.Group heading="Projects" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-subtle">
            {projects.map((p) => (
              <Command.Item
                key={p.slug}
                value={`project ${p.title} ${p.tags.join(" ")}`}
                onSelect={() => goTo(`project-${p.slug}`)}
                className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary data-[selected=true]:bg-indigo-500/15 data-[selected=true]:text-foreground"
              >
                {p.title}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-border" />

          <Command.Group heading="Research" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-subtle">
            {research.map((r) => (
              <Command.Item
                key={r.slug}
                value={`research ${r.title}`}
                onSelect={() => goTo(`research-${r.slug}`)}
                className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary data-[selected=true]:bg-indigo-500/15 data-[selected=true]:text-foreground"
              >
                {r.title}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-border" />

          <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-subtle">
            <Command.Item
              value="ask ai assistant chat"
              onSelect={openAssistant}
              className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary data-[selected=true]:bg-indigo-500/15 data-[selected=true]:text-foreground"
            >
              Ask my AI assistant
            </Command.Item>
            <Command.Item
              value="open terminal easter egg"
              onSelect={openTerminal}
              className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary data-[selected=true]:bg-indigo-500/15 data-[selected=true]:text-foreground"
            >
              Open terminal
            </Command.Item>
            <Command.Item
              value="email contact"
              onSelect={() => {
                window.location.href = `mailto:${profile.contact.email}`;
                close();
              }}
              className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary data-[selected=true]:bg-indigo-500/15 data-[selected=true]:text-foreground"
            >
              Email me
            </Command.Item>
            <Command.Item
              value="github"
              onSelect={() => {
                window.open(profile.contact.github, "_blank", "noreferrer");
                close();
              }}
              className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary data-[selected=true]:bg-indigo-500/15 data-[selected=true]:text-foreground"
            >
              Open GitHub
            </Command.Item>
            <Command.Item
              value="linkedin"
              onSelect={() => {
                window.open(profile.contact.linkedin, "_blank", "noreferrer");
                close();
              }}
              className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary data-[selected=true]:bg-indigo-500/15 data-[selected=true]:text-foreground"
            >
              Open LinkedIn
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
