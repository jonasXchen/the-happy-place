import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("combined setup preserves shared-project tables, installs a draft store, and refuses reruns", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select null::uuid;$$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key,bucket_id text);grant usage on schema public,auth to anon,authenticated,service_role;",
    );
    await db.exec(
      "create table public.grainbuds_products(id integer primary key,name text);insert into grainbuds_products values(1,'Existing matcha');grant select on grainbuds_products to anon;create table public.thehappyplacexarchive(id integer primary key);create function public.thehappyplacexprobe() returns boolean language sql as $$select true;$$;",
    );
    const existingObjects = () =>
      db.query(
        "select relname,relrowsecurity,relacl::text from pg_class where relnamespace='public'::regnamespace and relname in ('grainbuds_products','thehappyplacexarchive') order by relname",
      );
    const originalObjects = await existingObjects();
    const existingFunction = () =>
      db.query(
        "select proname,proacl::text from pg_proc where pronamespace='public'::regnamespace and proname='thehappyplacexprobe'",
      );
    const originalFunction = await existingFunction();
    const source = await readFile(
      new URL("../supabase/setup.sql", import.meta.url),
      "utf8",
    );
    const statements = (sql: string) =>
      sql
        .split("\n")
        .filter((line) => {
          const trimmed = line.trim();
          return (
            trimmed &&
            !trimmed.startsWith("--") &&
            !["begin;", "commit;"].includes(trimmed.toLowerCase())
          );
        })
        .join("\n");
    const migrations = new URL("../supabase/migrations/", import.meta.url);
    for (const name of (await readdir(migrations)).filter((name) =>
      name.endsWith(".sql"),
    )) {
      const migration = await readFile(new URL(name, migrations), "utf8");
      assert.ok(
        statements(source).includes(statements(migration)),
        `The single setup script must include all of ${name}`,
      );
    }
    await db.exec(source).catch((e) => {
      throw new Error(e.message);
    });
    assert.deepEqual((await existingObjects()).rows, originalObjects.rows);
    assert.deepEqual((await existingFunction()).rows, originalFunction.rows);
    assert.deepEqual(
      (await db.query("select * from grainbuds_products")).rows,
      [{ id: 1, name: "Existing matcha" }],
    );
    const tables = await db.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' and left(tablename,length('thehappyplace_'))='thehappyplace_'",
    );
    assert.equal(tables.rows.length, 21);
    for (const { tablename } of tables.rows) {
      assert.ok(
        tablename.startsWith("thehappyplace_"),
        `Store table ${tablename} must use the thehappyplace_ prefix`,
      );
    }
    const products = await db.query<{ count: number }>(
      "select count(*)::integer as count from thehappyplace_products",
    );
    assert.equal(products.rows[0].count, 8);
    const published = await db.query<{ count: number }>(
      "select count(*)::integer as count from thehappyplace_products where active",
    );
    assert.equal(published.rows[0].count, 0);
    const settings = await db.query<{ approved: boolean }>(
      "select (value->>'policies_approved')::boolean as approved from thehappyplace_settings where id='site'",
    );
    assert.equal(settings.rows[0].approved, false);
    await assert.rejects(db.exec(source), /already exists/);
    await db.exec("rollback");
  } finally {
    await db.close();
  }
});
