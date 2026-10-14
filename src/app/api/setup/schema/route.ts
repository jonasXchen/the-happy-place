import { readFile } from "node:fs/promises";
import { configured, sessionClient } from "@/lib/server";
export async function GET() {
  if (configured()) {
    const { error } = await (
      await sessionClient()
    )
      .from("thehappyplace_settings")
      .select("id")
      .eq("id", "site")
      .maybeSingle();
    if (!error)
      return new Response(
        "The schema already exists. Use the individual migrations and seed instructions in README.",
        { status: 409 },
      );
  }
  return new Response(
    await readFile(`${process.cwd()}/supabase/setup.sql`, "utf8"),
    {
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": "attachment; filename=happy-place-setup.sql",
        "Cache-Control": "no-store",
      },
    },
  );
}
