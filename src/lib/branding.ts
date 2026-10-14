import type { CSSProperties } from "react";
import { z } from "zod";

// Default branding and the supported font stacks live here. Saved admin settings
// override these defaults without changing the database schema or component CSS.
export const headingFonts = {
  editorial: {
    label: "Editorial serif",
    stack: 'Georgia, "Times New Roman", serif',
  },
  classic: {
    label: "Classic serif",
    stack: 'Palatino, "Palatino Linotype", "Book Antiqua", serif',
  },
  modern: { label: "Modern sans", stack: "Arial, Helvetica, sans-serif" },
} as const;
export const bodyFonts = {
  clean: { label: "Clean sans", stack: "Arial, Helvetica, sans-serif" },
  humanist: {
    label: "Humanist sans",
    stack: '"Trebuchet MS", Arial, sans-serif',
  },
  system: {
    label: "System sans",
    stack:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
} as const;

export const brandDefaults = {
  name: "The Happy Place",
  wordmark: "the happy place",
  tagline: "Furniture & everyday things",
  logo_url: "",
  instagram_url: "https://www.instagram.com/thehappyplace_sg/",
  heading_font: "editorial",
  body_font: "clean",
  text_size: "comfortable",
  button_shape: "square",
  colours: {
    paper: "#f7f5f0",
    cream: "#eeeae2",
    ink: "#292b25",
    muted: "#5e6055",
    line: "#deded4",
    accent: "#6c7058",
    accent_soft: "#d9dccd",
  },
} as const;

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour such as #6c7058.");
const httpsUrl = z
  .string()
  .max(1500)
  .url()
  .refine((value) => value.startsWith("https://"), "Use an HTTPS URL.");
const imageUrl = z.union([
  z.literal(""),
  httpsUrl,
  z
    .string()
    .max(1500)
    .regex(/^\/(?!\/)[^\s<>"'\\]*$/, "Use a local image path or an HTTPS URL."),
]);

export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((start) => {
      const value = parseInt(hex.slice(start, start + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const [lighter, darker] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

export const brandingSchema = z
  .object({
    name: z.string().trim().min(1).max(64),
    wordmark: z.string().trim().min(1).max(64),
    tagline: z.string().trim().max(100),
    logo_url: imageUrl,
    instagram_url: z.union([z.literal(""), httpsUrl]),
    heading_font: z.enum(["editorial", "classic", "modern"]),
    body_font: z.enum(["clean", "humanist", "system"]),
    text_size: z.enum(["comfortable", "large"]),
    button_shape: z.enum(["square", "soft", "rounded"]),
    colours: z.object({
      paper: hex,
      cream: hex,
      ink: hex,
      muted: hex,
      line: hex,
      accent: hex,
      accent_soft: hex,
    }),
  })
  .superRefine((brand, ctx) => {
    for (const foreground of ["ink", "muted"] as const) {
      for (const background of ["paper", "cream", "accent_soft"] as const) {
        if (
          contrastRatio(brand.colours[foreground], brand.colours[background]) <
          4.5
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["colours", foreground],
            message: `Choose a ${foreground === "ink" ? "text" : "secondary text"} colour with at least 4.5:1 contrast against ${background.replace("_", " ")}.`,
          });
        }
      }
    }
  });

export type Branding = z.infer<typeof brandingSchema>;

export function resolveBranding(value?: unknown): Branding {
  const result = brandingSchema.safeParse(value);
  return result.success ? result.data : structuredClone(brandDefaults);
}

const readableOn = (background: string) =>
  contrastRatio(background, "#ffffff") >= contrastRatio(background, "#000000")
    ? "#ffffff"
    : "#000000";

export function brandingStyles(brand: Branding): CSSProperties {
  const { colours } = brand;
  const styles: CSSProperties & Record<`--${string}`, string> = {
    "--paper": colours.paper,
    "--cream": colours.cream,
    "--ink": colours.ink,
    "--muted": colours.muted,
    "--line": colours.line,
    "--olive": colours.accent,
    "--sage": colours.accent_soft,
    "--accent-text": [colours.paper, colours.cream, colours.accent_soft].every(
      (background) => contrastRatio(colours.accent, background) >= 4.5,
    )
      ? colours.accent
      : colours.ink,
    "--on-accent": readableOn(colours.accent),
    "--on-ink": readableOn(colours.ink),
    "--serif": headingFonts[brand.heading_font].stack,
    "--sans": bodyFonts[brand.body_font].stack,
    "--text-small": brand.text_size === "large" ? "0.9375rem" : "0.875rem",
    "--text-label": brand.text_size === "large" ? "1.0625rem" : "0.9375rem",
    "--text-body": brand.text_size === "large" ? "1.125rem" : "1rem",
    "--button-radius": { square: "0px", soft: "6px", rounded: "999px" }[
      brand.button_shape
    ],
  };
  return styles;
}

export function brandInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word.toLowerCase() !== "the")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function brandIconSvg(brand: Branding): string {
  const letter = (brandInitials(brand.name)[0] || "h")
    .toLowerCase()
    .replace(/[<>&"']/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${brand.colours.accent}"/><text x="17" y="46" fill="${readableOn(brand.colours.accent)}" font-family="${brand.heading_font === "modern" ? "Arial,sans-serif" : "Georgia,serif"}" font-size="45" font-style="italic">${letter}</text><circle cx="48" cy="46" r="3" fill="${brand.colours.accent_soft}"/></svg>`;
}
