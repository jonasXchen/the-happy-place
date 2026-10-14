import type { Product, CartLine, Settings, Reward, Campaign } from "./types";
export function resolveLines(products: Product[], lines: CartLine[]) {
  return lines.map((line) => {
    const product = products.find((p) =>
      p.variants.some((v) => v.id === line.variant_id),
    );
    const variant = product?.variants.find((v) => v.id === line.variant_id);
    if (!product || !variant || !product.active)
      throw new Error("A selected piece is no longer available.");
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 20
    )
      throw new Error("Choose between 1 and 20 pieces.");
    return { product, variant, quantity: line.quantity };
  });
}
export function quote(
  products: Product[],
  lines: CartLine[],
  settings: Settings,
  options: {
    split?: boolean;
    remote?: boolean;
    reward?: Reward;
    campaign?: Campaign;
    method?: "standard" | "express";
  } = {},
) {
  const resolved = resolveLines(products, lines);
  const subtotal = resolved.reduce(
    (sum, l) => sum + l.variant.price_cents * l.quantity,
    0,
  );
  if (options.reward?.kind === "gift") {
    const gift = products.find((p) =>
      p.variants.some((v) => v.id === options.reward?.gift_variant_id),
    );
    const variant = gift?.variants.find(
      (v) => v.id === options.reward?.gift_variant_id,
    );
    if (!gift || !variant || !gift.active || variant.stock === 0)
      throw new Error("This gift is unavailable.");
    resolved.push({
      product: gift,
      variant: { ...variant, price_cents: 0 },
      quantity: 1,
    });
  }
  const groups = options.split
    ? [
        resolved.filter((l) => !l.variant.lead_weeks),
        resolved.filter((l) => l.variant.lead_weeks),
      ].filter((g) => g.length)
    : [resolved];
  let shipping = groups.reduce((sum, g) => {
    const rank = { small: 0, medium: 1, large: 2 };
    const largest = g.reduce(
      (a, l) =>
        rank[l.product.shipping_class] > rank[a] ? l.product.shipping_class : a,
      "small" as "small" | "medium" | "large",
    );
    const free =
      g.every((l) =>
        settings.free_shipping_classes.includes(l.product.shipping_class),
      ) &&
      g.reduce((s, l) => s + l.variant.price_cents * l.quantity, 0) >=
        settings.free_shipping_min;
    return (
      sum +
      (free ? 0 : settings[`shipping_${largest}`]) +
      (options.remote ? settings.remote_surcharge : 0)
    );
  }, 0);
  const installation = resolved.some((l) => l.product.installation)
    ? settings.installation_cents
    : 0;
  if (options.method === "express") {
    if (!settings.express_enabled)
      throw new Error("Express delivery is unavailable.");
    if (options.reward?.kind === "shipping")
      throw new Error("This delivery reward applies to standard delivery.");
    shipping += groups.length * settings.express_extra_cents;
  }
  let discount = 0;
  const promotion = options.reward ?? options.campaign;
  if (promotion) {
    if (subtotal < promotion.min_spend_cents)
      throw new Error(
        "Your basket has not reached the minimum spend for this offer.",
      );
    const eligible = resolved
      .filter(
        (l) =>
          !promotion.product_ids.length ||
          promotion.product_ids.includes(l.product.id),
      )
      .reduce((s, l) => s + l.variant.price_cents * l.quantity, 0);
    if (promotion.kind === "fixed")
      discount = Math.min(eligible, promotion.value);
    if (promotion.kind === "percent")
      discount = Math.floor((eligible * promotion.value) / 100);
    if (promotion.kind === "shipping") shipping = 0;
  }
  const net = subtotal - discount;
  const eligible = settings.earn_on_tax
    ? net
    : Math.floor((net * 10000) / (10000 + settings.gst_basis_points));
  return {
    subtotal_cents: subtotal,
    discount_cents: discount,
    shipping_cents: shipping,
    installation_cents: installation,
    tax_cents: Math.round(
      ((net + shipping + installation) * settings.gst_basis_points) /
        (10000 + settings.gst_basis_points),
    ),
    total_cents: net + shipping + installation,
    earned_points: Math.floor((eligible * settings.points_per_dollar) / 100),
  };
}
export function remoteAddress(
  settings: Settings,
  street: string,
  postal: string,
) {
  return (
    (settings.remote_keywords || []).some((keyword) =>
      street.toLowerCase().includes(keyword.toLowerCase()),
    ) ||
    (settings.remote_prefixes || []).some((prefix) => postal.startsWith(prefix))
  );
}
export function isPublished(
  item: {
    active: boolean;
    publish_at?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
  },
  now = Date.now(),
) {
  return (
    item.active &&
    (!item.publish_at || new Date(item.publish_at).getTime() <= now) &&
    (!item.starts_at || new Date(item.starts_at).getTime() <= now) &&
    (!item.ends_at || new Date(item.ends_at).getTime() > now)
  );
}
export function proratedPoints(
  points: number,
  refunded: number,
  total: number,
) {
  return total ? Math.min(points, Math.floor((points * refunded) / total)) : 0;
}
