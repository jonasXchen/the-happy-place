import { configured, hash } from "@/lib/server";
import { Unsubscribe } from "@/components/unsubscribe";
export const metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;
  const valid = Boolean(
    configured() &&
    email &&
    token &&
    token === hash(`unsubscribe:${email.toLowerCase()}`),
  );
  if (valid) return <Unsubscribe email={email!} token={token!} />;
  return (
    <div className="empty-state">
      <h3>{"This link needs a second look."}</h3>
      <p>
        {valid
          ? "You will no longer receive promotional emails. Order and delivery updates will still reach you."
          : "Use the unsubscribe link in one of our promotional emails."}
      </p>
    </div>
  );
}
