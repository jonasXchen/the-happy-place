import { notFound } from "next/navigation";
import { configured } from "@/lib/server";
import { getSiteData } from "@/lib/data";
import { ProductDetail } from "@/components/product-detail";
import { resolveBranding } from "@/lib/branding";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { products } = await getSiteData();
  const p = products.find((p) => p.slug === slug);
  return {
    title: p?.name || "Product",
    description: p?.description,
    alternates: { canonical: `/shop/${slug}` },
    openGraph: { images: p?.images || [] },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { products, settings } = await getSiteData();
  const p = products.find((p) => p.slug === slug && p.active);
  if (!p) {
    if (configured()) notFound();
    return <ProductDetail key={slug} slug={slug} />;
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.description,
            image: p.images,
            brand: {
              "@type": "Brand",
              name: resolveBranding(settings.branding).name,
            },
            offers: p.variants.map((v) => ({
              "@type": "Offer",
              priceCurrency: "SGD",
              price: v.price_cents / 100,
              sku: v.sku,
              availability:
                v.stock === 0
                  ? "https://schema.org/OutOfStock"
                  : v.lead_weeks
                    ? "https://schema.org/BackOrder"
                    : "https://schema.org/InStock",
            })),
          }).replace(/</g, "\u003c"),
        }}
      />
      <ProductDetail key={slug} slug={slug} />
    </>
  );
}
