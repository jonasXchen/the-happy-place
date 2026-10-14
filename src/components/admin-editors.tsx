"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  X,
  Plus,
  Trash2,
  Upload,
  ArrowRight,
  ArrowUpRight,
  Eye,
  Mail,
  Check,
  Save,
  Truck,
} from "lucide-react";
import { useStore } from "./store";
import { Field } from "./forms";
import {
  productSchema,
  rewardSchema,
  campaignSchema,
  collectionSchema,
} from "@/lib/validation";
import { settingsSchema } from "@/lib/admin-validation";
import { resolveBranding } from "@/lib/branding";
import { BrandingEditor } from "./branding-editor";
import {
  money,
  date,
  label,
  statuses,
  type Product,
  type Reward,
  type Campaign,
  type Collection,
  type Order,
  type Shipment,
} from "@/lib/types";
import type { AdminMutation } from "./admin";
type Common = { onClose: () => void; mutate: AdminMutation; busy: boolean };
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const elements = ref.current?.querySelectorAll<HTMLElement>(
          "button,input,select,textarea,a[href]",
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-centered" onClick={onClose}>
      <div
        className="form-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close editor"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
function Text({
  label: caption,
  value,
  onChange,
  area = false,
  type = "text",
  required = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  area?: boolean;
  type?: string;
  required?: boolean;
}) {
  return (
    <Field label={caption}>
      {area ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </Field>
  );
}
function Amount({
  label: caption,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={caption}>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value / 100}
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 100))}
      />
    </Field>
  );
}
function Toggle({
  label: caption,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-label">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {caption}
    </label>
  );
}
function ErrorNotice({ value }: { value: string }) {
  return value ? (
    <div className="notice error" role="alert">
      {value}
    </div>
  ) : null;
}
function validationMessage(e: unknown) {
  const err = e as {
    name: string;
    message: string;
    issues?: { path: unknown[]; message: string }[];
  };
  return err.name === "ZodError"
    ? err.issues
        ?.map((i) => `${i.path.join(".")}: ${i.message}`)
        .slice(0, 4)
        .join(". ") || "Please check the fields."
    : err.message;
}
function toInput(value?: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
function fromInput(value: string) {
  return value ? new Date(`${value}:00+08:00`).toISOString() : null;
}
function DateTime({
  label: caption,
  value,
  onChange,
}: {
  label: string;
  value?: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <Text
      label={`${caption} · Singapore time`}
      type="datetime-local"
      value={toInput(value)}
      onChange={(v) => onChange(fromInput(v))}
    />
  );
}
export function ImageUpload({ onUpload }: { onUpload: (url: string) => void }) {
  const s = useStore();
  const [busy, setBusy] = useState(false);
  return (
    <label className="button outline small" style={{ cursor: "pointer" }}>
      <Upload size={13} />
      {busy ? "Uploading..." : "Upload image"}
      <input
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            if (s.demo) {
              if (file.size > 500000)
                throw new Error(
                  "Use an image under 500 KB in the local preview. Connected uploads support 10 MB.",
                );
              const url = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () =>
                  reject(new Error("Couldn't open that image."));
                reader.readAsDataURL(file);
              });
              onUpload(url);
              return;
            }
            const form = new FormData();
            form.set("file", file);
            const response = await fetch("/api/upload", {
              method: "POST",
              body: form,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            onUpload(data.url);
          } catch (e) {
            s.toast((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}
export function ProductEditor({
  value,
  onClose,
  mutate,
  busy,
}: Common & { value: Product }) {
  const s = useStore();
  const [p, setP] = useState(value);
  const [error, setError] = useState("");
  const [newImage, setNewImage] = useState("");
  const change = <K extends keyof Product>(key: K, v: Product[K]) =>
    setP((current) => ({ ...current, [key]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...p,
        price_cents: Math.min(...p.variants.map((v) => v.price_cents)),
      };
      const validate = s.demo
        ? {
            ...payload,
            images: payload.images.map((v) =>
              v.startsWith("data:") ? "/images/chair.jpg" : v,
            ),
          }
        : payload;
      productSchema.parse(validate);
      await mutate("product", payload, () =>
        s.saveData({
          products: [...s.products.filter((v) => v.id !== p.id), payload],
        }),
      );
      onClose();
    } catch (e) {
      setError(validationMessage(e));
    }
  }
  return (
    <Modal title={p.name || "A new piece."} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Text
            label="Product name"
            required
            value={p.name}
            onChange={(v) => {
              change("name", v);
              if (!value.name)
                change(
                  "slug",
                  v
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/-$/, ""),
                );
            }}
          />
          <Text
            label="URL slug"
            required
            value={p.slug}
            onChange={(v) => change("slug", v)}
          />
          <Text
            label="Category"
            required
            value={p.category}
            onChange={(v) => change("category", v.toLowerCase())}
          />
          <Text
            label="Room"
            value={p.room}
            onChange={(v) => change("room", v)}
          />
          <Text
            label="Style"
            value={p.style}
            onChange={(v) => change("style", v)}
          />
          <Text
            label="Material"
            value={p.material}
            onChange={(v) => change("material", v)}
          />
        </div>
        <Text
          label="Description"
          area
          value={p.description}
          onChange={(v) => change("description", v)}
        />
        <div className="form-grid">
          <Text
            label="Dimensions"
            value={p.dimensions}
            onChange={(v) => change("dimensions", v)}
          />
          <Field label="Shipping class">
            <select
              value={p.shipping_class}
              onChange={(e) =>
                change(
                  "shipping_class",
                  e.target.value as Product["shipping_class"],
                )
              }
            >
              <option value="small">Small home objects</option>
              <option value="medium">Medium furniture</option>
              <option value="large">Large furniture</option>
            </select>
          </Field>
        </div>
        <Text
          label="Care instructions"
          area
          value={p.care}
          onChange={(v) => change("care", v)}
        />
        <h3>Images</h3>
        <div className="image-list">
          {p.images.map((url, i) => (
            <div key={i}>
              <img src={url} alt={`Image ${i + 1}`} />
              <button
                type="button"
                disabled={i === 0}
                onClick={() => {
                  const images = [...p.images];
                  [images[i - 1], images[i]] = [images[i], images[i - 1]];
                  change("images", images);
                }}
              >
                Move left
              </button>
              <button
                type="button"
                onClick={() =>
                  change(
                    "images",
                    p.images.filter((_, n) => n !== i),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <ImageUpload onUpload={(url) => change("images", [...p.images, url])} />
        <Text
          label="Or add an image URL"
          value={newImage}
          onChange={setNewImage}
        />
        <button
          className="button outline small"
          type="button"
          disabled={!newImage}
          onClick={() => {
            if (
              newImage.startsWith("https://") ||
              newImage.startsWith("/images/")
            ) {
              change("images", [...p.images, newImage]);
              setNewImage("");
            } else setError("Use an HTTPS image URL or a local /images/ path.");
          }}
        >
          Add image URL <Plus size={12} />
        </button>
        <h3>Finishes & stock</h3>
        <p className="small-text muted">
          Stock is the quantity available to sell, excluding checkout
          reservations. Leave it empty for made-to-order pieces. Lead time is an
          estimate in weeks.
        </p>
        {p.variants.map((v, i) => (
          <div className="variant-editor" key={v.id}>
            <div className="form-grid">
              {(["label", "sku", "colour", "material", "size"] as const).map(
                (k) => (
                  <Text
                    key={k}
                    label={label(k)}
                    value={v[k]}
                    required={k === "label" || k === "sku"}
                    onChange={(value) =>
                      change(
                        "variants",
                        p.variants.map((q, n) =>
                          n === i ? { ...q, [k]: value } : q,
                        ),
                      )
                    }
                  />
                ),
              )}
              <Amount
                label="Price · SGD, GST included"
                value={v.price_cents}
                onChange={(value) =>
                  change(
                    "variants",
                    p.variants.map((q, n) =>
                      n === i ? { ...q, price_cents: value } : q,
                    ),
                  )
                }
              />
              <Text
                label="Available stock · blank = made to order"
                type="number"
                value={v.stock ?? ""}
                onChange={(value) =>
                  change(
                    "variants",
                    p.variants.map((q, n) =>
                      n === i
                        ? { ...q, stock: value === "" ? null : Number(value) }
                        : q,
                    ),
                  )
                }
              />
              <Text
                label="Lead time · weeks"
                type="number"
                value={v.lead_weeks}
                onChange={(value) =>
                  change(
                    "variants",
                    p.variants.map((q, n) =>
                      n === i ? { ...q, lead_weeks: Number(value) } : q,
                    ),
                  )
                }
              />
            </div>
            <button
              className="small-text muted"
              type="button"
              disabled={p.variants.length === 1}
              onClick={() =>
                change(
                  "variants",
                  p.variants.filter((_, n) => n !== i),
                )
              }
            >
              <Trash2 size={12} style={{ display: "inline" }} /> Remove finish
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button outline small"
          onClick={() =>
            change("variants", [
              ...p.variants,
              {
                id: crypto.randomUUID(),
                product_id: p.id,
                label: "New finish",
                sku: `THP-${Date.now().toString().slice(-8)}`,
                colour: "",
                material: p.material,
                size: "Standard",
                price_cents: p.price_cents,
                stock: null,
                lead_weeks: 8,
              },
            ])
          }
        >
          <Plus size={13} />
          Add finish
        </button>
        <Toggle
          label="This piece requires installation"
          value={p.installation}
          onChange={(v) => change("installation", v)}
        />
        <Toggle
          label="Feature on the homepage"
          value={p.featured}
          onChange={(v) => change("featured", v)}
        />
        <Toggle
          label="Publish in the shop"
          value={p.active}
          onChange={(v) => change("active", v)}
        />
        <Toggle
          label="I have verified variant prices, stock, dimensions, and lead times"
          value={!p.sample}
          onChange={(v) => change("sample", !v)}
        />
        {p.sample && (
          <div className="notice">
            Unverified pieces appear in the preview catalogue, but connected
            checkout rejects them until reviewed.
          </div>
        )}
        <ErrorNotice value={error} />
        <button className="button dark full" disabled={busy}>
          {busy ? "Saving..." : "Save piece"}
          <Check size={16} />
        </button>
      </form>
    </Modal>
  );
}
function ProductPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const s = useStore();
  return (
    <div className="variant-editor">
      <span className="small-text muted">
        Eligible pieces. Leave all unchecked for the whole catalogue.
      </span>
      {s.products.map((p) => (
        <label className="toggle-label" key={p.id} style={{ margin: "10px 0" }}>
          <input
            type="checkbox"
            checked={value.includes(p.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...value, p.id]
                  : value.filter((id) => id !== p.id),
              )
            }
          />
          {p.name}
        </label>
      ))}
    </div>
  );
}
export function RewardEditor({
  value,
  onClose,
  mutate,
  busy,
}: Common & { value: Reward }) {
  const s = useStore();
  const [r, setR] = useState(value);
  const [error, setError] = useState("");
  const change = <K extends keyof Reward>(key: K, v: Reward[K]) =>
    setR((q) => ({ ...q, [key]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      rewardSchema.parse(r);
      await mutate("reward", r, () =>
        s.saveData({ rewards: [...s.rewards.filter((q) => q.id !== r.id), r] }),
      );
      onClose();
    } catch (e) {
      setError(validationMessage(e));
    }
  }
  return (
    <Modal title={r.title || "A new reward."} onClose={onClose}>
      <form onSubmit={submit}>
        <Text
          label="Reward title"
          value={r.title}
          required
          onChange={(v) => change("title", v)}
        />
        <Text
          label="Description shown to members"
          value={r.description}
          area
          onChange={(v) => change("description", v)}
        />
        <div className="form-grid">
          <Text
            label="Points required"
            type="number"
            value={r.points}
            onChange={(v) => change("points", Number(v))}
          />
          <Field label="Reward type">
            <select
              value={r.kind}
              onChange={(e) => change("kind", e.target.value as Reward["kind"])}
            >
              <option value="fixed">Fixed discount</option>
              <option value="percent">Percentage discount</option>
              <option value="shipping">Standard delivery</option>
              <option value="gift">Gift product</option>
            </select>
          </Field>
          {r.kind === "fixed" ? (
            <Amount
              label="Discount amount · SGD"
              value={r.value}
              onChange={(v) => change("value", v)}
            />
          ) : r.kind === "percent" ? (
            <Text
              label="Percentage"
              type="number"
              value={r.value}
              onChange={(v) => change("value", Number(v))}
            />
          ) : null}
          <Amount
            label="Minimum basket spend · SGD"
            value={r.min_spend_cents}
            onChange={(v) => change("min_spend_cents", v)}
          />
          <Text
            label="Redemptions per member · 0 = unlimited"
            type="number"
            value={r.limit_per_customer}
            onChange={(v) => change("limit_per_customer", Number(v))}
          />
        </div>
        {r.kind === "gift" && (
          <Field label="Gift product finish">
            <select
              value={r.gift_variant_id || ""}
              required
              onChange={(e) => change("gift_variant_id", e.target.value)}
            >
              <option value="">Choose a gift</option>
              {s.products.flatMap((p) =>
                p.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {p.name} · {v.label}
                  </option>
                )),
              )}
            </select>
          </Field>
        )}
        <div className="form-grid">
          <DateTime
            label="Available from"
            value={r.starts_at}
            onChange={(v) => change("starts_at", v)}
          />
          <DateTime
            label="Ends"
            value={r.ends_at}
            onChange={(v) => change("ends_at", v)}
          />
        </div>
        <Text
          label="Reward image URL"
          value={r.image || ""}
          onChange={(v) => change("image", v)}
        />
        <ImageUpload onUpload={(url) => change("image", url)} />
        <ProductPicker
          value={r.product_ids}
          onChange={(v) => change("product_ids", v)}
        />
        <Toggle
          label="Activate this reward"
          value={r.active}
          onChange={(v) => change("active", v)}
        />
        <p className="small-text muted" style={{ marginBottom: 20 }}>
          Rewards cannot be combined with discount codes. Each order keeps a
          snapshot of its reward terms.
        </p>
        <ErrorNotice value={error} />
        <button className="button dark full" disabled={busy}>
          Save reward <Check size={16} />
        </button>
      </form>
    </Modal>
  );
}
export function CampaignEditor({
  value,
  onClose,
  mutate,
  busy,
}: Common & { value: Campaign }) {
  const s = useStore();
  const [c, setC] = useState(value);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const change = <K extends keyof Campaign>(key: K, v: Campaign[K]) =>
    setC((q) => ({ ...q, [key]: v }));
  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    try {
      campaignSchema.parse(c);
      await mutate("campaign", c, () =>
        s.saveData({
          campaigns: [...s.campaigns.filter((q) => q.id !== c.id), c],
        }),
      );
      return true;
    } catch (e) {
      setError(validationMessage(e));
      return false;
    }
  }
  async function send(test: boolean) {
    try {
      if (!(await save())) return;
      await mutate(test ? "test_campaign" : "send_campaign", { id: c.id }, () =>
        s.toast("Preview only. No email was sent."),
      );
      setConfirmSend(false);
    } catch (e) {
      setError(validationMessage(e));
    }
  }
  return (
    <Modal title={c.title || "Something good to share."} onClose={onClose}>
      <form onSubmit={save}>
        <Text
          label="Campaign title"
          required
          value={c.title}
          onChange={(v) => change("title", v)}
        />
        <Text
          label="Discount code"
          required
          value={c.code}
          onChange={(v) => change("code", v.toUpperCase())}
        />
        <div className="form-grid">
          <Field label="Offer type">
            <select
              value={c.kind}
              onChange={(e) =>
                change("kind", e.target.value as Campaign["kind"])
              }
            >
              <option value="percent">Percentage discount</option>
              <option value="fixed">Fixed discount</option>
            </select>
          </Field>
          {c.kind === "fixed" ? (
            <Amount
              label="Discount · SGD"
              value={c.value}
              onChange={(v) => change("value", v)}
            />
          ) : (
            <Text
              label="Percentage off"
              type="number"
              value={c.value}
              onChange={(v) => change("value", Number(v))}
            />
          )}
          <Amount
            label="Minimum spend · SGD"
            value={c.min_spend_cents}
            onChange={(v) => change("min_spend_cents", v)}
          />
          <Text
            label="Maximum uses · 0 = unlimited"
            type="number"
            value={c.max_uses}
            onChange={(v) => change("max_uses", Number(v))}
          />
          <DateTime
            label="Starts"
            value={c.starts_at}
            onChange={(v) => change("starts_at", v || new Date().toISOString())}
          />
          <DateTime
            label="Ends"
            value={c.ends_at}
            onChange={(v) => change("ends_at", v || new Date().toISOString())}
          />
        </div>
        <ProductPicker
          value={c.product_ids}
          onChange={(v) => change("product_ids", v)}
        />
        <Toggle
          label="Enable this discount code during its scheduled dates"
          value={c.active}
          onChange={(v) => change("active", v)}
        />
        <h3>An email to go with it.</h3>
        <Text
          label="Email subject"
          value={c.subject}
          onChange={(v) => change("subject", v)}
        />
        <Text
          label="Email message"
          area
          value={c.message}
          onChange={(v) => change("message", v)}
        />
        <div className="inline-actions">
          <button
            className="button outline small"
            type="button"
            onClick={() => setPreview(!preview)}
          >
            <Eye size={13} />
            Preview email
          </button>
          <button
            className="button outline small"
            type="button"
            disabled={busy}
            onClick={() => void send(true)}
          >
            <Mail size={13} />
            Send test to myself
          </button>
        </div>
        {preview && (
          <div className="editor-preview">
            <strong>{c.subject}</strong>
            <p className="preline">{c.message}</p>
            <p className="small-text muted">
              A personal unsubscribe link is added to each campaign email.
            </p>
          </div>
        )}
        <ErrorNotice value={error} />
        <button className="button dark full" disabled={busy}>
          Save campaign <Check size={16} />
        </button>
        <button
          className="button outline full"
          style={{ marginTop: 15 }}
          type="button"
          disabled={busy || !c.subject || !c.message}
          onClick={() => setConfirmSend(true)}
        >
          Review email send <ArrowRight size={16} />
        </button>
        {confirmSend && (
          <div className="notice" style={{ marginTop: 20 }}>
            This queues the saved email for every currently opted-in subscriber.
            It does not send to customers who have opted out.
            <div className="inline-actions" style={{ marginTop: 15 }}>
              <button
                type="button"
                className="button dark small"
                disabled={busy}
                onClick={() => void send(false)}
              >
                {s.demo ? "Preview send" : "Queue campaign for subscribers"}
              </button>
              <button type="button" onClick={() => setConfirmSend(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
export function CollectionEditor({
  value,
  onClose,
  mutate,
  busy,
}: Common & { value: Collection }) {
  const s = useStore();
  const [c, setC] = useState(value);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const change = <K extends keyof Collection>(key: K, v: Collection[K]) =>
    setC((q) => ({ ...q, [key]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      collectionSchema.parse(c);
      await mutate("collection", c, () =>
        s.saveData({
          collections: [...s.collections.filter((q) => q.id !== c.id), c],
        }),
      );
      onClose();
    } catch (e) {
      setError(validationMessage(e));
    }
  }
  return (
    <Modal title={c.title || "A new collection."} onClose={onClose}>
      <form onSubmit={submit}>
        <Text
          label="Collection title"
          required
          value={c.title}
          onChange={(v) => {
            change("title", v);
            if (!value.title)
              change(
                "slug",
                v
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/-$/, ""),
              );
          }}
        />
        <Text
          label="URL slug"
          required
          value={c.slug}
          onChange={(v) => change("slug", v)}
        />
        <Text
          label="Description"
          area
          value={c.description}
          onChange={(v) => change("description", v)}
        />
        <Text
          label="Collection image URL"
          value={c.image}
          onChange={(v) => change("image", v)}
        />
        <ImageUpload onUpload={(url) => change("image", url)} />
        <ProductPicker
          value={c.product_ids}
          onChange={(v) => change("product_ids", v)}
        />
        <div className="form-grid">
          <DateTime
            label="Publish at"
            value={c.publish_at}
            onChange={(v) => change("publish_at", v)}
          />
          <DateTime
            label="Unpublish at"
            value={c.ends_at}
            onChange={(v) => change("ends_at", v)}
          />
        </div>
        <Text
          label="SEO title, optional"
          value={c.seo_title || ""}
          onChange={(v) => change("seo_title", v)}
        />
        <Text
          label="SEO description, optional"
          area
          value={c.seo_description || ""}
          onChange={(v) => change("seo_description", v)}
        />
        <Toggle
          label="Publish this collection at its scheduled time"
          value={c.active}
          onChange={(v) => change("active", v)}
        />
        <button
          className="button outline small"
          type="button"
          onClick={() => setPreview(!preview)}
        >
          <Eye size={13} />
          Preview
        </button>
        {preview && (
          <div className="editor-preview">
            <img
              src={c.image}
              alt="Collection preview"
              style={{ height: 220, width: "100%", objectFit: "cover" }}
            />
            <h2 style={{ marginTop: 20 }}>{c.title}</h2>
            <p>{c.description}</p>
            <p className="small-text muted">
              {c.product_ids.length} linked pieces
            </p>
          </div>
        )}
        <ErrorNotice value={error} />
        <button
          className="button dark full"
          style={{ marginTop: 20 }}
          disabled={busy}
        >
          Save collection <Check size={16} />
        </button>
        <p className="small-text muted" style={{ marginTop: 15 }}>
          Share /collections/{c.slug} with UTM parameters. The collection image
          also becomes its social preview image.
        </p>
      </form>
    </Modal>
  );
}
export function SettingsEditor({
  kind,
  mutate,
  busy,
}: {
  kind: "content" | "settings";
  mutate: AdminMutation;
  busy: boolean;
}) {
  const s = useStore();
  const [settings, setSettings] = useState({
    ...s.settings,
    branding: resolveBranding(s.settings.branding),
  });
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const change = <K extends keyof typeof settings>(
    key: K,
    v: (typeof settings)[K],
  ) => setSettings((old) => ({ ...old, [key]: v }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      settingsSchema.parse(settings);
      await mutate(kind === "content" ? "content" : "settings", settings, () =>
        s.saveData({ settings }),
      );
    } catch (e) {
      setError(validationMessage(e));
    }
  }
  return (
    <form onSubmit={save} className="admin-settings">
      {kind === "content" ? (
        <>
          <div className="admin-card">
            <h2>The first hello.</h2>
            <Text
              label="Homepage headline"
              area
              value={settings.hero_title}
              onChange={(v) => change("hero_title", v)}
            />
            <Text
              label="Homepage introduction"
              area
              value={settings.hero_subtitle}
              onChange={(v) => change("hero_subtitle", v)}
            />
            <Text
              label="Hero image URL"
              value={settings.hero_image}
              onChange={(v) => change("hero_image", v)}
            />
            <ImageUpload onUpload={(url) => change("hero_image", url)} />
            <Text
              label="Announcement banner"
              value={settings.announcement}
              onChange={(v) => change("announcement", v)}
            />
            <div className="form-grid">
              <DateTime
                label="Banner starts"
                value={settings.announcement_starts_at}
                onChange={(v) => change("announcement_starts_at", v)}
              />
              <DateTime
                label="Banner ends"
                value={settings.announcement_ends_at}
                onChange={(v) => change("announcement_ends_at", v)}
              />
            </div>
            <button
              type="button"
              className="button outline small"
              onClick={() => setPreview(!preview)}
            >
              <Eye size={13} />
              Preview homepage copy
            </button>
            {preview && (
              <div className="editor-preview">
                <img
                  src={settings.hero_image}
                  alt="Homepage preview"
                  style={{ height: 200, width: "100%", objectFit: "cover" }}
                />
                <h2 style={{ marginTop: 20 }}>{settings.hero_title}</h2>
                <p className="preline">{settings.hero_subtitle}</p>
              </div>
            )}
          </div>
          <div className="admin-card">
            <h2>Your story & showroom.</h2>
            <Text
              label="About your business"
              area
              value={settings.about}
              onChange={(v) => change("about", v)}
            />
            <Text
              label="Showroom address"
              area
              value={settings.showroom_address}
              onChange={(v) => change("showroom_address", v)}
            />
            <Text
              label="Showroom opening hours"
              value={settings.showroom_hours}
              onChange={(v) => change("showroom_hours", v)}
            />
            <Text
              label="Public contact email"
              type="email"
              value={settings.contact_email}
              onChange={(v) => change("contact_email", v)}
            />
            <Text
              label="Common questions"
              area
              value={settings.faq}
              onChange={(v) => change("faq", v)}
            />
          </div>
        </>
      ) : (
        <>
          <BrandingEditor
            value={settings.branding}
            onChange={(branding) => change("branding", branding)}
          />
          <div className="admin-card">
            <h2>A new order, in your inbox.</h2>
            <Text
              label="Staff notification email, optional"
              type="email"
              value={settings.notification_email}
              onChange={(v) => change("notification_email", v)}
            />
            <p className="small-text muted">
              This recipient receives an operational email when Stripe confirms
              a new order. It is kept separate from your public contact email.
            </p>
          </div>
          <div className="admin-card">
            <h2>Points, your way.</h2>
            <div className="form-grid">
              <Text
                label="Points per eligible SGD"
                type="number"
                value={settings.points_per_dollar}
                onChange={(v) => change("points_per_dollar", Number(v))}
              />
              <Text
                label="Points valid for · days"
                type="number"
                value={settings.expiry_days}
                onChange={(v) => change("expiry_days", Number(v))}
              />
              <Text
                label="Signup bonus · points"
                type="number"
                value={settings.signup_points}
                onChange={(v) => change("signup_points", Number(v))}
              />
              <Field label="Award points after">
                <select
                  value={settings.award_on}
                  onChange={(e) =>
                    change("award_on", e.target.value as "paid" | "delivered")
                  }
                >
                  <option value="paid">Confirmed Stripe payment</option>
                  <option value="delivered">All pieces delivered</option>
                </select>
              </Field>
            </div>
            <Toggle
              label="Include GST in eligible product spend"
              value={settings.earn_on_tax}
              onChange={(v) => change("earn_on_tax", v)}
            />
            <p className="small-text muted">
              Earning excludes delivery and installation. Discounts reduce
              eligible spend. Changes apply to future orders, with past rules
              kept on each order.
            </p>
          </div>
          <div className="admin-card">
            <h2>Delivery & installation.</h2>
            <div className="form-grid">
              <Amount
                label="Small items · SGD"
                value={settings.shipping_small}
                onChange={(v) => change("shipping_small", v)}
              />
              <Amount
                label="Medium furniture · SGD"
                value={settings.shipping_medium}
                onChange={(v) => change("shipping_medium", v)}
              />
              <Amount
                label="Large furniture · SGD"
                value={settings.shipping_large}
                onChange={(v) => change("shipping_large", v)}
              />
              <Amount
                label="Installation · per order, SGD"
                value={settings.installation_cents}
                onChange={(v) => change("installation_cents", v)}
              />
              <Amount
                label="Remote-area surcharge · SGD"
                value={settings.remote_surcharge}
                onChange={(v) => change("remote_surcharge", v)}
              />
              <Amount
                label="Free-delivery minimum · SGD"
                value={settings.free_shipping_min}
                onChange={(v) => change("free_shipping_min", v)}
              />
            </div>
            <p className="small-text muted">
              Complimentary delivery applies when every item in a shipment
              belongs to an eligible class and reaches the minimum.
            </p>
            {["small", "medium", "large"].map((cls) => (
              <Toggle
                key={cls}
                label={`Allow complimentary delivery for ${cls} items`}
                value={settings.free_shipping_classes.includes(cls)}
                onChange={(value) =>
                  change(
                    "free_shipping_classes",
                    value
                      ? [...settings.free_shipping_classes, cls]
                      : settings.free_shipping_classes.filter((v) => v !== cls),
                  )
                }
              />
            ))}
            <Text
              label="GST rate · percent"
              type="number"
              value={settings.gst_basis_points / 100}
              onChange={(v) =>
                change("gst_basis_points", Math.round(Number(v) * 100))
              }
            />
            <Text
              label="Remote postal prefixes · comma separated"
              value={settings.remote_prefixes.join(", ")}
              onChange={(v) =>
                change(
                  "remote_prefixes",
                  v
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
            <Text
              label="Remote street keywords · comma separated"
              value={settings.remote_keywords.join(", ")}
              onChange={(v) =>
                change(
                  "remote_keywords",
                  v
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
            <Toggle
              label="Offer express delivery after items are available"
              value={settings.express_enabled}
              onChange={(v) => change("express_enabled", v)}
            />
            <Amount
              label="Express surcharge per shipment · SGD"
              value={settings.express_extra_cents}
              onChange={(v) => change("express_extra_cents", v)}
            />
            <p className="small-text muted">
              Product and delivery amounts include GST. Tax settings must
              reflect the business&apos;s registration and approved pricing.
            </p>
          </div>
          <div className="admin-card">
            <h2>Policies before promises.</h2>
            <Text
              label="Delivery information"
              area
              value={settings.shipping_policy}
              onChange={(v) => change("shipping_policy", v)}
            />
            <Text
              label="Returns & cancellation policy"
              area
              value={settings.returns_policy}
              onChange={(v) => change("returns_policy", v)}
            />
            <Text
              label="Privacy policy"
              area
              value={settings.privacy_policy}
              onChange={(v) => change("privacy_policy", v)}
            />
            <Toggle
              label="The owner has reviewed delivery, rewards, tax, and policy settings. Allow connected checkout."
              value={settings.policies_approved}
              onChange={(v) => change("policies_approved", v)}
            />
            {!settings.policies_approved && (
              <div className="notice">
                Connected checkout stays closed until the owner approves these
                settings. Product verification is required separately.
              </div>
            )}
          </div>
        </>
      )}
      <ErrorNotice value={error} />
      <button className="button dark" style={{ marginTop: 25 }} disabled={busy}>
        {busy ? "Saving..." : "Save changes"}
        <Save size={15} />
      </button>
    </form>
  );
}
export function OrderEditor({
  value: onLoad,
  onClose,
  mutate,
  busy,
  canRefund,
}: Common & { value: Order; canRefund: boolean }) {
  const s = useStore();
  const value = s.admin.orders.find((o) => o.id === onLoad.id) || onLoad;
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [newShipment, setNewShipment] = useState(false);
  const [returnItem, setReturnItem] = useState("");
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState("");
  const [notes, setNotes] = useState(value.notes || "");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [refundKey, setRefundKey] = useState(() => crypto.randomUUID());
  async function saveShipment(e: React.FormEvent) {
    e.preventDefault();
    if (!shipment) return;
    try {
      if (!shipment.items.length)
        throw new Error("Choose at least one piece for this delivery.");
      if (
        ["scheduled", "out_for_delivery", "delivered"].includes(
          shipment.status,
        ) &&
        !shipment.scheduled_at
      )
        throw new Error("Confirm the delivery appointment first.");
      for (const item of shipment.items) {
        const ordered = value.items.find((i) => i.id === item.item_id);
        const elsewhere = value.shipments
          .filter((sh) => sh.id !== shipment.id && sh.status !== "cancelled")
          .reduce(
            (sum, sh) =>
              sum +
              (sh.items.find((i) => i.item_id === item.item_id)?.quantity || 0),
            0,
          );
        if (!ordered || elsewhere + item.quantity > ordered.quantity)
          throw new Error(
            "This delivery exceeds the number of ordered pieces. Reduce quantities in another delivery first.",
          );
      }
      await mutate(
        newShipment ? "add_shipment" : "shipment",
        { ...shipment, order_id: value.id },
        () => {
          const updated = newShipment
            ? [...value.shipments, shipment]
            : value.shipments.map((sh) =>
                sh.id === shipment.id ? shipment : sh,
              );
          const delivered =
            updated.length > 0 &&
            updated.every((sh) => sh.status === "delivered");
          const event = {
            id: crypto.randomUUID(),
            status: shipment.status,
            message:
              shipment.customer_note ||
              `Delivery ${label(shipment.status).toLowerCase()}.`,
            created_at: new Date().toISOString(),
          };
          s.saveAdmin({
            orders: s.admin.orders.map((o) =>
              o.id === value.id
                ? {
                    ...o,
                    status: delivered ? "delivered" : shipment.status,
                    shipments: updated,
                    events: [...o.events, event],
                  }
                : o,
            ),
          });
        },
      );
      setShipment(null);
    } catch (e) {
      setError(validationMessage(e));
    }
  }
  async function refund() {
    try {
      await mutate(
        "refund",
        { id: value.id, amount, reason, request_id: refundKey },
        () => {
          if (amount < 1 || amount > value.total_cents - value.refunded_cents)
            throw new Error("Check the refund amount.");
          s.saveAdmin({
            orders: s.admin.orders.map((o) =>
              o.id === value.id
                ? {
                    ...o,
                    refunded_cents: o.refunded_cents + amount,
                    payment_status:
                      o.refunded_cents + amount === o.total_cents
                        ? "refunded"
                        : "partially_refunded",
                    events: [
                      ...o.events,
                      {
                        id: crypto.randomUUID(),
                        status: "refunded",
                        message: `Preview refund of ${money(amount)}. ${reason}`,
                        created_at: new Date().toISOString(),
                      },
                    ],
                  }
                : o,
            ),
          });
        },
      );
      setConfirm(false);
      setRefundKey(crypto.randomUUID());
      setAmount(0);
      setReason("");
    } catch (e) {
      setError(validationMessage(e));
    }
  }
  return (
    <Modal title={value.number} onClose={onClose}>
      <div className="inline-actions">
        <span className={`status-pill ${value.payment_status}`}>
          {label(value.payment_status)}
        </span>
        <span className={`status-pill ${value.status}`}>
          {label(value.status)}
        </span>
        <Link
          href={`/orders/${value.id}`}
          className="text-button"
          style={{ marginLeft: "auto" }}
        >
          Customer view <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="form-grid" style={{ marginTop: 25 }}>
        <div>
          <h3>Customer & delivery address</h3>
          <p className="small-text preline">
            {value.address.name}
            <br />
            {value.customer_email}
            <br />
            {value.address.phone}
            <br />
            {value.address.block} {value.address.street}
            <br />
            {value.address.unit} {value.address.building}
            <br />
            Singapore {value.address.postal}
          </p>
          <p className="small-text muted" style={{ marginTop: 15 }}>
            {value.address.access}
            <br />
            {value.address.instructions}
          </p>
        </div>
        <div>
          <h3>Payment details</h3>
          <p className="small-text">
            Total {money(value.total_cents)}
            <br />
            Refunded {money(value.refunded_cents)}
            <br />
            Points earned {value.awarded_points}
            <br />
            Points redeemed {value.redeemed_points}
          </p>
          <p className="small-text muted" style={{ marginTop: 15 }}>
            Payment status comes from Stripe. Delivery controls do not change
            it.
          </p>
        </div>
      </div>
      <h3>The pieces</h3>
      {value.items.map((i) => (
        <div className="cart-line" key={i.id}>
          <img src={i.image} alt="" />
          <div>
            {i.product_name}
            <p>
              {i.variant_label} · {i.quantity} × {money(i.unit_price_cents)}
            </p>
            <p>{i.lead_weeks} week estimate</p>
          </div>
          <span>{money(i.quantity * i.unit_price_cents)}</span>
        </div>
      ))}
      <h3>Deliveries</h3>
      <button
        className="button outline small"
        disabled={busy || !value.shipments.length}
        onClick={() => {
          setNewShipment(true);
          setShipment({
            id: crypto.randomUUID(),
            status: "preparing",
            items: [],
            scheduled_at: null,
            window: "",
            tracking_url: "",
            customer_note: "",
          });
        }}
      >
        <Plus size={13} />
        Add a delivery
      </button>
      {value.shipments.length === 0 && (
        <p className="small-text muted">
          Deliveries are created after confirmed payment.
        </p>
      )}
      {value.shipments.map((sh, i) => (
        <div className="variant-editor" key={sh.id}>
          <div className="inline-actions">
            <strong className="small-text">Delivery {i + 1}</strong>
            <span className={`status-pill ${sh.status}`}>
              {label(sh.status)}
            </span>
            <button
              className="button outline small"
              style={{ marginLeft: "auto" }}
              onClick={() => {
                setNewShipment(false);
                setShipment(structuredClone(sh));
                setError("");
              }}
            >
              Update delivery <Truck size={12} />
            </button>
          </div>
          <p className="small-text muted" style={{ marginTop: 12 }}>
            {sh.scheduled_at
              ? `${date(sh.scheduled_at)} · ${sh.window}`
              : "No confirmed appointment yet"}
            <br />
            {sh.customer_note}
          </p>
        </div>
      ))}
      {shipment && (
        <form onSubmit={saveShipment} className="variant-editor">
          <h3 style={{ marginTop: 0 }}>A clear update for the customer.</h3>
          <p className="small-text muted">
            Choose the quantity of each piece in this delivery. Moving pieces to
            a new delivery requires reducing their quantities in the original
            delivery first.
          </p>
          {value.items.map((item) => (
            <Text
              key={item.id}
              label={`${item.product_name} · ${item.quantity} ordered`}
              type="number"
              value={
                shipment.items.find((i) => i.item_id === item.id)?.quantity || 0
              }
              onChange={(v) => {
                const quantity = Number(v);
                setShipment({
                  ...shipment,
                  items: [
                    ...shipment.items.filter((i) => i.item_id !== item.id),
                    ...(quantity > 0 ? [{ item_id: item.id, quantity }] : []),
                  ],
                });
              }}
            />
          ))}
          <Field label="Delivery status">
            <select
              value={shipment.status}
              onChange={(e) =>
                setShipment({ ...shipment, status: e.target.value })
              }
            >
              {statuses.map((status) => (
                <option value={status} key={status}>
                  {label(status)}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <DateTime
              label="Confirmed delivery appointment"
              value={shipment.scheduled_at}
              onChange={(v) => setShipment({ ...shipment, scheduled_at: v })}
            />
            <Text
              label="Delivery window"
              value={shipment.window}
              onChange={(v) => setShipment({ ...shipment, window: v })}
            />
          </div>
          <Text
            label="Tracking URL, optional"
            value={shipment.tracking_url}
            onChange={(v) => setShipment({ ...shipment, tracking_url: v })}
          />
          <Text
            label="Customer-visible update"
            area
            value={shipment.customer_note}
            onChange={(v) => setShipment({ ...shipment, customer_note: v })}
          />
          <p className="small-text muted">
            The customer sees this note in their timeline and receives an email
            in connected mode.
          </p>
          <div className="inline-actions">
            <button className="button dark small" disabled={busy}>
              Save delivery update <Check size={13} />
            </button>
            <button
              type="button"
              className="small-text"
              onClick={() => setShipment(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <h3>Internal notes</h3>
      <details className="accordion">
        <summary>Record a physical return</summary>
        <div className="form-grid">
          <Field label="Returned piece">
            <select
              value={returnItem}
              onChange={(e) => setReturnItem(e.target.value)}
            >
              <option value="">Choose a piece</option>
              {value.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.product_name} · {i.refunded_quantity || 0} of {i.quantity}{" "}
                  returned
                </option>
              ))}
            </select>
          </Field>
          <Text
            label="Units returned"
            type="number"
            value={returnQty}
            onChange={(v) => setReturnQty(Number(v))}
          />
        </div>
        <Text
          label="Inspection / return reason"
          value={returnReason}
          onChange={setReturnReason}
        />
        <button
          className="button outline small"
          disabled={busy || !returnItem || returnReason.trim().length < 3}
          onClick={async () => {
            try {
              await mutate(
                "restock",
                {
                  item_id: returnItem,
                  quantity: returnQty,
                  reason: returnReason,
                },
                () => {
                  const item = value.items.find((i) => i.id === returnItem)!;
                  if (
                    returnQty < 1 ||
                    returnQty + (item.refunded_quantity || 0) > item.quantity
                  )
                    throw new Error("Returned units exceed ordered units.");
                  s.saveAdmin({
                    orders: s.admin.orders.map((o) =>
                      o.id === value.id
                        ? {
                            ...o,
                            items: o.items.map((i) =>
                              i.id === returnItem
                                ? {
                                    ...i,
                                    refunded_quantity:
                                      (i.refunded_quantity || 0) + returnQty,
                                  }
                                : i,
                            ),
                          }
                        : o,
                    ),
                  });
                  s.saveData({
                    products: s.products.map((p) => ({
                      ...p,
                      variants: p.variants.map((v) =>
                        v.id === item.variant_id && v.stock !== null
                          ? { ...v, stock: v.stock + returnQty }
                          : v,
                      ),
                    })),
                  });
                },
              );
              setReturnItem("");
              setReturnReason("");
            } catch (e) {
              setError(validationMessage(e));
            }
          }}
        >
          Record inspected return
        </button>
        <p className="small-text muted">
          This restores available stock for tracked variants. It does not refund
          a payment.
        </p>
      </details>
      <Text
        label="Visible to staff only"
        area
        value={notes}
        onChange={setNotes}
      />
      <button
        className="button outline small"
        disabled={busy}
        onClick={() =>
          void mutate("notes", { id: value.id, notes }, () =>
            s.saveAdmin({
              orders: s.admin.orders.map((o) =>
                o.id === value.id ? { ...o, notes } : o,
              ),
            }),
          ).catch(() => {})
        }
      >
        Save staff note
      </button>
      {canRefund && (
        <>
          <h3>Refund a payment</h3>
          <div className="form-grid">
            <Amount
              label="Refund amount · SGD"
              value={amount}
              onChange={setAmount}
            />
            <Text
              label="Reason for the audit trail"
              value={reason}
              onChange={setReason}
            />
          </div>
          <p className="small-text muted">
            Up to {money(value.total_cents - value.refunded_cents)} remains
            refundable. Stripe confirms the payment adjustment. Returns are
            restocked separately after inspection.
          </p>
          <button
            className="button outline small"
            disabled={busy || amount <= 0 || reason.trim().length < 3}
            onClick={() => setConfirm(true)}
          >
            Review refund
          </button>
          {confirm && (
            <div className="notice" style={{ marginTop: 15 }}>
              Refund {money(amount)} to the original payment method? This is a
              financial action.
              <div className="inline-actions" style={{ marginTop: 15 }}>
                <button
                  className="button dark small"
                  disabled={busy}
                  onClick={() => void refund()}
                >
                  {s.demo ? "Record preview refund" : "Submit Stripe refund"}
                </button>
                <button onClick={() => setConfirm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
      <ErrorNotice value={error} />
      <h3>Customer timeline</h3>
      <div className="timeline">
        {[...value.events].reverse().map((e) => (
          <div key={e.id}>
            <h4>{label(e.status)}</h4>
            <p>{e.message}</p>
            <small>{date(e.created_at)}</small>
          </div>
        ))}
      </div>
    </Modal>
  );
}
export function CustomerEditor({
  id,
  onClose,
  mutate,
  busy,
}: Common & { id: string }) {
  const s = useStore();
  const c = s.admin.customers.find((c) => c.id === id)!;
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  return (
    <Modal title={c.name || c.email} onClose={onClose}>
      <div className="balance-card">
        <div>
          <span className="eyebrow">HAPPY POINTS</span>
          <strong>{c.points.toLocaleString()}</strong>
        </div>
        <p>
          {c.email}
          <br />
          {c.order_count} orders · {money(c.spent_cents)} spent
        </p>
      </div>
      <p className="small-text muted">
        Marketing {c.marketing_opt_in ? "opted in" : "not subscribed"}. Joining
        rewards does not subscribe a customer to email.
      </p>
      <h3>Adjust points with a reason.</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (!delta || reason.trim().length < 3)
              throw new Error("Enter a nonzero adjustment and a reason.");
            await mutate("points", { user_id: id, delta, reason }, () => {
              s.saveAdmin({
                customers: s.admin.customers.map((q) =>
                  q.id === id ? { ...q, points: q.points + delta } : q,
                ),
              });
              if (c.email === "alex@example.com") s.setPoints(s.points + delta);
            });
            setDelta(0);
            setReason("");
          } catch (e) {
            setError(validationMessage(e));
          }
        }}
      >
        <Text
          label="Points to add or remove · use a negative number to remove"
          type="number"
          value={delta}
          onChange={(v) => setDelta(Number(v))}
        />
        <Text label="Reason" area value={reason} onChange={setReason} />
        <ErrorNotice value={error} />
        <button className="button dark" disabled={busy}>
          Save adjustment <Check size={15} />
        </button>
      </form>
      <h3>Order history</h3>
      {s.admin.orders
        .filter((o) => o.user_id === id || o.customer_email === c.email)
        .map((o) => (
          <p key={o.id} className="small-text" style={{ padding: "10px 0" }}>
            {o.number} · {date(o.created_at)} · {money(o.total_cents)} ·{" "}
            {label(o.status)}
          </p>
        ))}
    </Modal>
  );
}
export function StaffEditor({ onClose, mutate, busy }: Common) {
  const s = useStore();
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>(["catalogue"]);
  const [revoke, setRevoke] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title="The right access for your team." onClose={onClose}>
      <p className="small-text muted" style={{ marginBottom: 20 }}>
        Ask the person to sign in once before assigning access. Enter an
        existing staff email to update its roles. Keep at least one owner.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (!roles.length && !revoke)
              throw new Error("Choose at least one role.");
            await mutate("staff", { email, roles: revoke ? [] : roles }, () =>
              s.saveAdmin({
                staff: [
                  ...s.admin.staff.filter((st) => st.email !== email),
                  ...(revoke
                    ? []
                    : [{ user_id: crypto.randomUUID(), email, roles }]),
                ],
              }),
            );
            onClose();
          } catch (e) {
            setError(validationMessage(e));
          }
        }}
      >
        <Text
          label="Staff email"
          type="email"
          required
          value={email}
          onChange={setEmail}
        />
        {[
          ["owner", "Owner · all areas, refunds, and staff access"],
          ["catalogue", "Catalogue · products, finishes, and inventory"],
          ["fulfilment", "Fulfilment · orders, delivery, and staff notes"],
          ["marketing", "Marketing · content, collections, and campaigns"],
        ].map(([role, title]) => (
          <Toggle
            key={role}
            label={title}
            value={roles.includes(role)}
            onChange={(v) =>
              setRoles(v ? [...roles, role] : roles.filter((r) => r !== role))
            }
          />
        ))}
        <ErrorNotice value={error} />
        <Toggle
          label="Remove all staff access for this email"
          value={revoke}
          onChange={setRevoke}
        />
        {revoke && (
          <div className="notice">
            Saving removes staff access for this email. The final owner cannot
            be removed.
          </div>
        )}
        <button className="button dark full" disabled={busy}>
          {revoke ? "Remove staff access" : "Save staff access"}{" "}
          <Check size={15} />
        </button>
      </form>
    </Modal>
  );
}
