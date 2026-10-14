import { brandingStyles, type Branding } from "@/lib/branding";

export function BrandTheme({
  brand,
  children,
}: {
  brand: Branding;
  children: React.ReactNode;
}) {
  return (
    <div className="site-theme" style={brandingStyles(brand)}>
      {children}
    </div>
  );
}
