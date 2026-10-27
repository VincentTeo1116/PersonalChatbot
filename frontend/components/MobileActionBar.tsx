"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import type { Profile } from "@/lib/types";

const SHOW_AFTER_PX = 240;

// Same idea as ContactNudge: never sit on top of another dialog or the chat panel, and step aside once the Contact section (which has these same actions) is on screen.
function shouldHide() {
  const contact = document.getElementById("contact");
  const contactInView = contact ? contact.getBoundingClientRect().top < window.innerHeight * 0.85 : false;
  const layerOpen =
    document.body.style.overflow === "hidden" ||
    document.querySelector('.pcw-panel--open, [role="dialog"]:not(.pcw-panel)') !== null;
  return contactInView || layerOpen;
}

function BarButton({ label, onClick, children, avatar = false }: { label: string; onClick: () => void; children?: ReactNode; avatar?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-text-secondary transition-colors active:bg-foreground/10 active:text-foreground"
    >
      {avatar ? (
        <Image src="/widget/chatbot-avatar.webp" alt="" width={24} height={24} className="size-6 rounded-full border border-indigo-400/60 object-cover" />
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {children}
        </svg>
      )}
      {label}
    </button>
  );
}

/** Phone-only bar pinned to the bottom with the three actions a visitor most wants: resume, get in touch, ask the chatbot. */
export default function MobileActionBar({ profile }: { profile: Profile }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SHOW_AFTER_PX && !shouldHide());
    update();
    window.addEventListener("scroll", update, { passive: true });
    const interval = window.setInterval(update, 500);
    return () => {
      window.removeEventListener("scroll", update);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <nav
      aria-label="Quick actions"
      inert={!visible}
      className={`fixed inset-x-0 bottom-0 z-[9990] flex border-t border-border bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-300 sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {profile.contact.resumeUrl && (
        <BarButton label="Resume" onClick={() => window.dispatchEvent(new CustomEvent("portfolio:open-resume"))}>
          <path d="M7 3h7l5 5v13H7z" />
          <path d="M14 3v5h5M10 13h6M10 17h6" />
        </BarButton>
      )}
      <BarButton label="Contact" onClick={() => window.dispatchEvent(new CustomEvent("portfolio:open-meeting-request"))}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </BarButton>
      <BarButton
        label="Chat"
        avatar
        onClick={() =>
          (window as unknown as { portfolioChatbot?: { open?: () => void } }).portfolioChatbot?.open?.()
        }
      />
    </nav>
  );
}
