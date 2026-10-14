"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Minus, Plus } from "lucide-react";
import { useStore } from "./store";
import { AddressForm, emptyAddress, Field } from "./forms";
import {
  quote,
  resolveLines,
  isPublished,
  remoteAddress,
} from "@/lib/commerce";
import { addressSchema } from "@/lib/validation";
import { money, type Address, type Order } from "@/lib/types";
export function Checkout() {
  const s = useStore();
  const { demo, setPoints } = s;
  const router = useRouter();
  const params = useSearchParams();
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [billing, setBilling] = useState<Address>(emptyAddress);
  const [differentBilling, setDifferentBilling] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [saved, setSaved] = useState<
    { id: string; label: string; address: Address }[]
  >([]);
  const [loggedIn, setLoggedIn] = useState(s.demo);
  const [reward, setReward] = useState(params.get("reward") || "");
  const [coupon, setCoupon] = useState("");
  const [split, setSplit] = useState(false);
  const [method, setMethod] = useState<"standard" | "express">("standard");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("");
  const [optin, setOptin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [serverQuote, setServerQuote] = useState<{
    key: string;
    value: ReturnType<typeof quote>;
  } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [requestId, setRequestId] = useState("");
  const cancellationId = params.get("cancelled") ? params.get("order") : null;
  const cancellationToken = params.get("token");
  const [cancelStatus, setCancelStatus] = useState("");
  useEffect(() => {
    if (demo || !cancellationId || !cancellationToken) return;
    let active = true;
    fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cancellationId, token: cancellationToken }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (active) {
          setCancelStatus(data.state);
          if (data.state === "released")
            fetch("/api/account").then(async (r) => {
              if (r.ok) {
                const account = await r.json();
                setPoints(account.points);
              }
            });
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [demo, cancellationId, cancellationToken, setPoints]);
  useEffect(() => {
    if (!demo)
      fetch("/api/account")
        .then(async (r) => {
          if (!r.ok) return;
          const data = await r.json();
          setLoggedIn(true);
          setSaved(data.addresses);
          setPoints(data.points);
          setAddress((a) => ({ ...a, email: data.email }));
        })
        .catch(() => {});
  }, [demo, setPoints]);
  let lines: ReturnType<typeof resolveLines> = [];
  let localQuote: ReturnType<typeof quote> | null = null;
  let quoteError = "";
  const selectedReward = s.rewards.find((r) => r.id === reward);
  try {
    lines = resolveLines(s.products, s.cart);
    if (lines.length)
      localQuote = quote(s.products, s.cart, s.settings, {
        split,
        remote: remoteAddress(s.settings, address.street, address.postal),
        method,
        reward: selectedReward,
        campaign: s.demo
          ? s.campaigns.find(
              (c) => c.code === coupon.toUpperCase() && isPublished(c),
            )
          : undefined,
      });
  } catch (e) {
    quoteError = (e as Error).message;
  }
  const quoteKey = JSON.stringify({
    lines: s.cart,
    split,
    method,
    street: address.street,
    postal: address.postal,
    reward_id: reward || null,
    coupon,
  });
  useEffect(() => {
    if (demo) return;
    const payload = JSON.parse(quoteKey);
    if (!payload.lines.length) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setQuoting(true);
      fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: quoteKey,
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          if (!controller.signal.aborted) {
            setServerQuote({ key: quoteKey, value: data });
            setError("");
          }
        })
        .catch((error) => {
          if (error.name !== "AbortError") setError(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setQuoting(false);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [demo, quoteKey]);
  const total = demo
    ? localQuote
    : serverQuote?.key === quoteKey
      ? serverQuote.value
      : null;
  const mixed =
    lines.some((l) => l.variant.lead_weeks === 0) &&
    lines.some((l) => l.variant.lead_weeks > 0);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      addressSchema.parse(address);
      if (differentBilling) addressSchema.parse(billing);
      if (!total)
        throw new Error("Please refresh the basket total before continuing.");
      if (selectedReward && s.points < selectedReward.points)
        throw new Error("You do not have enough points for this reward.");
      const checkoutId = requestId || crypto.randomUUID();
      setRequestId(checkoutId);
      const utm = JSON.parse(sessionStorage.getItem("thp-utm") || "{}");
      if (s.demo) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const items = lines.map((l) => ({
          id: crypto.randomUUID(),
          variant_id: l.variant.id,
          product_name: l.product.name,
          variant_label: l.variant.label,
          image: l.product.images[0],
          quantity: l.quantity,
          unit_price_cents: l.variant.price_cents,
          lead_weeks: l.variant.lead_weeks,
        }));
        const groups = split
          ? [
              items.filter((i) => !i.lead_weeks),
              items.filter((i) => i.lead_weeks),
            ]
          : [items];
        const order: Order = {
          id,
          number: `THP-PREVIEW-${s.admin.orders.length + 1}`,
          created_at: now,
          customer_email: address.email,
          address,
          billing_address: differentBilling ? billing : null,
          payment_status: "preview",
          status: items.some((i) => i.lead_weeks)
            ? "awaiting_stock"
            : "preparing",
          ...total,
          redeemed_points: selectedReward?.points || 0,
          awarded_points: 0,
          refunded_cents: 0,
          split_delivery: split,
          delivery_method: method,
          preferred_date: preferredDate,
          preferred_window: preferredWindow,
          utm,
          items,
          shipments: groups
            .filter((g) => g.length)
            .map((g) => ({
              id: crypto.randomUUID(),
              status: g.some((i) => i.lead_weeks)
                ? "awaiting_stock"
                : "preparing",
              items: g.map((i) => ({ item_id: i.id, quantity: i.quantity })),
              scheduled_at: null,
              window: "",
              tracking_url: "",
              customer_note:
                "Sample delivery. No real order or payment was created.",
            })),
          events: [
            {
              id: crypto.randomUUID(),
              status: "preview",
              message: "Local preview order created. No payment was taken.",
              created_at: now,
            },
          ],
        };
        s.saveDemoOrder(order);
        if (selectedReward) s.setPoints(s.points - selectedReward.points);
        s.clearCart();
        router.push(`/orders/${id}`);
        return;
      }
      if (saveAddress && loggedIn) {
        const result = await fetch("/api/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: "Home", address }),
        });
        if (!result.ok)
          throw new Error(
            "We couldn't save your address. Please retry or uncheck save address.",
          );
      }
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: checkoutId,
          expected_total_cents: total.total_cents,
          lines: s.cart,
          address,
          billing_address: differentBilling ? billing : null,
          reward_id: reward || null,
          coupon,
          split_delivery: split,
          delivery_method: method,
          preferred_date: preferredDate,
          preferred_window: preferredWindow,
          marketing_opt_in: optin,
          utm,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setRequestId(crypto.randomUUID());
        throw new Error(result.error);
      }
      if (!result.url)
        throw new Error(
          "This payment session is already complete. Check your order history.",
        );
      sessionStorage.setItem("thp-pending-order", result.order_id);
      window.location.assign(result.url);
    } catch (e) {
      setError(
        (e as Error).name === "ZodError"
          ? "Please check your address, contact number, and six-digit postal code."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  if (!s.cart.length)
    return (
      <div className="empty-state">
        <h3>Your next favourite is waiting.</h3>
        <p>Add a piece to your bag before checking out.</p>
        <Link href="/shop" className="button dark">
          Explore our pieces <ArrowRight size={16} />
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-intro">
        <div className="breadcrumb">
          <Link href="/shop">Shop</Link>
          <span>/</span>
          <span>Checkout</span>
        </div>
        <h1>Almost home.</h1>
        <p>A few details, and we&apos;ll take it from here.</p>
      </div>
      <form onSubmit={submit} className="checkout-layout">
        <div>
          {s.demo && (
            <div className="notice">
              Local preview. Use sample contact details. You can create a
              preview order, but no payment is taken and no email is sent.
            </div>
          )}
          {params.has("cancelled") && (
            <div className="notice">
              {cancelStatus === "released"
                ? "You left the payment page. Your stock and points reservation has been released, and your bag is still here."
                : cancelStatus === "paid"
                  ? "Stripe has confirmed this payment. Check your order history before placing another order."
                  : "You left the payment page. Your bag is still here. We are checking your stock and points reservation."}
            </div>
          )}
          {!loggedIn && (
            <p className="small-text muted">
              Already part of the family?{" "}
              <Link href="/login" className="text-button">
                Sign in for rewards
              </Link>
            </p>
          )}
          <h2>Where should we bring your pieces?</h2>
          {saved.length > 0 && (
            <Field label="Saved address">
              <select
                defaultValue=""
                onChange={(e) => {
                  const chosen = saved.find((a) => a.id === e.target.value);
                  if (chosen) setAddress(chosen.address);
                }}
              >
                <option value="">Enter a new address</option>
                {saved.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} · {a.address.street}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <AddressForm value={address} onChange={setAddress} />
          {loggedIn && (
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
              />
              Save this address to my account
            </label>
          )}
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={differentBilling}
              onChange={(e) => setDifferentBilling(e.target.checked)}
            />
            Use a different billing address
          </label>
          {differentBilling && (
            <>
              <h2>Billing address</h2>
              <AddressForm
                value={billing}
                onChange={setBilling}
                prefix="billing"
              />
            </>
          )}
          <div className="divider" />
          <h2>A delivery that works for you.</h2>
          <Field label="Delivery service">
            <select
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as "standard" | "express")
              }
            >
              <option value="standard">Standard delivery</option>
              {s.settings.express_enabled && (
                <option value="express">
                  Express delivery · {money(s.settings.express_extra_cents)}{" "}
                  extra per shipment
                </option>
              )}
            </select>
          </Field>
          {method === "express" && (
            <p className="small-text muted">
              Express handling begins after every piece in the shipment is
              available. Our team will confirm the appointment.
            </p>
          )}
          {mixed && (
            <>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={split}
                  onChange={(e) => setSplit(e.target.checked)}
                />
                Send ready-to-ship pieces first
              </label>
              <p className="small-text muted">
                Separate deliveries may incur an additional delivery fee. The
                total updates below.
              </p>
            </>
          )}
          <div className="form-grid" style={{ marginTop: 20 }}>
            <Field label="Preferred date, optional">
              <input
                type="date"
                value={preferredDate}
                min={new Date().toLocaleDateString("en-CA", {
                  timeZone: "Asia/Singapore",
                })}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </Field>
            <Field label="Preferred window">
              <select
                value={preferredWindow}
                onChange={(e) => setPreferredWindow(e.target.value)}
              >
                <option value="">No preference</option>
                <option>10am to 2pm</option>
                <option>2pm to 6pm</option>
              </select>
            </Field>
          </div>
          <p className="small-text muted">
            This is a request. Our team will confirm an appointment once your
            pieces are ready.
          </p>
          <div className="divider" />
          <label className="check-label">
            <input
              type="checkbox"
              checked={optin}
              onChange={(e) => setOptin(e.target.checked)}
            />
            Send me occasional news and offers. I can unsubscribe anytime.
          </label>
          <label className="check-label">
            <input type="checkbox" required />I have reviewed the delivery and
            return information and agree to the order terms.
          </label>
          {error && (
            <div
              className="notice error"
              role="alert"
              style={{ marginTop: 20 }}
            >
              {error}
            </div>
          )}
        </div>
        <aside className="checkout-summary">
          <h2>Your happy things.</h2>
          <div className="summary-products">
            {lines.map((l) => (
              <div className="cart-line" key={l.variant.id}>
                <img src={l.product.images[0]} alt={l.product.name} />
                <div>
                  <Link href={`/shop/${l.product.slug}`}>{l.product.name}</Link>
                  <p>{l.variant.label}</p>
                  <div className="quantity">
                    <button
                      type="button"
                      aria-label={`Decrease ${l.product.name}`}
                      onClick={() =>
                        s.setQuantity(l.variant.id, l.quantity - 1)
                      }
                    >
                      <Minus size={11} />
                    </button>
                    <span>{l.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${l.product.name}`}
                      disabled={l.quantity >= (l.variant.stock ?? 20)}
                      onClick={() =>
                        s.setQuantity(l.variant.id, l.quantity + 1)
                      }
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
                <span>{money(l.variant.price_cents * l.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <Field
            label={`Happy rewards · ${s.points.toLocaleString()} points available`}
          >
            <select
              value={reward}
              onChange={(e) => {
                setReward(e.target.value);
                if (e.target.value) setCoupon("");
              }}
              disabled={!loggedIn}
            >
              <option value="">Keep my points for next time</option>
              {s.rewards
                .filter((r) => isPublished(r))
                .map((r) => (
                  <option
                    key={r.id}
                    value={r.id}
                    disabled={s.points < r.points}
                  >
                    {r.title} · {r.points} points
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Discount code">
            <input
              value={coupon}
              onChange={(e) => {
                setCoupon(e.target.value.toUpperCase());
                if (e.target.value) setReward("");
              }}
              placeholder="Have a little something?"
              maxLength={40}
            />
          </Field>
          {quoteError && <div className="notice error">{quoteError}</div>}
          {total && (
            <>
              <div className="summary-line">
                <span>Pieces</span>
                <span>{money(total.subtotal_cents)}</span>
              </div>
              {total.discount_cents > 0 && (
                <div className="summary-line">
                  <span>Your reward / discount</span>
                  <span>−{money(total.discount_cents)}</span>
                </div>
              )}
              <div className="summary-line">
                <span>Delivery{split ? " · separate shipments" : ""}</span>
                <span>
                  {total.shipping_cents
                    ? money(total.shipping_cents)
                    : "Complimentary"}
                </span>
              </div>
              {total.installation_cents > 0 && (
                <div className="summary-line">
                  <span>Installation & handling</span>
                  <span>{money(total.installation_cents)}</span>
                </div>
              )}
              <div className="summary-line total">
                <strong>Total</strong>
                <strong>{money(total.total_cents)}</strong>
              </div>
              <p className="small-text muted">
                Includes {money(total.tax_cents)} GST.
                <br />
                {loggedIn
                  ? `${total.earned_points} points after ${s.settings.award_on === "paid" ? "confirmed payment" : "delivery"}.`
                  : "Join Happy Rewards to earn points on your next order."}
              </p>
            </>
          )}
          <button
            className="button dark full"
            style={{ marginTop: 23 }}
            disabled={
              busy ||
              quoting ||
              !total ||
              Boolean(quoteError) ||
              (!demo && Boolean(cancellationId) && cancelStatus !== "released")
            }
          >
            {busy
              ? "Preparing your checkout..."
              : quoting
                ? "Updating your total..."
                : s.demo
                  ? "Create preview order"
                  : "Continue to secure payment"}
            {s.demo ? <ArrowRight size={17} /> : <LockKeyhole size={16} />}
          </button>
          <p
            className="small-text muted"
            style={{ textAlign: "center", marginTop: 15 }}
          >
            {s.demo
              ? "Preview only. No Stripe charge."
              : "Payment handled securely by Stripe."}
          </p>
        </aside>
      </form>
    </>
  );
}
