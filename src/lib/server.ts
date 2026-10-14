import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { createHmac, timingSafeEqual } from "node:crypto";
export const configured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const localDemo = () =>
  !configured() &&
  process.env.NODE_ENV !== "production" &&
  process.env.ALLOW_LOCAL_DEMO !== "false";
export async function sessionClient() {
  if (!configured()) throw new Error("Database connection is not configured.");
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll(items) {
          try {
            items.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            );
          } catch {
            /* Server rendering cannot set cookies. Proxy refreshes them. */
          }
        },
      },
    },
  );
}
export function service() {
  if (!configured() || !process.env.SUPABASE_SECRET_KEY)
    throw new Error("Database service credentials are not configured.");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function user() {
  if (!configured()) return null;
  const db = await sessionClient();
  const { data, error } = await db.auth.getUser();
  if (error) return null;
  return data.user;
}
export async function requireStaff(scope?: string) {
  const current = await user();
  if (!current) throw new HttpError("Sign in to your staff account.", 401);
  const { data, error } = await (
    await sessionClient()
  )
    .from("thehappyplace_staff")
    .select("*")
    .eq("user_id", current.id)
    .single();
  if (
    error ||
    !data ||
    !data.roles.length ||
    (!data.roles.includes("owner") && scope && !data.roles.includes(scope))
  )
    throw new HttpError(
      "Your account does not have permission for this action.",
      403,
    );
  return { ...data, user: current };
}
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new HttpError("Online payments are not connected yet.", 503);
  if (
    /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY) &&
    process.env.STRIPE_LIVE_ENABLED !== "true"
  )
    throw new HttpError(
      "Live payments have not been enabled by the owner.",
      503,
    );
  return new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 });
}
export function hash(value: string) {
  if (!process.env.APP_SECRET || process.env.APP_SECRET.length < 32)
    throw new HttpError("Private account links are not configured yet.", 503);
  return createHmac("sha256", process.env.APP_SECRET)
    .update(value)
    .digest("hex");
}
export function guestToken(requestId: string) {
  return hash(`guest:${requestId}`);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(siteUrl()).origin)
    throw new HttpError("Request origin is not allowed.", 403);
}
export function cronAuthorized(request: Request) {
  const actual = request.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  return (
    Boolean(process.env.CRON_SECRET) &&
    Buffer.byteLength(actual) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  );
}
export async function rateLimit(request: Request, kind: string, limit = 10) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const { error } = await service().rpc("thehappyplace_rate_limit", {
    p_key: hash(`${kind}:${ip}`),
    p_limit: limit,
  });
  if (error)
    throw new HttpError("Please wait a few minutes before trying again.", 429);
}
export function apiError(error: unknown) {
  console.error(error instanceof Error ? error.message : "Request failed");
  return Response.json(
    {
      error:
        error instanceof HttpError
          ? error.message
          : error instanceof Error && error.name === "ZodError"
            ? "Please check the information you entered."
            : "We could not complete this request. Please try again.",
    },
    { status: error instanceof HttpError ? error.status : 400 },
  );
}
