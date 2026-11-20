// Contact numbers are free-form (people type "+91 98765 43210", "(020) 555-0101"),
// so we only tidy whitespace and check it looks like a phone: allowed characters
// and 7–15 digits (the E.164 maximum).

const ALLOWED = /^\+?[\d\s().-]+$/;

/** Collapses runs of whitespace and trims. */
export function cleanPhone(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

/** Returns an error message, or null when the value is a plausible phone number. */
export function phoneProblem(value: string, label = "Phone number"): string | null {
  if (!value) return `${label} is required.`;
  if (value.length > 30 || !ALLOWED.test(value)) {
    return `${label} can only contain digits, spaces, +, -, ( and ).`;
  }
  const digits = value.replace(/\D/g, "").length;
  if (digits < 7 || digits > 15) return `${label} should have between 7 and 15 digits.`;
  return null;
}

/** Validates a required primary and optional secondary number. */
export function checkPhones(phoneRaw: unknown, phone2Raw: unknown):
  | { error: string }
  | { phone: string; phone2: string } {
  const phone = cleanPhone(phoneRaw);
  const phone2 = cleanPhone(phone2Raw);
  const p1 = phoneProblem(phone, "Phone number");
  if (p1) return { error: p1 };
  if (phone2) {
    const p2 = phoneProblem(phone2, "Second phone number");
    if (p2) return { error: p2 };
  }
  return { phone, phone2 };
}
