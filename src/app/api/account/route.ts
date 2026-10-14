import { z } from "zod";
import { user, service, sameOrigin, HttpError, apiError } from "@/lib/server";
import { customerOrder } from "@/lib/data";
import { addressSchema } from "@/lib/validation";
export async function GET() {
  try {
    const current = await user();
    if (!current) throw new HttpError("Sign in to see your account.", 401);
    const db = service();
    await db.rpc("thehappyplace_sync_profile", {
      p_user: current.id,
      p_email: current.email!,
      p_name: "",
    });
    await db.rpc("thehappyplace_expire_points", { p_user: current.id });
    const [orders, entries, addresses, balance] = await Promise.all([
      db
        .from("thehappyplace_orders")
        .select("*,thehappyplace_order_items(*),thehappyplace_shipments(*),thehappyplace_order_events(*)")
        .eq("user_id", current.id)
        .order("created_at", { ascending: false }),
      db
        .from("thehappyplace_points_entries")
        .select("*")
        .eq("user_id", current.id)
        .order("created_at", { ascending: false }),
      db.from("thehappyplace_addresses").select("*").eq("user_id", current.id),
      db.rpc("thehappyplace_balance", { p_user: current.id }),
    ]);
    for (const result of [orders, entries, addresses, balance])
      if (result.error) throw result.error;
    return Response.json({
      email: current.email,
      orders: (orders.data || []).map(customerOrder),
      entries: entries.data,
      addresses: addresses.data,
      points: balance.data,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const current = await user();
    if (!current) throw new HttpError("Sign in to save an address.", 401);
    const body = z
      .object({
        label: z.string().max(80),
        address: addressSchema,
        id: z.uuid().optional(),
      })
      .parse(await request.json());
    if (body.id) {
      const { data: own } = await service()
        .from("thehappyplace_addresses")
        .select("id")
        .eq("id", body.id)
        .eq("user_id", current.id)
        .maybeSingle();
      if (!own) throw new HttpError("Address not found.", 404);
    }
    const { error } = await service()
      .from("thehappyplace_addresses")
      .upsert({
        id: body.id || crypto.randomUUID(),
        user_id: current.id,
        label: body.label,
        address: body.address,
      });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
