import { Collections } from "@/components/content";
import { getSiteData } from "@/lib/data";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getSiteData();
  const c = data.collections.find((c) => c.slug === slug);
  return {
    title: c?.seo_title || c?.title || "Collection",
    description: c?.seo_description || c?.description,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: { images: c?.image ? [c.image] : [] },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <Collections slug={(await params).slug} />;
}
