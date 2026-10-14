"use server";

import { createClient } from "@/lib/supabase/server";
import { validateTestimonial, hasErrors, type TestimonialErrors } from "@/lib/validation/testimonial";

export type TestimonialState =
  | { ok: true }
  | { ok: false; errors?: TestimonialErrors; error?: string }
  | undefined;

export async function submitTestimonial(
  _prevState: TestimonialState,
  formData: FormData
): Promise<TestimonialState> {
  const input = {
    authorName: String(formData.get("authorName") ?? ""),
    authorRole: String(formData.get("authorRole") ?? ""),
    quote: String(formData.get("quote") ?? ""),
  };

  // Re-validate here even though the client already checked -- client-side validation is
  // only ever a UX convenience, it can be bypassed by anyone submitting the form directly.
  const errors = validateTestimonial(input);
  if (hasErrors(errors)) return { ok: false, errors };

  const supabase = await createClient();
  const { error } = await supabase.from("testimonials").insert({
    author_name: input.authorName.trim().replace(/\s+/g, " "),
    author_role: input.authorRole.trim(),
    quote: input.quote.trim(),
    // Explicit even though it's also the column default and RLS-enforced on this insert
    // policy -- a submitted testimonial is never visible until an admin approves it.
    status: "pending",
  });

  if (error) {
    // Logged server-side (never shown to the visitor) -- most likely cause is
    // 010_testimonial_status.sql not having been run yet.
    console.error("testimonials insert failed:", error.message);
    return { ok: false, error: "Something went wrong submitting your testimonial. Please try again." };
  }

  return { ok: true };
}
