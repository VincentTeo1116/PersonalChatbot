"use client";

import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import { motion } from "motion/react";
import { submitMeetingRequest, type MeetingRequestState } from "@/lib/actions/meetingRequest";
import { validateMeetingRequest, type MeetingRequestInput } from "@/lib/validation/meetingRequest";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400";
const labelClass = "text-sm text-text-secondary";

const EMPTY: MeetingRequestInput = { name: "", position: "", company: "", email: "", phone: "", message: "" };

export default function MeetingRequestModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<MeetingRequestState, FormData>(submitMeetingRequest, undefined);
  const [values, setValues] = useState<MeetingRequestInput>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof MeetingRequestInput, boolean>>>({});

  const liveErrors = validateMeetingRequest(values);
  const serverErrors = state && !state.ok ? state.errors : undefined;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function errorFor(field: keyof MeetingRequestInput): string | undefined {
    return serverErrors?.[field] ?? (touched[field] ? liveErrors[field] : undefined);
  }

  function field(name: keyof MeetingRequestInput) {
    return {
      name,
      value: values[name],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setValues((v) => ({ ...v, [name]: e.target.value })),
      onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
    };
  }

  const success = state?.ok === true;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">Request a meeting</p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover hover:text-foreground"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {success ? (
            <div className="py-6 text-center">
              <p className="text-lg font-semibold text-foreground">Thanks — request received!</p>
              <p className="mt-2 text-sm text-text-secondary">
                I&apos;ll get back to you by email shortly to find a time that works.
              </p>
              <button
                onClick={onClose}
                className="mt-6 rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
              >
                Close
              </button>
            </div>
          ) : (
            <form action={action} onSubmit={() => setTouched({ name: true, position: true, company: true, email: true, phone: true })} className="space-y-3">
              <p className="text-xs text-text-subtle">
                Tell me a bit about yourself and I&apos;ll follow up by email to set up a time.
              </p>

              <div>
                <label className={labelClass} htmlFor="mr-name">Full name</label>
                <input id="mr-name" className={inputClass} placeholder="David Ali Muthu" {...field("name")} />
                {errorFor("name") && <p className="mt-1 text-xs text-red-500">{errorFor("name")}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="mr-position">Job title</label>
                  <input id="mr-position" className={inputClass} placeholder="Hiring Manager / IT Team Lead" {...field("position")} />
                  {errorFor("position") && <p className="mt-1 text-xs text-red-500">{errorFor("position")}</p>}
                </div>
                <div>
                  <label className={labelClass} htmlFor="mr-company">Company</label>
                  <input id="mr-company" className={inputClass} placeholder="ABC Company" {...field("company")} />
                  {errorFor("company") && <p className="mt-1 text-xs text-red-500">{errorFor("company")}</p>}
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="mr-email">Email</label>
                <input id="mr-email" type="email" className={inputClass} placeholder="username@abc.com" {...field("email")} />
                {errorFor("email") && <p className="mt-1 text-xs text-red-500">{errorFor("email")}</p>}
              </div>

              <div>
                <label className={labelClass} htmlFor="mr-phone">Phone number</label>
                <input id="mr-phone" type="tel" className={inputClass} placeholder="012-3457821" {...field("phone")} />
                {errorFor("phone") && <p className="mt-1 text-xs text-red-500">{errorFor("phone")}</p>}
              </div>

              <div>
                <label className={labelClass} htmlFor="mr-message">Message (optional)</label>
                <textarea id="mr-message" rows={3} className={inputClass} placeholder="What would you like to discuss?" {...field("message")} />
              </div>

              {state?.ok === false && state.error && <p className="text-sm text-red-500">{state.error}</p>}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
              >
                {pending ? "Sending…" : "Send request"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
