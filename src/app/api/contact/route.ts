import { z } from "zod";
import { sameOrigin, service, apiError, rateLimit } from "@/lib/server";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await rateLimit(request, "enquiry", 5);
    const body = z
      .object({
        name: z.string().min(2).max(120),
        email: z.email().max(254),
        phone: z.string().max(30),
        kind: z.enum([
          "Showroom visit",
          "Customisation",
          "Order help",
          "Other",
        ]),
        message: z.string().min(5).max(4000),
      })
      .parse(await request.json());
    const { data: s } = await service()
      .from("thehappyplace_settings")
      .select("value")
      .eq("id", "site")
      .single();
    const { error } = await service()
      .from("thehappyplace_notifications")
      .insert({
        event_key: `enquiry:${crypto.randomUUID()}`,
        recipient: s?.value?.contact_email,
        subject: `${body.kind} enquiry from ${body.name}`,
        body: `${body.name}\n${body.email}\n${body.phone}\n\n${body.message}`,
      });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
