import { Suspense } from "react";
import { Checkout } from "@/components/checkout";
export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}
