import { z } from "zod";
const text = (max = 300) => z.string().trim().max(max);
export const addressSchema = z.object({
  name: text(120).min(2),
  email: z.email().max(254),
  phone: text(30).regex(/^\+?[\d\s()-]{8,25}$/),
  block: text(30).min(1),
  street: text(120).min(2),
  building: text(120),
  unit: text(40),
  postal: z.string().regex(/^\d{6}$/),
  country: z.literal("Singapore"),
  instructions: text(1000),
  access: text(500),
});
export const checkoutSchema = z.object({
  request_id: z.uuid(),
  expected_total_cents: z.number().int().min(0),
  lines: z
    .array(
      z.object({
        variant_id: z.uuid(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(50),
  address: addressSchema,
  billing_address: addressSchema.nullable().optional(),
  reward_id: z.uuid().nullable().optional(),
  coupon: text(40).optional(),
  split_delivery: z.boolean(),
  delivery_method: z.enum(["standard", "express"]).default("standard"),
  preferred_date: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
  preferred_window: text(100),
  marketing_opt_in: z.boolean(),
  utm: z.record(z.string(), z.string().max(200)).optional(),
});
export const productSchema = z.object({
  id: z.uuid(),
  name: text(150).min(2),
  slug: text(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: text(80).min(1),
  room: text(80),
  style: text(80),
  material: text(80),
  description: text(4000),
  dimensions: text(1000),
  care: text(2000),
  images: z
    .array(
      z
        .string()
        .max(1500)
        .refine((v) => v.startsWith("/images/") || v.startsWith("https://")),
    )
    .max(20),
  price_cents: z.number().int().min(1).max(100000000),
  active: z.boolean(),
  featured: z.boolean(),
  shipping_class: z.enum(["small", "medium", "large"]),
  installation: z.boolean(),
  source_url: z.string().max(1500).optional(),
  sample: z.boolean().optional(),
  variants: z
    .array(
      z.object({
        id: z.uuid(),
        product_id: z.uuid(),
        label: text(150).min(1),
        sku: text(100).min(1),
        colour: text(80),
        material: text(80),
        size: text(80),
        price_cents: z.number().int().min(1).max(100000000),
        stock: z.number().int().min(0).nullable(),
        lead_weeks: z.number().int().min(0).max(104),
        image: z.string().optional(),
      }),
    )
    .min(1)
    .max(100),
});
export const rewardSchema = z
  .object({
    id: z.uuid(),
    title: text(150).min(2),
    description: text(2000),
    points: z.number().int().min(1).max(1000000),
    kind: z.enum(["fixed", "percent", "shipping", "gift"]),
    value: z.number().int().min(0).max(10000000),
    min_spend_cents: z.number().int().min(0),
    active: z.boolean(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
    limit_per_customer: z.number().int().min(0),
    product_ids: z.array(z.uuid()),
    gift_variant_id: z.uuid().nullable().optional(),
    image: z.string().optional(),
  })
  .refine(
    (r) => r.kind !== "percent" || r.value <= 100,
    "Percentage must be at most 100",
  );
export const campaignSchema = z
  .object({
    id: z.uuid(),
    title: text(150).min(2),
    code: text(40).regex(/^[A-Z0-9_-]+$/),
    kind: z.enum(["fixed", "percent"]),
    value: z.number().int().min(1),
    min_spend_cents: z.number().int().min(0),
    max_uses: z.number().int().min(0),
    uses: z.number().int().min(0),
    starts_at: z.iso.datetime(),
    ends_at: z.iso.datetime(),
    active: z.boolean(),
    product_ids: z.array(z.uuid()),
    subject: text(200),
    message: text(10000),
    sent_at: z.string().nullable().optional(),
  })
  .refine((r) => r.kind !== "percent" || r.value <= 100)
  .refine((r) => new Date(r.ends_at) > new Date(r.starts_at));
export const collectionSchema = z.object({
  id: z.uuid(),
  title: text(150).min(2),
  slug: text(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: text(3000),
  image: z.string().max(1500),
  product_ids: z.array(z.uuid()),
  active: z.boolean(),
  publish_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  seo_title: text(200).optional(),
  seo_description: text(500).optional(),
});
