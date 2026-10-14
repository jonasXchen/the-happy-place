import { z } from "zod";
import { brandingSchema, brandDefaults } from "./branding";
const t = (n = 3000) => z.string().max(n);
const cents = z.number().int().min(0).max(10000000);
export const settingsSchema = z.object({
  branding: brandingSchema.default(brandDefaults),
  hero_title: t(200),
  hero_subtitle: t(500),
  hero_image: t(1500),
  announcement: t(300),
  announcement_starts_at: z.iso.datetime().nullable(),
  announcement_ends_at: z.iso.datetime().nullable(),
  points_per_dollar: z.number().min(0).max(100),
  expiry_days: z.number().int().min(1).max(3650),
  signup_points: z.number().int().min(0).max(10000),
  award_on: z.enum(["paid", "delivered"]),
  shipping_small: cents,
  shipping_medium: cents,
  shipping_large: cents,
  installation_cents: cents,
  remote_surcharge: cents,
  remote_prefixes: z.array(z.string().regex(/^\d{2,6}$/)).max(100),
  remote_keywords: z.array(z.string().min(2).max(80)).max(100),
  express_enabled: z.boolean(),
  express_extra_cents: cents,
  free_shipping_min: cents,
  free_shipping_classes: z.array(z.enum(["small", "medium", "large"])),
  policies_approved: z.boolean(),
  showroom_address: t(500),
  showroom_hours: t(300),
  contact_email: z.email(),
  about: t(5000),
  shipping_policy: t(10000),
  returns_policy: t(10000),
  privacy_policy: t(10000),
  faq: t(10000),
  earn_on_tax: z.boolean(),
  gst_basis_points: z.number().int().min(0).max(2500),
  notification_email: z.union([z.literal(""), z.email()]),
});
export const contentKeys = [
  "hero_title",
  "hero_subtitle",
  "hero_image",
  "announcement",
  "announcement_starts_at",
  "announcement_ends_at",
  "showroom_address",
  "showroom_hours",
  "contact_email",
  "about",
  "faq",
] as const;

// Content editors can replace only editorial fields; owner settings stay intact.
export function mergeContentSettings(
  previous: Record<string, unknown>,
  next: z.infer<typeof settingsSchema>,
) {
  return {
    ...previous,
    ...Object.fromEntries(contentKeys.map((key) => [key, next[key]])),
  };
}
