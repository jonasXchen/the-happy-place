import { Suspense } from "react";
import { OrderView } from "@/components/account";
export const metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <OrderView id={(await params).id} />
    </Suspense>
  );
}
