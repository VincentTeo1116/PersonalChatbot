"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import type { GithubRepository } from "@/lib/github";

type DetailTab = "idea" | "ingredients" | "bake";
const LAYER_WIDTHS = ["w-full", "w-[94%]", "w-[88%]", "w-[82%]", "w-[76%]"];
const CAKE_FLAVORS = [
  "from-indigo-400 via-violet-400 to-fuchsia-400",
  "from-rose-300 via-pink-400 to-orange-300",
  "from-amber-300 via-orange-300 to-rose-300",
  "from-cyan-300 via-sky-400 to-indigo-400",
  "from-emerald-300 via-teal-400 to-cyan-400",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric" }).format(new Date(value));
}

export default function GithubExhibition({
  username,
  repositories,
}: {
  username: string;
  repositories: GithubRepository[];
}) {
  const [query, setQuery] = useState("");
  const [room, setRoom] = useState("All exhibits");
  const [order, setOrder] = useState<"recent" | "stars">("recent");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(repositories[0]?.id ?? null);
  const [tab, setTab] = useState<DetailTab>("idea");
  const [languageMix, setLanguageMix] = useState<Record<number, string[]>>({});

  const rooms = useMemo(
    () => ["All exhibits", ...Array.from(new Set(repositories.map((repo) => repo.language).filter((v): v is string => !!v))).slice(0, 5)],
    [repositories],
  );
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return repositories
      .filter((repo) => room === "All exhibits" || repo.language === room)
      .filter((repo) => !search || [repo.name, repo.description ?? "", repo.language ?? "", ...repo.topics].join(" ").toLowerCase().includes(search))
      .sort((a, b) => order === "stars" ? b.stars - a.stars : Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [repositories, room, query, order]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / LAYER_WIDTHS.length));
  const currentPage = Math.min(page, pageCount - 1);
  const cakeSlices = filtered.slice(currentPage * LAYER_WIDTHS.length, (currentPage + 1) * LAYER_WIDTHS.length);
  const selected = cakeSlices.find((repo) => repo.id === selectedId) ?? cakeSlices[0] ?? null;

  useEffect(() => {
    if (!selected || languageMix[selected.id] !== undefined) return;

    let cancelled = false;
    fetch(`https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(selected.name)}/languages`, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load this repository's languages");
        return response.json() as Promise<Record<string, number>>;
      })
      .then((bytesByLanguage) => {
        const topLanguages = Object.entries(bytesByLanguage)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([language]) => language);
        if (!cancelled) setLanguageMix((current) => ({ ...current, [selected.id]: topLanguages }));
      })
      .catch(() => {
        if (!cancelled) setLanguageMix((current) => ({ ...current, [selected.id]: selected.language ? [selected.language] : [] }));
      });
    return () => { cancelled = true; };
  }, [languageMix, selected, username]);

  function resetGallery() {
    setPage(0);
    setSelectedId(null);
    setTab("idea");
  }

  function movePage(nextPage: number) {
    const boundedPage = Math.max(0, Math.min(nextPage, pageCount - 1));
    setPage(boundedPage);
    setSelectedId(filtered[boundedPage * LAYER_WIDTHS.length]?.id ?? null);
    setTab("idea");
  }

  function chooseRoom(value: string) {
    setRoom(value);
    resetGallery();
  }

  return (
    <section id="github-exhibition" className="relative isolate overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-44 h-96 w-[min(90vw,60rem)] -translate-x-1/2 rounded-full bg-fuchsia-500/[0.08] blur-[100px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="GitHub exhibition" title="A portfolio, baked in layers" align="center" large>
          <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
            Pick a slice from the project cake. Each layer opens a different build; explore its ingredients, story, and GitHub activity.
          </p>
        </SectionHeading>

        <Reveal delay={120}>
          <div className="mt-12 overflow-hidden rounded-[2rem] border border-border bg-surface/85 shadow-2xl shadow-indigo-950/10 backdrop-blur">
            <div className="border-b border-border bg-surface-hover/50 px-5 py-5 sm:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500 dark:text-indigo-300">The project patisserie</p>
                  <p className="mt-1 text-sm text-text-muted">{repositories.length} public {repositories.length === 1 ? "project" : "projects"} · fresh from GitHub</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="exhibition-search">Search projects</label>
                  <input
                    id="exhibition-search"
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); resetGallery(); }}
                    placeholder="Find a project or ingredient…"
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:w-64"
                  />
                  <button
                    type="button"
                    onClick={() => { setOrder((current) => current === "recent" ? "stars" : "recent"); resetGallery(); }}
                    className="min-h-11 rounded-xl border border-border px-4 text-sm text-text-secondary transition hover:border-indigo-400/50 hover:text-foreground"
                  >
                    {order === "recent" ? "Fresh from the oven ↓" : "Most loved ★"}
                  </button>
                </div>
              </div>

              {repositories.length > 0 && (
                <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filter projects by language">
                  {rooms.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => chooseRoom(item)}
                      aria-pressed={room === item}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${room === item ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" : "border border-border bg-surface text-text-secondary hover:border-indigo-400/50 hover:text-foreground"}`}
                    >
                      {item === "All exhibits" ? "All flavours" : item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!repositories.length ? (
              <div className="px-6 py-16 text-center sm:px-10">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 text-2xl" aria-hidden>✿</div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">The cake is still in the oven</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">GitHub’s public project list isn’t available right now. You can still browse the whole collection on GitHub.</p>
                <a href={`https://github.com/${username}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400">Visit GitHub ↗</a>
              </div>
            ) : (
              <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                <div className="relative overflow-hidden border-b border-border bg-gradient-to-b from-indigo-500/[0.035] to-fuchsia-500/[0.07] p-5 sm:p-8 lg:border-b-0 lg:border-r">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.18]" style={{ backgroundImage: "radial-gradient(currentColor 0.7px, transparent 0.7px)", backgroundSize: "18px 18px" }} />
                  <div className="relative mb-2 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">The project cake</h3>
                      <p className="mt-1 text-xs text-text-muted">Tap a layer to taste that project</p>
                    </div>
                    <span className="rounded-full border border-border bg-surface/80 px-3 py-1 text-xs tabular-nums text-text-muted">{filtered.length} slices</span>
                  </div>

                  {cakeSlices.length ? (
                    <div className="relative mx-auto mt-10 flex min-h-[25rem] max-w-md flex-col items-center justify-end pb-9 pt-12">
                      <div aria-hidden className="absolute top-3 flex items-end gap-2">
                        {[0, 1, 2].map((candle) => (
                          <span key={candle} className={`relative h-10 w-2 rounded-t-full bg-gradient-to-b ${["from-rose-300 to-rose-400", "from-cyan-300 to-indigo-400", "from-amber-200 to-orange-300"][candle]}`}>
                            <span className="absolute -top-3 left-1/2 h-3 w-2 -translate-x-1/2 rounded-full bg-amber-300 blur-[1px]" />
                          </span>
                        ))}
                      </div>

                      <div className="relative z-10 flex w-full flex-col-reverse items-center gap-[3px]">
                        {cakeSlices.map((repo, index) => {
                          const active = selected?.id === repo.id;
                          const width = LAYER_WIDTHS[index];
                          const flavor = CAKE_FLAVORS[index % CAKE_FLAVORS.length];
                          return (
                            <motion.button
                              layout
                              key={repo.id}
                              type="button"
                              onClick={() => { setSelectedId(repo.id); setTab("idea"); }}
                              aria-pressed={active}
                              aria-label={`Explore ${repo.name.replaceAll("-", " ")}, cake layer ${index + 1}`}
                              className={`group relative h-[3.65rem] ${width} overflow-hidden rounded-[1rem_1rem_1.2rem_1.2rem] border border-white/40 bg-gradient-to-r ${flavor} text-left shadow-[0_8px_14px_-9px_rgba(15,23,42,.8)] transition duration-300 hover:-translate-y-1 hover:brightness-105 ${active ? "z-10 -translate-y-1 scale-[1.025] ring-2 ring-white/80 ring-offset-2 ring-offset-indigo-950/10" : "saturate-[.82]"}`}
                            >
                              <span aria-hidden className="absolute inset-x-0 top-0 h-2 border-b border-white/40 bg-white/50" />
                              <span aria-hidden className="absolute inset-x-0 bottom-0 h-2 bg-black/10" />
                              <span className="absolute inset-0 flex items-center justify-between gap-3 px-4 sm:px-5">
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-bold text-slate-950 drop-shadow-sm">{repo.name.replaceAll("-", " ")}</span>
                                  <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-900/70">{repo.language || repo.topics[0] || "Open source project"}</span>
                                </span>
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/50 bg-white/30 text-sm text-slate-900/80 transition group-hover:rotate-12" aria-hidden>{active ? "✦" : "＋"}</span>
                              </span>
                              {repo.archived && <span className="absolute right-14 top-3 rounded-full bg-slate-950/10 px-2 py-0.5 text-[9px] font-semibold text-slate-900/70">ARCHIVED</span>}
                            </motion.button>
                          );
                        })}
                      </div>

                      <div aria-hidden className="relative mt-3 h-6 w-[96%] rounded-[50%] border border-white/60 bg-gradient-to-b from-white/70 to-indigo-200/60 shadow-[0_12px_20px_-12px_rgba(30,41,59,.7)]" />
                      <div className="absolute bottom-0 h-7 w-[82%] rounded-b-[2rem] rounded-t-[0.5rem] border border-white/30 bg-gradient-to-b from-indigo-200/80 to-indigo-300/60 shadow-lg" aria-hidden />
                      <div className="absolute bottom-6 left-1/2 h-px w-[75%] -translate-x-1/2 bg-white/70" aria-hidden />
                    </div>
                  ) : (
                    <div className="mt-10 grid min-h-80 place-items-center rounded-3xl border border-dashed border-border text-center text-sm text-text-muted">No projects match those ingredients.<br />Try a different search or flavour.</div>
                  )}

                  {filtered.length > LAYER_WIDTHS.length && (
                    <div className="relative mt-2 flex items-center justify-center gap-4">
                      <button type="button" onClick={() => movePage(currentPage - 1)} disabled={currentPage === 0} aria-label="Previous cake layers" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-foreground transition hover:border-indigo-400/50 disabled:cursor-not-allowed disabled:opacity-35">←</button>
                      <span className="text-xs tabular-nums text-text-muted">Cake {currentPage + 1} of {pageCount}</span>
                      <button type="button" onClick={() => movePage(currentPage + 1)} disabled={currentPage >= pageCount - 1} aria-label="Next cake layers" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-foreground transition hover:border-indigo-400/50 disabled:cursor-not-allowed disabled:opacity-35">→</button>
                    </div>
                  )}
                </div>

                <div className="min-h-[30rem] p-5 sm:p-8">
                  <AnimatePresence mode="wait">
                    {selected ? (
                      <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300">Your selected slice</p>
                            <h3 className="mt-2 break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{selected.name.replaceAll("-", " ")}</h3>
                          </div>
                          <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-text-muted">{selected.archived ? "Archived" : "Fresh build"}</span>
                        </div>

                        <div className="mt-6 grid grid-cols-3 gap-2 border-y border-border py-4 text-center">
                          <div><p className="text-lg font-semibold text-foreground">★ {selected.stars}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Stars</p></div>
                          <div><p className="text-lg font-semibold text-foreground">⑂ {selected.forks}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Forks</p></div>
                          <div><p className="truncate text-sm font-semibold text-foreground">{formatDate(selected.updatedAt)}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Last baked</p></div>
                        </div>

                        <div className="mt-5 flex gap-2" role="tablist" aria-label="Explore project details">
                          {([
                            { key: "idea", number: "01", label: "The idea" },
                            { key: "ingredients", number: "02", label: "Ingredients" },
                            { key: "bake", number: "03", label: "Baking notes" },
                          ] as const).map((item) => (
                            <button key={item.key} role="tab" aria-selected={tab === item.key} type="button" onClick={() => setTab(item.key)} className={`flex-1 rounded-xl px-2 py-3 text-left transition ${tab === item.key ? "bg-indigo-500 text-white" : "bg-surface-hover text-text-secondary hover:text-foreground"}`}>
                              <span className="block text-[10px] opacity-70">{item.number}</span><span className="mt-1 block text-xs font-medium sm:text-sm">{item.label}</span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 min-h-28 rounded-2xl bg-surface-hover/70 p-5">
                          <AnimatePresence mode="wait">
                            <motion.div key={tab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.16 }}>
                              {tab === "idea" && <>
                                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">The idea</p>
                                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{selected.description || "No short description yet. Open the repository to see the recipe in full."}</p>
                              </>}
                              {tab === "ingredients" && <>
                                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">Ingredients in this layer</p>
                                <p className="mt-3 text-xs font-medium text-text-muted">Top languages by code size</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {languageMix[selected.id] === undefined && <span className="text-sm text-text-muted">Checking the recipe…</span>}
                                  {languageMix[selected.id]?.map((language, index) => <span key={language} className="rounded-full bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300">{index + 1}. {language}</span>)}
                                  {languageMix[selected.id]?.length === 0 && <span className="text-sm text-text-muted">No language data listed.</span>}
                                </div>
                                {selected.topics.length > 0 && <>
                                  <p className="mt-4 text-xs font-medium text-text-muted">Topics</p>
                                  <div className="mt-2 flex flex-wrap gap-2">{selected.topics.map((topic) => <span key={topic} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary">{topic}</span>)}</div>
                                </>}
                              </>}
                              {tab === "bake" && <>
                                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">Baking notes</p>
                                <p className="mt-2 text-sm leading-relaxed text-text-secondary">Updated {formatDate(selected.updatedAt)} · {selected.stars} {selected.stars === 1 ? "star" : "stars"} · {selected.forks} {selected.forks === 1 ? "fork" : "forks"}. {selected.archived ? "This repository is archived." : "This repository is active."}</p>
                              </>}
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <a href={selected.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-indigo-400">Open recipe on GitHub <span aria-hidden>↗</span></a>
                          {/* {selected.homepage && <a href={selected.homepage} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition hover:border-indigo-400/50 hover:bg-surface-hover">Taste the live demo ↗</a>} */}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="empty-selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid min-h-[25rem] place-items-center text-center">
                        <div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-fuchsia-500/10 text-2xl text-fuchsia-500" aria-hidden>✦</div><p className="mt-4 font-medium text-foreground">Choose a slice</p><p className="mt-1 text-sm text-text-muted">Its story and ingredients will appear here.</p></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-border bg-surface-hover/40 px-5 py-4 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <span>Project details refresh from GitHub every six hours.</span>
              <a href={`https://github.com/${username}?tab=repositories`} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">Browse every recipe ↗</a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
