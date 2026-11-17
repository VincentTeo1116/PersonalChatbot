"use client";

import { useEffect } from "react";
import { CHAT_WANTED_EVENT, chatWidget } from "@/lib/chat-widget";
import type { Profile } from "@/lib/types";

declare global {
  interface Window {
    PortfolioChatbotConfig?: Record<string, unknown>;
    portfolioChatbot?: unknown;
  }
}

const WIDGET_SCRIPT_ID = "portfolio-chatbot-widget-script";
// Longest the chat waits for a quiet moment before loading anyway.
const IDLE_TIMEOUT_MS = 4000;

// Config must be set before the script runs, so we inject the tag ourselves instead of using next/script.
// The script is not needed to read the page, so it waits until the browser is idle rather than competing with the page's own start-up. Asking for the chat earlier (any "chat" button) loads it immediately.
export default function ChatWidgetLoader({ profile }: { profile: Profile }) {
  useEffect(() => {
    let openWhenReady = false;
    let cancelled = false;

    const load = () => {
      if (cancelled || document.getElementById(WIDGET_SCRIPT_ID)) return;

      window.PortfolioChatbotConfig = {
        apiUrl: process.env.NEXT_PUBLIC_CHATBOT_API_URL || "http://localhost:8080/api/chat",
        ownerName: profile.name,
        primaryColor: "#6366f1",
        greeting: `Hi! Ask me anything about ${profile.name}'s background, skills, or projects.`,
      };

      const script = document.createElement("script");
      script.id = WIDGET_SCRIPT_ID;
      script.src = "/widget/chatbot-widget.js";
      script.async = true;
      script.onload = () => {
        if (openWhenReady) chatWidget()?.open?.();
        openWhenReady = false;
      };
      // A failed download (offline, blocked) removes the tag so the next request for the chat tries again instead of doing nothing forever.
      script.onerror = () => script.remove();
      document.body.appendChild(script);
    };

    const onWanted = () => {
      const widget = chatWidget();
      if (typeof widget?.open === "function") {
        widget.open();
        return;
      }
      openWhenReady = true;
      load();
    };
    window.addEventListener(CHAT_WANTED_EVENT, onWanted);

    const idle = typeof window.requestIdleCallback === "function";
    const handle = idle ? window.requestIdleCallback(load, { timeout: IDLE_TIMEOUT_MS }) : window.setTimeout(load, 2000);

    return () => {
      cancelled = true;
      window.removeEventListener(CHAT_WANTED_EVENT, onWanted);
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [profile]);

  return null;
}
