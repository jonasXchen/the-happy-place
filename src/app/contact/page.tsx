import { Contact } from "@/components/content";
export const metadata = { title: "Contact & showroom" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  return <Contact product={(await searchParams).product} />;
}
