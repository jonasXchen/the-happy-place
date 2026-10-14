import type { MetadataRoute } from "next";
import { siteUrl, configured } from "@/lib/server";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: !configured()
        ? ["/"]
        : [
            "/admin",
            "/api",
            "/account",
            "/checkout",
            "/orders",
            "/login",
            "/auth",
            "/unsubscribe",
          ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
