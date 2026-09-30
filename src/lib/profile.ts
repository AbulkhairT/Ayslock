import { z } from "zod";
import { isValidZone } from "./format";
import { normalizeUsername, usernameProblem } from "./username";

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Add your name.").max(80),
  username: z.string().trim().superRefine((v, ctx) => {
    const p = usernameProblem(v);
    if (p) ctx.addIssue({ code: "custom", message: p });
  }).transform((v) => normalizeUsername(v)!),
  timezone: z.string().refine(isValidZone, "Pick a valid timezone."),
  bio: z.string().trim().max(500, "Keep the bio under 500 characters.").default(""),
  location_kind: z.enum(["in_person", "online"]),
  location_text: z.string().trim().max(200).default(""),
  avatar_url: z.string().trim().max(500).refine((v) => !v || /^https:\/\//.test(v), "Avatar must be an https:// image link.").default(""),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Every service needs a name.").max(80),
  description: z.string().trim().max(300).default(""),
  duration_minutes: z.coerce.number().int().min(5, "Services must be at least 5 minutes.").max(720),
  price: z.string().trim().max(12).default(""),
});

export function priceToCents(v: string): number | null | "invalid" {
  const s = v.replace(/[$€£,\s]/g, "");
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return "invalid";
  return Math.round(Number(s) * 100);
}

export function formObject(form: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, form.get(k) ?? undefined]));
}
