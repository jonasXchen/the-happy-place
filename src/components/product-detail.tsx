"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Truck,
  Gift,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { useStore } from "./store";
import { ProductCard, SectionHeading } from "./products";
import { money } from "@/lib/types";
export function ProductDetail({ slug }: { slug: string }) {
  const s = useStore();
  const p = s.products.find((p) => p.slug === slug);
  const [selected, setSelected] = useState("");
  const [image, setImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    if (!zoom) return;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "Tab") e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [zoom]);
  if (!p)
    return (
      <div className="empty-state">
        <h3>This piece is taking a little break.</h3>
        <Link href="/shop">Browse all pieces</Link>
      </div>
    );
  const v = p.variants.find((v) => v.id === selected) || p.variants[0];
  return (
    <>
      <div className="product-detail">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href={`/shop?category=${p.category}`}>{p.category}</Link>
          <span>/</span>
          <span>{p.name}</span>
        </div>
        <div className="detail-layout">
          <div className="detail-gallery">
            <button
              className="main-photo"
              aria-label="Enlarge product image"
              onClick={() => setZoom(true)}
            >
              <img
                src={
                  image === 0 && v.image
                    ? v.image
                    : p.images[image] || p.images[0]
                }
                alt={p.name}
              />
            </button>
            <div className="detail-thumbs">
              {p.images.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  aria-label={`View image ${i + 1}`}
                  onClick={() => setImage(i)}
                >
                  <img src={url} alt={`${p.name}, view ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="detail-copy">
            <span className="eyebrow">
              {p.material.toUpperCase()} · {p.style.toUpperCase()}
            </span>
            <h1>{p.name}</h1>
            <div className="detail-price">{money(v.price_cents)}</div>
            <span className="tax-note">
              GST included. Delivery calculated at checkout.
            </span>
            <p className="detail-description">{p.description}</p>
            <div className="form-field">
              <label htmlFor="variant">Choose your finish</label>
              <select
                id="variant"
                value={v.id}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setQty(1);
                }}
              >
                {p.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} · {money(v.price_cents)}
                    {v.stock === 0 ? " · Sold out" : ""}
                  </option>
                ))}
              </select>
            </div>
            <p className="stock-note">
              <i className="stock-dot" />
              {v.stock === 0
                ? "Currently unavailable"
                : v.lead_weeks
                  ? `Made for you. Estimated lead time: ${v.lead_weeks} weeks.`
                  : "Ready to ship. Our team will confirm your delivery date."}
            </p>
            <div className="purchase-row">
              <div className="quantity">
                <button
                  aria-label="Decrease quantity"
                  disabled={qty <= 1}
                  onClick={() => setQty(qty - 1)}
                >
                  <Minus size={13} />
                </button>
                <span>{qty}</span>
                <button
                  aria-label="Increase quantity"
                  disabled={qty >= Math.min(v.stock ?? 20, 20)}
                  onClick={() => setQty(qty + 1)}
                >
                  <Plus size={13} />
                </button>
              </div>
              <button
                className="button dark"
                disabled={v.stock === 0}
                onClick={() => {
                  s.add(v.id, qty);
                  s.setCartOpen(true);
                }}
              >
                Add to bag <ArrowRight size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Save product"
                onClick={() => s.toggleWishlist(p.id)}
              >
                <Heart
                  size={21}
                  fill={s.wishlist.includes(p.id) ? "currentColor" : "none"}
                />
              </button>
            </div>
            <div className="detail-promises">
              <span>
                <Truck size={14} /> Delivered to your door
              </span>
              <span>
                <Gift size={14} /> Earn happy points
              </span>
            </div>
            <details className="accordion" open>
              <summary>The details</summary>
              <p>
                {p.dimensions}
                <br />
                Material: {v.material}
                <br />
                Finish: {v.colour}
                <br />
                SKU: {v.sku}
              </p>
            </details>
            <details className="accordion">
              <summary>Care for your piece</summary>
              <p>{p.care}</p>
            </details>
            <details className="accordion">
              <summary>Delivery & installation</summary>
              <p>
                {s.settings.shipping_policy}
                {p.installation && (
                  <>
                    <br />
                    This piece requires installation. The fee is shown at
                    checkout.
                  </>
                )}
              </p>
            </details>
            <details className="accordion">
              <summary>Make it your own</summary>
              <p>
                Looking for a different size or finish? Our team can help.
                <br />
                <Link
                  href={`/contact?product=${encodeURIComponent(p.name)}`}
                  className="text-button"
                >
                  Enquire about customisation <ArrowUpRight size={13} />
                </Link>
              </p>
            </details>
            {p.sample && s.demo && (
              <p className="dashboard-note">
                Preview catalogue. Finish options, stock, and delivery terms are
                sample settings awaiting owner review.
              </p>
            )}
          </div>
        </div>
      </div>
      <section className="section">
        <SectionHeading
          eyebrow="GOOD COMPANY FOR YOUR NEW PIECE"
          title="Better together."
          href="/shop"
        />
        <div className="product-grid">
          {s.products
            .filter((q) => q.active && q.id !== p.id)
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
      {zoom && (
        <div
          className="zoom-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged product image"
          onClick={() => setZoom(false)}
        >
          <button
            className="icon-button"
            autoFocus
            onClick={() => setZoom(false)}
            aria-label="Close enlarged image"
          >
            <X size={24} />
          </button>
          <img src={p.images[image]} alt={p.name} />
        </div>
      )}
    </>
  );
}
