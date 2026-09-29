"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400";
const labelClass = "text-sm text-text-secondary";

const LIVE_SITE_LABEL = "Live site";

export default function ProjectForm({
  project,
  action,
  submitLabel,
}: {
  project?: Project;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  // The "Live site" link gets its own field below (auto-saved into `links` as the
  // first entry) so it doesn't need to be typed twice into the generic list.
  const [liveSiteUrl, setLiveSiteUrl] = useState(
    project?.links.find((l) => l.label === LIVE_SITE_LABEL)?.url ?? ""
  );
  const [links, setLinks] = useState(project?.links.filter((l) => l.label !== LIVE_SITE_LABEL) ?? []);

  const allLinks = [
    ...(liveSiteUrl.trim() ? [{ label: LIVE_SITE_LABEL, url: liveSiteUrl.trim() }] : []),
    ...links.filter((l) => l.label && l.url),
  ];

  return (
    <form action={action} className="max-w-2xl space-y-4">
      {project && <input type="hidden" name="id" value={project.id} />}
      <input type="hidden" name="links" value={JSON.stringify(allLinks)} />

      <div>
        <label className={labelClass} htmlFor="slug">Slug</label>
        <input id="slug" name="slug" defaultValue={project?.slug} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="title">Title</label>
        <input id="title" name="title" defaultValue={project?.title} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="description">Description</label>
        <textarea id="description" name="description" defaultValue={project?.description} rows={4} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="tags">Tags (comma-separated)</label>
        <input id="tags" name="tags" defaultValue={project?.tags.join(", ")} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="demoVideoUrl">Demo video URL</label>
        <input id="demoVideoUrl" name="demoVideoUrl" defaultValue={project?.demoVideoUrl} placeholder="YouTube link or a direct .mp4/.webm URL" className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="liveSiteUrl">Live site URL</label>
        <input
          id="liveSiteUrl"
          value={liveSiteUrl}
          onChange={(e) => setLiveSiteUrl(e.target.value)}
          placeholder="https://your-deployed-site.com"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-text-secondary">
          When filled in, this is saved as a &quot;{LIVE_SITE_LABEL}&quot; button automatically &mdash; no need to add it below too.
        </p>
      </div>
      <div>
        <label className={labelClass} htmlFor="award">Award badge</label>
        <input id="award" name="award" defaultValue={project?.award} placeholder="e.g. 3rd Place" className={inputClass} />
      </div>
      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" name="featured" defaultChecked={project?.featured} />
        Featured
      </label>

      <div className="space-y-2">
        <p className={labelClass}>Other links (GitHub, write-up, etc.)</p>
        {links.map((link, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={link.label}
              onChange={(e) => setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, label: e.target.value } : l)))}
              placeholder="Label (e.g. GitHub)"
              className={`${inputClass} sm:w-40 sm:shrink-0`}
            />
            <input
              value={link.url}
              onChange={(e) => setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l)))}
              placeholder="https://…"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-red-500 sm:py-0"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:text-foreground"
        >
          + Add link
        </button>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
      >
        {submitLabel}
      </button>
    </form>
  );
}
