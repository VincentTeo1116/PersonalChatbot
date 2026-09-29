"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";
import type { HackathonPhoto, Profile, Project } from "@/lib/types";

type XTerm = import("@xterm/xterm").Terminal;
type XFitAddon = import("@xterm/addon-fit").FitAddon;

const PROMPT = "guest@portfolio:~$ ";

function buildCommands(
  profile: Profile,
  projects: Project[],
  hackathonPhotos: HackathonPhoto[]
): Record<string, (args: string[]) => string[]> {
  const projectFiles = projects.map((p) => `${p.slug}.txt`);
  const skillLines = () => profile.skills.map(({ category, items }) => `${category}: ${items.join(", ")}`);

  return {
    help: () => [
      "Available commands:",
      "  help          show this list",
      "  whoami        who am I?",
      "  about         short bio",
      "  education     education history",
      "  skills        tech skills",
      "  projects      list projects",
      "  hackathons    list hackathons",
      "  ls            list files",
      "  cat <file>    print a file (try: about.txt, contact.txt, <project>.txt)",
      "  contact       how to reach me",
      "  clear         clear the screen",
      "  exit          close this terminal",
    ],
    whoami: () => [`${profile.name} — ${profile.tagline}`],
    about: () => [profile.about],
    education: () => profile.education.map((e) => `${e.period}  ${e.degree}, ${e.institution}`),
    skills: skillLines,
    projects: () => projects.map((p) => `${p.slug.padEnd(24)} ${p.title}`),
    hackathons: () => hackathonPhotos.map((h) => `- ${h.caption}`),
    contact: () => [
      `email     ${profile.contact.email}`,
      `github    ${profile.contact.github}`,
      `linkedin  ${profile.contact.linkedin}`,
    ],
    ls: () => ["about.txt", "contact.txt", "skills.txt", ...projectFiles],
    cat: (args) => {
      const file = args[0] ?? "";
      if (file === "about.txt") return [profile.about];
      if (file === "contact.txt") return [profile.contact.email, profile.contact.github, profile.contact.linkedin];
      if (file === "skills.txt") return skillLines();
      const project = projects.find((p) => `${p.slug}.txt` === file);
      if (project) return [project.title, "", project.description];
      return [`cat: ${file || "(no file)"}: No such file`];
    },
    sudo: (args) => (args.join(" ") === "make me a sandwich" ? ["Okay."] : ["Permission denied: nice try \u{1F609}"]),
  };
}

export default function TerminalEasterEgg({
  profile,
  projects,
  hackathonPhotos,
}: {
  profile: Profile;
  projects: Project[];
  hackathonPhotos: HackathonPhoto[];
}) {
  const commands = useMemo(
    () => buildCommands(profile, projects, hackathonPhotos),
    [profile, projects, hackathonPhotos]
  );
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<XFitAddon | null>(null);
  const bufferRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(0);

  function prompt(term: XTerm) {
    term.write(`\r\n${PROMPT}`);
  }

  function replaceLine(term: XTerm, next: string) {
    term.write("\b \b".repeat(bufferRef.current.length));
    bufferRef.current = next;
    term.write(next);
  }

  function runCommand(term: XTerm, input: string) {
    const [cmd, ...args] = input.split(/\s+/);

    if (cmd === "clear") {
      term.clear();
      prompt(term);
      return;
    }
    if (cmd === "exit" || cmd === "close") {
      setIsOpen(false);
      return;
    }

    const output = commands[cmd]?.(args);
    if (output === undefined) {
      term.writeln(`command not found: ${cmd} (type 'help')`);
    } else {
      output.forEach((line) => term.writeln(line));
    }
    prompt(term);
  }

  function handleData(term: XTerm, data: string) {
    if (data === "\r") {
      const line = bufferRef.current;
      bufferRef.current = "";
      term.write("\r\n");
      if (line.trim()) {
        historyRef.current.push(line);
        historyIndexRef.current = historyRef.current.length;
        runCommand(term, line.trim());
      } else {
        prompt(term);
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

    if (data === "\u0003") {
      term.write("^C");
      bufferRef.current = "";
      prompt(term);
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

    if (data.charCodeAt(0) === 27 || data.charCodeAt(0) < 32) return; // ignore other escapes/control chars

    bufferRef.current += data;
    term.write(data);
  }

  // handleData is a plain function redefined every render (it closes over `commands`,
  // which depends on the profile/projects/hackathonPhotos props). The effect below only
  // wants to create the xterm.js Terminal once per open, not tear it down and recreate it
  // whenever those props change -- so instead of listing handleData as a dependency (which
  // would force exactly that), keep a ref that's always up to date and have term.onData
  // call through it. The assignment happens in its own effect (not during render) so it
  // always reflects the latest closure by the time an actual keystroke comes in.
  const handleDataRef = useRef(handleData);
  useEffect(() => {
    handleDataRef.current = handleData;
  });

  useEffect(() => {
    const onExternalOpen = () => setIsOpen(true);
    window.addEventListener("portfolio:open-terminal", onExternalOpen);
    return () => window.removeEventListener("portfolio:open-terminal", onExternalOpen);
  }, []);

  useEffect(() => {
    if (!isOpen || !containerRef.current || termRef.current) return;
    let disposed = false;

    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
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

      term.writeln(`Welcome to ${profile.name}'s terminal. Type 'help' to see available commands.`);
      term.write(`\r\n${PROMPT}`);

      term.onData((data) => handleDataRef.current(term, data));
    })();

    return () => {
      disposed = true;
    };
  }, [isOpen, profile.name]);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => fitRef.current?.fit();
    window.addEventListener("resize", onResize);
    const t = setTimeout(() => fitRef.current?.fit(), 50);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        aria-label="Open terminal"
        onClick={() => setIsOpen((v) => !v)}
        className="fixed left-5 bottom-5 z-[9999] flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-indigo-300 shadow-2xl hover:bg-slate-700 transition-colors"
      >
        <span className="font-mono text-lg">{">_"}</span>
      </button>

      <div
        aria-hidden={!isOpen}
        inert={!isOpen}
        onTransitionEnd={() => {
          if (isOpen) fitRef.current?.fit();
        }}
        className={`fixed left-5 bottom-24 z-[9999] flex h-[min(70vh,420px)] w-[min(90vw,480px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl origin-bottom-left transition-all duration-300 ease-out ${
          isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Terminal</p>
            <p className="text-[11px] text-slate-500">type &apos;help&apos; to get started</p>
          </div>
          <button
            aria-label="Close terminal"
            onClick={() => setIsOpen(false)}
            className="px-1 text-xl leading-none text-slate-400 hover:text-white"
          >
            {"×"}
          </button>
        </div>
        <div ref={containerRef} className="flex-1 overflow-hidden p-2" />
      </div>
    </>
  );
}
