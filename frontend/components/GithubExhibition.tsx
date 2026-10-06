"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import type { GithubRepository } from "@/lib/github";

type ExhibitView = "story" | "layers" | "signals";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(value));
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
  const [visibleCount, setVisibleCount] = useState(8);
  const [selectedId, setSelectedId] = useState<number | null>(repositories[0]?.id ?? null);
  const [view, setView] = useState<ExhibitView>("story");

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

  const selected = filtered.find((repo) => repo.id === selectedId) ?? filtered[0] ?? null;
  const layers: { key: ExhibitView; number: string; label: string }[] = [
    { key: "story", number: "01", label: "The idea" },
    { key: "layers", number: "02", label: "The layers" },
    { key: "signals", number: "03", label: "The activity" },
  ];

  function chooseRoom(value: string) {
    setRoom(value);
    setSelectedId(null);
    setView("story");
    setVisibleCount(8);
  }

  function chooseExhibit(id: number) {
    setSelectedId(id);
    setView("story");
  }

  return (
    <section id="github-exhibition" className="relative isolate overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-44 h-96 w-[min(90vw,60rem)] -translate-x-1/2 rounded-full bg-indigo-500/[0.08] blur-[100px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="GitHub exhibition" title="Step inside the workshop" align="center" large>
          <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
            A living gallery of public builds. Pick a room, choose an exhibit, then explore what it is made of.
          </p>
        </SectionHeading>

        <Reveal delay={120}>
          <div className="mt-12 overflow-hidden rounded-[2rem] border border-border bg-surface/80 shadow-2xl shadow-indigo-950/10 backdrop-blur">
            <div className="border-b border-border bg-surface-hover/50 px-5 py-5 sm:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500 dark:text-indigo-300">Choose your gallery</p>
                  <p className="mt-1 text-sm text-text-muted">{repositories.length} public {repositories.length === 1 ? "exhibit" : "exhibits"} · curated live from GitHub</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="exhibition-search">Search exhibits</label>
                  <input
                    id="exhibition-search"
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setSelectedId(null); setVisibleCount(8); }}
                    placeholder="Search projects or topics…"
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:w-64"
                  />
                  <button
                    type="button"
                    onClick={() => { setOrder((current) => current === "recent" ? "stars" : "recent"); setVisibleCount(8); }}
                    className="min-h-11 rounded-xl border border-border px-4 text-sm text-text-secondary transition hover:border-indigo-400/50 hover:text-foreground"
                    aria-label={`Sort by ${order === "recent" ? "stars" : "recently updated"}`}
                  >
                    {order === "recent" ? "Recently updated ↓" : "Most starred ↓"}
                  </button>
                </div>
              </div>

              {repositories.length > 0 && (
                <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filter exhibits by language">
                  {rooms.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => chooseRoom(item)}
                      aria-pressed={room === item}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${room === item ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" : "border border-border bg-surface text-text-secondary hover:border-indigo-400/50 hover:text-foreground"}`}
                    >
                      {item === "All exhibits" ? "All rooms" : item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!repositories.length ? (
              <div className="px-6 py-16 text-center sm:px-10">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-2xl" aria-hidden>⌘</div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">The gallery is getting ready</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">GitHub’s public repository list is unavailable right now. You can still visit the collection directly.</p>
                <a href={`https://github.com/${username}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400">Visit GitHub ↗</a>
              </div>
            ) : (
              <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="border-b border-border p-5 sm:p-8 lg:border-b-0 lg:border-r">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">Exhibit hall</h3>
                      <p className="mt-1 text-xs text-text-muted">Choose a tile to open its display</p>
                    </div>
                      <span className="rounded-full border border-border px-3 py-1 text-xs tabular-nums text-text-muted">{Math.min(filtered.length, visibleCount)} of {filtered.length}</span>
                  </div>

                  {filtered.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {filtered.slice(0, visibleCount).map((repo, index) => {
                        const active = selected?.id === repo.id;
                        const colors = ["from-indigo-500/20 to-violet-500/5", "from-fuchsia-500/15 to-indigo-500/5", "from-cyan-500/15 to-blue-500/5", "from-amber-500/15 to-rose-500/5"];
                        return (
                          <motion.button
                            layout
                            key={repo.id}
                            type="button"
                            onClick={() => chooseExhibit(repo.id)}
                            aria-pressed={active}
                            className={`group relative min-h-36 overflow-hidden rounded-2xl border p-4 text-left transition sm:min-h-40 ${active ? "border-indigo-400 bg-indigo-500/[0.08] ring-2 ring-indigo-400/25" : "border-border bg-background hover:-translate-y-1 hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/10"}`}
                          >
                            <span aria-hidden className={`absolute inset-0 bg-gradient-to-br ${colors[index % colors.length]} opacity-80`} />
                            <span aria-hidden className="absolute -right-5 -top-7 h-20 w-20 rounded-full border border-current opacity-[0.08] transition-transform duration-500 group-hover:scale-150" />
                            <span className="relative flex h-full flex-col justify-between">
                              <span className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
                                <span>ROOM {String(index + 1).padStart(2, "0")}</span>
                                {repo.archived && <span className="rounded-full bg-surface/70 px-2 py-1 normal-case tracking-normal">Archive</span>}
                              </span>
                              <span>
                                <span className="block truncate text-sm font-semibold text-foreground sm:text-base">{repo.name.replaceAll("-", " ")}</span>
                                <span className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                                  {repo.language && <><span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />{repo.language}</>}
                                  {repo.stars > 0 && <span className="ml-auto">★ {repo.stars}</span>}
                                </span>
                              </span>
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center text-sm text-text-muted">No exhibits match that search. Try another room or keyword.</div>
                  )}
                  {filtered.length > visibleCount && (
                    <button type="button" onClick={() => setVisibleCount((count) => count + 8)} className="mt-4 w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-text-secondary transition hover:border-indigo-400/50 hover:bg-indigo-500/5 hover:text-foreground">
                      Open {Math.min(8, filtered.length - visibleCount)} more exhibits <span aria-hidden>↓</span>
                    </button>
                  )}
                </div>

                <div className="min-h-[27rem] p-5 sm:p-8">
                  <AnimatePresence mode="wait">
                    {selected ? (
                      <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300">Now exploring</p>
                            <h3 className="mt-2 break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{selected.name.replaceAll("-", " ")}</h3>
                          </div>
                          <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-text-muted">{selected.archived ? "Archived" : "Open source"}</span>
                        </div>

                        <div className="mt-6 grid grid-cols-3 gap-2 border-y border-border py-4 text-center">
                          <div><p className="text-lg font-semibold text-foreground">★ {selected.stars}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Stars</p></div>
                          <div><p className="text-lg font-semibold text-foreground">⑂ {selected.forks}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Forks</p></div>
                          <div><p className="truncate text-sm font-semibold text-foreground">{formatDate(selected.updatedAt)}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Last updated</p></div>
                        </div>

                        <div className="mt-5 flex gap-2" role="tablist" aria-label="Explore project details">
                          {layers.map((layer) => (
                            <button key={layer.key} role="tab" aria-selected={view === layer.key} type="button" onClick={() => setView(layer.key)} className={`flex-1 rounded-xl px-2 py-3 text-left transition ${view === layer.key ? "bg-indigo-500 text-white" : "bg-surface-hover text-text-secondary hover:text-foreground"}`}>
                              <span className="block text-[10px] opacity-70">{layer.number}</span><span className="mt-1 block text-xs font-medium sm:text-sm">{layer.label}</span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 min-h-28 rounded-2xl bg-surface-hover/70 p-5">
                          <AnimatePresence mode="wait">
                            <motion.div key={view} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.16 }}>
                              {view === "story" && <>
                                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">Exhibit note</p>
                                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{selected.description || "This repository does not have a short description yet. Open the source to see the project details."}</p>
                              </>}
                              {view === "layers" && <>
                                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">What it is built with</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {selected.language && <span className="rounded-full bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300">{selected.language} · primary language</span>}
                                  {selected.topics.map((topic) => <span key={topic} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary">{topic}</span>)}
                                  {!selected.language && !selected.topics.length && <span className="text-sm text-text-muted">No language or topics listed yet.</span>}
                                </div>
                              </>}
                              {view === "signals" && <>
                                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">Repository signals</p>
                                <p className="mt-2 text-sm leading-relaxed text-text-secondary">Updated {formatDate(selected.updatedAt)} · {selected.stars} {selected.stars === 1 ? "star" : "stars"} · {selected.forks} {selected.forks === 1 ? "fork" : "forks"}.{selected.archived ? " This repository is archived." : " This repository is active."}</p>
                              </>}
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <a href={selected.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-indigo-400">Open source on GitHub <span aria-hidden>↗</span></a>
                          {selected.homepage && <a href={selected.homepage} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition hover:border-indigo-400/50 hover:bg-surface-hover">Visit live project ↗</a>}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="empty-selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid min-h-[24rem] place-items-center text-center">
                        <div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/10 text-2xl text-indigo-500" aria-hidden>✦</div><p className="mt-4 font-medium text-foreground">Choose an exhibit to explore</p><p className="mt-1 text-sm text-text-muted">The project story will unfold here, layer by layer.</p></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-border bg-surface-hover/40 px-5 py-4 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <span>Exhibit details refresh from GitHub every six hours.</span>
              <a href={`https://github.com/${username}?tab=repositories`} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">Browse every repository ↗</a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
