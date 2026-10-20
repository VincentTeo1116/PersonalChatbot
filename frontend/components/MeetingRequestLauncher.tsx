"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import type { MeetingRequestInput } from "@/lib/validation/meetingRequest";

// Loaded on first open: most visitors never open it, so it shouldn't be in the initial bundle.
const MeetingRequestModal = dynamic(() => import("@/components/MeetingRequestModal"));

// Mounted once at the page root (like CommandPalette/TerminalEasterEgg) so it can be opened from anywhere -- the Contact section's own button, or the chat widget dispatching "portfolio:open-meeting-request" with whatever it drafted from the conversation.
export default function MeetingRequestLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<Partial<MeetingRequestInput> | undefined>(undefined);

  useEffect(() => {
    function onExternalOpen(e: Event) {
      setPrefill((e as CustomEvent<Partial<MeetingRequestInput>>).detail);
      setIsOpen(true);
    }
    window.addEventListener("portfolio:open-meeting-request", onExternalOpen);
    return () => window.removeEventListener("portfolio:open-meeting-request", onExternalOpen);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <MeetingRequestModal
          initialValues={prefill}
          onClose={() => {
            setIsOpen(false);
            setPrefill(undefined);
          }}
        />
      )}
    </AnimatePresence>
  );
}
