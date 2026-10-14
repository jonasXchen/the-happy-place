import "server-only";
import type Stripe from "stripe";
import { service, stripe, HttpError, siteUrl, guestToken } from "./server";
export async function confirmSession(
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  if (
    session.payment_status !== "paid" &&
    !(
      session.payment_status === "no_payment_required" &&
      session.amount_total === 0
    )
  )
    return;
  const orderId = session.client_reference_id;
  if (!orderId || session.currency !== "sgd")
    throw new Error("Payment metadata is invalid.");
  const intent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;
  const { error } = await service().rpc("thehappyplace_confirm_payment", {
    p_order: orderId,
    p_session: session.id,
    p_intent: intent,
    p_event: eventId,
    p_total: session.amount_total,
  });
  if (error) throw error;
}
export async function createSession(orderId: string) {
  const db = service();
  const { data: order, error } = await db
    .from("thehappyplace_orders")
    .select("*,thehappyplace_order_items(*)")
    .eq("id", orderId)
    .single();
  if (error || !order) throw new Error("Order missing.");
  const tracking = `${siteUrl()}/orders/${order.id}?token=${guestToken(order.request_id)}`;
  let sessionId = order.stripe_session_id;
  if (!sessionId) {
    for await (const candidate of stripe().checkout.sessions.list({
      created: {
        gte: Math.floor(new Date(order.created_at).getTime() / 1000) - 60,
      },
      limit: 100,
    })) {
      if (candidate.client_reference_id === order.id) {
        sessionId = candidate.id;
        const { error } = await db
          .from("thehappyplace_orders")
          .update({ stripe_session_id: sessionId })
          .eq("id", order.id);
        if (error) throw error;
        break;
      }
    }
  }
  if (sessionId) {
    const existing = await stripe().checkout.sessions.retrieve(sessionId);
    if (existing.status === "open" && existing.url) return existing;
    if (
      existing.payment_status === "paid" ||
      existing.payment_status === "no_payment_required"
    )
      return existing;
    throw new HttpError(
      "This checkout has expired. Please start a new checkout.",
    );
  }
  if (new Date(order.reserved_until).getTime() - Date.now() < 31 * 60000) {
    const { error } = await db.rpc("thehappyplace_release_order", {
      p_order: order.id,
      p_reason: "expired",
    });
    if (error) throw error;
    throw new HttpError(
      "This checkout has timed out. Review your bag and start a new checkout.",
      409,
    );
  }
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: order.id,
      customer_email: order.customer_email,
      success_url: `${tracking}&checkout=complete`,
      cancel_url: `${siteUrl()}/checkout?cancelled=1&order=${order.id}&token=${guestToken(order.request_id)}`,
      expires_at: Math.floor(new Date(order.reserved_until).getTime() / 1000),
      line_items: [
        {
          price_data: {
            currency: "sgd",
            unit_amount: order.total_cents,
            product_data: {
              name: `The Happy Place · ${order.number}`,
              description: order.thehappyplace_order_items
                .map(
                  (i: { product_name: string; quantity: number }) =>
                    `${i.quantity} × ${i.product_name}`,
                )
                .join(", ")
                .slice(0, 500),
            },
          },
          quantity: 1,
        },
      ],
      metadata: { order_id: order.id },
      payment_intent_data: { metadata: { order_id: order.id } },
    },
    { idempotencyKey: `checkout:${order.id}` },
  );
  const saved = await db
    .from("thehappyplace_orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);
  if (saved.error)
    throw new Error(
      "Payment session requires reconciliation. Please retry this checkout.",
    );
  return session;
}
export async function refundOrder(
  orderId: string,
  amount: number,
  requestId: string,
) {
  const { data: o, error } = await service()
    .from("thehappyplace_orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error || !o || !o.stripe_payment_intent_id)
    throw new HttpError("This order has no confirmed Stripe payment.");
  if (
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > o.total_cents - o.refunded_cents
  )
    throw new HttpError("Refund amount exceeds the remaining payment.");
  return stripe().refunds.create(
    {
      payment_intent: o.stripe_payment_intent_id,
      amount,
      metadata: { order_id: orderId },
    },
    { idempotencyKey: `refund:${orderId}:${requestId}` },
  );
}
