import type { Product } from "./types";
import { productSchema } from "./validation";
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted)
    throw new Error("An opening quote has no matching closing quote.");
  row.push(value);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function importProducts(text: string, existing: Product[]): Product[] {
  const rows = parseCsv(text);
  if (rows.length < 2)
    throw new Error("Add a header row and at least one product.");
  const headers = rows.shift()!.map((h) => h.trim().toLowerCase());
  const required = ["slug", "name", "category", "price", "sku"];
  for (const key of required)
    if (!headers.includes(key)) throw new Error(`Missing column: ${key}`);
  const groups = new Map<string, Product>();
  rows.forEach((values, i) => {
    if (values.length !== headers.length)
      throw new Error(`Row ${i + 2} has the wrong number of columns.`);
    const r = Object.fromEntries(
      headers.map((key, j) => [key, values[j].trim()]),
    );
    const previous = existing.find((p) => p.slug === r.slug);
    const p = groups.get(r.slug) ||
      structuredClone(previous) || {
        id: crypto.randomUUID(),
        name: r.name,
        slug: r.slug,
        category: r.category,
        room: r.room || "Living",
        style: r.style || "Contemporary",
        material: r.material || "",
        description: r.description || "",
        dimensions: r.dimensions || "",
        care: r.care || "",
        images: r.image ? [r.image] : [],
        price_cents: Math.round(Number(r.price) * 100),
        active: false,
        featured: false,
        shipping_class: "medium",
        installation: false,
        sample: true,
        variants: [],
      };
    const prior = p.variants.find((v) => v.sku === r.sku);
    const price = Number(r.price);
    const stock =
      r.stock === "" || r.stock === undefined ? null : Number(r.stock);
    const lead = Number(r.lead_weeks || 0);
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      (stock !== null && (!Number.isInteger(stock) || stock < 0)) ||
      !Number.isInteger(lead) ||
      lead < 0
    )
      throw new Error(`Row ${i + 2}: check price, stock, and lead time.`);
    const variant = {
      id: prior?.id || crypto.randomUUID(),
      product_id: p.id,
      label: [r.colour || "Standard", r.size].filter(Boolean).join(" / "),
      sku: r.sku,
      colour: r.colour || "Standard",
      material: r.material || p.material,
      size: r.size || "Standard",
      price_cents: Math.round(price * 100),
      stock,
      lead_weeks: lead,
    };
    p.variants = prior
      ? p.variants.map((v) => (v.id === prior.id ? variant : v))
      : [...p.variants, variant];
    p.price_cents = Math.min(...p.variants.map((v) => v.price_cents));
    p.name = r.name;
    p.category = r.category;
    p.sample = true;
    groups.set(r.slug, productSchema.parse(p));
  });
  return [...groups.values()];
}
