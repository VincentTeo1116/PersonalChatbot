"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import TestimonialModal from "@/components/TestimonialModal";

// Mounted once at the page root (like MeetingRequestLauncher) so it can be opened from
// anywhere -- currently just the Contact section's "Leave a testimonial" button.
export default function TestimonialLauncher() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function onExternalOpen() {
      setIsOpen(true);
    }
    window.addEventListener("portfolio:open-testimonial-request", onExternalOpen);
    return () => window.removeEventListener("portfolio:open-testimonial-request", onExternalOpen);
  }, []);

  return <AnimatePresence>{isOpen && <TestimonialModal onClose={() => setIsOpen(false)} />}</AnimatePresence>;
}
