"use client";

import { useEffect } from "react";

// One global listener that makes every .admin-card glow under the cursor, instead of a handler per card.
export default function Spotlight() {
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      const card = (e.target as Element | null)?.closest<HTMLElement>(".admin-card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    }
    addEventListener("pointermove", onMove, { passive: true });
    return () => removeEventListener("pointermove", onMove);
  }, []);

  return null;
}
