# The Happy Place

A furniture storefront and owner dashboard built separately from Grainbuds. Next.js 16.4, React 19, TypeScript, Tailwind CSS, Supabase, Stripe Checkout, and Resend.

## Local preview

```sh
npm install
npm run dev -- --port 3030
```

Open http://localhost:3030 and http://localhost:3030/admin. The supplied `.env.local` contains only a local URL and demo flag. With no Supabase connection, development mode uses a clearly labelled preview. Catalogue and admin edits persist in this browser. Preview orders take no payment and send no email. Use fictional contact details. Reset preview from the admin banner.

Production builds never allow demo admin access or preview order creation. Without credentials, payment endpoints reject checkout. A failed configured database never falls back to sample data.

## Set up the Supabase database

1. Select the Supabase project configured for **The Happy Place**. It can share a project with Grainbuds; Happy Place uses `thehappyplace_` tables and functions. Shared projects also share Supabase Auth users, so an existing Grainbuds login can identify the same user in Happy Place. Store records and staff roles remain in their own tables.
2. Open **SQL Editor → New query**, paste the entire [supabase/setup.sql](supabase/setup.sql), and click **Run** once. This single script includes all three migrations, initial settings, and the draft catalogue. It creates all 21 `thehappyplace_` tables, permissions, accounting functions, and the `thp-images` bucket in one transaction. You do not need to run the files in `supabase/migrations/` or a seed command separately. The script preserves existing Grainbuds tables and refuses to overwrite an existing Happy Place store.
3. Fill `.env.local` using [.env.example](.env.example). Generate an `APP_SECRET` of at least 32 random characters and keep it stable so private links survive service-key rotation. The Supabase publishable key is public. The application secret, service secret, Stripe secret, webhook secret, Resend key, and cron secret remain server-only.
4. Set `NEXT_PUBLIC_SITE_URL` to the exact browser origin in the matching Vercel environment, then redeploy. Use `http://localhost:3030` in `.env.local` for local work; this file overrides `.env`. In the same Supabase project's **Authentication → URL Configuration → Redirect URLs**, add `https://YOUR-DOMAIN/auth/callback**` and `http://localhost:3030/auth/callback**`. The wildcard includes the `?next=...` query used to return customers to their account and staff to admin. Preserve Grainbuds' existing entries and shared default Site URL; Happy Place explicitly supplies its own callback.
5. Configure Supabase's email sender or custom SMTP. Customer and staff sign-in use Supabase's passwordless email link flow. Resend can be configured as its SMTP provider separately.
   A [branded sign-in email](supabase/templates/README.md) is ready to install. Its shared-project template selects Happy Place by the requested callback URL and supports preserving Grainbuds' current body and subject. Regenerate it from saved branding when colours, fonts or domains change.
6. The setup SQL already includes the initial catalogue and settings. Optionally run `CONFIRM_STORE_SEED=the-happy-place npm run seed` to copy business reference photos into your storage bucket. The command skips existing database records and imports no customer data.
7. Sign in once with the owner's email. Bootstrap the first owner in the SQL Editor using the real Auth user ID:

```sql
insert into public.thehappyplace_staff(user_id, email, roles)
values ('REPLACE_WITH_AUTH_USER_UUID', 'owner@example.com', array['owner']);
```

The account appears under Auth → Users. Subsequent staff assignments use Admin → Settings. Roles restrict catalogue, fulfilment, marketing, and owner actions. Refunds, rewards rules, points adjustments, and staff management require owner access.

## Review before checkout opens

Reference prices and images come from the current business site. Sample SKU combinations and stock counts demonstrate how the system works. They are not a verified inventory import. All inspected source products were backordered; ready-to-ship sample entries are fictional availability examples.

Review each product's prices, valid finishes, dimensions, images, stock, lead time, shipping class, and installation requirement. In its editor, mark the verification checkbox after review. Connected checkout rejects unverified products.

Review delivery rates, remote-area assumptions, free-delivery eligibility, rewards economics, tax registration, and policies in Settings. Existing site pages disagree about some delivery thresholds and rates; see [reference/assets.md](reference/assets.md). The `policies_approved` setting keeps connected checkout closed until the owner approves the configured terms.

Current delivery pricing uses one installation fee per order and the largest shipping class per shipment. Separate ready/backorder shipments each incur their applicable delivery fee. Remote-area defaults use editable street keywords and postal prefixes; verify their suitability for the business before launch. Optional express delivery adds its configured surcharge per shipment after items are available. Prices include the configured GST rate.

## Stripe setup

Use the business owner's Stripe account and **test-mode** keys first. Add a webhook endpoint at `/api/stripe/webhook` for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

Set its signing secret as `STRIPE_WEBHOOK_SECRET`. Enable payment methods supported by the account. Stripe Checkout handles payment details; this app never stores card numbers.

For local webhook forwarding, use Stripe CLI:

```sh
stripe listen --forward-to localhost:3030/api/stripe/webhook
```

Use the CLI-provided signing secret locally. Create an actual test Checkout purchase and test both full and partial refunds after the database is connected. Local database tests validate accounting, but do not replace a test against the real Stripe account.

The server recalculates the basket, then reserves stock and points in a database transaction. Stripe confirms payments through signed webhooks. Payment state is separate from shipment state. Duplicate events cannot repeat fulfilment or points awards. Amount, currency, and order association are checked. Zero-payment Stripe sessions are valid only when Stripe reports that no payment is required and the order total is zero.

Refunds use Stripe's original payment method. Cumulative refund accounting handles duplicate and out-of-order events. Points earned on refunded spend are reversed proportionally; redeemed points are restored proportionally. Spent refunded points can create a negative balance that future earnings repay. Expired unused points are not reclaimed as new debt. Physical returns are restocked separately.

## Emails and maintenance

Set `RESEND_API_KEY`, a verified `EMAIL_FROM`, and a random `CRON_SECRET` of at least 32 characters. `/api/cron` requires `Authorization: Bearer <CRON_SECRET>`. It expires unused points, reconciles overdue Stripe reservations, and delivers up to 30 queued emails per invocation. Retries use provider idempotency keys. Marketing jobs recheck subscription status before delivery.

[vercel.json](vercel.json) schedules maintenance once daily at midnight UTC, during the 8am hour in Singapore. This schedule works with Vercel Hobby, whose cron jobs run at most once daily and can start anywhere within the scheduled hour; see [Vercel's scheduling limits](https://vercel.com/docs/cron-jobs/usage-and-pricing). Vercel supplies the cron secret header automatically.

With the daily schedule, queued emails are processed only once a day, up to 30 per invocation. A larger queue takes additional runs to drain. Stripe webhooks still confirm payments and release expired Checkout reservations when their events arrive, but maintenance recovery for missed events and reservations without a Stripe session waits for the next run. For timely emails and recovery, configure an external scheduler to send a GET request to `https://your-domain/api/cron` every five minutes with `Authorization: Bearer <CRON_SECRET>`, or use a Vercel plan that supports `*/5 * * * *`. Only restore that expression in `vercel.json` after changing plans. Monitor notification failures under Settings. Payment confirmation is independent of email delivery.

## Owner guide

- **Products:** edit pieces and variants, reorder or upload photos, set available stock, archive by switching Published to Draft, and import/export CSV. Categories and filters derive from product fields. CSV prices use SGD amounts, not cents. One row represents one SKU. Imports require review before checkout.
- **Orders & deliveries:** open an order, confirm its delivery appointment in Singapore time, record the time window and tracking link, and add customer-visible progress updates. Keep private information in Internal notes.
- **Customers:** inspect order history and apply points adjustments with a required reason. Joining rewards is separate from email consent.
- **Happy rewards:** create fixed discounts, percentage discounts, delivery benefits, or gift-product rewards. Set dates, minimum spend, eligible products, and per-member limits. Rewards and discount codes do not stack.
- **Marketing:** create dated discount codes, write and preview an email, queue a test email, and explicitly confirm a campaign send. Repeated sends of the same campaign do not duplicate recipients. Create a new campaign for a new send.
- **Content & collections:** update homepage text, showroom details, the brand story, FAQs, and shoppable collection pages. Preview a collection and schedule its publication. Share collection links with `utm_source`, `utm_medium`, and `utm_campaign` for order attribution.
- **Settings:** maintain delivery and earning rules, publish reviewed policies, manage staff and new-order notification recipients, retry failed notifications, and inspect the audit trail.

Customer accounts show orders, rewards history, saved addresses, and browser-saved favourites. Guest tracking links are scoped to one order and expire after 90 days. Order pages refresh every 30 seconds. Admin reports cover the most recent 200 orders; reporting queries should be extended when volume exceeds that window.

## Branding and design maintenance

Owners can change the business name, wordmark, tagline, logo image URL, Instagram link, colours, heading/body fonts, text size, and button shape under **Admin → Settings → Your brand, everywhere**. The preview shows unsaved changes; **Save changes** applies them to the store. Colour validation requires at least 4.5:1 contrast for main and secondary text against the page, panel, and soft-accent backgrounds. Button foreground colours adjust automatically. Reload a storefront page after saving to refresh its browser title and favicon.

Branding lives in `thehappyplace_settings.value.branding`. Existing databases use the defaults when this field is absent. No SQL migration or setup rerun is needed. Only the owner settings action can update branding; marketing content edits preserve it.

| Change                                                                          | Where to maintain it                                     |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Default brand identity, palette, font presets, text scale, button shapes        | [src/lib/branding.ts](src/lib/branding.ts)               |
| Shared spacing, control sizes, derived surfaces, status colours, photo overlays | [src/styles/tokens.css](src/styles/tokens.css)           |
| Base typography, focus styles, theme wrapper, animations                        | [src/styles/base.css](src/styles/base.css)               |
| Header, footer, homepage, product cards, cart                                   | [src/styles/storefront.css](src/styles/storefront.css)   |
| Shop, product detail, checkout, account, rewards, policy pages                  | [src/styles/commerce.css](src/styles/commerce.css)       |
| Admin layouts, tables, editors, branding preview                                | [src/styles/admin.css](src/styles/admin.css)             |
| Phone/tablet layouts and reduced-motion rules                                   | [src/styles/responsive.css](src/styles/responsive.css)   |
| Import order for all styles                                                     | [src/app/globals.css](src/app/globals.css)               |
| Furniture finish swatches, independent of branding                              | [src/lib/product-colours.ts](src/lib/product-colours.ts) |

To add a custom font, place licensed WOFF2 files in `public/fonts/`, define `@font-face` in `src/styles/base.css` with `font-display: swap`, then register the font stack in `headingFonts` or `bodyFonts` in `src/lib/branding.ts`. Add its key to the corresponding schema enum; the admin dropdown reads the registry automatically. Keep font names and CSS in code instead of accepting arbitrary font URLs from the settings form.

New components should use existing `.button`, `.form-field`, `.notice`, and layout classes. Use semantic variables such as `var(--paper)`, `var(--ink)`, `var(--accent-text)`, and `var(--text-body)` for appearance. Keep product-specific colours in catalogue data. The global error page uses default branding because the database may be unavailable.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Tests use an isolated in-memory PostgreSQL engine, with Auth and Storage schemas stubbed for migrations. They exercise transactional pricing, reservations, payment replay, refunds, points, and permissions. No test connects to a production database or sends real email.

Typography uses a 16px body and form size with secondary labels at least 14px at the default browser size. Font sizes use rem units so they follow browser text preferences. Forms stack on phones, navigation adapts to narrower screens, and wide admin tables scroll within their panels.

Isolated headless Chrome checks cover the storefront, checkout, account, order tracking, and admin at 320, 390, 768, 1024, and 1440px widths. Checks include enlarged text, mobile navigation, cart, search, account tabs, and admin editors. Sample data is used with Supabase disconnected. Complete an actual Stripe test purchase and an email-delivery test before launch.

Next.js was upgraded from the reference repo's version to fix runtime advisories. `npm audit --omit=dev` is the production dependency check. The lint toolchain currently inherits the published `braces` 3.0.3 advisory; npm's suggested downgrade is incompatible with this Next.js setup. Recheck for a patched lint dependency before accepting untrusted glob patterns in development tooling.

## Deployment

Deploy as a standard Next.js project after owner authorisation. Configure the selected Supabase project, verified email domain, Stripe test keys, webhook, cron secret, and production site URL. Preview deployments need their own allowed authentication redirect and Stripe webhook configuration. Production credentials and live payments should be enabled only after the owner approves the reviewed catalogue, policies, and tested flows. Set `STRIPE_LIVE_ENABLED=true` only for that approved launch; live keys are rejected otherwise.

No live site, payment connection, existing customer migration, or real campaign send has been performed by this build.
