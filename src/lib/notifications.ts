import "server-only";
import { service, siteUrl, guestToken } from "./server";
export async function deliverNotifications() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    return { sent: 0, configured: false };
  const db = service();
  const { data: jobs, error } = await db.rpc("thehappyplace_claim_notifications");
  if (error) throw error;
  let sent = 0;
  for (const job of jobs || []) {
    try {
      if (job.campaign_id) {
        const { data: subscriber } = await db
          .from("thehappyplace_subscribers")
          .select("active")
          .eq("email", job.recipient)
          .single();
        if (!subscriber?.active) {
          await db
            .from("thehappyplace_notifications")
            .update({ status: "suppressed" })
            .eq("id", job.id);
          continue;
        }
      }
      let body = job.body;
      const id = job.event_key.split(":")[1];
      if (
        ["paid", "shipment", "refund"].includes(job.event_key.split(":")[0]) &&
        /^[a-f0-9-]{36}$/.test(id)
      ) {
        const { data: o } = await db
          .from("thehappyplace_orders")
          .select("id,request_id")
          .eq("id", id)
          .maybeSingle();
        if (o)
          body += `\n\nYour private order link:\n${siteUrl()}/orders/${o.id}?token=${guestToken(o.request_id)}`;
      }
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": job.id,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: job.recipient,
          subject: job.subject,
          text: body,
        }),
      });
      if (!response.ok)
        throw new Error(`Email provider returned ${response.status}`);
      const result = await db
        .from("thehappyplace_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", job.id);
      if (result.error) throw result.error;
      sent++;
    } catch (e) {
      await db
        .from("thehappyplace_notifications")
        .update({
          status: "failed",
          last_error: (e as Error).message.slice(0, 300),
        })
        .eq("id", job.id);
    }
  }
  return { sent, configured: true };
}
