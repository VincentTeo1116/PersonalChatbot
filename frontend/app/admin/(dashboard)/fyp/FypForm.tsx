"use client";

import { useActionState } from "react";
import type { Fyp } from "@/lib/types";
import { saveFyp, type FypFormState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400";
const labelClass = "text-sm text-text-secondary";

export default function FypForm({ fyp }: { fyp: Fyp }) {
  const [state, action, pending] = useActionState<FypFormState, FormData>(saveFyp, undefined);

  return (
    <form action={action} className="max-w-2xl space-y-4">
      <div>
        <label className={labelClass} htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          defaultValue={fyp.title ?? ""}
          placeholder="Leave blank to show a 'Coming Soon' card on the public site"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="description">Project description</label>
        <textarea
          id="description"
          name="description"
          defaultValue={fyp.description ?? ""}
          rows={5}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="githubUrl">GitHub repo link</label>
        <input id="githubUrl" name="githubUrl" defaultValue={fyp.githubUrl ?? ""} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="datasetDescription">Dataset description</label>
        <textarea
          id="datasetDescription"
          name="datasetDescription"
          defaultValue={fyp.datasetDescription ?? ""}
          rows={3}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="videoUrl">Demo video URL (YouTube link or direct .mp4)</label>
        <input id="videoUrl" name="videoUrl" defaultValue={fyp.videoUrl ?? ""} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="supervisor">Supervisor</label>
        <input id="supervisor" name="supervisor" defaultValue={fyp.supervisor ?? ""} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="lecturerFeedback">Lecturer feedback (optional)</label>
        <textarea
          id="lecturerFeedback"
          name="lecturerFeedback"
          defaultValue={fyp.lecturerFeedback ?? ""}
          rows={3}
          placeholder="Leave blank if none yet -- it's hidden on the public site until filled in"
          className={inputClass}
        />
      </div>

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
