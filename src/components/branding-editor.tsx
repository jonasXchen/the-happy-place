"use client";
import { ArrowRight } from "lucide-react";
import { Field } from "./forms";
import { Logo } from "./shell";
import {
  bodyFonts,
  headingFonts,
  brandingSchema,
  brandingStyles,
  resolveBranding,
  type Branding,
} from "@/lib/branding";

const colourLabels = {
  paper: "Page background",
  cream: "Panel background",
  ink: "Main text",
  muted: "Secondary text",
  line: "Borders",
  accent: "Brand accent",
  accent_soft: "Soft accent background",
} as const;

export function BrandingEditor({
  value,
  onChange,
}: {
  value: Branding;
  onChange: (brand: Branding) => void;
}) {
  const change = <K extends keyof Branding>(key: K, next: Branding[K]) =>
    onChange({ ...value, [key]: next });
  const validation = brandingSchema.safeParse(value);
  const preview = resolveBranding(value);
  return (
    <section className="admin-card" aria-labelledby="branding-heading">
      <h2 id="branding-heading">Your brand, everywhere.</h2>
      <p className="small-text muted">
        Choose your colours, fonts, and logo. Preview your changes below, then
        save your settings to apply them.
      </p>
      <div className="form-grid" style={{ marginTop: 24 }}>
        <Field label="Business name">
          <input
            value={value.name}
            onChange={(e) => change("name", e.target.value)}
            maxLength={64}
            required
          />
        </Field>
        <Field label="Wordmark text">
          <input
            value={value.wordmark}
            onChange={(e) => change("wordmark", e.target.value)}
            maxLength={64}
            required
          />
        </Field>
        <Field label="Brand tagline">
          <input
            value={value.tagline}
            onChange={(e) => change("tagline", e.target.value)}
            maxLength={100}
          />
        </Field>
        <Field label="Logo image URL, optional">
          <input
            value={value.logo_url}
            onChange={(e) => change("logo_url", e.target.value)}
            placeholder="/images/logo.svg or https://…"
          />
        </Field>
        <Field label="Instagram URL, optional">
          <input
            value={value.instagram_url}
            onChange={(e) => change("instagram_url", e.target.value)}
            type="url"
            placeholder="https://www.instagram.com/…"
          />
        </Field>
        <Field label="Heading font">
          <select
            aria-label="Heading font"
            value={value.heading_font}
            onChange={(e) =>
              change("heading_font", e.target.value as Branding["heading_font"])
            }
          >
            {Object.entries(headingFonts).map(([id, font]) => (
              <option key={id} value={id}>
                {font.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Body font">
          <select
            aria-label="Body font"
            value={value.body_font}
            onChange={(e) =>
              change("body_font", e.target.value as Branding["body_font"])
            }
          >
            {Object.entries(bodyFonts).map(([id, font]) => (
              <option key={id} value={id}>
                {font.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Text size">
          <select
            aria-label="Text size"
            value={value.text_size}
            onChange={(e) =>
              change("text_size", e.target.value as Branding["text_size"])
            }
          >
            <option value="comfortable">Comfortable</option>
            <option value="large">Large</option>
          </select>
        </Field>
        <Field label="Button shape">
          <select
            aria-label="Button shape"
            value={value.button_shape}
            onChange={(e) =>
              change("button_shape", e.target.value as Branding["button_shape"])
            }
          >
            <option value="square">Square</option>
            <option value="soft">Soft corners</option>
            <option value="rounded">Rounded</option>
          </select>
        </Field>
      </div>
      <div className="brand-colour-grid">
        {Object.entries(colourLabels).map(([key, caption]) => {
          const id = key as keyof Branding["colours"];
          return (
            <Field key={id} label={caption}>
              <div className="brand-colour-control">
                <input
                  type="color"
                  aria-label={`Choose ${caption.toLowerCase()}`}
                  value={
                    /^#[0-9a-f]{6}$/i.test(value.colours[id])
                      ? value.colours[id]
                      : "#000000"
                  }
                  onChange={(e) =>
                    change("colours", {
                      ...value.colours,
                      [id]: e.target.value,
                    })
                  }
                />
                <input
                  aria-label={`${caption} hex value`}
                  value={value.colours[id]}
                  maxLength={7}
                  spellCheck={false}
                  onChange={(e) =>
                    change("colours", {
                      ...value.colours,
                      [id]: e.target.value,
                    })
                  }
                />
              </div>
            </Field>
          );
        })}
      </div>
      {!validation.success && (
        <div className="notice error" role="alert">
          {Array.from(
            new Set(validation.error.issues.map((issue) => issue.message)),
          ).join(" ")}{" "}
          The preview uses the default brand until these fields are valid.
        </div>
      )}
      <div
        className="brand-preview"
        style={brandingStyles(preview)}
        aria-label="Brand preview"
      >
        <Logo brand={preview} />
        <div className="brand-preview-copy">
          <span className="eyebrow">A SPACE THAT FEELS LIKE YOU</span>
          <h2>Make yourself at home.</h2>
          <p>
            Considered pieces for everyday living. This is how your colours and
            fonts will look together.
          </p>
          <p className="muted small-text">
            Secondary text stays readable against your chosen backgrounds.
          </p>
          <button className="button dark" type="button">
            Explore your pieces <ArrowRight size={16} />
          </button>
          <span className="brand-preview-accent">
            A little inspiration, every now and then.
          </span>
        </div>
      </div>
    </section>
  );
}
