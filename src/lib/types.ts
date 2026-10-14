import type { Branding } from "./branding";
export type Variant = {
  id: string;
  product_id: string;
  label: string;
  sku: string;
  colour: string;
  material: string;
  size: string;
  price_cents: number;
  stock: number | null;
  lead_weeks: number;
  image?: string;
};
export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  room: string;
  style: string;
  material: string;
  description: string;
  dimensions: string;
  care: string;
  images: string[];
  price_cents: number;
  active: boolean;
  featured: boolean;
  shipping_class: "small" | "medium" | "large";
  installation: boolean;
  variants: Variant[];
  source_url?: string;
  sample?: boolean;
};
export type Reward = {
  id: string;
  title: string;
  description: string;
  points: number;
  kind: "fixed" | "percent" | "shipping" | "gift";
  value: number;
  min_spend_cents: number;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  limit_per_customer: number;
  product_ids: string[];
  gift_variant_id?: string | null;
  image?: string;
};
export type Settings = {
  branding?: Branding;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  announcement: string;
  announcement_starts_at: string | null;
  announcement_ends_at: string | null;
  points_per_dollar: number;
  expiry_days: number;
  signup_points: number;
  award_on: "paid" | "delivered";
  shipping_small: number;
  shipping_medium: number;
  shipping_large: number;
  installation_cents: number;
  remote_surcharge: number;
  remote_prefixes: string[];
  remote_keywords: string[];
  express_enabled: boolean;
  express_extra_cents: number;
  free_shipping_min: number;
  free_shipping_classes: string[];
  policies_approved: boolean;
  showroom_address: string;
  showroom_hours: string;
  contact_email: string;
  about: string;
  shipping_policy: string;
  returns_policy: string;
  privacy_policy: string;
  faq: string;
  earn_on_tax: boolean;
  gst_basis_points: number;
  notification_email: string;
};
export type Collection = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  product_ids: string[];
  active: boolean;
  publish_at?: string | null;
  ends_at?: string | null;
  seo_title?: string;
  seo_description?: string;
};
export type Campaign = {
  id: string;
  title: string;
  code: string;
  kind: "fixed" | "percent";
  value: number;
  min_spend_cents: number;
  max_uses: number;
  uses: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
  product_ids: string[];
  subject: string;
  message: string;
  sent_at?: string | null;
};
export type Address = {
  name: string;
  email: string;
  phone: string;
  block: string;
  street: string;
  building: string;
  unit: string;
  postal: string;
  country: string;
  instructions: string;
  access: string;
};
export type CartLine = { variant_id: string; quantity: number };
export type OrderItem = {
  id: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  image: string;
  quantity: number;
  unit_price_cents: number;
  lead_weeks: number;
  refunded_quantity?: number;
};
export type Shipment = {
  id: string;
  status: string;
  items: { item_id: string; quantity: number }[];
  scheduled_at: string | null;
  window: string;
  tracking_url: string;
  customer_note: string;
};
export type OrderEvent = {
  id: string;
  status: string;
  message: string;
  created_at: string;
};
export type Order = {
  id: string;
  number: string;
  created_at: string;
  user_id?: string | null;
  customer_email: string;
  address: Address;
  billing_address?: Address | null;
  payment_status: string;
  status: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  installation_cents: number;
  tax_cents: number;
  total_cents: number;
  redeemed_points: number;
  awarded_points: number;
  refunded_cents: number;
  split_delivery: boolean;
  delivery_method?: "standard" | "express";
  preferred_date: string;
  preferred_window: string;
  utm: Record<string, string>;
  items: OrderItem[];
  shipments: Shipment[];
  events: OrderEvent[];
  notes?: string;
};
export type PointsEntry = {
  id: string;
  delta: number;
  kind: string;
  note: string;
  created_at: string;
  expires_at: string | null;
};
export type Customer = {
  id: string;
  email: string;
  name: string;
  points: number;
  order_count: number;
  spent_cents: number;
  marketing_opt_in: boolean;
};
export type Notification = {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
};
export type Staff = { user_id: string; email: string; roles: string[] };
export type SiteData = {
  products: Product[];
  rewards: Reward[];
  settings: Settings;
  collections: Collection[];
  campaigns: Campaign[];
};
export type AdminData = {
  orders: Order[];
  customers: Customer[];
  notifications: Notification[];
  staff: Staff[];
  audit: { id: string; action: string; created_at: string; detail: unknown }[];
};
export const statuses = [
  "confirmed",
  "awaiting_stock",
  "preparing",
  "ready_to_schedule",
  "scheduled",
  "out_for_delivery",
  "delivered",
  "delivery_issue",
  "cancelled",
];
export function money(cents: number) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
export function date(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}
export function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
