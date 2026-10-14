import type { Metadata } from "next";
import { getSiteData, getPublicBranding, StoreSetupRequired } from "@/lib/data";
import { brandingStyles, resolveBranding } from "@/lib/branding";
import { StoreSetup } from "@/components/setup";
import { localDemo } from "@/lib/server";
import { StoreProvider } from "@/components/store";
import { Shell } from "@/components/shell";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const brand = await getPublicBranding().catch(() => resolveBranding());
  return {
    robots: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? undefined
      : { index: false, follow: false },
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    title: {
      default: `${brand.name}${brand.tagline ? ` | ${brand.tagline}` : ""}`,
      template: `%s | ${brand.name}`,
    },
    description: `Considered furniture and beautiful everyday things for a home that feels like you. Explore ${brand.name}, Singapore.`,
    icons: {
      icon: `/api/branding/icon?v=${encodeURIComponent(`${brand.name}-${brand.colours.accent}-${brand.colours.accent_soft}-${brand.heading_font}`)}`,
    },
    openGraph: {
      title: "A home that feels like you.",
      description: "Considered furniture. Beautiful everyday things.",
      images: ["/images/hero.jpg"],
    },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let data;
  try {
    data = await getSiteData();
  } catch (error) {
    if (error instanceof StoreSetupRequired)
      return (
        <html lang="en" style={brandingStyles(resolveBranding())}>
          <body>
            <StoreSetup />
          </body>
        </html>
      );
    throw error;
  }
  return (
    <html
      lang="en"
      style={brandingStyles(resolveBranding(data.settings.branding))}
    >
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <StoreProvider initial={data} demo={localDemo()}>
          <Shell>
            <div id="main-content">{children}</div>
          </Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
