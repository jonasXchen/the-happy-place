import { Suspense } from "react";
import { Shop } from "@/components/shop";
export const metadata = {
  title: "Find your next favourite piece",
  description:
    "Shop furniture, home décor, and considered everyday things. Browse by room, material, and availability.",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const key = JSON.stringify(await searchParams);
  return (
    <Suspense>
      <Shop key={key} />
    </Suspense>
  );
}
