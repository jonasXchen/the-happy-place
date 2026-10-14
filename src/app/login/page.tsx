import { Suspense } from "react";
import { Login } from "@/components/account";
export const metadata = {
  title: "Make yourself at home",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
