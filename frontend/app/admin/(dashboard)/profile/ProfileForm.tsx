"use client";

import { useActionState, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import type { Profile } from "@/lib/types";
import { saveProfile, uploadAvatar, type ProfileFormState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400";
const labelClass = "text-sm text-text-secondary";

type SkillRow = { category: string; items: string };

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfile, undefined);
  const [skills, setSkills] = useState<SkillRow[]>(
    profile.skills.map((s) => ({ category: s.category, items: s.items.join(", ") }))
  );
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const skillsJson = JSON.stringify(
    skills
      .filter((s) => s.category.trim())
      .map((s) => ({
        category: s.category.trim(),
        items: s.items.split(",").map((i) => i.trim()).filter(Boolean),
      }))
  );

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

      <section className="grid grid-cols-2 gap-4">
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
          <label className={labelClass} htmlFor="contactResumeUrl">Resume URL</label>
          <input
            id="contactResumeUrl"
            name="contactResumeUrl"
            defaultValue={profile.contact.resumeUrl}
            className={inputClass}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Skills</h2>
        {skills.map((row, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={row.category}
              onChange={(e) =>
                setSkills((prev) => prev.map((s, idx) => (idx === i ? { ...s, category: e.target.value } : s)))
              }
              placeholder="Category (e.g. Languages)"
              className={`${inputClass} w-40 shrink-0`}
            />
            <input
              value={row.items}
              onChange={(e) =>
                setSkills((prev) => prev.map((s, idx) => (idx === i ? { ...s, items: e.target.value } : s)))
              }
              placeholder="Comma-separated items"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setSkills((prev) => prev.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded-lg border border-border px-3 text-sm text-text-secondary hover:text-red-500"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSkills((prev) => [...prev, { category: "", items: "" }])}
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
