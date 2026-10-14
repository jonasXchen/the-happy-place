"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  ArrowUpRight,
  Search,
  UserRound,
  ShoppingBag,
  Menu,
  X,
  ArrowRight,
  Minus,
  Plus,
  Instagram,
} from "lucide-react";
import { useStore } from "./store";
import { money } from "@/lib/types";
import { resolveLines, isPublished } from "@/lib/commerce";
import { resolveBranding, type Branding } from "@/lib/branding";
export function Logo({ brand = resolveBranding() }: { brand?: Branding }) {
  return (
    <Link
      href="/"
      className={`logo${brand.logo_url ? " image-logo" : ""}`}
      aria-label={`${brand.name} home`}
    >
      {brand.logo_url ? (
        <img src={brand.logo_url} alt={brand.name} />
      ) : (
        <span>
          {brand.wordmark}
          <span className="logo-dot">.</span>
        </span>
      )}
      {brand.tagline && <small>{brand.tagline.toUpperCase()}</small>}
    </Link>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const s = useStore();
  const branding = resolveBranding(s.settings.branding);
  const { cartOpen, setCartOpen } = s;
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const count = s.cart.reduce((a, l) => a + l.quantity, 0);
  useEffect(() => {
    if (!cartOpen) return;
    const previous = document.activeElement as HTMLElement;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
      if (e.key === "Tab") {
        const nodes =
          panel.current?.querySelectorAll<HTMLElement>("a,button,input");
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [cartOpen, setCartOpen]);
  if (path.startsWith("/admin")) return <>{children}</>;
  const links = [
    ["Furniture", "/shop"],
    ["Home & living", "/shop?category=decor"],
    ["Collections", "/collections"],
    ["Our story", "/about"],
  ];
  let lines: ReturnType<typeof resolveLines> = [];
  try {
    lines = resolveLines(s.products, s.cart);
  } catch {
    /* Removed catalogue items are excluded from the bag preview. */
  }
  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setSubscribing(true);
    try {
      if (s.demo) {
        s.toast("Preview signup saved. No email was sent.");
      } else {
        const response = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, consent: true }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        s.toast("You're on the list. Welcome home.");
      }
      setEmail("");
    } catch (e) {
      s.toast((e as Error).message);
    } finally {
      setSubscribing(false);
    }
  }
  return (
    <>
      <div className="announcement">
        <span>
          {isPublished({
            active: true,
            starts_at: s.settings.announcement_starts_at,
            ends_at: s.settings.announcement_ends_at,
          })
            ? s.settings.announcement
            : "Thoughtfully chosen. Made to feel like home."}
        </span>
        <Link href="/contact">
          Visit our showroom <ArrowUpRight size={12} />
        </Link>
      </div>
      <header className="header">
        <button
          className="icon-button mobile-only"
          aria-label={menu ? "Close menu" : "Open menu"}
          aria-expanded={menu}
          aria-controls="mobile-navigation"
          onClick={() => setMenu(!menu)}
        >
          <Menu size={22} />
        </button>
        <Logo brand={branding} />
        <nav className="desktop-nav">
          {links.map(([name, url]) => (
            <Link
              key={name}
              href={url}
              className={path === url ? "active" : ""}
            >
              {name}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="Search products"
            onClick={() => setSearch(!search)}
          >
            <Search size={19} />
          </button>
          <Link
            className="icon-button hide-small"
            href="/account"
            aria-label="Your account"
          >
            <UserRound size={19} />
          </Link>
          <button
            className="icon-button bag-button"
            aria-label={`Open bag, ${count} items`}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag size={19} />
            <span>{count}</span>
          </button>
        </div>
      </header>
      {menu && (
        <nav
          className="mobile-nav"
          id="mobile-navigation"
          aria-label="Main navigation"
        >
          {links.map(([name, url]) => (
            <Link key={name} href={url} onClick={() => setMenu(false)}>
              {name}
              <ArrowUpRight size={18} />
            </Link>
          ))}
          <Link href="/rewards" onClick={() => setMenu(false)}>
            Happy rewards
          </Link>
          <Link href="/account" onClick={() => setMenu(false)}>
            Your account
          </Link>
        </nav>
      )}
      {search && (
        <form
          className="search-bar"
          action="/shop"
          onSubmit={() => setSearch(false)}
        >
          <Search size={20} />
          <input
            autoFocus
            name="q"
            placeholder="Find your next favourite piece"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="text-button">
            Search <ArrowRight size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setSearch(false)}
            aria-label="Close search"
          >
            <X size={20} />
          </button>
        </form>
      )}
      <main>{children}</main>
      <section className="newsletter">
        <div>
          <span className="eyebrow">LET&apos;S STAY IN TOUCH</span>
          <h2>
            A little inspiration,
            <br />
            every now and then.
          </h2>
          <p>
            New pieces, considered spaces, and a few good things.
            <br />
            Delivered to your inbox.
          </p>
        </div>
        <form onSubmit={subscribe}>
          <label className="sr-only" htmlFor="newsletter-email">
            Your email address
          </label>
          <div className="newsletter-input">
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              aria-label="Subscribe to the newsletter"
              disabled={subscribing}
            >
              <ArrowRight size={23} />
            </button>
          </div>
          <label className="check-label">
            <input type="checkbox" required /> I agree to receive news and
            offers. Unsubscribe anytime.
          </label>
        </form>
      </section>
      <footer>
        <div className="footer-brand">
          <Logo brand={branding} />
          <p>
            Make room for the things
            <br />
            that make you happy.
          </p>
          {branding.instagram_url && (
            <a
              href={branding.instagram_url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${branding.name} on Instagram`}
            >
              <Instagram size={18} />
            </a>
          )}
        </div>
        <div>
          <h4>Explore</h4>
          <Link href="/shop">All pieces</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/shop?availability=ready">Ready to ship</Link>
          <Link href="/rewards">Happy rewards</Link>
        </div>
        <div>
          <h4>Here to help</h4>
          <Link href="/contact">Contact & showroom</Link>
          <Link href="/policies/shipping">Delivery information</Link>
          <Link href="/policies/returns">Returns & care</Link>
          <Link href="/policies/faq">Common questions</Link>
          <Link href="/account">Track your order</Link>
        </div>
        <div>
          <h4>Come say hello</h4>
          <p className="preline">{s.settings.showroom_address}</p>
          <p>{s.settings.showroom_hours}</p>
          <Link href="/contact" className="text-button">
            Plan your visit <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {branding.name}
          </span>
          <div>
            <span>
              {s.demo ? "Local preview · sample catalogue" : "Singapore · SGD"}
            </span>
            <Link href="/policies/privacy">Privacy</Link>
            <Link href="/admin">Staff login</Link>
          </div>
        </div>
      </footer>
      {cartOpen && (
        <div className="modal-backdrop" onClick={() => setCartOpen(false)}>
          <div
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Your bag"
            ref={panel}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-heading">
              <h2>
                Your bag <small>{count}</small>
              </h2>
              <button
                className="icon-button"
                aria-label="Close bag"
                onClick={() => setCartOpen(false)}
              >
                <X size={22} />
              </button>
            </div>
            {lines.length ? (
              <>
                <div className="cart-lines">
                  {lines.map(({ product, variant, quantity }) => (
                    <div className="cart-line" key={variant.id}>
                      <img
                        src={variant.image || product.images[0]}
                        alt={product.name}
                      />
                      <div>
                        <Link
                          href={`/shop/${product.slug}`}
                          onClick={() => setCartOpen(false)}
                        >
                          {product.name}
                        </Link>
                        <p>{variant.label}</p>
                        <p>
                          {variant.lead_weeks
                            ? `Made for you · ${variant.lead_weeks} week estimate`
                            : "Ready to ship"}
                        </p>
                        <div className="quantity">
                          <button
                            aria-label={`Decrease ${product.name} quantity`}
                            onClick={() =>
                              s.setQuantity(variant.id, quantity - 1)
                            }
                          >
                            <Minus size={12} />
                          </button>
                          <span>{quantity}</span>
                          <button
                            aria-label={`Increase ${product.name} quantity`}
                            onClick={() =>
                              s.setQuantity(variant.id, quantity + 1)
                            }
                            disabled={quantity >= (variant.stock ?? 20)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                      <span>{money(variant.price_cents * quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <div>
                    <span>Subtotal</span>
                    <strong>
                      {money(
                        lines.reduce(
                          (a, l) => a + l.variant.price_cents * l.quantity,
                          0,
                        ),
                      )}
                    </strong>
                  </div>
                  <p>Delivery and rewards calculated at checkout.</p>
                  <Link
                    className="button dark full"
                    href="/checkout"
                    onClick={() => setCartOpen(false)}
                  >
                    Continue to checkout <ArrowRight size={17} />
                  </Link>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <ShoppingBag size={34} />
                <h3>Room for something lovely.</h3>
                <p>Your bag is empty. Find a piece that feels like you.</p>
                <Link
                  href="/shop"
                  className="button dark"
                  onClick={() => setCartOpen(false)}
                >
                  Explore our pieces <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
