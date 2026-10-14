import { test } from "node:test";
import assert from "node:assert/strict";
import {
  brandDefaults,
  brandingSchema,
  resolveBranding,
  brandIconSvg,
  brandingStyles,
  contrastRatio,
} from "../src/lib/branding";
import {
  settingsSchema,
  mergeContentSettings,
} from "../src/lib/admin-validation";
import { seed } from "../src/lib/seed";

test("an existing store without branding receives readable defaults", () => {
  const { branding: omitted, ...legacy } = seed.settings;
  void omitted;
  const settings = settingsSchema.parse(legacy);
  assert.equal(settings.branding.name, "The Happy Place");
  assert.ok(brandingSchema.safeParse(settings.branding).success);
  assert.deepEqual(resolveBranding(undefined), settings.branding);
});

test("branding rejects unreadable text and preserves editable validation paths", () => {
  const result = brandingSchema.safeParse({
    ...brandDefaults,
    colours: { ...brandDefaults.colours, muted: "#ffffff" },
  });
  assert.equal(result.success, false);
  if (!result.success)
    assert.ok(
      result.error.issues.some(
        (issue) => issue.path.join(".") === "colours.muted",
      ),
    );
});

test("branding accepts supported fonts and rejects arbitrary CSS and unsafe logo URLs", () => {
  assert.ok(
    brandingSchema.safeParse({
      ...brandDefaults,
      heading_font: "modern",
      body_font: "system",
      text_size: "large",
    }).success,
  );
  for (const change of [
    { logo_url: "javascript:alert(1)" },
    { logo_url: "//untrusted.example/logo.svg" },
    { body_font: 'Arial; background:url("https://untrusted.example")' },
    { colours: { ...brandDefaults.colours, accent: "red; display:none" } },
  ])
    assert.equal(
      brandingSchema.safeParse({ ...brandDefaults, ...change }).success,
      false,
    );
});

test("marketing content updates cannot replace owner branding", () => {
  const previous = {
    ...seed.settings,
    branding: { ...brandDefaults, name: "Owner's saved brand" },
  };
  const incoming = settingsSchema.parse({
    ...seed.settings,
    hero_title: "A fresh headline",
    branding: brandDefaults,
    shipping_small: 99999,
    signup_points: 999,
  });
  const saved = mergeContentSettings(previous, incoming);
  assert.equal(saved.hero_title, "A fresh headline");
  assert.deepEqual(saved.branding, previous.branding);
  assert.equal(saved.shipping_small, previous.shipping_small);
  assert.equal(saved.signup_points, previous.signup_points);
});

test("mid-tone brand accents retain readable button and link text", () => {
  const brand = brandingSchema.parse({
    ...brandDefaults,
    colours: { ...brandDefaults.colours, accent: "#777777" },
  });
  const styles = brandingStyles(brand) as Record<string, string>;
  assert.ok(contrastRatio(brand.colours.accent, styles["--on-accent"]) >= 4.5);
  for (const background of ["paper", "cream", "accent_soft"] as const)
    assert.ok(
      contrastRatio(brand.colours[background], styles["--accent-text"]) >= 4.5,
    );
});

test("a brand name containing markup cannot inject an SVG element into its icon", () => {
  const svg = brandIconSvg({
    ...structuredClone(brandDefaults),
    name: '<script>alert("x")</script>',
  });
  assert.equal(svg.includes("<script>"), false);
  assert.equal(svg.includes("alert("), false);
});
