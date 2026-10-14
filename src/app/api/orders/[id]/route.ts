import { z } from "zod";
import { user, service, hash, HttpError, apiError } from "@/lib/server";
import { customerOrder } from "@/lib/data";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = z.uuid().parse((await params).id);
    const current = await user();
    const token = new URL(request.url).searchParams.get("token");
    const { data: o, error } = await service()
      .from("thehappyplace_orders")
      .select("*,thehappyplace_order_items(*),thehappyplace_shipments(*),thehappyplace_order_events(*)")
      .eq("id", id)
      .maybeSingle();
    const own = current && o?.user_id === current.id;
    const guest =
      token &&
      token.length === 64 &&
      o?.guest_token_hash === hash(token) &&
      new Date(o.guest_expires_at) > new Date();
    if (error || !o || (!own && !guest))
      throw new HttpError(
        "This private order link is invalid or has expired.",
        404,
      );
    return Response.json(customerOrder(o));
  } catch (e) {
    return apiError(e);
  }
}
