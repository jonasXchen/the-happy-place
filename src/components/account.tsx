"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Gift,
  Package,
  Heart,
  MapPin,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useStore } from "./store";
import { ProductCard } from "./products";
import { AddressForm, emptyAddress } from "./forms";
import {
  date,
  money,
  label,
  type Order,
  type PointsEntry,
  type Address,
} from "@/lib/types";
export function Login() {
  const s = useStore();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          next: params.get("next") === "/admin" ? "/admin" : "/account",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-box">
      <span className="eyebrow">MAKE YOURSELF AT HOME</span>
      <h1>Your happy place.</h1>
      <p>
        Sign in with an email link to see your orders, save your favourites, and
        collect happy points.
      </p>
      {s.demo ? (
        <>
          <div className="notice">
            Local preview. Customer accounts require Supabase. Explore the
            sample account to see how it works.
          </div>
          <Link
            href={params.get("next") === "/admin" ? "/admin" : "/account"}
            className="button dark full"
          >
            Explore preview account <ArrowRight size={16} />
          </Link>
        </>
      ) : sent ? (
        <div className="notice" role="status">
          Check your inbox for a sign-in link. You can close this tab after
          opening it.
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="login-email">Your email</label>
            <input
              type="email"
              id="login-email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          {(error || params.has("error")) && (
            <div className="notice error" role="alert">
              {error || "This sign-in link has expired. Request a new one."}
            </div>
          )}
          <button className="button dark full" disabled={busy}>
            {busy ? "Sending your link..." : "Send me a sign-in link"}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
type AccountData = {
  email: string;
  orders: Order[];
  entries: PointsEntry[];
  addresses: { id: string; label: string; address: Address }[];
  points: number;
};
export function Account() {
  const router = useRouter();
  const s = useStore();
  const { demo, setPoints } = s;
  const [tab, setTab] = useState("orders");
  const [data, setData] = useState<AccountData | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(s.demo);
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    if (demo) return;
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      setPoints(result.points);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    if (!demo) {
      fetch("/api/account", { cache: "no-store" })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          setData(result);
          setPoints(result.points);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoaded(true));
    }
  }, [demo, setPoints]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (s.demo) {
        setData((d) => ({
          ...d,
          email: d?.email || "alex@example.com",
          orders: d?.orders || [],
          entries: d?.entries || [],
          points: s.points,
          addresses: [
            ...(d?.addresses || []),
            { id: crypto.randomUUID(), label: addressLabel, address },
          ],
        }));
        s.toast("Sample address saved for this preview.");
      } else {
        const response = await fetch("/api/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: addressLabel, address }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        await refresh();
        s.toast("Your address is saved.");
      }
      setEditing(false);
    } catch (e) {
      s.toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const orders = s.demo ? s.admin.orders : data?.orders || [];
  const entries = s.demo
    ? [
        {
          id: "1",
          delta: 1250,
          kind: "purchase",
          note: "Sample points balance",
          created_at: "2026-10-01T00:00:00Z",
          expires_at: "2027-10-01T00:00:00Z",
        },
      ]
    : data?.entries || [];
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">A LITTLE SPACE OF YOUR OWN</span>
        <h1>Welcome home.</h1>
        <p>
          {s.demo
            ? "A sample account for exploring your orders and rewards."
            : data?.email || "Your orders, favourites, and little rewards."}
        </p>
      </div>
      <div className="account-layout">
        {s.demo && (
          <div className="notice">
            Preview account with fictional orders and sample points. No real
            payments, deliveries, or email sends.
          </div>
        )}
        {!loaded ? (
          <p>Opening your happy place...</p>
        ) : !s.demo && !data ? (
          <div className="empty-state">
            <h3>Let&apos;s make this your space.</h3>
            <p>{error || "Sign in to see your orders and rewards."}</p>
            <Link className="button dark" href="/login">
              Sign in <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            <div className="account-tabs">
              {[
                ["orders", "Your orders", Package],
                ["rewards", "Happy rewards", Gift],
                ["wishlist", "Your favourites", Heart],
                ["addresses", "Addresses", MapPin],
              ].map(([id, title, Icon]) => {
                const Component = Icon as typeof Package;
                return (
                  <button
                    key={String(id)}
                    className={`chip ${tab === id ? "active" : ""}`}
                    onClick={() => setTab(String(id))}
                  >
                    <Component size={14} />
                    {String(title)}
                  </button>
                );
              })}
              {!s.demo && (
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  onClick={async () => {
                    await fetch("/api/auth", { method: "DELETE" });
                    router.push("/login");
                    router.refresh();
                  }}
                >
                  <LogOut size={17} />
                </button>
              )}
            </div>
            {tab === "orders" && (
              <>
                {orders.length === 0 ? (
                  <div className="empty-state">
                    <Package size={30} />
                    <h3>Your first happy thing awaits.</h3>
                    <Link href="/shop" className="button dark">
                      Find a piece you love
                    </Link>
                  </div>
                ) : (
                  orders.map((o) => (
                    <div className="order-card" key={o.id}>
                      <div className="order-card-top">
                        <div>
                          <h3>{o.number}</h3>
                          <p>
                            {date(o.created_at)} · {o.items.length} piece
                            {o.items.length === 1 ? "" : "s"} ·{" "}
                            {money(o.total_cents)}
                          </p>
                        </div>
                        <span className={`status-pill ${o.status}`}>
                          {label(o.status)}
                        </span>
                      </div>
                      <div className="inline-actions" style={{ marginTop: 20 }}>
                        {o.items.slice(0, 3).map((i) => (
                          <img
                            key={i.id}
                            src={i.image}
                            alt={i.product_name}
                            style={{
                              height: 70,
                              width: 70,
                              objectFit: "cover",
                              background: "var(--cream)",
                            }}
                          />
                        ))}
                        <Link
                          href={`/orders/${o.id}`}
                          className="text-button"
                          style={{ marginLeft: "auto" }}
                        >
                          See your order <ArrowUpRight size={15} />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
            {tab === "rewards" && (
              <>
                <div className="balance-card">
                  <div>
                    <span className="eyebrow">YOUR HAPPY POINTS</span>
                    <strong>{s.points.toLocaleString()}</strong>
                    <p>
                      {s.points < 0
                        ? "A refund has adjusted your balance. Future earnings will reduce the amount owed."
                        : "A little thank you for making yourself at home."}
                    </p>
                  </div>
                  <Link href="/rewards" className="button outline small">
                    Explore your rewards <ArrowRight size={15} />
                  </Link>
                </div>
                <h2 style={{ fontSize: 30, marginBottom: 20 }}>
                  Your points, over time.
                </h2>
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Activity</th>
                        <th>Points</th>
                        <th>Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr key={e.id}>
                          <td>{date(e.created_at)}</td>
                          <td>
                            {label(e.kind)}
                            <p className="small-text muted">{e.note}</p>
                          </td>
                          <td>
                            {e.delta > 0 ? "+" : ""}
                            {e.delta}
                          </td>
                          <td>{e.expires_at ? date(e.expires_at) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tab === "wishlist" && (
              <>
                {s.wishlist.length ? (
                  <div className="product-grid">
                    {s.products
                      .filter((p) => p.active && s.wishlist.includes(p.id))
                      .map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Heart size={30} />
                    <h3>A place for your favourites.</h3>
                    <p>Tap the heart on any piece to keep it here.</p>
                    <Link href="/shop" className="button dark">
                      Explore our pieces
                    </Link>
                  </div>
                )}
              </>
            )}
            {tab === "addresses" && (
              <>
                <div className="inline-actions">
                  <h2 style={{ fontSize: 30 }}>Where you call home.</h2>
                  <button
                    className="button outline small"
                    style={{ marginLeft: "auto" }}
                    onClick={() => setEditing(!editing)}
                  >
                    Add an address
                  </button>
                </div>
                {editing && (
                  <form
                    onSubmit={save}
                    className="admin-card"
                    style={{ maxWidth: 700 }}
                  >
                    <div className="form-field">
                      <label htmlFor="address-label">Address label</label>
                      <input
                        id="address-label"
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                        required
                      />
                    </div>
                    <AddressForm value={address} onChange={setAddress} />
                    <button className="button dark" disabled={busy}>
                      Save address <ArrowRight size={16} />
                    </button>
                  </form>
                )}
                {data?.addresses.map((a) => (
                  <div className="order-card" key={a.id}>
                    <h3>{a.label}</h3>
                    <p className="preline">
                      {a.address.name}
                      <br />
                      {a.address.block} {a.address.street}
                      <br />
                      {a.address.unit} {a.address.building}
                      <br />
                      Singapore {a.address.postal}
                    </p>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
export function OrderView({ id }: { id: string }) {
  const s = useStore();
  const { demo, clearCart } = s;
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [remote, setRemote] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!s.demo);
  const o = s.demo ? s.admin.orders.find((o) => o.id === id) : remote;
  useEffect(() => {
    if (demo) return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/orders/${id}?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) {
          setRemote(result);
          setError("");
          if (
            result.payment_status === "paid" &&
            sessionStorage.getItem("thp-pending-order") === id
          ) {
            clearCart();
            sessionStorage.removeItem("thp-pending-order");
          }
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, token, demo, clearCart]);
  if (loading)
    return (
      <div className="empty-state">
        <Package size={30} />
        <p>Finding your order...</p>
      </div>
    );
  if (!o)
    return (
      <div className="empty-state">
        <h3>Your order is private.</h3>
        <p>
          {error ||
            "Open the private link from your order email, or sign in to your account."}
        </p>
        <Link href="/login" className="button dark">
          Sign in
        </Link>
      </div>
    );
  return (
    <div className="order-detail">
      <div className="breadcrumb">
        <Link href="/account">Your account</Link>
        <span>/</span>
        <span>{o.number}</span>
      </div>
      <span className="eyebrow">YOUR PIECES, ON THEIR WAY HOME</span>
      <h1>{o.number}</h1>
      <div className="inline-actions">
        <span className={`status-pill ${o.status}`}>{label(o.status)}</span>
        <span className="small-text muted">{date(o.created_at)}</span>
        <span className="small-text muted">
          Payment: {label(o.payment_status)}
        </span>
        {!s.demo && (
          <span className="small-text muted">
            <RefreshCw size={10} style={{ display: "inline" }} /> Updates every
            30 seconds
          </span>
        )}
      </div>
      {s.demo && (
        <div className="notice" style={{ marginTop: 25 }}>
          Sample order. No real payment or delivery. Delivery changes made in
          the preview admin panel appear here.
        </div>
      )}
      {o.payment_status === "pending" && (
        <div className="notice" style={{ marginTop: 25 }}>
          Waiting for payment confirmation. Your order will update once Stripe
          confirms payment.
        </div>
      )}
      <div className="order-columns">
        <div>
          <h2 style={{ fontSize: 28 }}>Your pieces</h2>
          {o.items.map((i) => (
            <div className="cart-line" key={i.id}>
              <img src={i.image} alt={i.product_name} />
              <div>
                {i.product_name}
                <p>
                  {i.variant_label} · Quantity {i.quantity}
                </p>
                <p>
                  {i.lead_weeks
                    ? `${i.lead_weeks} week lead-time estimate`
                    : "Ready to ship"}
                </p>
              </div>
              <span>{money(i.unit_price_cents * i.quantity)}</span>
            </div>
          ))}
          <h2 style={{ fontSize: 28, marginTop: 30 }}>Delivery updates</h2>
          {o.shipments.map((sh, index) => (
            <div className="order-card" key={sh.id}>
              <div className="order-card-top">
                <h3 style={{ fontSize: 23 }}>Delivery {index + 1}</h3>
                <span className={`status-pill ${sh.status}`}>
                  {label(sh.status)}
                </span>
              </div>
              {sh.items.map((item) => {
                const i = o.items.find((i) => i.id === item.item_id);
                return (
                  <p key={item.item_id}>
                    {item.quantity} × {i?.product_name}
                  </p>
                );
              })}
              {sh.scheduled_at ? (
                <p style={{ marginTop: 15 }}>
                  Confirmed appointment
                  <br />
                  <strong>
                    {date(sh.scheduled_at)} · {sh.window}
                  </strong>
                </p>
              ) : (
                <p style={{ marginTop: 15 }}>
                  Our team will confirm your delivery appointment.
                  <br />
                  {o.preferred_date &&
                    `Requested: ${o.preferred_date}, ${o.preferred_window || "no time preference"}`}
                </p>
              )}
              {sh.customer_note && (
                <p style={{ marginTop: 15 }}>{sh.customer_note}</p>
              )}
              {sh.tracking_url && (
                <a
                  className="text-button"
                  href={sh.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Track this delivery <ArrowUpRight size={13} />
                </a>
              )}
            </div>
          ))}
          <div className="timeline">
            {[...o.events]
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              )
              .map((e) => (
                <div key={e.id}>
                  <h4>{label(e.status)}</h4>
                  <p>{e.message}</p>
                  <small>{date(e.created_at)}</small>
                </div>
              ))}
          </div>
        </div>
        <aside>
          <div className="checkout-summary">
            <h2>Bringing it home.</h2>
            <p className="small-text preline">
              {o.address.name}
              <br />
              {o.address.block} {o.address.street}
              <br />
              {o.address.unit} {o.address.building}
              <br />
              Singapore {o.address.postal}
              <br />
              {o.address.phone}
            </p>
            <p className="small-text muted" style={{ marginTop: 15 }}>
              {o.address.access}
              <br />
              {o.address.instructions}
            </p>
            <div className="divider" />
            <div className="summary-line">
              <span>Pieces</span>
              <span>{money(o.subtotal_cents)}</span>
            </div>
            <div className="summary-line">
              <span>Delivery</span>
              <span>{money(o.shipping_cents)}</span>
            </div>
            {o.installation_cents > 0 && (
              <div className="summary-line">
                <span>Installation</span>
                <span>{money(o.installation_cents)}</span>
              </div>
            )}
            {o.discount_cents > 0 && (
              <div className="summary-line">
                <span>Discount</span>
                <span>−{money(o.discount_cents)}</span>
              </div>
            )}
            <div className="summary-line total">
              <strong>Total</strong>
              <strong>{money(o.total_cents)}</strong>
            </div>
            {o.refunded_cents > 0 && (
              <div className="summary-line">
                <span>Refunded</span>
                <span>{money(o.refunded_cents)}</span>
              </div>
            )}
            <p className="small-text muted">
              Includes {money(o.tax_cents)} GST.
            </p>
            <div className="divider" />
            <Link
              href={`/contact?product=${encodeURIComponent(o.number)}`}
              className="text-button"
            >
              A little help with your order <ArrowUpRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
