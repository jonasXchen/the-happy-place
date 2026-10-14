import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, importProducts } from "../src/lib/csv";
test("quoted descriptions preserve commas, escaped quotes, and newlines", () => {
  assert.deepEqual(
    parseCsv('name,description\r\nChair,"Soft, \"\"lovely\"\"\ntexture"'),
    [
      ["name", "description"],
      ["Chair", 'Soft, "lovely"\ntexture'],
    ],
  );
});
test("CSV rejects mismatched rows and invalid stock", () => {
  assert.throws(
    () =>
      importProducts(
        "slug,name,category,price,sku\nchair,Chair,chairs,200",
        [],
      ),
    /columns/,
  );
  assert.throws(
    () =>
      importProducts(
        "slug,name,category,price,sku,stock\nchair,Chair,chairs,200,SKU-1,-1",
        [],
      ),
    /stock/,
  );
});
test("rows sharing a slug import as separate finishes on one product", () => {
  const p = importProducts(
    "slug,name,category,price,sku,colour\nchair,Chair,chairs,200,SKU-1,Oat\nchair,Chair,chairs,220,SKU-2,Sand",
    [],
  );
  assert.equal(p.length, 1);
  assert.equal(p[0].variants.length, 2);
  assert.equal(p[0].active, false);
  assert.equal(p[0].sample, true);
});
