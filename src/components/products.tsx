"use client";
import Link from "next/link";
import { Heart, Plus, ArrowUpRight } from "lucide-react";
import { useStore } from "./store";
import type { Product } from "@/lib/types";
import { money } from "@/lib/types";
import { productSwatches } from "@/lib/product-colours";
export function ProductCard({
  product,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  const s = useStore();
  const ready = product.variants.some(
    (v) => v.lead_weeks === 0 && (v.stock === null || v.stock > 0),
  );
  const saved = s.wishlist.includes(product.id);
  const swatches = productSwatches(
    product.variants.map((variant) => variant.colour),
  );
  return (
    <article
      className="product-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="product-photo">
        <Link href={`/shop/${product.slug}`}>
          <img src={product.images[0]} alt={product.name} loading="lazy" />
        </Link>
        <span className="product-badge">
          {ready
            ? "READY TO SHIP"
            : product.featured
              ? "A HOUSE FAVOURITE"
              : "MADE FOR YOU"}
        </span>
        <button
          className={`wish-button ${saved ? "saved" : ""}`}
          aria-label={`${saved ? "Remove" : "Save"} ${product.name}`}
          onClick={() => s.toggleWishlist(product.id)}
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
        </button>
        <Link href={`/shop/${product.slug}`} className="quick-view">
          Find your finish <Plus size={16} />
        </Link>
      </div>
      <div className="product-info">
        <span>{product.material}</span>
        <Link href={`/shop/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <div>
          <p>
            {money(Math.min(...product.variants.map((v) => v.price_cents)))}
          </p>
          <div className="swatches" aria-label="Available colours">
            {swatches.map((colour) => (
              <i key={colour} style={{ background: colour }} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  href,
  link = "Explore all pieces",
}: {
  eyebrow: string;
  title: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-button">
          {link} <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
