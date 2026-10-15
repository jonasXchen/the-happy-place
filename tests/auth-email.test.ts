import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuthEmail, authEmailCallbacks } from "../src/lib/auth-email";
import { resolveBranding } from "../src/lib/branding";

test("editable branding cannot introduce active HTML or Go template actions", () => {
  const brand = {
    ...resolveBranding(),
    name: "{{ .Token }} <script>",
    wordmark: "<script>{{ .Token }}</script>",
  };
  const email = createAuthEmail({ brand, origins: ["https://happy.example"] });
  assert.equal(email.preview.includes("<script>"), false);
  assert.equal(email.preview.includes("{{ .Token }}"), false);
  assert.ok(email.preview.includes("&#123;&#123; .Token &#125;&#125;"));
  assert.ok(email.subject.includes('{{ "Sign in to {{ .Token }} <script>" }}'));
});

test("a shared project's existing fallback keeps its original authentication link", () => {
  const fallbackHtml =
    '<h1>Grainbuds</h1><a href="{{ .ConfirmationURL }}">Sign in</a>';
  const email = createAuthEmail({
    brand: resolveBranding(),
    origins: ["https://happy.example"],
    fallbackHtml,
    fallbackSubject: "Grainbuds sign-in",
  });
  assert.ok(email.content.endsWith(`{{ else }}\n${fallbackHtml}\n{{ end }}\n`));
  assert.ok(email.subject.endsWith("{{ else }}Grainbuds sign-in{{ end }}\n"));
  assert.ok(
    email.callbacks.includes(
      "https://happy.example/auth/callback?next=%2Fadmin",
    ),
  );
  assert.equal(
    email.callbacks.some((url) => url.includes("grainbuds")),
    false,
  );
  assert.equal(
    email.callbacks.some((url) => url.includes("localhost")),
    false,
  );
});

test("email origins reject unsafe schemes, credentials and callback paths", () => {
  for (const origin of [
    "javascript:alert(1)",
    "http://happy.example",
    "https://user:password@happy.example",
    "https://happy.example/auth/callback",
    "https://happy.example/?next=/admin",
  ]) {
    assert.throws(() => authEmailCallbacks([origin]));
  }
  assert.ok(
    authEmailCallbacks(["http://localhost:3030"]).includes(
      "http://localhost:3030/auth/callback?next=%2Faccount",
    ),
  );
});
