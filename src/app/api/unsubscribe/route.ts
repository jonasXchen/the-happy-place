import { z } from "zod";
import { sameOrigin, service, hash, apiError, HttpError } from "@/lib/server";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { email, token } = z
      .object({ email: z.email(), token: z.string().length(64) })
      .parse(await request.json());
    if (token !== hash(`unsubscribe:${email.toLowerCase()}`))
      throw new HttpError("This unsubscribe link is invalid.", 404);
    const { error } = await service()
      .from("thehappyplace_subscribers")
      .update({ active: false })
      .eq("email", email.toLowerCase())
      .eq("token_hash", token);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
