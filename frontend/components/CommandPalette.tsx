"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Profile, Project, Publication } from "@/lib/types";

// cmdk (the palette UI) is only needed once someone actually opens it, so it's split out of the
// initial bundle. This shell stays tiny and always mounted so Cmd/Ctrl+K and the nav's Search
// button keep working from the first moment.
const CommandPaletteDialog = dynamic(() => import("@/components/CommandPaletteDialog"));

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
  // Stays true after the first open so the dialog (and its close animation) isn't torn down.
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    function show() {
      setEverOpened(true);
      setOpen(true);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setEverOpened(true);
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("portfolio:open-palette", show);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("portfolio:open-palette", show);
    };
  }, []);

  if (!everOpened) return null;
  return <CommandPaletteDialog open={open} onOpenChange={setOpen} profile={profile} projects={projects} research={research} />;
}
