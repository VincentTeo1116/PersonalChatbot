"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load")));
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/** Cloudflare Turnstile challenge for a form. Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; the token travels as the `cf-turnstile-response` field. */
export default function TurnstileField() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!SITE_KEY || !boxRef.current) return;
    const box = boxRef.current;
    let widgetId: string | undefined;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widgetId = window.turnstile.render(box, {
          sitekey: SITE_KEY,
          callback: (value: string) => setToken(value),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <>
      <div ref={boxRef} className="min-h-[65px]" />
      <input type="hidden" name="cf-turnstile-response" value={token} />
    </>
  );
}
