import {
  brandingSchema,
  brandingStyles,
  headingFonts,
  bodyFonts,
  type Branding,
} from "./branding";

// HTML escaping also neutralizes Go template delimiters in editable brand text.
const html = (value: string) =>
  value.replace(
    /[&<>"'{}]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "{": "&#123;",
        "}": "&#125;",
      })[character]!,
  );

export function authEmailCallbacks(origins: string[]): string[] {
  if (!origins.length)
    throw new Error("Provide at least one Happy Place origin.");
  return [
    ...new Set(
      origins.flatMap((origin) => {
        const url = new URL(origin);
        if (
          (url.protocol !== "https:" &&
            !(url.protocol === "http:" && url.hostname === "localhost")) ||
          url.username ||
          url.password ||
          url.search ||
          url.hash ||
          url.pathname !== "/"
        )
          throw new Error(
            "Use an HTTPS website origin, or HTTP localhost, without a path.",
          );
        const callback = `${url.origin}/auth/callback`;
        return [
          callback,
          ...["/account", "/admin"].map(
            (next) => `${callback}?next=${encodeURIComponent(next)}`,
          ),
        ];
      }),
    ),
  ];
}

export const defaultAuthEmailFallback = `<h2>Your sign-in link</h2>
<p>Follow the link below to sign in. This link expires shortly and can only be used once.</p>
<p><a href="{{ .ConfirmationURL }}">Sign in</a></p>`;

export function createAuthEmail({
  brand: input,
  origins,
  fallbackHtml = defaultAuthEmailFallback,
  fallbackSubject = "Your sign-in link",
}: {
  brand: Branding;
  origins: string[];
  fallbackHtml?: string;
  fallbackSubject?: string;
}) {
  const brand = brandingSchema.parse(input);
  const callbacks = authEmailCallbacks(origins);
  const condition = `or ${callbacks.map((url) => `(eq .RedirectTo ${JSON.stringify(url)})`).join(" ")}`;
  const { colours } = brand;
  const styles = brandingStyles(brand) as Record<string, string>;
  const heading = html(headingFonts[brand.heading_font].stack);
  const body = html(bodyFonts[brand.body_font].stack);
  const size = brand.text_size === "large" ? 18 : 16;
  const logo = brand.logo_url
    ? `<img src="${html(new URL(brand.logo_url, origins[0]).href)}" alt="${html(brand.name)}" width="220" style="display:block;width:auto;max-width:220px;max-height:64px;border:0;">`
    : `<span style="font-family:${heading};font-size:32px;line-height:1.2;letter-spacing:-1px;">${html(brand.wordmark)}<span style="color:${styles["--accent-text"]};">.</span></span>`;
  const brandedHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in to ${html(brand.name)}</title>
  <style>@media only screen and (max-width:480px){.email-padding{padding:28px 22px!important;}}</style>
</head>
<body style="margin:0;padding:0;background-color:${colours.cream};color:${colours.ink};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Your sign-in link for ${html(brand.name)}. Make yourself at home.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${colours.cream};">
    <tr><td align="center" style="padding:28px 12px;">
      <!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:${colours.paper};border:1px solid ${colours.line};font-family:${body};">
        <tr><td class="email-padding" style="padding:40px 40px 32px;border-bottom:1px solid ${colours.line};overflow-wrap:anywhere;">
          ${logo}
          ${brand.tagline ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:${colours.muted};letter-spacing:0.5px;">${html(brand.tagline)}</p>` : ""}
        </td></tr>
        <tr><td class="email-padding" style="padding:38px 40px;overflow-wrap:anywhere;">
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;letter-spacing:1.4px;">MAKE YOURSELF AT HOME</p>
          <h1 style="margin:0 0 22px;font-family:${heading};font-size:34px;font-weight:400;letter-spacing:-0.8px;line-height:1.2;">Your happy place awaits.</h1>
          <p style="margin:0 0 24px;font-size:${size}px;line-height:1.75;">Sign in to see your orders, save your favourite pieces, and collect Happy Rewards.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="${colours.accent}" style="background-color:${colours.accent};border-radius:${styles["--button-radius"]};mso-padding-alt:17px 24px;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:17px 24px;font-family:${body};font-size:${size}px;line-height:1.4;color:${styles["--on-accent"]};text-decoration:none;border-radius:${styles["--button-radius"]};">Sign in to ${html(brand.name)}</a>
          </td></tr></table>
          <p style="margin:26px 0 0;font-size:14px;line-height:1.75;color:${colours.muted};">This link is for one use and expires shortly. Open it in the same browser where you requested it.</p>
        </td></tr>
        <tr><td class="email-padding" style="padding:24px 40px;background-color:${colours.accent_soft};font-size:14px;line-height:1.75;color:${colours.muted};overflow-wrap:anywhere;">
          If you didn't request this email, you can safely ignore it.
          <p style="margin:12px 0 0;color:${colours.ink};">${html(brand.name)}</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;
  return {
    callbacks,
    content: `{{ if ${condition} }}\n${brandedHtml}\n{{ else }}\n${fallbackHtml}\n{{ end }}\n`,
    // A quoted Go action prints the editable subject without interpreting it.
    subject: `{{ if ${condition} }}{{ ${JSON.stringify(`Sign in to ${brand.name}`)} }}{{ else }}${fallbackSubject}{{ end }}\n`,
    preview: brandedHtml.replaceAll("{{ .ConfirmationURL }}", "#preview-only"),
  };
}
