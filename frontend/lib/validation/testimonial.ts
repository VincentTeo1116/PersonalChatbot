// Shared by the client (inline feedback) and the server action (the real check, since client-side validation can be bypassed). Deliberately lighter than meetingRequest's -- no email/phone here, so no disposable-domain checks are relevant.

export type TestimonialInput = {
  authorName: string;
  authorRole: string;
  quote: string;
};

export type TestimonialErrors = Partial<Record<keyof TestimonialInput, string>>;

export function validateTestimonial(input: TestimonialInput): TestimonialErrors {
  const errors: TestimonialErrors = {};

  if (input.authorName.trim().length < 2) {
    errors.authorName = "Please enter your name.";
  }

  const quote = input.quote.trim();
  if (quote.length < 10) {
    errors.quote = "Please write a bit more — at least a sentence or two.";
  } else if (quote.length > 600) {
    errors.quote = "That's a bit long — please keep it under 600 characters.";
  }

  return errors;
}

export function hasErrors(errors: TestimonialErrors): boolean {
  return Object.keys(errors).length > 0;
}
