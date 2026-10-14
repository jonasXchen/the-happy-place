import type { MetadataRoute } from "next";
import { getSiteData } from "@/lib/data";
import { siteUrl } from "@/lib/server";
import { isPublished } from "@/lib/commerce";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSiteData();
  const base = siteUrl();
  return [
    "",
    "/shop",
    "/collections",
    "/about",
    "/contact",
    "/rewards",
    "/policies/shipping",
    "/policies/returns",
    "/policies/privacy",
    "/policies/faq",
    ...data.products.filter((p) => p.active).map((p) => `/shop/${p.slug}`),
    ...data.collections
      .filter((c) => isPublished(c))
      .map((c) => `/collections/${c.slug}`),
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.6,
  }));
}
