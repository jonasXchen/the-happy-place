import { z } from "zod";
import {
  sessionClient,
  sameOrigin,
  siteUrl,
  apiError,
  HttpError,
} from "@/lib/server";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = z
      .object({
        email: z.email(),
        next: z.enum(["/account", "/admin"]).default("/account"),
      })
      .parse(await request.json());
    const db = await sessionClient();
    const { error } = await db.auth.signInWithOtp({
      email: body.email,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(body.next)}`,
      },
    });
    if (error) throw new HttpError(error.message);
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    await (await sessionClient()).auth.signOut();
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
