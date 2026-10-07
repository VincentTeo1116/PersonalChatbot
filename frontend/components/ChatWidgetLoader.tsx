"use client";

import { useEffect } from "react";
import type { Profile } from "@/lib/types";

declare global {
  interface Window {
    PortfolioChatbotConfig?: Record<string, unknown>;
    portfolioChatbot?: unknown;
  }
}

const WIDGET_SCRIPT_ID = "portfolio-chatbot-widget-script";

// Config must be set before the script runs, so we inject the tag ourselves instead of using next/script.
export default function ChatWidgetLoader({ profile }: { profile: Profile }) {
  useEffect(() => {
    if (document.getElementById(WIDGET_SCRIPT_ID)) return;

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
    document.body.appendChild(script);
  }, [profile]);

  return null;
}
