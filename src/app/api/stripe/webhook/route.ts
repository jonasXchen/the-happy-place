import { stripe, service } from "@/lib/server";
import { confirmSession } from "@/lib/payments";
import type Stripe from "stripe";
export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    return new Response("Webhook not configured", { status: 503 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature") || "",
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }
  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await confirmSession(event.data.object, event.id);
    } else if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const incoming = event.data.object;
      const session = await stripe().checkout.sessions.retrieve(incoming.id);
      if (
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required"
      )
        await confirmSession(session, `${event.id}:paid`);
      else if (
        session.status === "expired" ||
        event.type === "checkout.session.async_payment_failed"
      ) {
        const { error } = await service().rpc("thehappyplace_release_order", {
          p_order: session.client_reference_id,
          p_reason: session.status === "expired" ? "expired" : "failed",
        });
        if (error) throw error;
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const pi =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (pi) {
        const { data: o } = await service()
          .from("thehappyplace_orders")
          .select("id")
          .eq("stripe_payment_intent_id", pi)
          .maybeSingle();
        if (!o)
          throw new Error(
            "Payment confirmation must be reconciled before refund.",
          );
        const authoritative = await stripe().charges.retrieve(charge.id);
        const { error } = await service().rpc("thehappyplace_apply_refund", {
          p_order: o.id,
          p_amount: authoritative.amount_refunded,
          p_event: event.id,
        });
        if (error) throw error;
      }
    }
    return Response.json({ received: true });
  } catch (e) {
    console.error("Stripe event failed", event.id, (e as Error).message);
    return new Response("Retry required", { status: 500 });
  }
}
