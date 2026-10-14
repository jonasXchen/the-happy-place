"use client";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
export function RefreshStore({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  const router = useRouter();
  return (
    <button
      className={`button ${dark ? "dark" : "outline"}`}
      onClick={() => router.refresh()}
    >
      {children}
      <ArrowUpRight size={16} />
    </button>
  );
}
