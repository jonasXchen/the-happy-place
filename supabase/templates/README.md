# Sign-in email

The generated Happy Place email uses the website's brand defaults: cream background, serif wordmark and heading, olive sign-in button, 16px body text and 14px secondary text. The HTML uses tables and inline styles for email clients. System font stacks avoid dependence on remote font downloads.

The shared template selects Happy Place only when `.RedirectTo` exactly matches one of its account or admin callbacks. Local callbacks use port 3030. Other apps receive the content in the `else` branch. The default fallback reproduces Supabase's basic sign-in email; it does not include a custom Grainbuds design.

## Install in Supabase

1. Open the shared project's **Authentication → Email → Templates → Magic Link**.
2. Save copies of the existing body and subject before editing. If Grainbuds already has a custom email, preserve that exact body and subject in the generated `else` branches, or regenerate with the fallback options below.
3. Paste [magic-link.html](magic-link.html) into the body editor and [magic-link.subject.txt](magic-link.subject.txt) into the subject field. The subject contains Go template expressions; paste the whole file.
4. Save the template. Keep both stores' callback URLs allowed under URL Configuration. Buttons use `{{ .ConfirmationURL }}` so Supabase verifies the token before returning to the requested callback.
5. Test a new request from each website after SMTP and email rate limits allow it. Open the link in the same browser where it was requested.

Open [magic-link.preview.html](magic-link.preview.html) locally to inspect the Happy Place design. Its button is a placeholder and cannot sign anyone in. This browser preview does not verify rendering in Gmail, Outlook or Apple Mail.

## Update branding or domains

The generated files are a snapshot, not a live connection to Admin Settings. Regenerate after a branding or domain change, review, then paste the updated files into Supabase again:

```sh
npm run email:templates -- --site-url https://the-happy-place-mu.vercel.app --from-store
```

`--from-store` reads only the public `site` settings using the publishable key from your environment files. It does not change users, templates or other settings, or send an email. Omit it to use defaults from `src/lib/branding.ts`. `--site-url` is explicit so a local environment URL cannot accidentally replace the production domain. Use `--local-origin` if Happy Place runs on a different local port; use a port distinct from Grainbuds.

To preserve a custom Grainbuds email, copy its current body to a local HTML file and its subject to a local text file, then supply both:

```sh
npm run email:templates -- --site-url https://the-happy-place-mu.vercel.app --from-store --fallback-html /path/to/grainbuds-magic-link.html --fallback-subject /path/to/grainbuds-subject.txt
```

Retain any existing Supabase template expressions in those files. The fallback is inserted verbatim. Selection uses the current request's redirect URL, not user metadata, because the same user can sign in to both stores.

This customization changes the body and subject. The SMTP sender address and sender name remain shared project settings. See [Supabase's email template documentation](https://supabase.com/docs/guides/auth/auth-email-templates).
