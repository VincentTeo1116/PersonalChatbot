"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { submitTestimonial, type TestimonialState } from "@/lib/actions/testimonial";
import { validateTestimonial, type TestimonialInput } from "@/lib/validation/testimonial";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400";
const labelClass = "text-sm text-text-secondary";

const EMPTY: TestimonialInput = { authorName: "", authorRole: "", quote: "" };

// Shared by the on-site modal and the shareable /testimonial invite page, so both go through the same validation, honeypot and pending-until-approved flow.
export default function TestimonialSubmitForm({
  done,
}: {
  /** The button shown after a successful submit: a link (invite page) or a callback (modal). */
  done: { label: string; href?: string; onClick?: () => void };
}) {
  const [state, action, pending] = useActionState<TestimonialState, FormData>(submitTestimonial, undefined);
  const [values, setValues] = useState<TestimonialInput>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof TestimonialInput, boolean>>>({});

  const liveErrors = validateTestimonial(values);
  const serverErrors = state && !state.ok ? state.errors : undefined;

  function errorFor(field: keyof TestimonialInput): string | undefined {
    return serverErrors?.[field] ?? (touched[field] ? liveErrors[field] : undefined);
  }

  function field(name: keyof TestimonialInput) {
    return {
      name,
      value: values[name],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setValues((v) => ({ ...v, [name]: e.target.value })),
      onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
    };
  }

  if (state?.ok === true) {
    const doneClass = "mt-6 inline-block rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400";
    return (
      <div className="py-6 text-center">
        <p className="text-lg font-semibold text-foreground">Thanks — testimonial received!</p>
        <p className="mt-2 text-sm text-text-secondary">It&apos;ll appear on the site once it&apos;s been reviewed.</p>
        {done.href ? (
          <a href={done.href} className={doneClass}>{done.label}</a>
        ) : (
          <button onClick={done.onClick} className={doneClass}>{done.label}</button>
        )}
      </div>
    );
  }

  return (
    <form action={action} onSubmit={() => setTouched({ authorName: true, quote: true })} className="space-y-3">
      <p className="text-xs text-text-subtle">
        Worked with me, supervised me, or collaborated on something? I&apos;d love to feature your
        words — it&apos;s reviewed before it goes live.
      </p>

      {/* Honeypot -- real visitors never see or fill this; a non-empty value marks the submission as a bot. */}
      <label className="hp-field" aria-hidden="true">
        Leave this empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <div>
        <label className={labelClass} htmlFor="t-name">Your name</label>
        <input id="t-name" className={inputClass} placeholder="Jane Doe" {...field("authorName")} />
        {errorFor("authorName") && <p className="mt-1 text-xs text-red-500">{errorFor("authorName")}</p>}
      </div>

      <div>
        <label className={labelClass} htmlFor="t-role">Role (optional)</label>
        <input id="t-role" className={inputClass} placeholder="Engineering Manager, APU" {...field("authorRole")} />
      </div>

      <div>
        <label className={labelClass} htmlFor="t-quote">Your testimonial</label>
        <textarea
          id="t-quote"
          rows={4}
          className={inputClass}
          placeholder="What was it like working together?"
          {...field("quote")}
        />
        {errorFor("quote") && <p className="mt-1 text-xs text-red-500">{errorFor("quote")}</p>}
      </div>

      {state?.ok === false && state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Submit testimonial"}
      </button>
    </form>
  );
}
