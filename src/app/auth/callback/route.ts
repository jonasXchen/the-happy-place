import { NextResponse } from "next/server";
import { sessionClient, service, siteUrl } from "@/lib/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next =
    url.searchParams.get("next") === "/admin" ? "/admin" : "/account";
  if (code) {
    const db = await sessionClient();
    const { data, error } = await db.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await service().rpc("thehappyplace_sync_profile", {
        p_user: data.user.id,
        p_email: data.user.email!,
        p_name: "",
      });
      return NextResponse.redirect(new URL(next, siteUrl()));
    }
  }
  return NextResponse.redirect(new URL("/login?error=expired", siteUrl()));
}
