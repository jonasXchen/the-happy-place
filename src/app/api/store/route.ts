import { getSiteData } from "@/lib/data";
export async function GET() {
  try {
    return Response.json(await getSiteData(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Store data is temporarily unavailable." },
      { status: 503 },
    );
  }
}
