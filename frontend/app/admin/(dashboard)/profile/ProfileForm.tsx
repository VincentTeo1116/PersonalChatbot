"use client";

import { useActionState, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import type { Profile } from "@/lib/types";
import { saveProfile, uploadAvatar, uploadResume, type ProfileFormState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400";
const labelClass = "text-sm text-text-secondary";
const LEVELS = [1, 2, 3, 4, 5];

type SkillRow = { category: string; itemsText: string; levels: Record<string, number> };

function parseSkillNames(itemsText: string): string[] {
  return itemsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfile, undefined);
  const [skills, setSkills] = useState<SkillRow[]>(
    profile.skills.map((s) => ({
      category: s.category,
      itemsText: s.items.map((i) => i.name).join(", "),
      levels: Object.fromEntries(s.items.map((i) => [i.name, i.level])),
    }))
  );
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState(profile.contact.resumeUrl);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const skillsJson = JSON.stringify(
    skills
      .filter((s) => s.category.trim())
      .map((s) => {
        const names = parseSkillNames(s.itemsText);
        return {
          category: s.category.trim(),
          items: names.map((name) => ({ name, level: s.levels[name] ?? 4 })),
        };
      })
  );

  function setSkillLevel(rowIndex: number, name: string, level: number) {
    setSkills((prev) =>
      prev.map((s, idx) => (idx === rowIndex ? { ...s, levels: { ...s.levels, [name]: level } } : s))
    );
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    setAvatarError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadAvatar(formData);
    if (result.error) setAvatarError(result.error);
    if (result.publicUrl) setAvatarUrl(result.publicUrl);
    setAvatarBusy(false);
    e.target.value = "";
  }

  async function handleResumeChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeBusy(true);
    setResumeError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadResume(formData);
    if (result.error) setResumeError(result.error);
    if (result.publicUrl) setResumeUrl(result.publicUrl);
    setResumeBusy(false);
    e.target.value = "";
  }

  return (
    <form action={action} className="max-w-2xl space-y-8">
      <input type="hidden" name="skills" value={skillsJson} />

      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
            <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
          </div>
          <div>
            <label className={labelClass}>
              <span className="mb-1 block">Avatar</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={avatarBusy}
                className="text-xs text-text-secondary"
              />
            </label>
            {avatarBusy && <p className="text-xs text-text-subtle">Uploading…</p>}
            {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={profile.name} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="tagline">Tagline</label>
          <input id="tagline" name="tagline" defaultValue={profile.tagline} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="location">Location</label>
          <input id="location" name="location" defaultValue={profile.location} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="heroSummary">Hero summary</label>
          <textarea
            id="heroSummary"
            name="heroSummary"
            defaultValue={profile.heroSummary}
            rows={3}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="about">About</label>
          <textarea id="about" name="about" defaultValue={profile.about} rows={5} className={inputClass} required />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="statCgpa">Stat: CGPA</label>
          <input
            id="statCgpa"
            name="statCgpa"
            type="number"
            step="0.01"
            defaultValue={profile.statCgpa ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="statHackathons">Stat: Hackathons</label>
          <input
            id="statHackathons"
            name="statHackathons"
            type="number"
            defaultValue={profile.statHackathons ?? ""}
            className={inputClass}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Contact</h2>
        <div>
          <label className={labelClass} htmlFor="contactEmail">Email</label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={profile.contact.email}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="contactGithub">GitHub URL</label>
          <input id="contactGithub" name="contactGithub" defaultValue={profile.contact.github} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="contactLinkedin">LinkedIn URL</label>
          <input
            id="contactLinkedin"
            name="contactLinkedin"
            defaultValue={profile.contact.linkedin}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="contactResumeUrl">Resume URL (fallback if no PDF uploaded below)</label>
          <input
            id="contactResumeUrl"
            name="contactResumeUrl"
            defaultValue={profile.contact.resumeUrl}
            placeholder="e.g. an external link if you'd rather not upload a file"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            <span className="mb-1 block">Or upload a resume PDF (takes priority over the URL above)</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleResumeChange}
              disabled={resumeBusy}
              className="text-xs text-text-secondary"
            />
          </label>
          {resumeBusy && <p className="mt-1 text-xs text-text-subtle">Uploading…</p>}
          {resumeError && <p className="mt-1 text-xs text-red-500">{resumeError}</p>}
          {!resumeBusy && !resumeError && resumeUrl && (
            <a href={resumeUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-indigo-500 hover:underline">
              View current resume →
            </a>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Skills</h2>
        <p className="text-xs text-text-subtle">
          List names comma-separated as before, then set each one&apos;s proficiency (1 = learning, 5 = expert) below —
          shown on the site as small dots next to each skill.
        </p>
        {skills.map((row, i) => {
          const names = parseSkillNames(row.itemsText);
          return (
            <div key={i} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={row.category}
                  onChange={(e) =>
                    setSkills((prev) => prev.map((s, idx) => (idx === i ? { ...s, category: e.target.value } : s)))
                  }
                  placeholder="Category (e.g. Languages)"
                  className={`${inputClass} sm:w-40 sm:shrink-0`}
                />
                <input
                  value={row.itemsText}
                  onChange={(e) =>
                    setSkills((prev) => prev.map((s, idx) => (idx === i ? { ...s, itemsText: e.target.value } : s)))
                  }
                  placeholder="Comma-separated items"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setSkills((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-red-500 sm:py-0"
                >
                  Remove
                </button>
              </div>

              {names.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {names.map((name) => (
                    <label
                      key={name}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-xs text-text-secondary"
                    >
                      <span className="max-w-[9rem] truncate">{name}</span>
                      <select
                        value={row.levels[name] ?? 4}
                        onChange={(e) => setSkillLevel(i, name, Number(e.target.value))}
                        className="rounded border border-border bg-surface px-1 py-0.5 text-xs text-foreground outline-none"
                        aria-label={`Proficiency for ${name}`}
                      >
                        {LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setSkills((prev) => [...prev, { category: "", itemsText: "", levels: {} }])}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:text-foreground"
        >
          + Add category
        </button>
      </section>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-500">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
