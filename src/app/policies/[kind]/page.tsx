import { notFound } from "next/navigation";
import { Policy } from "@/components/content";
export default async function Page({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!["shipping", "returns", "privacy", "faq"].includes(kind)) notFound();
  return <Policy kind={kind} />;
}
