import { redirect } from "next/navigation";
import {
  requireStaff,
  localDemo,
  configured,
  user,
  service,
} from "@/lib/server";
import { OwnerBootstrap } from "@/components/setup";
import { getAdminData, getSiteData } from "@/lib/data";
import { Admin } from "@/components/admin";
import { StoreProvider } from "@/components/store";
export const metadata = {
  title: "Store management",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const section = (await params).section?.[0] || "overview";
  if (!configured() && !localDemo())
    return (
      <div className="empty-state">
        <h3>Connect your store first.</h3>
        <p>
          Staff access requires the Supabase configuration described in the
          README.
        </p>
      </div>
    );
  let roles = ["owner"];
  if (!localDemo()) {
    try {
      const staff = await requireStaff();
      roles = staff.roles;
    } catch {
      const current = await user();
      if (current) {
        const { count, error } = await service()
          .from("thehappyplace_staff")
          .select("user_id", { count: "exact", head: true })
          .contains("roles", ["owner"]);
        if (!error && count === 0)
          return <OwnerBootstrap id={current.id} email={current.email!} />;
      }
      redirect("/login?next=/admin");
    }
  }
  const data = await getAdminData();
  const owner = roles.includes("owner");
  const safe = {
    orders: owner || roles.includes("fulfilment") ? data.orders : [],
    customers: owner ? data.customers : [],
    notifications: owner ? data.notifications : [],
    staff: owner ? data.staff : [],
    audit: owner ? data.audit : [],
  };
  const site = await getSiteData(true, owner);
  return (
    <StoreProvider
      initial={site}
      initialAdmin={safe}
      demo={localDemo()}
      adminMode
    >
      <Admin section={section} roles={roles} />
    </StoreProvider>
  );
}
