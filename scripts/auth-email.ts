import { parseArgs } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { brandingSchema, resolveBranding } from "../src/lib/branding";
import { createAuthEmail } from "../src/lib/auth-email";

async function main() {
  const { values } = parseArgs({
    options: {
      "site-url": { type: "string" },
      "local-origin": { type: "string", default: "http://localhost:3030" },
      "from-store": { type: "boolean", default: false },
      "fallback-html": { type: "string" },
      "fallback-subject": { type: "string" },
    },
  });
  if (!values["site-url"])
    throw new Error(
      "Pass --site-url https://YOUR-DOMAIN to select the Happy Place website.",
    );
  let brand = resolveBranding();
  if (values["from-store"]) {
    loadEnvConfig(process.cwd(), true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key)
      throw new Error(
        "Configure the Supabase URL and publishable key to read saved branding.",
      );
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db
      .from("thehappyplace_settings")
      .select("value")
      .eq("id", "site")
      .single();
    if (error)
      throw new Error(
        "Could not read public branding. Check the selected store and connection.",
      );
    brand = data.value.branding
      ? brandingSchema.parse(data.value.branding)
      : resolveBranding();
  }
  const result = createAuthEmail({
    brand,
    origins: [values["site-url"], values["local-origin"]!],
    fallbackHtml: values["fallback-html"]
      ? await readFile(values["fallback-html"], "utf8")
      : undefined,
    fallbackSubject: values["fallback-subject"]
      ? (await readFile(values["fallback-subject"], "utf8")).trim()
      : undefined,
  });
  await mkdir("supabase/templates", { recursive: true });
  await writeFile("supabase/templates/magic-link.html", result.content);
  await writeFile("supabase/templates/magic-link.subject.txt", result.subject);
  await writeFile("supabase/templates/magic-link.preview.html", result.preview);
  console.log(
    "Generated the sign-in body, subject and preview in supabase/templates. No email sent or Supabase settings changed.",
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Email template generation failed.",
  );
  process.exitCode = 1;
});
