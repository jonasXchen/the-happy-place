import { z } from "zod";
import {
  sameOrigin,
  user,
  service,
  hash,
  stripe,
  apiError,
  HttpError,
} from "@/lib/server";
import { confirmSession } from "@/lib/payments";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = z
      .object({ id: z.uuid(), token: z.string().length(64) })
      .parse(await request.json());
    const current = await user();
    const { data: order } = await service()
      .from("thehappyplace_orders")
      .select("*")
      .eq("id", body.id)
      .maybeSingle();
    if (
      !order ||
      !(
        (current && order.user_id === current.id) ||
        (order.guest_token_hash === hash(body.token) &&
          new Date(order.guest_expires_at) > new Date())
      )
    )
      throw new HttpError("Order not found.", 404);
    if (order.stripe_session_id) {
      const session = await stripe().checkout.sessions.retrieve(
        order.stripe_session_id,
      );
      if (
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required"
      ) {
        await confirmSession(session, `cancel-check:${session.id}`);
        return Response.json({ state: "paid" });
      }
      if (session.status === "complete")
        throw new HttpError(
          "A payment is still processing. Its reservation will remain until payment is confirmed.",
          409,
        );
      if (session.status === "open")
        await stripe().checkout.sessions.expire(session.id);
    }
    const { error } = await service().rpc("thehappyplace_release_order", {
      p_order: order.id,
      p_reason: "expired",
    });
    if (error) throw error;
    return Response.json({ state: "released" });
  } catch (e) {
    return apiError(e);
  }
}
