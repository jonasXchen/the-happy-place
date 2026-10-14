import type Stripe from "stripe";
import { cronAuthorized, service, stripe } from "@/lib/server";
import { confirmSession } from "@/lib/payments";
import { deliverNotifications } from "@/lib/notifications";
export async function GET(request: Request) {
  if (!cronAuthorized(request))
    return new Response("Unauthorized", { status: 401 });
  const db = service();
  try {
    await db.rpc("thehappyplace_expire_points", {});
    let reconciled = 0;
    if (process.env.STRIPE_SECRET_KEY) {
      const { data: orders } = await db
        .from("thehappyplace_orders")
        .select("*")
        .eq("payment_status", "pending")
        .eq("reservation_released", false)
        .lt("reserved_until", new Date().toISOString())
        .limit(50);
      for (const order of orders || []) {
        let session: Stripe.Checkout.Session | null = order.stripe_session_id
          ? await stripe().checkout.sessions.retrieve(order.stripe_session_id)
          : null;
        if (!session) {
          for await (const candidate of stripe().checkout.sessions.list({
            created: {
              gte: Math.floor(new Date(order.created_at).getTime() / 1000) - 60,
            },
            limit: 100,
          })) {
            if (candidate.client_reference_id === order.id) {
              session = candidate;
              break;
            }
          }
        }
        if (
          session?.payment_status === "paid" ||
          session?.payment_status === "no_payment_required"
        ) {
          await confirmSession(session, `reconcile:${session.id}`);
          reconciled++;
        } else if (session?.status === "open") {
          await stripe().checkout.sessions.expire(session.id);
          await db.rpc("thehappyplace_release_order", {
            p_order: order.id,
            p_reason: "expired",
          });
        } else if (!session || session.status === "expired") {
          await db.rpc("thehappyplace_release_order", {
            p_order: order.id,
            p_reason: "expired",
          });
        }
        // Completed sessions awaiting an asynchronous payment keep reservations until a final payment event.
      }
    }
    return Response.json({ reconciled, ...(await deliverNotifications()) });
  } catch (e) {
    console.error((e as Error).message);
    return Response.json(
      { error: "Maintenance failed; retry required." },
      { status: 500 },
    );
  }
}
