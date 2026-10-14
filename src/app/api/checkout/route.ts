import { checkoutSchema } from "@/lib/validation";
import {
  service,
  user,
  hash,
  guestToken,
  sameOrigin,
  apiError,
  rateLimit,
  HttpError,
  configured,
  stripe,
} from "@/lib/server";
import { createSession } from "@/lib/payments";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (!configured())
      throw new HttpError(
        "Checkout is not connected. No payment or order has been created.",
        503,
      );
    stripe();
    if (!process.env.STRIPE_WEBHOOK_SECRET)
      throw new HttpError("Payment confirmation is not configured yet.", 503);
    await rateLimit(request, "checkout");
    const payload = checkoutSchema.parse(await request.json());
    const current = await user();
    if (current) {
      const { error } = await service().rpc("thehappyplace_sync_profile", {
        p_user: current.id,
        p_email: current.email!,
        p_name: payload.address.name,
      });
      if (error) throw error;
    }
    const token = guestToken(payload.request_id);
    const { data: id, error } = await service().rpc("thehappyplace_create_order", {
      p_user: current?.id || null,
      p_guest_hash: hash(token),
      p_fingerprint: hash(JSON.stringify(payload)),
      p_payload: payload,
    });
    if (error) throw new HttpError(error.message);
    if (payload.marketing_opt_in) {
      const email = payload.address.email.toLowerCase();
      await service()
        .from("thehappyplace_subscribers")
        .upsert({
          email,
          name: payload.address.name,
          active: true,
          token_hash: hash(`unsubscribe:${email}`),
        });
    }
    const { data: order } = await service()
      .from("thehappyplace_orders")
      .select("total_cents")
      .eq("id", id)
      .single();
    if (order?.total_cents !== payload.expected_total_cents) {
      await service().rpc("thehappyplace_release_order", {
        p_order: id,
        p_reason: "failed",
      });
      throw new HttpError(
        "Your basket price has changed. Refresh the quote and review your total before paying.",
        409,
      );
    }
    const session = await createSession(id);
    return Response.json({ url: session.url, order_id: id, token });
  } catch (e) {
    return apiError(e);
  }
}
