"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import { AdminForm, type ActionResult } from "@/components/admin/AdminFeedback";
import { CASE_STUDY_MAX_LENGTH, CASE_STUDY_SECTIONS } from "@/lib/project-case-study";

const inputClass = "admin-input";
const labelClass = "admin-label";

const LIVE_SITE_LABEL = "Live site";

export default function ProjectForm({
  project,
  action,
  submitLabel,
  redirectTo,
  caseStudyEnabled = false,
}: {
  project?: Project;
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  /** Where to go after a successful save (edit forms); create actions return their own redirectTo. */
  redirectTo?: string;
  caseStudyEnabled?: boolean;
}) {
  // "Live site" gets its own field below, auto-saved as the first links entry, so it's not typed twice.
  const [liveSiteUrl, setLiveSiteUrl] = useState(
    project?.links.find((l) => l.label === LIVE_SITE_LABEL)?.url ?? ""
  );
  const [links, setLinks] = useState(project?.links.filter((l) => l.label !== LIVE_SITE_LABEL) ?? []);

  const allLinks = [
    ...(liveSiteUrl.trim() ? [{ label: LIVE_SITE_LABEL, url: liveSiteUrl.trim() }] : []),
    ...links.filter((l) => l.label && l.url),
  ];

  return (
    <AdminForm
      action={action}
      message={project ? "Changes saved" : "Created"}
      detail={project ? undefined : "Opening the editor so you can add images…"}
      redirectTo={redirectTo}
      className="admin-card max-w-2xl space-y-4 p-6">
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
      <div>
        <label className={labelClass} htmlFor="role">Your role</label>
        <input id="role" name="role" defaultValue={project?.role} placeholder="e.g. Solo project, or: Led backend, teammate built frontend" className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="impact">Impact</label>
        <input id="impact" name="impact" defaultValue={project?.impact} placeholder="e.g. Cut manual grading time by ~60%, used by 50+ students" className={inputClass} />
        <p className="mt-1 text-xs text-text-secondary">A concrete outcome or number -- this is what recruiters scan for first.</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" name="featured" defaultChecked={project?.featured} />
        Featured
      </label>

      {caseStudyEnabled ? (
        <fieldset className="space-y-4 border-t border-border pt-5">
          <legend className="px-1 text-base font-semibold text-foreground">Engineering case study</legend>
          <input type="hidden" name="caseStudyEnabled" value="true" />
          <p className="text-sm text-text-secondary">These sections appear on the full project page and become sources for the chatbot. Empty sections stay hidden.</p>
          {CASE_STUDY_SECTIONS.map(({ key, title, prompt }) => (
            <div key={key}>
              <label className={labelClass} htmlFor={`caseStudy-${key}`}>{title}</label>
              <p id={`caseStudy-${key}-help`} className="mb-2 text-xs text-text-secondary">{prompt}</p>
              <textarea
                id={`caseStudy-${key}`}
                name={`caseStudy-${key}`}
                defaultValue={project?.caseStudy?.[key] ?? ""}
                aria-describedby={`caseStudy-${key}-help`}
                maxLength={CASE_STUDY_MAX_LENGTH}
                rows={5}
                className={inputClass}
              />
            </div>
          ))}
        </fieldset>
      ) : (
        <p className="rounded-xl border border-border p-3 text-sm text-text-secondary">To enable engineering case studies, run supabase/013_project_case_studies.sql in your Supabase SQL Editor. Existing project fields can still be saved.</p>
      )}

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
              className="admin-btn admin-btn-danger shrink-0 sm:py-0"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
          className="admin-btn admin-btn-ghost"
        >
          + Add link
        </button>
      </div>

      <button type="submit" className="admin-btn admin-btn-primary">
        {submitLabel}
      </button>
    </AdminForm>
  );
}
