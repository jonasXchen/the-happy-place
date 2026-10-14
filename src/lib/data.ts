import "server-only";
import { cache } from "react";
import { resolveBranding } from "./branding";
import { configured, sessionClient, service, localDemo } from "./server";
import { seed, demoAdmin } from "./seed";
import type { SiteData, Product, Order, AdminData } from "./types";
export class StoreSetupRequired extends Error {}
export function normalizeProduct(row: Record<string, unknown>): Product {
  const variants = (row.thehappyplace_variants ??
    row.variants ??
    []) as (Product["variants"][number] & { active?: boolean })[];
  return {
    ...row,
    variants: variants.filter((v) => v.active !== false),
  } as Product;
}
export function normalizeOrder(row: Record<string, unknown>): Order {
  return {
    ...row,
    items: row.thehappyplace_order_items ?? row.items ?? [],
    shipments: row.thehappyplace_shipments ?? row.shipments ?? [],
    events: row.thehappyplace_order_events ?? row.events ?? [],
  } as Order;
}
export function customerOrder(row: Record<string, unknown>): Order {
  const safe = { ...row };
  for (const key of [
    "guest_token_hash",
    "notes",
    "fingerprint",
    "stripe_payment_intent_id",
    "stripe_session_id",
  ])
    delete safe[key];
  return normalizeOrder(safe);
}
export const getSiteData = cache(async function getSiteData(
  all = false,
  includePrivate = false,
): Promise<SiteData> {
  if (!configured()) return seed;
  const db = all ? service() : await sessionClient();
  const results = await Promise.all([
    db
      .from("thehappyplace_products")
      .select("*,thehappyplace_variants(*)")
      .order("created_at"),
    db.from("thehappyplace_rewards").select("*").order("points"),
    db.from("thehappyplace_settings").select("value").eq("id", "site").single(),
    db.from("thehappyplace_collections").select("*"),
    all
      ? db.from("thehappyplace_campaigns").select("*")
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of results)
    if (
      r.error &&
      ["PGRST205", "PGRST202", "42P01", "PGRST116"].includes(r.error.code)
    )
      throw new StoreSetupRequired(
        "The store schema or initial settings have not been installed.",
      );
    else if (r.error)
      throw new Error(`Could not load store data: ${r.error.message}`);
  let notificationEmail = "";
  if (includePrivate) {
    const { data, error } = await db
      .from("thehappyplace_private_settings")
      .select("value")
      .eq("id", "notifications")
      .maybeSingle();
    if (error) throw error;
    notificationEmail = data?.value?.email || "";
  }
  return {
    products: (results[0].data || []).map(normalizeProduct),
    rewards: results[1].data || [],
    settings: {
      ...seed.settings,
      ...(results[2].data as { value: object })?.value,
      notification_email: notificationEmail,
    },
    collections: results[3].data || [],
    campaigns: results[4].data || [],
  };
});

export const getPublicBranding = cache(async function getPublicBranding() {
  if (!configured()) return resolveBranding(seed.settings.branding);
  const db = await sessionClient();
  const { data, error } = await db
    .from("thehappyplace_settings")
    .select("value")
    .eq("id", "site")
    .maybeSingle();
  if (error) throw error;
  return resolveBranding(data?.value?.branding);
});

export async function getAdminData(): Promise<AdminData> {
  if (localDemo()) return demoAdmin;
  const db = service();
  const results = await Promise.all([
    db
      .from("thehappyplace_orders")
      .select(
        "*,thehappyplace_order_items(*),thehappyplace_shipments(*),thehappyplace_order_events(*)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    db.rpc("thehappyplace_customers"),
    db
      .from("thehappyplace_notifications")
      .select("id,recipient,subject,status,attempts,last_error,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("thehappyplace_staff").select("*"),
    db
      .from("thehappyplace_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  for (const r of results) if (r.error) throw new Error(r.error.message);
  return {
    orders: (results[0].data || []).map(normalizeOrder),
    customers: results[1].data || [],
    notifications: results[2].data || [],
    staff: results[3].data || [],
    audit: results[4].data || [],
  };
}
