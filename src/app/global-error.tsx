"use client";
import { brandingStyles, resolveBranding } from "@/lib/branding";
import "./globals.css";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en" style={brandingStyles(resolveBranding())}>
      <body className="global-error-page">
        <h1>We need a moment.</h1>
        <p>
          The store connection is temporarily unavailable. Please try again.
        </p>
        <button onClick={reset} className="button dark">
          Try again
        </button>
      </body>
    </html>
  );
}
