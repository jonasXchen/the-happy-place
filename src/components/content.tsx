"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { useStore } from "./store";
import { ProductCard } from "./products";
import { isPublished } from "@/lib/commerce";
export function Collections({ slug }: { slug?: string }) {
  const s = useStore();
  const collections = s.collections.filter((c) => isPublished(c));
  const collection = collections.find((c) => c.slug === slug);
  if (slug && !collection)
    return (
      <div className="empty-state">
        <h3>This collection is taking shape.</h3>
        <Link href="/collections">Explore our collections</Link>
      </div>
    );
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">THOUGHTFULLY PUT TOGETHER</span>
        <h1>{collection?.title || "A little inspiration."}</h1>
        <p>
          {collection?.description ||
            "Spaces with a point of view. Discover pieces that feel even better together."}
        </p>
      </div>
      <section className="section">
        {collection ? (
          <>
            <img
              src={collection.image}
              alt={collection.title}
              style={{
                width: "100%",
                height: 460,
                objectFit: "cover",
                marginBottom: 45,
              }}
            />
            <div className="section-heading">
              <h2>Make the space your own.</h2>
            </div>
            <div className="product-grid">
              {s.products
                .filter(
                  (p) => p.active && collection.product_ids.includes(p.id),
                )
                .map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
            </div>
          </>
        ) : (
          <div className="collection-grid">
            {collections.map((c) => (
              <Link
                href={`/collections/${c.slug}`}
                className="collection-card"
                key={c.id}
              >
                <img src={c.image} alt={c.title} />
                <h2>{c.title}</h2>
                <p>{c.description}</p>
                <span className="text-button" style={{ marginTop: 20 }}>
                  Explore the collection <ArrowUpRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
export function About() {
  const s = useStore();
  return (
    <div className="content-page">
      <span className="eyebrow">THE LITTLE THINGS, CONSIDERED</span>
      <h1>Home is a feeling.</h1>
      <p className="preline">{s.settings.about}</p>
      <img
        src="/images/interior.jpg"
        alt="A home shaped by considered furniture and natural textures"
      />
      <h2>Find the pieces that feel like you.</h2>
      <p>
        Take your time with the materials, the shapes, and the details. Our team
        can help you find a finish or a size that suits your space.
      </p>
      <Link href="/contact" className="text-button" style={{ marginTop: 25 }}>
        Let&apos;s find your happy place <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function Policy({ kind }: { kind: string }) {
  const s = useStore();
  const values: Record<string, [string, string]> = {
    shipping: ["Delivery information", s.settings.shipping_policy],
    returns: ["Returns & care", s.settings.returns_policy],
    privacy: ["Your privacy", s.settings.privacy_policy],
    faq: ["A few common questions", s.settings.faq],
  };
  const [title, body] = values[kind] || values.faq;
  return (
    <div className="content-page">
      <span className="eyebrow">HERE TO HELP</span>
      <h1>{title}</h1>
      {!s.settings.policies_approved && (
        <div className="notice">
          Draft information awaiting owner review before launch.
        </div>
      )}
      <p className="preline">{body}</p>
      <Link href="/contact" className="text-button" style={{ marginTop: 30 }}>
        Talk to our team <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function Contact({ product = "" }: { product?: string }) {
  const s = useStore();
  const [kind, setKind] = useState(
    product ? "Customisation" : "Showroom visit",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    product ? `I'd like to ask about ${product}.\n` : "",
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!s.demo) {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, name, email, phone, message }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
      }
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">LET&apos;S MAKE ROOM FOR A CONVERSATION</span>
        <h1>Come say hello.</h1>
        <p>
          See a piece in person, find your perfect finish, or ask us a question.
          We&apos;re here to help.
        </p>
      </div>
      <div className="contact-grid">
        <div>
          <img
            src="/images/interior.jpg"
            alt="The Happy Place furniture and finishes"
            style={{ height: 320, width: "100%", objectFit: "cover" }}
          />
          <h2>Make yourself comfortable.</h2>
          <p className="preline">{s.settings.showroom_address}</p>
          <p>{s.settings.showroom_hours}</p>
          <a
            href={`mailto:${s.settings.contact_email}`}
            className="text-button"
          >
            {s.settings.contact_email} <ArrowUpRight size={14} />
          </a>
          <p>
            Visits are by appointment. Send us a preferred day and time, and
            we&apos;ll confirm availability.
          </p>
        </div>
        {done ? (
          <div className="empty-state">
            <h3>
              {s.demo
                ? "That's how an enquiry works."
                : "We've got your message."}
            </h3>
            <p>
              {s.demo
                ? "Preview only. Your message was not sent."
                : "Our team will get back to you using the details you shared. A showroom visit is confirmed only after our reply."}
            </p>
            <button className="button outline" onClick={() => setDone(false)}>
              Write another message
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2>What can we help with?</h2>
            <div className="form-field">
              <label htmlFor="enquiry-kind">I&apos;m interested in</label>
              <select
                id="enquiry-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option>Showroom visit</option>
                <option>Customisation</option>
                <option>Order help</option>
                <option>Other</option>
              </select>
            </div>
            {[
              ["Name", name, setName, "text"],
              ["Email", email, setEmail, "email"],
              ["Phone, optional", phone, setPhone, "tel"],
            ].map(([title, value, setter, type]) => (
              <div className="form-field" key={String(title)}>
                <label htmlFor={`enquiry-${type}`}>{String(title)}</label>
                <input
                  id={`enquiry-${type}`}
                  type={String(type)}
                  value={String(value)}
                  onChange={(e) =>
                    (setter as (v: string) => void)(e.target.value)
                  }
                  required={type !== "tel"}
                />
              </div>
            ))}
            <div className="form-field">
              <label htmlFor="enquiry-message">A little more detail</label>
              <textarea
                id="enquiry-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                minLength={5}
                maxLength={4000}
              />
            </div>
            {error && <div className="notice error">{error}</div>}
            {s.demo && (
              <p className="small-text muted" style={{ marginBottom: 20 }}>
                Local preview. No enquiry email will be sent.
              </p>
            )}
            <button className="button dark" disabled={busy}>
              {busy
                ? "Sending..."
                : s.demo
                  ? "Preview enquiry"
                  : "Send your enquiry"}
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </>
  );
}
