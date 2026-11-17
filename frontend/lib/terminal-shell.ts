import { hasCaseStudy } from "@/lib/project-case-study";
import type { HackathonPhoto, Profile, Project, Publication, Testimonial, WorkExperience } from "@/lib/types";

/** Everything the terminal can print. It all comes from the same database rows and article list as the page, so the terminal can never show older facts than the site does. */
export type TerminalData = {
  profile: Profile;
  projects: Project[];
  hackathonPhotos: HackathonPhoto[];
  experience: WorkExperience[];
  research: Publication[];
  testimonials: Testimonial[];
  articles: { slug: string; title: string; description: string; published: string }[];
};

export type ForecastDay = { date: string; forecast: number; low: number; high: number; usual: number; holiday: string | null };

/** Things only the browser can do; passed in so the commands themselves stay plain functions. */
export type TerminalActions = {
  navigate: (href: string) => void;
  openExternal: (url: string) => void;
  openResume: () => boolean;
  ask: (question: string) => boolean;
  setTheme: (mode: "dark" | "light" | "toggle") => "dark" | "light";
  loadForecast: () => Promise<{ dataThrough: string; days: ForecastDay[] }>;
};

export type CommandResult = { lines: string[]; clear?: boolean; exit?: boolean };

const ESC = "\u001b[";
const paint = (code: string) => (text: string) => `${ESC}${code}m${text}${ESC}0m`;
export const style = {
  bold: paint("1"),
  dim: paint("2"),
  accent: paint("38;5;141"),
  blue: paint("38;5;111"),
  green: paint("38;5;114"),
  yellow: paint("38;5;221"),
  red: paint("38;5;203"),
};

const SECTIONS: Record<string, string> = {
  home: "/#top",
  about: "/#about",
  projects: "/#projects",
  demos: "/#model-demo",
  writing: "/#writing",
  experience: "/#experience",
  testimonials: "/#testimonials",
  research: "/#research",
  github: "/#github",
  hackathons: "/#hackathons",
  contact: "/#contact",
  "ai-lab": "/ai-lab",
  services: "/services",
  privacy: "/privacy",
};

const HELP: [string, string][] = [
  ["help", "show this list"],
  ["neofetch", "profile summary card"],
  ["whoami", "who am I?"],
  ["about", "short bio"],
  ["education", "education history"],
  ["experience", "work experience"],
  ["skills", "tech skills by category"],
  ["projects", "list projects"],
  ["project <name>", "details of one project (role, result, stack, links)"],
  ["research", "published papers"],
  ["writing", "articles, newest first"],
  ["testimonials", "what people say"],
  ["hackathons", "hackathon gallery captions"],
  ["forecast [days]", "live Rapid KL ridership forecast (default 7, max 28)"],
  ["ask <question>", "hand a question to the AI assistant"],
  ["open <target>", "go to a section, project, article or linkedin"],
  ["resume", "open the resume"],
  ["contact", "how to reach me"],
  ["theme [dark|light]", "switch the site theme"],
  ["ls / cat <file>", "browse the same content as files"],
  ["history", "commands typed this session"],
  ["date / echo / pwd", "the usual"],
  ["clear", "clear the screen (or Ctrl+L)"],
  ["exit", "close this terminal"],
];

/** Breaks text at spaces so words are never split across lines; `indent` is added to every line after the first. */
export function wrap(text: string, width: number, indent = ""): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    let started = false;
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (!started) {
        line = word;
        started = true;
      } else if (`${line} ${word}`.length > width) {
        out.push(line);
        line = indent + word;
      } else {
        line += ` ${word}`;
      }
    }
    if (started) out.push(line);
  }
  return out;
}

const bullets = (detail: string, width: number) =>
  detail
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => wrap(`- ${line}`, width, "  "));

/** A dim label in a fixed column, with the value wrapped beside it. Colour codes are added after wrapping so they never count towards the width. */
const LABEL_WIDTH = 9;
function field(label: string, value: string, width: number, paintLabel = style.dim): string[] {
  return wrap(value, Math.max(width - LABEL_WIDTH, 16)).map((line, i) => (i === 0 ? paintLabel(label.padEnd(LABEL_WIDTH)) : " ".repeat(LABEL_WIDTH)) + line);
}

const number = (value: number) => Math.round(value).toLocaleString("en-US");

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function createShell(data: TerminalData, actions: TerminalActions) {
  const { profile, projects, hackathonPhotos, experience, research, testimonials, articles } = data;
  const projectFiles = projects.map((p) => `${p.slug}.txt`);
  const files = ["about.txt", "contact.txt", "skills.txt", "experience.txt", "education.txt", ...projectFiles];

  const findProject = (query: string) => {
    const q = query.toLowerCase().replace(/\.txt$/, "");
    if (!q) return undefined;
    return (
      projects.find((p) => p.slug === q) ??
      projects.find((p) => p.title.toLowerCase() === q) ??
      projects.find((p) => p.slug.includes(q) || p.title.toLowerCase().includes(q))
    );
  };

  const skillLines = (width: number) =>
    profile.skills.flatMap(({ category, items }) => [style.accent(category), ...wrap(items.map((i) => i.name).join(", "), width - 2).map((line) => `  ${line}`)]);

  const projectDetails = (p: Project, width: number) => [
    style.bold(p.title) + (p.award ? `  ${style.yellow(p.award)}` : ""),
    ...(p.role ? field("role", p.role, width) : []),
    ...(p.tags.length ? field("stack", p.tags.join(", "), width) : []),
    "",
    ...wrap(p.description, width),
    ...(p.impact ? ["", ...wrap(p.impact, width).map(style.green)] : []),
    "",
    ...field("page", `/projects/${p.slug}`, width),
    ...p.links.flatMap((l) => [...field("link", l.label, width), `${" ".repeat(LABEL_WIDTH)}${l.url}`]),
    style.dim(hasCaseStudy(p.caseStudy) ? `Type 'open ${p.slug}' to read the case study.` : `Type 'open ${p.slug}' to open the project page.`),
  ];

  const experienceLines = (width: number) =>
    experience.flatMap((e, i) => [
      ...(i ? [""] : []),
      `${style.bold(e.role)} ${style.dim("@")} ${e.company.trim()}`,
      style.blue(e.period),
      ...bullets(e.detail, width),
    ]);

  const educationLines = (width: number) =>
    profile.education.flatMap((e, i) => [
      ...(i ? [""] : []),
      ...wrap(e.degree, width).map(style.bold),
      style.blue(e.period),
      ...wrap(`${e.institution}${e.detail ? ` · ${e.detail}` : ""}`, width - 2).map((line) => `  ${line}`),
    ]);

  const contactLines = () => [
    `${style.dim("email".padEnd(LABEL_WIDTH))}${profile.contact.email}`,
    ...(profile.contact.github ? [`${style.dim("github".padEnd(LABEL_WIDTH))}${profile.contact.github}`] : []),
    ...(profile.contact.linkedin ? [`${style.dim("linkedin".padEnd(LABEL_WIDTH))}${profile.contact.linkedin}`] : []),
    ...(profile.contact.resumeUrl ? [`${style.dim("resume".padEnd(LABEL_WIDTH))}type 'resume'`] : []),
  ];

  const neofetch = (width: number) => {
    const rows: [string, string][] = [
      ["role", profile.tagline.trim()],
      ["based", profile.location],
      ...(profile.education[0] ? ([["study", `${profile.education[0].degree} (${profile.education[0].period})`]] as [string, string][]) : []),
      ...(experience[0] ? ([["now", `${experience[0].role} @ ${experience[0].company.trim()}`]] as [string, string][]) : []),
      ["work", `${projects.length} projects · ${research.length} published paper${research.length === 1 ? "" : "s"} · ${articles.length} articles`],
      ...(profile.statHackathons != null ? ([["events", `${profile.statHackathons} hackathons`]] as [string, string][]) : []),
      ...(profile.availability ? ([["status", profile.availability]] as [string, string][]) : []),
    ];
    return [
      `${style.accent(style.bold(profile.name))}${style.dim("@portfolio")}`,
      style.dim("-".repeat(profile.name.length + 10)),
      ...rows.flatMap(([key, value]) => field(key, value, width, style.accent)),
    ];
  };

  async function forecast(args: string[]): Promise<string[]> {
    const asked = Number.parseInt(args[0] ?? "7", 10);
    const count = Math.min(Math.max(Number.isFinite(asked) ? asked : 7, 1), 28);
    try {
      const { dataThrough, days } = await actions.loadForecast();
      const shown = days.slice(0, count);
      if (shown.length === 0) return [style.red("The forecast has no days to show right now. Try again later.")];
      const peak = Math.max(...shown.map((d) => d.high));
      return [
        style.bold("Rapid KL rail network: forecast daily entries"),
        style.dim(`Data up to ${shortDate(dataThrough)}. Bars are scaled to the busiest day shown.`),
        "",
        ...shown.map((d) => {
          const diff = d.usual ? Math.round(((d.forecast - d.usual) / d.usual) * 100) : 0;
          const versus = diff === 0 ? style.dim("usual") : diff > 0 ? style.yellow(`+${diff}%`) : style.blue(`${diff}%`);
          const bar = "█".repeat(Math.max(1, Math.round((d.forecast / peak) * 16)));
          return `${shortDate(d.date).padEnd(11)} ${number(d.forecast).padStart(8)}  ${style.accent(bar.padEnd(16))} ${versus}${d.holiday ? style.dim(`  ${d.holiday}`) : ""}`;
        }),
        "",
        style.dim("Type 'open demos' for the chart, lines and stations."),
      ];
    } catch {
      return [style.red("Could not load the forecast just now."), style.dim("Type 'open demos' to see the chart on the page instead.")];
    }
  }

  function open(args: string[]): string[] {
    const target = (args[0] ?? "").toLowerCase();
    if (!target) return ["usage: open <target>", style.dim(`sections: ${Object.keys(SECTIONS).join(", ")}`), style.dim("also: a project or article name, linkedin, resume")];
    if (target === "resume") return resume();
    if (target === "linkedin" && profile.contact.linkedin) {
      actions.openExternal(profile.contact.linkedin);
      return ["Opening LinkedIn in a new tab..."];
    }
    if (SECTIONS[target]) {
      actions.navigate(SECTIONS[target]);
      return [`Opening ${target}...`];
    }
    const project = findProject(target);
    if (project) {
      actions.navigate(`/projects/${project.slug}`);
      return [hasCaseStudy(project.caseStudy) ? `Opening the ${project.title} case study...` : `Opening the ${project.title} project page...`];
    }
    const article = articles.find((a) => a.slug === target || a.slug.includes(target));
    if (article) {
      actions.navigate(`/writing/${article.slug}`);
      return [`Opening "${article.title}"...`];
    }
    return [style.red(`open: nothing called '${target}'.`), style.dim("Try 'projects', 'writing' or 'open' on its own for the list.")];
  }

  function resume(): string[] {
    return actions.openResume() ? ["Opening the resume..."] : [style.red("No resume is published at the moment."), style.dim("Type 'contact' to reach me directly.")];
  }

  const commands: Record<string, (args: string[], width: number, history: string[]) => string[] | Promise<string[]>> = {
    help: () => [style.bold("Available commands"), ...HELP.map(([name, what]) => `  ${style.accent(name.padEnd(20))} ${what}`), "", style.dim("Tab completes commands and names. Up/Down recalls earlier commands.")],
    neofetch: (_a, width) => neofetch(width),
    whoami: () => [`${profile.name}: ${profile.tagline.trim()}`],
    about: (_a, width) => wrap(profile.about, width),
    education: (_a, width) => educationLines(width),
    experience: (_a, width) => (experience.length ? experienceLines(width) : ["No work experience is listed yet."]),
    skills: (_a, width) => skillLines(width),
    projects: () => [
      ...projects.map((p) => `${style.accent(p.slug.padEnd(30))} ${p.title}${p.award ? style.yellow("  ★") : ""}`),
      "",
      style.dim("★ award winner. Type 'project <name>' for details."),
    ],
    project: (args, width) => {
      const p = findProject(args.join(" "));
      if (!args.length) return ["usage: project <name>", style.dim("Type 'projects' for the list; Tab completes the name.")];
      return p ? projectDetails(p, width) : [style.red(`project: no project matches '${args.join(" ")}'.`), style.dim("Type 'projects' for the list.")];
    },
    research: (_a, width) =>
      research.length
        ? research.flatMap((r) => [...wrap(r.title, width).map(style.bold), ...wrap(`${r.venue}${r.doi ? ` · DOI ${r.doi}` : ""}`, width - 2).map((line) => `  ${style.blue(line)}`), `  ${style.dim("page")} /research/${r.slug}`])
        : ["No published research is listed yet."],
    writing: (_a, width) =>
      articles.length ? [...articles.flatMap((a) => wrap(a.title, width - 12).map((line, i) => (i === 0 ? `${style.blue(a.published)}  ` : " ".repeat(12)) + line)), "", style.dim("Type 'open <part of the title or slug>' to read one.")] : ["No articles are published yet."],
    testimonials: (_a, width) =>
      testimonials.length ? testimonials.flatMap((t, i) => [...(i ? [""] : []), ...wrap(`"${t.quote.trim()}"`, width), style.dim(`  - ${t.authorName}${t.authorRole ? `, ${t.authorRole}` : ""}`)]) : ["No testimonials are published yet."],
    hackathons: (_a, width) => [
      ...(profile.statHackathons != null ? [`${profile.statHackathons} hackathons so far. From the gallery:`] : []),
      ...hackathonPhotos.flatMap((h) => wrap(`- ${h.caption.trim()}`, width, "  ")),
    ],
    forecast,
    ask: (args) => {
      const question = args.join(" ").trim();
      if (!question) return ["usage: ask <question>", style.dim("example: ask What did Vincent build at YYC?")];
      return actions.ask(question)
        ? ["Handed to the AI assistant. Review the question in the chat panel and press send."]
        : [style.red("The AI assistant is still loading. Try again in a few seconds.")];
    },
    open,
    resume,
    contact: contactLines,
    theme: (args) => {
      const mode = args[0] === "dark" || args[0] === "light" ? args[0] : "toggle";
      return [`Theme set to ${actions.setTheme(mode)}.`];
    },
    history: (_a, _w, history) => (history.length ? history.map((line, i) => `${String(i + 1).padStart(3)}  ${line}`) : ["No commands yet."]),
    date: () => [new Date().toString()],
    echo: (args) => [args.join(" ")],
    pwd: () => ["/home/guest/portfolio"],
    ls: () => files,
    cat: (args, width) => {
      const file = args[0] ?? "";
      if (file === "about.txt") return wrap(profile.about, width);
      if (file === "contact.txt") return contactLines();
      if (file === "skills.txt") return skillLines(width);
      if (file === "experience.txt") return experienceLines(width);
      if (file === "education.txt") return educationLines(width);
      const project = projectFiles.includes(file) ? findProject(file) : undefined;
      if (project) return projectDetails(project, width);
      return [style.red(`cat: ${file || "(no file)"}: No such file`), style.dim("Type 'ls' to list files.")];
    },
    sudo: (args) => (args.join(" ") === "make me a sandwich" ? ["Okay."] : ["Permission denied: nice try 😉"]),
  };
  const names = [...Object.keys(commands), "clear", "exit"].sort();

  /** The closest command name, for "did you mean". */
  function suggest(word: string) {
    const distance = (a: string, b: string) => {
      const row = Array.from({ length: b.length + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        let previous = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
          const current = row[j];
          row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
          previous = current;
        }
      }
      return row[b.length];
    };
    const best = names.map((name) => ({ name, d: distance(word, name) })).sort((a, b) => a.d - b.d)[0];
    return best && best.d <= 2 ? best.name : null;
  }

  return {
    names,
    banner: (width: number): string[] => [...neofetch(Math.max(width, 24)), "", `Type ${style.accent("help")} to see what you can do here.`],

    async run(input: string, width: number, history: string[]): Promise<CommandResult> {
      const [cmd, ...args] = input.trim().split(/\s+/);
      const name = cmd.toLowerCase();
      if (name === "clear" || name === "cls") return { lines: [], clear: true };
      if (name === "exit" || name === "close" || name === "quit") return { lines: [], exit: true };
      const handler = commands[name];
      if (!handler) {
        const guess = suggest(name);
        return { lines: [style.red(`command not found: ${cmd}`), style.dim(guess ? `Did you mean '${guess}'? Type 'help' for the full list.` : "Type 'help' for the full list.")] };
      }
      try {
        return { lines: await handler(args, Math.max(width, 24), history) };
      } catch {
        return { lines: [style.red(`${name}: something went wrong. Please try again.`)] };
      }
    },

    /** Tab completion: returns the line to show, plus the candidates when there is more than one. */
    complete(buffer: string): { line: string; options: string[] } {
      const parts = buffer.split(/\s+/);
      const first = parts.length === 1;
      const word = (parts[parts.length - 1] ?? "").toLowerCase();
      const command = parts[0]?.toLowerCase();
      const pool = first
        ? names
        : command === "cat"
          ? files
          : command === "project"
            ? projects.map((p) => p.slug)
            : command === "open"
              ? [...Object.keys(SECTIONS), ...projects.map((p) => p.slug), ...articles.map((a) => a.slug), "linkedin", "resume"]
              : command === "theme"
                ? ["dark", "light"]
                : [];
      const options = pool.filter((option) => option.startsWith(word));
      if (options.length === 0) return { line: buffer, options: [] };
      let shared = options[0];
      for (const option of options) while (!option.startsWith(shared)) shared = shared.slice(0, -1);
      const head = buffer.slice(0, buffer.length - word.length);
      return { line: head + shared + (options.length === 1 ? " " : ""), options: options.length > 1 ? options : [] };
    },
  };
}
