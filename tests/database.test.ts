import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { seed, ids } from "../src/lib/seed";
const db = new PGlite();
const uid = "40000000-0000-4000-8000-000000000001";
async function rpc<T = unknown>(name: string, args: unknown[]) {
  const sql = `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as value`;
  try {
    const r = await db.query<{ value: T }>(sql, args);
    return r.rows[0]?.value;
  } catch (e) {
    const error = e as { message: string; where?: string };
    throw new Error(`${error.message} ${error.where || ""}`);
  }
}
function payload(
  lines = [{ variant_id: ids.variant(10), quantity: 1 }],
  reward: string | null = null,
) {
  return {
    request_id: crypto.randomUUID(),
    lines,
    address: {
      name: "Sample Buyer",
      email: "sample@example.com",
      phone: "+65 81234567",
      block: "1",
      street: "Sample Street",
      building: "",
      unit: "",
      postal: "123456",
      country: "Singapore",
      instructions: "",
      access: "Lift access",
    },
    reward_id: reward,
    split_delivery: false,
    preferred_date: "",
    preferred_window: "",
    utm: {},
  };
}
async function create(p = payload()) {
  return rpc<string>("thehappyplace_create_order", [
    uid,
    "hash",
    "fingerprint",
    JSON.stringify(p),
  ]);
}
before(async () => {
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text); create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid primary key,bucket_id text); grant usage on schema public,auth to anon,authenticated,service_role;",
  );
  for (const name of ["001_store.sql", "002_admin.sql", "003_accounting.sql"])
    await db
      .exec(
        await readFile(
          new URL(`../supabase/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      )
      .catch((e) => {
        throw new Error(`Migration ${name}: ${e.message}`);
      });
  await db.query("insert into auth.users values($1,$2)", [
    uid,
    "sample@example.com",
  ]);
  await db.query("insert into thehappyplace_settings values('site',$1)", [
    JSON.stringify({ ...seed.settings, policies_approved: true }),
  ]);
  for (const p of seed.products)
    await rpc("thehappyplace_save_product", [JSON.stringify({ ...p, sample: false })]);
  await rpc("thehappyplace_credit_points", [
    uid,
    20000,
    null,
    "test-balance",
    "welcome",
    365,
    "Test credit",
  ]);
  for (const reward of seed.rewards)
    await db.query(
      "insert into thehappyplace_rewards select * from jsonb_populate_record(null::thehappyplace_rewards,$1)",
      [JSON.stringify(reward)],
    );
});
after(async () => {
  await db.close();
});
test("database prices ignore client totals and duplicate checkout reserves once", async () => {
  const p = payload([{ variant_id: ids.variant(60), quantity: 1 }]);
  const beforeStock = await db.query<{ stock: number }>(
    "select stock from thehappyplace_variants where id=$1",
    [ids.variant(60)],
  );
  const oid = await create({ ...p, total_cents: 1 } as ReturnType<
    typeof payload
  >);
  assert.equal(
    await create({ ...p, total_cents: 1 } as ReturnType<typeof payload>),
    oid,
  );
  const r = await db.query<{ total_cents: number }>(
    "select total_cents from thehappyplace_orders where id=$1",
    [oid],
  );
  assert.equal(r.rows[0].total_cents, 12490);
  const afterStock = await db.query<{ stock: number }>(
    "select stock from thehappyplace_variants where id=$1",
    [ids.variant(60)],
  );
  assert.equal(beforeStock.rows[0].stock - afterStock.rows[0].stock, 1);
});
test("payment replay awards once and refund replay reverses once", async () => {
  const oid = await create();
  const amount = 351000;
  const initial = await rpc<number>("thehappyplace_balance", [uid]);
  await rpc("thehappyplace_confirm_payment", [
    oid,
    "cs_test_a",
    "pi_test_a",
    "evt_test_a",
    amount,
  ]);
  await rpc("thehappyplace_confirm_payment", [
    oid,
    "cs_test_a",
    "pi_test_a",
    "evt_test_a",
    amount,
  ]);
  await rpc("thehappyplace_confirm_payment", [
    oid,
    "cs_test_a",
    "pi_test_a",
    "evt_test_a_duplicate",
    amount,
  ]);
  const paid = await rpc<number>("thehappyplace_balance", [uid]);
  assert.equal(paid! - initial!, 3110);
  await rpc("thehappyplace_apply_refund", [oid, 175500, "evt_refund_a"]);
  await rpc("thehappyplace_apply_refund", [oid, 175500, "evt_refund_a"]);
  assert.equal(await rpc("thehappyplace_balance", [uid]), paid! - 1555);
  await rpc("thehappyplace_apply_refund", [oid, 351000, "evt_refund_b"]);
  assert.equal(await rpc("thehappyplace_balance", [uid]), initial);
});
test("failed checkout restores reserved stock and redeemed points exactly once", async () => {
  const before = await rpc<number>("thehappyplace_balance", [uid]);
  const p = payload(
    [{ variant_id: ids.variant(30), quantity: 1 }],
    ids.reward(1),
  );
  const oid = await create(p);
  assert.equal(await rpc("thehappyplace_balance", [uid]), before! - 500);
  await rpc("thehappyplace_release_order", [oid, "expired"]);
  await rpc("thehappyplace_release_order", [oid, "expired"]);
  assert.equal(await rpc("thehappyplace_balance", [uid]), before);
});
test("stock cannot go negative and rejected checkout rolls back", async () => {
  await db.query("update thehappyplace_variants set stock=1 where id=$1", [
    ids.variant(61),
  ]);
  const p = payload([{ variant_id: ids.variant(61), quantity: 1 }]);
  await create(p);
  await assert.rejects(
    create(payload([{ variant_id: ids.variant(61), quantity: 1 }])),
    /stock/,
  );
  const r = await db.query<{ stock: number }>(
    "select stock from thehappyplace_variants where id=$1",
    [ids.variant(61)],
  );
  assert.equal(r.rows[0].stock, 0);
});
test("paid reservations cannot be released by an expiry event", async () => {
  const oid = await create();
  await rpc("thehappyplace_confirm_payment", [
    oid,
    "cs_test_protect",
    "pi_test_protect",
    "evt_test_protect",
    351000,
  ]);
  await rpc("thehappyplace_release_order", [oid, "expired"]);
  const r = await db.query<{
    payment_status: string;
    reservation_released: boolean;
  }>("select payment_status,reservation_released from thehappyplace_orders where id=$1", [
    oid,
  ]);
  assert.equal(r.rows[0].payment_status, "paid");
  assert.equal(r.rows[0].reservation_released, false);
});
test("anonymous users cannot invoke checkout or read customer records", async () => {
  await db.exec("set role anon");
  await assert.rejects(
    db.query("select * from thehappyplace_orders"),
    /permission denied/,
  );
  await assert.rejects(
    rpc("thehappyplace_create_order", [uid, "x", "x", JSON.stringify(payload())]),
    /permission denied/,
  );
  await db.exec("reset role");
});
test("expired unused purchase points do not become refund debt", async () => {
  const id = crypto.randomUUID();
  await db.query("insert into auth.users values($1,$2)", [
    id,
    "expiry@example.com",
  ]);
  const oid = await rpc<string>("thehappyplace_create_order", [
    id,
    "hash",
    "f",
    JSON.stringify(payload()),
  ]);
  await rpc("thehappyplace_confirm_payment", [
    oid,
    "cs_expiry",
    "pi_expiry",
    "evt_expiry",
    351000,
  ]);
  await db.query(
    "update thehappyplace_points_entries set expires_at=now()-interval '1 day' where user_id=$1 and delta>0",
    [id],
  );
  await rpc("thehappyplace_expire_points", [id]);
  assert.equal(await rpc("thehappyplace_balance", [id]), 0);
  await rpc("thehappyplace_apply_refund", [oid, 351000, "evt_expiry_refund"]);
  assert.equal(await rpc("thehappyplace_balance", [id]), 0);
});
test("future earnings repay spent-refund debt without debt returning on expiry", async () => {
  const id = crypto.randomUUID();
  await db.query("insert into auth.users values($1,$2)", [
    id,
    "debt@example.com",
  ]);
  const oid = await rpc<string>("thehappyplace_create_order", [
    id,
    "hash",
    "f",
    JSON.stringify(payload()),
  ]);
  await rpc("thehappyplace_confirm_payment", [
    oid,
    "cs_debt",
    "pi_debt",
    "evt_debt",
    351000,
  ]);
  await rpc("thehappyplace_debit_points", [id, 3110, null, "spend-debt", "Reward spent"]);
  await rpc("thehappyplace_apply_refund", [oid, 351000, "evt_debt_refund"]);
  assert.equal(await rpc("thehappyplace_balance", [id]), -3110);
  await rpc("thehappyplace_credit_points", [
    id,
    4000,
    null,
    "repay-debt",
    "purchase",
    365,
    "Future earning",
  ]);
  assert.equal(await rpc("thehappyplace_balance", [id]), 890);
  await db.query(
    "update thehappyplace_points_entries set expires_at=now()-interval '1 day' where event_key='repay-debt'",
  );
  await rpc("thehappyplace_expire_points", [id]);
  assert.equal(await rpc("thehappyplace_balance", [id]), 0);
});
test("delivery-based earning reflects a partial refund before delivery", async () => {
  const id = crypto.randomUUID();
  await db.query("insert into auth.users values($1,$2)", [
    id,
    "delivery@example.com",
  ]);
  await db.exec(
    "update thehappyplace_settings set value=jsonb_set(value,'{award_on}','\"delivered\"') where id='site'",
  );
  try {
    const oid = await rpc<string>("thehappyplace_create_order", [
      id,
      "hash",
      "f",
      JSON.stringify(payload()),
    ]);
    await rpc("thehappyplace_confirm_payment", [
      oid,
      "cs_delivery",
      "pi_delivery",
      "evt_delivery",
      351000,
    ]);
    assert.equal(await rpc("thehappyplace_balance", [id]), 0);
    await rpc("thehappyplace_apply_refund", [oid, 175500, "evt_delivery_refund"]);
    const sh = await db.query<{ id: string; items: unknown }>(
      "select id,items from thehappyplace_shipments where order_id=$1",
      [oid],
    );
    await rpc("thehappyplace_update_shipment", [
      sh.rows[0].id,
      JSON.stringify({
        status: "delivered",
        items: sh.rows[0].items,
        scheduled_at: "2026-11-05T02:00:00Z",
        window: "10am to 2pm",
        tracking_url: "",
        customer_note: "Delivered",
      }),
    ]);
    assert.equal(await rpc("thehappyplace_balance", [id]), 1555);
    await rpc("thehappyplace_apply_refund", [oid, 351000, "evt_delivery_refund_final"]);
    assert.equal(await rpc("thehappyplace_balance", [id]), 0);
  } finally {
    await db.exec(
      "update thehappyplace_settings set value=jsonb_set(value,'{award_on}','\"paid\"') where id='site'",
    );
  }
});
test("authenticated customers cannot read staff notes through the database API", async () => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  await db.exec("set role authenticated");
  try {
    await db.query("select id,number from thehappyplace_orders");
    await assert.rejects(
      db.query("select notes from thehappyplace_orders"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select guest_token_hash from thehappyplace_orders"),
      /permission denied/,
    );
  } finally {
    await db.exec("reset role");
  }
});
test("express fees and remote-area rules agree with the server transaction", async () => {
  await db.exec(
    "update thehappyplace_settings set value=jsonb_set(value,'{express_enabled}','true') where id='site'",
  );
  try {
    const p = {
      ...payload([{ variant_id: ids.variant(30), quantity: 1 }]),
      delivery_method: "express",
    };
    const oid = await create(p);
    const r = await db.query<{ shipping_cents: number }>(
      "select shipping_cents from thehappyplace_orders where id=$1",
      [oid],
    );
    assert.equal(r.rows[0].shipping_cents, 7500);
  } finally {
    await db.exec(
      "update thehappyplace_settings set value=jsonb_set(value,'{express_enabled}','false') where id='site'",
    );
  }
});
test("shipment quantities cannot exceed an order, and incomplete delivery stays open", async () => {
  const p = payload([{ variant_id: ids.variant(30), quantity: 2 }]);
  const oid = await create(p);
  await rpc("thehappyplace_confirm_payment", [
    oid,
    "cs_quantities",
    "pi_quantities",
    "evt_quantities",
    89500,
  ]);
  const sh = await db.query<{
    id: string;
    items: { item_id: string; quantity: number }[];
  }>("select id,items from thehappyplace_shipments where order_id=$1", [oid]);
  const data = {
    status: "delivered",
    items: [{ ...sh.rows[0].items[0], quantity: 3 }],
    scheduled_at: "2026-11-05T02:00:00Z",
    window: "10am to 2pm",
    tracking_url: "",
    customer_note: "Delivery update",
  };
  await assert.rejects(
    rpc("thehappyplace_update_shipment", [sh.rows[0].id, JSON.stringify(data)]),
    /quantities/,
  );
  await rpc("thehappyplace_update_shipment", [
    sh.rows[0].id,
    JSON.stringify({ ...data, items: [{ ...data.items[0], quantity: 1 }] }),
  ]);
  const order = await db.query<{ status: string }>(
    "select status from thehappyplace_orders where id=$1",
    [oid],
  );
  assert.notEqual(order.rows[0].status, "delivered");
});
test("the final owner cannot be removed, and other staff access can be revoked", async () => {
  const owner = crypto.randomUUID();
  const staff = crypto.randomUUID();
  await db.query("insert into auth.users values($1,$2),($3,$4)", [
    owner,
    "owner@example.com",
    staff,
    "staff@example.com",
  ]);
  await rpc("thehappyplace_set_staff", [owner, "owner@example.com", ["owner"]]);
  await assert.rejects(
    rpc("thehappyplace_set_staff", [owner, "owner@example.com", []]),
    /owner/,
  );
  await rpc("thehappyplace_set_staff", [staff, "staff@example.com", ["catalogue"]]);
  await rpc("thehappyplace_set_staff", [staff, "staff@example.com", []]);
  const rows = await db.query("select * from thehappyplace_staff where user_id=$1", [
    staff,
  ]);
  assert.equal(rows.rows.length, 0);
});
