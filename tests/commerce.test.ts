import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/lib/seed";
import { quote, proratedPoints } from "../src/lib/commerce";
import { addressSchema } from "../src/lib/validation";
test("delivery cost reflects the largest piece and separate shipments", () => {
  const lines = [
    { variant_id: seed.products[0].variants[0].id, quantity: 1 },
    { variant_id: seed.products[5].variants[0].id, quantity: 1 },
  ];
  const combined = quote(seed.products, lines, seed.settings);
  const split = quote(seed.products, lines, seed.settings, { split: true });
  assert.equal(combined.shipping_cents, 12000);
  assert.equal(split.shipping_cents, 13500);
  assert.equal(split.total_cents - combined.total_cents, 1500);
});
test("tax-inclusive earning excludes delivery, installation, and discounts", () => {
  const reward = seed.rewards[0];
  const q = quote(
    seed.products,
    [{ variant_id: seed.products[2].variants[0].id, quantity: 1 }],
    seed.settings,
    { reward },
  );
  assert.equal(q.discount_cents, 1500);
  assert.equal(q.earned_points, 376);
  assert.equal(q.total_cents, 45500);
});
test("partial refunds reverse cumulative points with integer rounding", () => {
  assert.equal(proratedPoints(999, 33333, 100000), 332);
  assert.equal(proratedPoints(999, 100000, 100000), 999);
});
test("invalid quantities and inadequate reward spend fail", () => {
  assert.throws(() =>
    quote(
      seed.products,
      [{ variant_id: seed.products[0].variants[0].id, quantity: -1 }],
      seed.settings,
    ),
  );
  assert.throws(() =>
    quote(
      seed.products,
      [{ variant_id: seed.products[5].variants[0].id, quantity: 1 }],
      seed.settings,
      { reward: seed.rewards[1] },
    ),
  );
});
test("Singapore addresses require a six-digit postal code", () => {
  const a = {
    name: "Sample Customer",
    email: "sample@example.com",
    phone: "+65 8123 4567",
    block: "1",
    street: "Sample Street",
    building: "",
    unit: "",
    postal: "123456",
    country: "Singapore",
    instructions: "",
    access: "Lift access",
  };
  assert.ok(addressSchema.safeParse(a).success);
  assert.equal(
    addressSchema.safeParse({ ...a, postal: "12345" }).success,
    false,
  );
});
