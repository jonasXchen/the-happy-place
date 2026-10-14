import { createClient } from "@supabase/supabase-js";
import { seed } from "../src/lib/seed";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { loadEnvFile } from "node:process";
try {
  loadEnvFile(".env.local");
} catch {
  /* Hosting may provide environment variables directly. */
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
  throw new Error(
    "Set the store's Supabase URL and service secret before running seed.",
  );
if (process.env.CONFIRM_STORE_SEED !== "the-happy-place")
  throw new Error(
    "Set CONFIRM_STORE_SEED=the-happy-place to confirm the selected project. Existing records are never overwritten.",
  );
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const files = new Set([
  ...seed.products.flatMap((p) => p.images),
  seed.settings.hero_image,
  ...seed.collections.map((c) => c.image),
  ...seed.rewards.map((r) => r.image!).filter(Boolean),
]);
const uploads = new Map<string, string>();
for (const path of files) {
  if (!path.startsWith("/images/")) continue;
  const name = path.slice("/images/".length);
  const bytes = await readFile(`public/images/${name}`);
  const { error } = await db.storage
    .from("thp-images")
    .upload(`seed/${name}`, bytes, {
      contentType: extname(name) === ".jpg" ? "image/jpeg" : "image/png",
      upsert: false,
    });
  if (error && !error.message.includes("already exists")) throw error;
  uploads.set(
    path,
    db.storage.from("thp-images").getPublicUrl(`seed/${name}`).data.publicUrl,
  );
}
const settings = {
  ...seed.settings,
  hero_image: uploads.get(seed.settings.hero_image) || seed.settings.hero_image,
  policies_approved: false,
};
const { notification_email: privateEmail, ...publicSettings } = settings;
void privateEmail;
const settingResult = await db
  .from("thehappyplace_settings")
  .upsert(
    { id: "site", value: publicSettings },
    { onConflict: "id", ignoreDuplicates: true },
  );
if (settingResult.error) throw settingResult.error;
for (const product of seed.products) {
  const { data: existing, error } = await db
    .from("thehappyplace_products")
    .select("id")
    .eq("id", product.id)
    .maybeSingle();
  if (error) throw error;
  if (existing) continue;
  const { error: saveError } = await db.rpc("thehappyplace_save_product", {
    p_product: {
      ...product,
      images: product.images.map((p) => uploads.get(p) || p),
      sample: true,
    },
  });
  if (saveError) throw saveError;
}
for (const reward of seed.rewards) {
  const { error } = await db
    .from("thehappyplace_rewards")
    .upsert(
      { ...reward, image: uploads.get(reward.image!) || reward.image },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw error;
}
for (const collection of seed.collections) {
  const { error } = await db.from("thehappyplace_collections").upsert(
    {
      ...collection,
      image: uploads.get(collection.image) || collection.image,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
}
console.log(
  "Initial catalogue loaded. Products remain unverified and checkout remains closed until owner review. Existing records were preserved.",
);
