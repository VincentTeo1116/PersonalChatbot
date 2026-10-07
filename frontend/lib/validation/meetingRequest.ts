// Shared by the client (inline feedback) and the server action (the real check, since client-side
// validation can be bypassed). Only catches obviously fake input -- can't verify it's a real address.

export type MeetingRequestInput = {
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
  message: string;
};

export type MeetingRequestErrors = Partial<Record<keyof MeetingRequestInput, string>>;

// The most common disposable email providers -- not exhaustive, but catches most throwaway addresses.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "fakeinbox.com",
  "getnada.com",
  "dispostable.com",
  "sharklasers.com",
  "maildrop.cc",
  "temp-mail.org",
  "mohmal.com",
  "emailondeck.com",
]);

// Local-parts used for lazy test/joke submissions rather than a real address, e.g. "test@gmail.com".
const PLACEHOLDER_LOCAL_PARTS = new Set([
  "test",
  "abc",
  "asdf",
  "foo",
  "example",
  "fake",
  "noreply",
  "no-reply",
  "a",
  "aaa",
  "xxx",
  "demo",
  "sample",
  "admin",
  "qwerty",
  "123456",
  "dummy",
  "changeme",
]);

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Flags all-same-digit or sequential numbers like "0123456789" -- the kind people mash in when faking it.
function isObviouslyFakePhone(digits: string): boolean {
  if (/^(\d)\1+$/.test(digits)) return true; // all one repeated digit
  const ascendingWrap = "01234567890123456789";
  const descendingWrap = "09876543210987654321";
  return ascendingWrap.includes(digits) || descendingWrap.includes(digits);
}

export function validateMeetingRequest(input: MeetingRequestInput): MeetingRequestErrors {
  const errors: MeetingRequestErrors = {};

  const name = input.name.trim().replace(/\s+/g, " ");
  const nameWords = name.split(" ").filter(Boolean);
  if (nameWords.length < 2) {
    errors.name = "Please enter your full name (first and last).";
  } else if (nameWords.some((w) => w.length < 2) || /\d/.test(name)) {
    errors.name = "That doesn't look like a real name.";
  }

  if (input.position.trim().length < 2) {
    errors.position = "Please enter your job title.";
  }

  if (input.company.trim().length < 2) {
    errors.company = "Please enter your company name.";
  }

  const email = input.email.trim().toLowerCase();
  const emailMatch = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!emailMatch) {
    errors.email = "Please enter a valid email address.";
  } else {
    const [localPart, domain] = email.split("@");
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      errors.email = "Please use a real work or personal email, not a disposable one.";
    } else if (PLACEHOLDER_LOCAL_PARTS.has(localPart)) {
      errors.email = "That looks like a placeholder email -- please enter your real address.";
    }
  }

  const digits = normalizePhoneDigits(input.phone);
  if (digits.length < 10 || digits.length > 11) {
    errors.phone = "Phone number must be 10-11 digits.";
  } else if (isObviouslyFakePhone(digits)) {
    errors.phone = "That doesn't look like a real phone number.";
  }

  return errors;
}

export function hasErrors(errors: MeetingRequestErrors): boolean {
  return Object.keys(errors).length > 0;
}
