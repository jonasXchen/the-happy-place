import { z } from "zod";
import {
  sameOrigin,
  requireStaff,
  service,
  apiError,
  HttpError,
  hash,
  siteUrl,
} from "@/lib/server";
import { getAdminData, getSiteData } from "@/lib/data";
import {
  productSchema,
  rewardSchema,
  campaignSchema,
  collectionSchema,
} from "@/lib/validation";
import { settingsSchema, mergeContentSettings } from "@/lib/admin-validation";
import { refundOrder } from "@/lib/payments";
import { statuses } from "@/lib/types";
export async function GET() {
  try {
    const staff = await requireStaff();
    const data = await getAdminData();
    const owner = staff.roles.includes("owner");
    return Response.json({
      site: await getSiteData(true, owner),
      admin: {
        orders: owner || staff.roles.includes("fulfilment") ? data.orders : [],
        customers: owner ? data.customers : [],
        notifications: owner ? data.notifications : [],
        staff: owner ? data.staff : [],
        audit: owner ? data.audit : [],
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const envelope = z
      .object({ action: z.string(), data: z.unknown() })
      .parse(await request.json());
    const scopes: Record<string, string> = {
      product: "catalogue",
      reward: "owner",
      campaign: "marketing",
      collection: "marketing",
      settings: "owner",
      content: "marketing",
      shipment: "fulfilment",
      add_shipment: "fulfilment",
      notes: "fulfilment",
      refund: "owner",
      points: "owner",
      staff: "owner",
      restock: "fulfilment",
      send_campaign: "marketing",
      test_campaign: "marketing",
      retry_notifications: "owner",
    };
    const scope = scopes[envelope.action];
    if (!scope) throw new HttpError("Unknown action.");
    const staff = await requireStaff(scope);
    const db = service();
    let result: unknown = { ok: true };
    if (envelope.action === "product") {
      const product = productSchema.parse(envelope.data);
      const { error } = await db.rpc("thehappyplace_save_product", {
        p_product: product,
      });
      if (error) throw new HttpError(error.message);
    }
    if (envelope.action === "reward") {
      const reward = rewardSchema.parse(envelope.data);
      const { error } = await db.from("thehappyplace_rewards").upsert(reward);
      if (error) throw new HttpError(error.message);
    }
    if (envelope.action === "collection") {
      const collection = collectionSchema.parse(envelope.data);
      const { error } = await db
        .from("thehappyplace_collections")
        .upsert(collection);
      if (error) throw new HttpError(error.message);
    }
    if (envelope.action === "campaign") {
      const campaign = campaignSchema.parse(envelope.data);
      const { uses: ignoredUses, sent_at: ignoredSent, ...editable } = campaign;
      void ignoredUses;
      void ignoredSent;
      const { error } = await db
        .from("thehappyplace_campaigns")
        .upsert(editable);
      if (error) throw new HttpError(error.message);
    }
    if (envelope.action === "settings" || envelope.action === "content") {
      const settings = settingsSchema.parse(envelope.data);
      const { notification_email: notification, ...publicSettings } = settings;
      let value: object = publicSettings;
      if (envelope.action === "content") {
        const { data: old, error: readError } = await db
          .from("thehappyplace_settings")
          .select("value")
          .eq("id", "site")
          .single();
        if (readError) throw readError;
        value = mergeContentSettings(old.value, settings);
      }
      const { error } = await db
        .from("thehappyplace_settings")
        .upsert({ id: "site", value });
      if (error) throw error;
      if (envelope.action === "settings")
        await db
          .from("thehappyplace_private_settings")
          .upsert({ id: "notifications", value: { email: notification } });
    }
    if (envelope.action === "shipment" || envelope.action === "add_shipment") {
      const body = z
        .object({
          id: z.uuid(),
          order_id: z.uuid().optional(),
          status: z.enum(statuses as [string, ...string[]]),
          items: z
            .array(
              z.object({
                item_id: z.uuid(),
                quantity: z.number().int().min(1).max(100),
              }),
            )
            .min(1),
          scheduled_at: z.string().nullable(),
          window: z.string().max(150),
          tracking_url: z.union([
            z.literal(""),
            z.url().refine((u) => u.startsWith("https://")),
          ]),
          customer_note: z.string().max(1500),
        })
        .parse(envelope.data);
      const { id, order_id, ...data } = body;
      if (envelope.action === "add_shipment" && !order_id)
        throw new HttpError("Choose an order for this delivery.");
      const { error } = await db.rpc(
        envelope.action === "shipment"
          ? "thehappyplace_update_shipment"
          : "thehappyplace_add_shipment",
        envelope.action === "shipment"
          ? { p_shipment: id, p_data: data }
          : { p_order: order_id, p_data: data },
      );
      if (error) throw new HttpError(error.message);
    }
    if (envelope.action === "notes") {
      const body = z
        .object({ id: z.uuid(), notes: z.string().max(5000) })
        .parse(envelope.data);
      const { error } = await db
        .from("thehappyplace_orders")
        .update({ notes: body.notes })
        .eq("id", body.id);
      if (error) throw error;
    }
    if (envelope.action === "refund") {
      const body = z
        .object({
          id: z.uuid(),
          amount: z.number().int().min(1),
          request_id: z.uuid(),
          reason: z.string().min(3).max(500),
        })
        .parse(envelope.data);
      const refund = await refundOrder(body.id, body.amount, body.request_id);
      result = {
        ok: true,
        message: `Refund ${refund.status}. The order updates when Stripe confirms it.`,
      };
    }
    if (envelope.action === "restock") {
      const body = z
        .object({
          item_id: z.uuid(),
          quantity: z.number().int().min(1).max(100),
          reason: z.string().min(3).max(500),
        })
        .parse(envelope.data);
      const { error } = await db.rpc("thehappyplace_restock_return", {
        p_item: body.item_id,
        p_qty: body.quantity,
      });
      if (error) throw new HttpError(error.message);
    }
    if (envelope.action === "points") {
      const body = z
        .object({
          user_id: z.uuid(),
          delta: z.number().int().min(-1000000).max(1000000),
          reason: z.string().min(3).max(1000),
        })
        .parse(envelope.data);
      const { error } = await db.rpc("thehappyplace_adjust_points", {
        p_user: body.user_id,
        p_delta: body.delta,
        p_reason: body.reason,
        p_actor: staff.user.id,
      });
      if (error) throw new HttpError(error.message);
    }
    if (envelope.action === "staff") {
      const body = z
        .object({
          email: z.email(),
          roles: z
            .array(z.enum(["owner", "catalogue", "fulfilment", "marketing"]))
            .min(0),
        })
        .parse(envelope.data);
      const { data: profile } = await db
        .from("thehappyplace_profiles")
        .select("id,email")
        .eq("email", body.email.toLowerCase())
        .maybeSingle();
      if (!profile)
        throw new HttpError(
          "Ask this person to sign in once before assigning staff access.",
        );
      const { error } = await db.rpc("thehappyplace_set_staff", {
        p_user: profile.id,
        p_email: profile.email,
        p_roles: body.roles,
      });
      if (error) throw new HttpError(error.message);
    }
    if (
      envelope.action === "send_campaign" ||
      envelope.action === "test_campaign"
    ) {
      const body = z.object({ id: z.uuid() }).parse(envelope.data);
      const { data: c, error } = await db
        .from("thehappyplace_campaigns")
        .select("*")
        .eq("id", body.id)
        .single();
      if (error || !c || !c.subject || !c.message)
        throw new HttpError("Save a campaign subject and message first.");
      if (envelope.action === "test_campaign") {
        const { error } = await db.from("thehappyplace_notifications").insert({
          event_key: `test:${crypto.randomUUID()}`,
          recipient: staff.user.email!,
          subject: `[Test] ${c.subject}`,
          body: c.message,
        });
        if (error) throw error;
        result = {
          ok: true,
          message: "Test email queued for your staff address.",
        };
      } else {
        const { data: subs } = await db
          .from("thehappyplace_subscribers")
          .select("email")
          .eq("active", true);
        if (!subs?.length)
          throw new HttpError("There are no opted-in subscribers.");
        const rows = subs.map((sub) => ({
          event_key: `campaign:${c.id}:${hash(sub.email)}`,
          recipient: sub.email,
          subject: c.subject,
          body: `${c.message}\n\nThe Happy Place\nUnsubscribe: ${siteUrl()}/unsubscribe?email=${encodeURIComponent(sub.email)}&token=${hash(`unsubscribe:${sub.email}`)}`,
          campaign_id: c.id,
        }));
        for (let i = 0; i < rows.length; i += 100) {
          const { error } = await db
            .from("thehappyplace_notifications")
            .upsert(rows.slice(i, i + 100), {
              onConflict: "event_key",
              ignoreDuplicates: true,
            });
          if (error) throw error;
        }
        await db
          .from("thehappyplace_campaigns")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", c.id);
        result = {
          ok: true,
          message: `Campaign queued for ${rows.length} opted-in subscribers. Existing recipients are not sent this campaign twice.`,
        };
      }
    }
    if (envelope.action === "retry_notifications") {
      const { error } = await db
        .from("thehappyplace_notifications")
        .update({ status: "pending", attempts: 0 })
        .eq("status", "failed");
      if (error) throw error;
    }
    const audit = await db.from("thehappyplace_audit").insert({
      actor_id: staff.user.id,
      action: envelope.action,
      detail:
        envelope.action === "staff"
          ? envelope.data
          : envelope.action === "refund"
            ? envelope.data
            : { id: (envelope.data as { id?: string })?.id || null },
    });
    if (audit.error) throw audit.error;
    return Response.json(result);
  } catch (e) {
    return apiError(e);
  }
}
