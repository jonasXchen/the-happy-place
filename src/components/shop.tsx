"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useStore } from "./store";
import { ProductCard } from "./products";
export function Shop() {
  const params = useSearchParams();
  const s = useStore();
  const [category, setCategory] = useState(params.get("category") || "all");
  const [room, setRoom] = useState("");
  const [material, setMaterial] = useState("");
  const [style, setStyle] = useState("");
  const [ready, setReady] = useState(params.get("availability") === "ready");
  const [query, setQuery] = useState(params.get("q") || "");
  const [sort, setSort] = useState("featured");
  const [price, setPrice] = useState("");
  let products = s.products.filter(
    (p) =>
      p.active &&
      (category === "all" || p.category === category) &&
      (!room || p.room === room) &&
      (!material || p.material === material) &&
      (!style || p.style === style) &&
      (!ready ||
        p.variants.some(
          (v) => v.lead_weeks === 0 && (v.stock === null || v.stock > 0),
        )) &&
      (!price || p.price_cents <= Number(price)) &&
      `${p.name} ${p.description} ${p.material} ${p.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  products = [...products].sort((a, b) =>
    sort === "price-low"
      ? a.price_cents - b.price_cents
      : sort === "price-high"
        ? b.price_cents - a.price_cents
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : Number(b.featured) - Number(a.featured),
  );
  const categories = [...new Set(s.products.map((p) => p.category))];
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">PIECES YOU&apos;LL LOVE LIVING WITH</span>
        <h1>Find your kind of happy.</h1>
        <p>
          Soft shapes. Natural textures. A few unexpected details.
          <br />
          Discover furniture and everyday things with a little more character.
        </p>
      </div>
      <div className="shop-layout">
        <div className="shop-toolbar">
          <div className="filter-chips">
            <button
              className={`chip ${category === "all" ? "active" : ""}`}
              onClick={() => setCategory("all")}
            >
              All pieces
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`chip ${category === c ? "active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
          <div className="admin-search">
            <Search size={15} />
            <input
              aria-label="Search products"
              placeholder="Search for a piece..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="shop-filter-row">
          <SlidersHorizontal size={14} />
          <select
            aria-label="Filter by room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          >
            <option value="">All rooms</option>
            {[...new Set(s.products.map((p) => p.room))].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Filter by material"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          >
            <option value="">All materials</option>
            {[...new Set(s.products.map((p) => p.material))].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Filter by style"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            <option value="">All styles</option>
            {[...new Set(s.products.map((p) => p.style))].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Maximum price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          >
            <option value="">Any price</option>
            <option value="50000">Under $500</option>
            <option value="100000">Under $1,000</option>
            <option value="300000">Under $3,000</option>
          </select>
          <button
            className={`chip ${ready ? "active" : ""}`}
            onClick={() => setReady(!ready)}
          >
            Ready to ship {ready && <X size={12} />}
          </button>
          <span className="result-count">{products.length} pieces</span>
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="featured">Our favourites</option>
            <option value="price-low">Price, low to high</option>
            <option value="price-high">Price, high to low</option>
            <option value="name">Name, A to Z</option>
          </select>
        </div>
        {products.length ? (
          <div className="product-grid shop-grid">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>A little more room to explore.</h3>
            <p>We couldn&apos;t find a piece with those filters.</p>
            <button
              className="button outline"
              onClick={() => {
                setCategory("all");
                setRoom("");
                setMaterial("");
                setStyle("");
                setReady(false);
                setPrice("");
                setQuery("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </>
  );
}
