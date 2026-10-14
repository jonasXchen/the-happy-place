import { z } from "zod";
import { sameOrigin, rateLimit, service, hash, apiError } from "@/lib/server";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await rateLimit(request, "newsletter", 5);
    const { email, consent } = z
      .object({ email: z.email().max(254), consent: z.literal(true) })
      .parse(await request.json());
    if (!consent) throw new Error("Consent required");
    const normal = email.toLowerCase();
    const { error } = await service()
      .from("thehappyplace_subscribers")
      .upsert({
        email: normal,
        active: true,
        token_hash: hash(`unsubscribe:${normal}`),
      });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
