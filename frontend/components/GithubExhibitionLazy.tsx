"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import PartHeading from "@/components/PartHeading";
import type { GithubRepository } from "@/lib/github";

const SECTION_ID = "github-exhibition";
// Start loading the gallery about one screen before the visitor reaches it.
const NEAR_MARGIN = "800px";

type Props = { username: string; repositories: GithubRepository[] };

/**
 * A plain list of the repositories. It is what the server sends, what search engines and visitors without JavaScript read,
 * and what stays on screen if the interactive gallery cannot be downloaded. It carries the same id as the gallery, so links to #github-exhibition work either way.
 */
function RepositoryList({ username, repositories }: Props) {
  return (
    <div id={SECTION_ID} className="relative isolate mt-16 scroll-mt-24">
      <div className="mx-auto max-w-6xl px-6">
        <PartHeading number="02" title="Exhibition: a portfolio, baked in layers">
          <p className="mt-3 max-w-2xl text-sm text-text-secondary sm:text-base">
            {repositories.length} public projects, fresh from GitHub.
          </p>
        </PartHeading>
        <ul className="mt-8 grid min-h-[34rem] content-start gap-3 rounded-[2rem] border border-border bg-surface/85 p-5 sm:grid-cols-2 sm:p-8">
          {repositories.map((repo) => (
            <li key={repo.id} className="rounded-xl border border-border bg-surface p-4">
              <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="font-semibold text-foreground underline-offset-4 hover:underline">
                {repo.name}
              </a>
              {repo.language && <span className="ml-2 text-xs text-text-muted">{repo.language}</span>}
              {repo.description && <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{repo.description}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-text-secondary">
          <a href={`https://github.com/${username}?tab=repositories`} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-300">
            Browse every repository on GitHub
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * The interactive gallery is the heaviest thing on the homepage to start up (it measures and animates every layer), and it sits several screens down.
 * Starting it with the rest of the page delayed the first tap on slow phones, so its code is fetched and run only when the visitor scrolls near it.
 */
export default function GithubExhibitionLazy(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  // Created once, so the loaded gallery is not thrown away and fetched again on a re-render.
  const [Gallery] = useState(() =>
    dynamic(() => import("@/components/GithubExhibition"), { ssr: false, loading: () => <RepositoryList {...props} /> })
  );

  useEffect(() => {
    if (near) return;
    const node = ref.current;
    if (!node) return;
    // Browsers without the observer keep the plain list, which is complete on its own.
    if (typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: `${NEAR_MARGIN} 0px` }
    );
    // Watch the enclosing page section, not this element: off-screen sections skip layout (content-visibility), so an element inside one has no reliable position until the section itself comes near.
    observer.observe(node.closest("section") ?? node);
    return () => observer.disconnect();
  }, [near]);

  // A link straight to this block (#github-exhibition) arrives while it is still being streamed in, so the browser's own jump can miss it. Scroll there once it exists; coming near then loads the gallery as usual.
  useEffect(() => {
    const jump = () => {
      if (window.location.hash === `#${SECTION_ID}`) ref.current?.scrollIntoView({ block: "start" });
    };
    jump();
    window.addEventListener("hashchange", jump);
    return () => window.removeEventListener("hashchange", jump);
  }, []);

  return (
    <div ref={ref} className="scroll-mt-24">
      {near ? <Gallery {...props} /> : <RepositoryList {...props} />}
    </div>
  );
}
