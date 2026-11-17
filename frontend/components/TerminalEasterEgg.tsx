"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@xterm/xterm/css/xterm.css";
import { createShell, style, type ForecastDay, type TerminalActions, type TerminalData } from "@/lib/terminal-shell";

type XTerm = import("@xterm/xterm").Terminal;
type XFitAddon = import("@xterm/addon-fit").FitAddon;

const PROMPT = `${style.green("guest@portfolio")}:${style.blue("~")}$ `;
const THEME_EVENT = "portfolio:theme-changed";

type ForecastResponse = {
  dataThrough: string;
  days: { date: string; holiday: string | null }[];
  series: { id: string; forecast: number[]; low: number[]; high: number[]; usual: number[] }[];
};

type ChatWidget = { open?: () => void; prefillQuestion?: (question: string) => void };

export default function TerminalEasterEgg(data: TerminalData) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<XFitAddon | null>(null);
  const bufferRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(0);
  // True while a command that waits on the network (forecast) is running, so stray keys are not mixed into its output.
  const busyRef = useRef(false);

  const resumeUrl = data.profile.contact.resumeUrl;
  const shell = useMemo(() => {
    const actions: TerminalActions = {
      // Sections on this page and other pages alike go through the router, which scrolls to a #section for us.
      navigate: (href) => router.push(href),
      openExternal: (url) => {
        window.open(url, "_blank", "noopener,noreferrer");
      },
      openResume: () => {
        if (!resumeUrl) return false;
        window.dispatchEvent(new CustomEvent("portfolio:open-resume"));
        return true;
      },
      ask: (question) => {
        const widget = (window as Window & { portfolioChatbot?: ChatWidget }).portfolioChatbot;
        if (typeof widget?.prefillQuestion !== "function") return false;
        widget.prefillQuestion(question);
        return true;
      },
      setTheme: (mode) => {
        const root = document.documentElement;
        const dark = mode === "toggle" ? !root.classList.contains("dark") : mode === "dark";
        root.classList.toggle("dark", dark);
        try {
          localStorage.setItem("theme", dark ? "dark" : "light");
        } catch {}
        window.dispatchEvent(new Event(THEME_EVENT));
        return dark ? "dark" : "light";
      },
      loadForecast: async () => {
        const res = await fetch("/api/rapidkl-forecast", { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as ForecastResponse;
        const network = body.series.find((s) => s.id === "ALL");
        if (!network) throw new Error("no network series");
        const days: ForecastDay[] = body.days.map((day, i) => ({
          date: day.date,
          holiday: day.holiday,
          forecast: network.forecast[i],
          low: network.low[i],
          high: network.high[i],
          usual: network.usual[i],
        }));
        return { dataThrough: body.dataThrough, days: days.filter((d) => Number.isFinite(d.forecast)) };
      },
    };
    return createShell(data, actions);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `data` is the props object, new on every render; its fields are listed instead.
  }, [data.profile, data.projects, data.hackathonPhotos, data.experience, data.research, data.testimonials, data.articles, resumeUrl, router]);

  function prompt(term: XTerm) {
    term.write(`\r\n${PROMPT}`);
  }

  function replaceLine(term: XTerm, next: string) {
    term.write("\b \b".repeat(bufferRef.current.length));
    bufferRef.current = next;
    term.write(next);
  }

  async function runCommand(term: XTerm, input: string) {
    busyRef.current = true;
    try {
      // Two columns of slack so a wrapped line never touches the edge.
      const result = await shell.run(input, term.cols - 2, historyRef.current);
      if (termRef.current !== term) return; // closed and recreated while waiting
      if (result.exit) {
        setIsOpen(false);
        term.write(PROMPT);
        return;
      }
      if (result.clear) {
        term.clear();
        term.write(`\u001b[2K\r${PROMPT}`);
        return;
      }
      result.lines.forEach((line) => term.writeln(line));
      prompt(term);
      // Jumping to a section moves keyboard focus to the page; hand it back so the next command can be typed straight away.
      window.setTimeout(() => {
        // Not when the command opened a dialog (the resume): that dialog should keep the focus.
        if (termRef.current === term && !document.querySelector('[role="dialog"][aria-modal="true"]')) term.focus();
      }, 150);
    } finally {
      busyRef.current = false;
    }
  }

  function handleData(term: XTerm, data: string) {
    if (busyRef.current) return;

    if (data === "\r") {
      const line = bufferRef.current;
      bufferRef.current = "";
      term.write("\r\n");
      if (line.trim()) {
        historyRef.current.push(line.trim());
        historyIndexRef.current = historyRef.current.length;
        void runCommand(term, line.trim());
      } else {
        term.write(PROMPT);
      }
      return;
    }

    if (data === "\u007F") {
      if (bufferRef.current.length > 0) {
        bufferRef.current = bufferRef.current.slice(0, -1);
        term.write("\b \b");
      }
      return;
    }

    if (data === "\t") {
      const { line, options } = shell.complete(bufferRef.current);
      if (options.length > 0) {
        // Several matches: list them, then redraw the prompt with what has been typed so far.
        term.write(`\r\n${options.join("   ")}`);
        prompt(term);
        bufferRef.current = "";
      }
      replaceLine(term, line);
      return;
    }

    if (data === "\u0003") {
      term.write("^C");
      bufferRef.current = "";
      prompt(term);
      return;
    }

    if (data === "\f") {
      term.clear();
      term.write(`\u001b[2K\r${PROMPT}${bufferRef.current}`);
      return;
    }

    if (data === "\u001b[A") {
      if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
        replaceLine(term, historyRef.current[historyIndexRef.current] ?? "");
      }
      return;
    }

    if (data === "\u001b[B") {
      if (historyIndexRef.current < historyRef.current.length) {
        historyIndexRef.current += 1;
        replaceLine(term, historyRef.current[historyIndexRef.current] ?? "");
      }
      return;
    }

    if (data.charCodeAt(0) === 27) return; // other escape sequences (arrow left/right, function keys)

    // Typed characters and pasted text alike: keep printable characters, drop control characters and line breaks.
    const printable = Array.from(data)
      .filter((char) => char >= " " && char !== "\u007F")
      .join("");
    if (!printable) return;
    bufferRef.current += printable;
    term.write(printable);
  }

  // handleData is redefined every render (it closes over `shell`). The effect below creates the xterm.js Terminal once per open, so it calls through this ref instead of listing handleData as a dependency, which would tear the terminal down whenever the page data changed.
  const handleDataRef = useRef(handleData);
  const shellRef = useRef(shell);
  useEffect(() => {
    handleDataRef.current = handleData;
    shellRef.current = shell;
  });

  useEffect(() => {
    const onExternalOpen = () => setIsOpen(true);
    window.addEventListener("portfolio:open-terminal", onExternalOpen);
    return () => window.removeEventListener("portfolio:open-terminal", onExternalOpen);
  }, []);

  // Escape closes the panel, like every other overlay on the site.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!isOpen || !containerRef.current || termRef.current) return;
    let disposed = false;

    (async () => {
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
        if (disposed || !containerRef.current) return;

        const term = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          theme: { background: "#020617", foreground: "#e2e8f0", cursor: "#818cf8" },
        });
        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(containerRef.current);
        fit.fit();

        termRef.current = term;
        fitRef.current = fit;

        shellRef.current.banner(term.cols - 2).forEach((line) => term.writeln(line));
        term.write(`\r\n${PROMPT}`);
        term.onData((input) => handleDataRef.current(term, input));
        term.focus();
        setLoadFailed(false);
      } catch {
        // The terminal library is downloaded on first open; a dropped connection should say so rather than leave an empty box.
        if (!disposed) setLoadFailed(true);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => fitRef.current?.fit();
    window.addEventListener("resize", onResize);
    const t = setTimeout(() => {
      fitRef.current?.fit();
      termRef.current?.focus();
    }, 50);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        aria-label={isOpen ? "Close terminal" : "Open terminal"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="fixed left-5 bottom-5 z-[9999] hidden h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-indigo-300 shadow-2xl hover:bg-slate-700 transition-colors sm:flex"
      >
        <span className="font-mono text-lg">{">_"}</span>
      </button>

      <div
        role="region"
        aria-label="Terminal"
        aria-hidden={!isOpen}
        inert={!isOpen}
        onTransitionEnd={() => {
          if (isOpen) fitRef.current?.fit();
        }}
        className={`fixed left-5 bottom-36 sm:bottom-24 z-[9999] flex h-[min(70vh,460px)] w-[min(90vw,620px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl origin-bottom-left transition-all duration-300 ease-out ${
          isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">guest@portfolio</p>
              <p className="text-[11px] text-slate-400">Type help · Tab completes · Esc closes</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close terminal panel"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-slate-400 hover:bg-white/10 hover:text-white"
          >
            {"×"}
          </button>
        </div>
        {loadFailed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-slate-300">The terminal could not load. Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => {
                setLoadFailed(false);
                setIsOpen(false);
                window.setTimeout(() => setIsOpen(true), 0);
              }}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Try again
            </button>
          </div>
        ) : (
          <div ref={containerRef} className="flex-1 overflow-hidden p-2" />
        )}
      </div>
    </>
  );
}
