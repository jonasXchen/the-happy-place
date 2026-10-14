"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Armchair,
  Package,
  Users,
  Gift,
  Megaphone,
  PanelsTopLeft,
  Settings,
  ArrowUpRight,
  Plus,
  Search,
  ChevronRight,
  Truck,
  Wallet,
  ShoppingBag,
  CheckCircle2,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  X,
  Eye,
  Pencil,
} from "lucide-react";
import { Logo } from "./shell";
import { useStore } from "./store";
import { resolveBranding, brandInitials } from "@/lib/branding";
import {
  money,
  date,
  label,
  type Product,
  type Reward,
  type Campaign,
  type Collection,
  type Order,
} from "@/lib/types";
import {
  ProductEditor,
  RewardEditor,
  CampaignEditor,
  CollectionEditor,
  OrderEditor,
  SettingsEditor,
  CustomerEditor,
  StaffEditor,
} from "./admin-editors";
import { importProducts } from "@/lib/csv";
export type AdminMutation = (
  action: string,
  data: unknown,
  demoUpdate: () => void,
) => Promise<void>;
export function Admin({
  section,
  roles,
}: {
  section: string;
  roles: string[];
}) {
  const s = useStore();
  const branding = resolveBranding(s.settings.branding);
  const router = useRouter();
  const [asOf] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [product, setProduct] = useState<Product | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<string | null>(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<Product[] | null>(null);
  const [importError, setImportError] = useState("");
  const can = (role: string) => roles.includes("owner") || roles.includes(role);
  const nav = [
    ["overview", "Overview", LayoutDashboard, ""],
    ["products", "Products", Armchair, "catalogue"],
    ["orders", "Orders & deliveries", Package, "fulfilment"],
    ["customers", "Customers", Users, "owner"],
    ["rewards", "Happy rewards", Gift, "owner"],
    ["marketing", "Marketing", Megaphone, "marketing"],
    ["content", "Content & collections", PanelsTopLeft, "marketing"],
    ["settings", "Settings", Settings, "owner"],
  ] as const;
  async function refresh() {
    if (s.demo) return;
    const response = await fetch("/api/admin", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    s.saveAdmin(data.admin);
    s.saveData(data.site);
  }
  const mutate: AdminMutation = async (action, data, demoUpdate) => {
    setBusy(true);
    try {
      if (s.demo) {
        demoUpdate();
        s.saveAdmin({
          audit: [
            {
              id: crypto.randomUUID(),
              action,
              created_at: new Date().toISOString(),
              detail: data,
            },
            ...s.admin.audit,
          ],
        });
        s.toast("Saved in your local preview.");
      } else {
        const response = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, data }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        await refresh();
        s.toast(result.message || "Your changes are saved.");
      }
    } catch (e) {
      s.toast((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const titles: Record<string, [string, string]> = {
    overview: [
      "A little overview.",
      `Here's what's happening at ${branding.name}.`,
    ],
    products: [
      "Your pieces.",
      "Keep your catalogue, finishes, and available stock up to date.",
    ],
    orders: [
      "From your place to theirs.",
      "Payments, delivery appointments, and every step in between.",
    ],
    customers: [
      "The people behind the homes.",
      "Customer history, rewards, and marketing preferences.",
    ],
    rewards: [
      "A little more rewarding.",
      "Rewards your customers can choose. Rules you can change.",
    ],
    marketing: [
      "Good things to share.",
      "Discount codes, campaigns, and news for your subscribers.",
    ],
    content: [
      "Make it feel like you.",
      "Update your homepage and put together a new collection.",
    ],
    settings: [
      "The details, considered.",
      "Delivery, points, policies, and staff permissions.",
    ],
  };
  const current = titles[section] ? section : "overview";
  const required = nav.find((n) => n[0] === current)?.[3];
  const allowed = !required || can(required);
  const paid = s.admin.orders.filter((o) =>
    ["paid", "partially_refunded", "refunded"].includes(o.payment_status),
  );
  const revenue = paid.reduce(
    (a, o) => a + o.total_cents - o.refunded_cents,
    0,
  );
  const attention = s.admin.orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  );
  const newProduct = () => {
    const id = crypto.randomUUID();
    setProduct({
      id,
      name: "",
      slug: "",
      category: "chairs",
      room: "Living",
      style: "Contemporary",
      material: "",
      description: "",
      dimensions: "",
      care: "",
      images: [],
      price_cents: 10000,
      active: false,
      featured: false,
      shipping_class: "medium",
      installation: false,
      sample: true,
      variants: [
        {
          id: crypto.randomUUID(),
          product_id: id,
          label: "Standard",
          sku: `THP-${Date.now().toString().slice(-6)}`,
          colour: "Oat",
          material: "",
          size: "Standard",
          price_cents: 10000,
          stock: null,
          lead_weeks: 8,
        },
      ],
    });
  };
  function exportCsv() {
    const headers = [
      "slug",
      "name",
      "category",
      "price",
      "sku",
      "stock",
      "lead_weeks",
      "colour",
      "material",
      "size",
      "image",
    ];
    const rows = s.products.flatMap((p) =>
      p.variants.map((v) => [
        p.slug,
        p.name,
        p.category,
        v.price_cents / 100,
        v.sku,
        v.stock ?? "",
        v.lead_weeks,
        v.colour,
        v.material,
        v.size,
        p.images[0] || "",
      ]),
    );
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "happy-place-products.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Logo brand={branding} />
        <small>STORE MANAGEMENT</small>
        <nav className="admin-nav">
          {nav
            .filter((n) => !n[3] || can(n[3]))
            .map(([id, title, Icon]) => (
              <Link
                key={id}
                href={id === "overview" ? "/admin" : `/admin/${id}`}
                className={current === id ? "active" : ""}
              >
                <Icon size={17} />
                {title}
                {id === "orders" && attention.length > 0 && (
                  <span className="badge">{attention.length}</span>
                )}
              </Link>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" className="inline-actions">
            View your store <ArrowUpRight size={13} />
          </Link>
          {!s.demo && (
            <button
              className="inline-actions"
              onClick={async () => {
                await fetch("/api/auth", { method: "DELETE" });
                router.push("/login?next=/admin");
                router.refresh();
              }}
            >
              Sign out <LogOut size={13} />
            </button>
          )}
          <span className="muted">Singapore · SGD</span>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <span>
            {branding.name} / {titles[current][0].replace(".", "")}
          </span>
          <div className="inline-actions">
            <span>{s.demo ? "Preview workspace" : "Staff workspace"}</span>
            <span className="admin-avatar">{brandInitials(branding.name)}</span>
          </div>
        </div>
        {s.demo && (
          <div className="admin-demo-banner">
            <span>
              Local preview. Changes stay in this browser. Orders and customers
              are fictional; payments and emails are disabled.
            </span>
            <button
              onClick={() => {
                localStorage.removeItem("thp-demo-v1");
                localStorage.removeItem("thp-shopping-v1");
                location.reload();
              }}
            >
              Reset preview
            </button>
          </div>
        )}
        <div className="admin-heading">
          <div>
            <h1>{titles[current][0]}</h1>
            <p>{titles[current][1]}</p>
          </div>
          {current === "products" && (
            <button className="button dark small" onClick={newProduct}>
              <Plus size={14} />
              Add a piece
            </button>
          )}
          {current === "rewards" && (
            <button
              className="button dark small"
              onClick={() =>
                setReward({
                  id: crypto.randomUUID(),
                  title: "",
                  description: "",
                  points: 500,
                  kind: "fixed",
                  value: 1500,
                  min_spend_cents: 10000,
                  active: false,
                  limit_per_customer: 0,
                  product_ids: [],
                  image: "/images/tray.jpg",
                })
              }
            >
              <Plus size={14} />
              New reward
            </button>
          )}
          {current === "marketing" && (
            <button
              className="button dark small"
              onClick={() =>
                setCampaign({
                  id: crypto.randomUUID(),
                  title: "",
                  code: "",
                  kind: "percent",
                  value: 5,
                  min_spend_cents: 10000,
                  max_uses: 100,
                  uses: 0,
                  starts_at: new Date().toISOString(),
                  ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
                  active: false,
                  product_ids: [],
                  subject: "",
                  message: "",
                })
              }
            >
              <Plus size={14} />
              New campaign
            </button>
          )}
        </div>
        {!allowed ? (
          <div className="notice">
            Your staff role does not include this area.
          </div>
        ) : (
          <>
            {current === "overview" && (
              <>
                <div className="stats-grid">
                  {[
                    [
                      "Sales after refunds",
                      money(revenue),
                      Wallet,
                      "Confirmed payments",
                    ],
                    [
                      "Orders to fulfil",
                      attention.length,
                      Package,
                      "Waiting to come home",
                    ],
                    [
                      "Average order",
                      money(
                        paid.length ? Math.round(revenue / paid.length) : 0,
                      ),
                      ShoppingBag,
                      "Across confirmed payments",
                    ],
                    [
                      "Active pieces",
                      s.products.filter((p) => p.active).length,
                      Armchair,
                      `${s.products.filter((p) => p.variants.some((v) => v.stock === 0)).length} with sold-out variants`,
                    ],
                  ].map(([title, value, Icon, note]) => {
                    const C = Icon as typeof Wallet;
                    return (
                      <div key={String(title)} className="stat-card">
                        <span>
                          {String(title)}
                          <C size={15} />
                        </span>
                        <strong>{String(value)}</strong>
                        <small>{String(note)}</small>
                      </div>
                    );
                  })}
                </div>
                <div className="admin-two-col">
                  <div className="admin-card">
                    <div
                      className="inline-actions"
                      style={{ justifyContent: "space-between" }}
                    >
                      <h2>Orders needing a little care</h2>
                      <Link href="/admin/orders" className="small-text">
                        View all{" "}
                        <ChevronRight size={11} style={{ display: "inline" }} />
                      </Link>
                    </div>
                    <OrderTable
                      orders={attention.slice(0, 5)}
                      onOpen={setOrder}
                    />
                  </div>
                  <div className="admin-card">
                    <h2>Good things to take care of</h2>
                    <div className="activity-list">
                      <div>
                        <Truck size={16} />
                        <div>
                          <p>
                            {
                              attention.filter((o) => o.status === "scheduled")
                                .length
                            }{" "}
                            deliveries scheduled
                          </p>
                          <small>Confirmed appointments</small>
                        </div>
                      </div>
                      <div>
                        <Armchair size={16} />
                        <div>
                          <p>
                            {s.products.filter((p) => p.sample).length} pieces
                            need review
                          </p>
                          <small>Verify prices, variants, and lead times</small>
                        </div>
                      </div>
                      <div>
                        <CheckCircle2 size={16} />
                        <div>
                          <p>
                            {s.settings.policies_approved
                              ? "Store policies reviewed"
                              : "Store policies awaiting review"}
                          </p>
                          <small>
                            {s.settings.policies_approved
                              ? "Connected checkout may open"
                              : "Checkout stays closed until approved"}
                          </small>
                        </div>
                      </div>
                      <div>
                        <Megaphone size={16} />
                        <div>
                          <p>
                            {
                              s.admin.notifications.filter(
                                (n) => n.status === "failed",
                              ).length
                            }{" "}
                            emails need attention
                          </p>
                          <small>See notification delivery in Settings</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="admin-two-col">
                  <div className="admin-card">
                    <h2>Sales over the past 7 days</h2>
                    <div className="admin-bar-chart">
                      {Array.from({ length: 7 }, (_, i) => {
                        const day = new Date(asOf - (6 - i) * 86400000);
                        const dayKey = day.toISOString().slice(0, 10);
                        const value = paid
                          .filter((o) => o.created_at.startsWith(dayKey))
                          .reduce(
                            (a, o) => a + o.total_cents - o.refunded_cents,
                            0,
                          );
                        const max = Math.max(
                          1,
                          ...paid.map((o) => o.total_cents),
                        );
                        return (
                          <div
                            key={i}
                            title={`${date(day.toISOString())}: ${money(value)}`}
                          >
                            <i
                              style={{
                                height: `${Math.max(2, (value / max) * 100)}%`,
                              }}
                            />
                            <small>
                              {day.toLocaleDateString("en-SG", {
                                weekday: "short",
                                timeZone: "Asia/Singapore",
                              })}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="admin-card">
                    <h2>A quick way in</h2>
                    <div className="activity-list">
                      <Link
                        href="/admin/products"
                        className="inline-actions"
                        style={{ padding: 15 }}
                      >
                        Update a piece <ArrowUpRight size={14} />
                      </Link>
                      <Link
                        href="/admin/content"
                        className="inline-actions"
                        style={{ padding: 15 }}
                      >
                        Refresh the homepage <ArrowUpRight size={14} />
                      </Link>
                      <Link
                        href="/admin/rewards"
                        className="inline-actions"
                        style={{ padding: 15 }}
                      >
                        Create a little reward <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
                <p className="dashboard-note">
                  Metrics cover the most recent 200 orders. Export or extend the
                  reporting query when your order volume grows.
                </p>
              </>
            )}
            {current === "products" && (
              <>
                <div className="admin-toolbar">
                  <div className="admin-search">
                    <Search size={15} />
                    <input
                      aria-label="Search products"
                      placeholder="Find a piece, SKU, or material..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <div className="inline-actions">
                    <button
                      className="button outline small"
                      onClick={exportCsv}
                    >
                      <Download size={13} />
                      Export CSV
                    </button>
                    <label
                      className="button outline small"
                      style={{ cursor: "pointer" }}
                    >
                      <Upload size={13} />
                      Import CSV
                      <input
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={async (e) => {
                          try {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 1000000)
                              throw new Error("CSV must be under 1 MB.");
                            setImported(
                              importProducts(await file.text(), s.products),
                            );
                            setImportError("");
                          } catch (e) {
                            setImportError((e as Error).message);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                {importError && (
                  <div className="notice error">{importError}</div>
                )}
                <div className="admin-card">
                  <div className="table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Piece</th>
                          <th>Category</th>
                          <th>Price from</th>
                          <th>Available stock</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {s.products
                          .filter((p) =>
                            `${p.name} ${p.material} ${p.variants.map((v) => v.sku).join(" ")}`
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                          )
                          .map((p) => (
                            <tr key={p.id}>
                              <td>
                                <div className="table-product">
                                  <img
                                    src={p.images[0] || "/images/chair.jpg"}
                                    alt=""
                                  />
                                  <div>
                                    {p.name}
                                    <small>
                                      {p.variants.length} finish options ·{" "}
                                      {p.material}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>{label(p.category)}</td>
                              <td>{money(p.price_cents)}</td>
                              <td>
                                {p.variants.every((v) => v.stock === null)
                                  ? "Made to order"
                                  : p.variants.reduce(
                                      (a, v) => a + (v.stock || 0),
                                      0,
                                    )}
                                <small
                                  className="muted"
                                  style={{ display: "block", marginTop: 5 }}
                                >
                                  Excludes reservations
                                </small>
                              </td>
                              <td>
                                <button
                                  className={`status-pill ${p.active ? "" : "pending"}`}
                                  disabled={busy}
                                  onClick={() =>
                                    void mutate(
                                      "product",
                                      { ...p, active: !p.active },
                                      () =>
                                        s.saveData({
                                          products: s.products.map((q) =>
                                            q.id === p.id
                                              ? { ...q, active: !q.active }
                                              : q,
                                          ),
                                        }),
                                    ).catch(() => {})
                                  }
                                >
                                  {p.active ? "Published" : "Draft"}
                                </button>
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  aria-label={`Edit ${p.name}`}
                                  onClick={() => setProduct(structuredClone(p))}
                                >
                                  <Pencil size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="dashboard-note">
                  Categories, rooms, and styles come from your product fields.
                  Create a category by entering a new name in a product. CSV
                  imports remain unverified until you review each piece.
                </p>
              </>
            )}
            {current === "orders" && (
              <>
                <div className="admin-toolbar">
                  <div className="admin-search">
                    <Search size={15} />
                    <input
                      aria-label="Search orders"
                      placeholder="Order number or customer..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <div className="switcher">
                    {["all", "awaiting_stock", "scheduled", "delivered"].map(
                      (v) => (
                        <button
                          key={v}
                          className={`chip ${filter === v ? "active" : ""}`}
                          onClick={() => setFilter(v)}
                        >
                          {label(v)}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <div className="admin-card">
                  <OrderTable
                    orders={s.admin.orders.filter(
                      (o) =>
                        (filter === "all" || o.status === filter) &&
                        `${o.number} ${o.address.name} ${o.customer_email}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                    )}
                    onOpen={setOrder}
                  />
                </div>
              </>
            )}
            {current === "customers" && (
              <div className="admin-card">
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Orders</th>
                        <th>Spent</th>
                        <th>Points</th>
                        <th>Marketing</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {s.admin.customers.map((c) => (
                        <tr key={c.id}>
                          <td>
                            {c.name || "Member"}
                            <p className="small-text muted">{c.email}</p>
                          </td>
                          <td>{c.order_count}</td>
                          <td>{money(c.spent_cents)}</td>
                          <td>{c.points.toLocaleString()}</td>
                          <td>
                            {c.marketing_opt_in ? "Opted in" : "Not subscribed"}
                          </td>
                          <td>
                            <button
                              className="button outline small"
                              onClick={() => setCustomer(c.id)}
                            >
                              View & adjust
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {current === "rewards" && (
              <>
                <div className="reward-cards">
                  {s.rewards.map((r) => (
                    <div className="reward-card" key={r.id}>
                      <img src={r.image || "/images/tray.jpg"} alt="" />
                      <span className="eyebrow">
                        {r.points.toLocaleString()} POINTS
                      </span>
                      <h3>{r.title}</h3>
                      <p>{r.description}</p>
                      <div
                        className="inline-actions"
                        style={{ marginTop: "auto", width: "100%" }}
                      >
                        <span
                          className={`status-pill ${r.active ? "" : "pending"}`}
                        >
                          {r.active ? "Active" : "Draft"}
                        </span>
                        <button
                          className="button outline small"
                          style={{ marginLeft: "auto" }}
                          onClick={() => setReward(structuredClone(r))}
                        >
                          Edit reward <Pencil size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="admin-card">
                  <h2>How points work</h2>
                  <p className="small-text muted">
                    {s.settings.points_per_dollar} points per eligible dollar.
                    Award after {s.settings.award_on}. Expire after{" "}
                    {s.settings.expiry_days} days. Signup bonus:{" "}
                    {s.settings.signup_points} points.
                  </p>
                  <Link
                    href="/admin/settings"
                    className="text-button"
                    style={{ marginTop: 20 }}
                  >
                    Change earning rules <ArrowUpRight size={13} />
                  </Link>
                </div>
              </>
            )}
            {current === "marketing" && (
              <>
                <div className="admin-card">
                  <h2>Your campaigns</h2>
                  {s.campaigns.length ? (
                    <div className="table-scroll">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Campaign</th>
                            <th>Offer</th>
                            <th>Uses</th>
                            <th>Dates</th>
                            <th>Status</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {s.campaigns.map((c) => (
                            <tr key={c.id}>
                              <td>
                                {c.title}
                                <p className="small-text muted">{c.code}</p>
                              </td>
                              <td>
                                {c.kind === "percent"
                                  ? `${c.value}% off`
                                  : money(c.value)}
                              </td>
                              <td>
                                {c.uses} / {c.max_uses || "unlimited"}
                              </td>
                              <td>
                                {date(c.starts_at)} to {date(c.ends_at)}
                              </td>
                              <td>
                                <span
                                  className={`status-pill ${c.active ? "" : "pending"}`}
                                >
                                  {c.active ? "Active" : "Draft"}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  aria-label={`Edit ${c.title}`}
                                  onClick={() =>
                                    setCampaign(structuredClone(c))
                                  }
                                >
                                  <Pencil size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: 35 }}>
                      <Megaphone size={26} />
                      <h3>A good thing deserves to be shared.</h3>
                      <p>
                        Create a code, save an email, and preview it before
                        sending.
                      </p>
                    </div>
                  )}
                </div>
                <div className="admin-card">
                  <h2>Where your orders come from</h2>
                  <div className="table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Orders</th>
                          <th>Sales after refunds</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ...new Set(
                            paid.map((o) => o.utm.utm_source || "Direct"),
                          ),
                        ].map((source) => {
                          const orders = paid.filter(
                            (o) => (o.utm.utm_source || "Direct") === source,
                          );
                          return (
                            <tr key={source}>
                              <td>{source}</td>
                              <td>{orders.length}</td>
                              <td>
                                {money(
                                  orders.reduce(
                                    (a, o) =>
                                      a + o.total_cents - o.refunded_cents,
                                    0,
                                  ),
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="dashboard-note">
                    Add utm_source, utm_medium, and utm_campaign to share links
                    to attribute orders. No advertising trackers are enabled by
                    default.
                  </p>
                </div>
              </>
            )}
            {current === "content" && (
              <>
                <SettingsEditor
                  key={JSON.stringify(s.settings)}
                  kind="content"
                  mutate={mutate}
                  busy={busy}
                />
                <div className="admin-card">
                  <div
                    className="inline-actions"
                    style={{ justifyContent: "space-between" }}
                  >
                    <h2>Collections & campaign pages</h2>
                    <button
                      className="button dark small"
                      onClick={() =>
                        setCollection({
                          id: crypto.randomUUID(),
                          title: "",
                          slug: "",
                          description: "",
                          image: "/images/interior.jpg",
                          product_ids: [],
                          active: false,
                        })
                      }
                    >
                      <Plus size={13} />
                      New collection
                    </button>
                  </div>
                  <div className="collection-grid">
                    {s.collections.map((c) => (
                      <div className="collection-card" key={c.id}>
                        <img src={c.image} alt="" style={{ height: 210 }} />
                        <h2 style={{ fontSize: 25 }}>{c.title}</h2>
                        <p>{c.description}</p>
                        <div
                          className="inline-actions"
                          style={{ marginTop: 15 }}
                        >
                          <span
                            className={`status-pill ${c.active ? "" : "pending"}`}
                          >
                            {c.active
                              ? c.publish_at &&
                                new Date(c.publish_at) > new Date()
                                ? "Scheduled"
                                : "Published"
                              : "Draft"}
                          </span>
                          <button
                            className="button outline small"
                            onClick={() => setCollection(structuredClone(c))}
                          >
                            Edit <Pencil size={12} />
                          </button>
                          <Link
                            href={`/collections/${c.slug}`}
                            className="icon-button"
                            aria-label="View collection"
                          >
                            <Eye size={16} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {current === "settings" && (
              <>
                <SettingsEditor
                  key={JSON.stringify(s.settings)}
                  kind="settings"
                  mutate={mutate}
                  busy={busy}
                />
                <div className="admin-card">
                  <div
                    className="inline-actions"
                    style={{ justifyContent: "space-between" }}
                  >
                    <h2>Staff access</h2>
                    <button
                      className="button outline small"
                      onClick={() => setStaffOpen(true)}
                    >
                      <Plus size={13} />
                      Assign a role
                    </button>
                  </div>
                  {s.admin.staff.length ? (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Roles</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.admin.staff.map((st) => (
                          <tr key={st.user_id}>
                            <td>{st.email}</td>
                            <td>{st.roles.join(", ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="small-text muted">
                      The preview has no real staff accounts. Bootstrap the
                      first owner in Supabase, then assign roles here.
                    </p>
                  )}
                </div>
                <div className="admin-card">
                  <div
                    className="inline-actions"
                    style={{ justifyContent: "space-between" }}
                  >
                    <h2>Notification delivery</h2>
                    <button
                      className="button outline small"
                      disabled={busy}
                      onClick={() =>
                        void mutate("retry_notifications", {}, () =>
                          s.saveAdmin({
                            notifications: s.admin.notifications.map((n) =>
                              n.status === "failed"
                                ? { ...n, status: "pending", attempts: 0 }
                                : n,
                            ),
                          }),
                        ).catch(() => {})
                      }
                    >
                      <RefreshCw size={12} />
                      Retry failed
                    </button>
                  </div>
                  <div className="table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Recipient</th>
                          <th>Subject</th>
                          <th>Status</th>
                          <th>Attempts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.admin.notifications.map((n) => (
                          <tr key={n.id}>
                            <td>{n.recipient}</td>
                            <td>
                              {n.subject}
                              <p className="small-text muted">{n.last_error}</p>
                            </td>
                            <td>
                              <span className={`status-pill ${n.status}`}>
                                {label(n.status)}
                              </span>
                            </td>
                            <td>{n.attempts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!s.admin.notifications.length && (
                    <p className="small-text muted">
                      No notifications yet. Connected email requires Resend and
                      the maintenance job.
                    </p>
                  )}
                </div>
                <div className="admin-card">
                  <h2>Recent changes</h2>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.admin.audit.slice(0, 15).map((a) => (
                        <tr key={a.id}>
                          <td>{date(a.created_at)}</td>
                          <td>{label(a.action)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
        {product && (
          <ProductEditor
            value={product}
            onClose={() => setProduct(null)}
            mutate={mutate}
            busy={busy}
          />
        )}{" "}
        {reward && (
          <RewardEditor
            value={reward}
            onClose={() => setReward(null)}
            mutate={mutate}
            busy={busy}
          />
        )}{" "}
        {campaign && (
          <CampaignEditor
            value={campaign}
            onClose={() => setCampaign(null)}
            mutate={mutate}
            busy={busy}
          />
        )}{" "}
        {collection && (
          <CollectionEditor
            value={collection}
            onClose={() => setCollection(null)}
            mutate={mutate}
            busy={busy}
          />
        )}{" "}
        {order && (
          <OrderEditor
            value={s.admin.orders.find((o) => o.id === order.id) || order}
            onClose={() => setOrder(null)}
            mutate={mutate}
            busy={busy}
            canRefund={can("owner")}
          />
        )}{" "}
        {customer && (
          <CustomerEditor
            id={customer}
            onClose={() => setCustomer(null)}
            mutate={mutate}
            busy={busy}
          />
        )}{" "}
        {staffOpen && (
          <StaffEditor
            onClose={() => setStaffOpen(false)}
            mutate={mutate}
            busy={busy}
          />
        )}{" "}
        {imported && (
          <div className="modal-centered">
            <div className="form-modal">
              <header>
                <h2>Review your import.</h2>
                <button
                  className="icon-button"
                  aria-label="Close import"
                  onClick={() => setImported(null)}
                >
                  <X size={20} />
                </button>
              </header>
              <div className="notice">
                {imported.length} pieces passed validation. Imports do not
                verify stock or pricing. Review them before enabling checkout.
              </div>
              {imported.map((p) => (
                <p key={p.id} style={{ fontSize: "1rem", padding: 8 }}>
                  {p.name} · {p.variants.length} variants ·{" "}
                  {money(p.price_cents)}
                </p>
              ))}
              <button
                className="button dark"
                disabled={busy}
                onClick={async () => {
                  try {
                    if (s.demo) {
                      await mutate(
                        "product_import",
                        { count: imported.length },
                        () =>
                          s.saveData({
                            products: [
                              ...s.products.filter(
                                (p) => !imported.some((i) => i.id === p.id),
                              ),
                              ...imported,
                            ],
                          }),
                      );
                    } else
                      for (const p of imported)
                        await mutate("product", p, () =>
                          s.saveData({
                            products: [
                              ...s.products.filter((v) => v.id !== p.id),
                              p,
                            ],
                          }),
                        );
                    setImported(null);
                  } catch {
                    /* Keep preview available after a failed row. */
                  }
                }}
              >
                Import {imported.length} pieces <Upload size={15} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
function OrderTable({
  orders,
  onOpen,
}: {
  orders: Order[];
  onOpen: (o: Order) => void;
}) {
  return (
    <div className="table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Delivery</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <button onClick={() => onOpen(o)}>{o.number}</button>
                <p className="small-text muted">{date(o.created_at)}</p>
              </td>
              <td>
                {o.address.name}
                <p className="small-text muted">
                  {o.items.length} piece{o.items.length === 1 ? "" : "s"}
                </p>
              </td>
              <td>{money(o.total_cents)}</td>
              <td>
                <span className={`status-pill ${o.payment_status}`}>
                  {label(o.payment_status)}
                </span>
              </td>
              <td>
                <span className={`status-pill ${o.status}`}>
                  {label(o.status)}
                </span>
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Open ${o.number}`}
                  onClick={() => onOpen(o)}
                >
                  <ChevronRight size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!orders.length && (
        <p className="small-text muted" style={{ padding: 25 }}>
          No orders in this view.
        </p>
      )}
    </div>
  );
}
