export const USERNAME_RE = /^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$/;

const RESERVED = new Set([
  "admin", "api", "app", "ayslock", "book", "booking", "dashboard", "demo", "help", "login",
  "logout", "me", "new", "onboarding", "privacy", "root", "settings", "signin", "signup",
  "support", "terms", "u", "www", "auth", "account", "b", "static", "null", "undefined",
]);

/** Normalize user input like " @Adam " to "adam". Returns null when it cannot be a username. */
export function normalizeUsername(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = input.trim().replace(/^@+/, "").toLowerCase();
  return USERNAME_RE.test(v) ? v : null;
}

export function usernameProblem(input: string): string | null {
  const v = input.trim().replace(/^@+/, "").toLowerCase();
  if (v.length < 3) return "Use at least 3 characters.";
  if (v.length > 30) return "Use 30 characters or fewer.";
  if (!/^[a-z0-9_]+$/.test(v)) return "Use only letters, numbers and underscores.";
  if (!USERNAME_RE.test(v)) return "Start and end with a letter or number.";
  if (RESERVED.has(v)) return "That username is reserved. Try another.";
  return null;
}
