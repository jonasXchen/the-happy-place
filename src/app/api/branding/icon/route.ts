import { getPublicBranding } from "@/lib/data";
import { brandIconSvg, resolveBranding } from "@/lib/branding";

export async function GET() {
  const brand = await getPublicBranding().catch(() => resolveBranding());
  return new Response(brandIconSvg(brand), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
