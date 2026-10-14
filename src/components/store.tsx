"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { SiteData, AdminData, CartLine, Order } from "@/lib/types";
import { demoAdmin } from "@/lib/seed";
import { usePathname } from "next/navigation";
import { resolveBranding } from "@/lib/branding";
import { BrandTheme } from "./brand-theme";
type Store = SiteData & {
  demo: boolean;
  cart: CartLine[];
  wishlist: string[];
  admin: AdminData;
  points: number;
  toast: (s: string) => void;
  add: (id: string, qty?: number) => void;
  setQuantity: (id: string, qty: number) => void;
  toggleWishlist: (id: string) => void;
  saveData: (data: Partial<SiteData>) => void;
  saveAdmin: (data: Partial<AdminData>) => void;
  setPoints: (n: number) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  saveDemoOrder: (o: Order) => void;
};
const Context = createContext<Store | null>(null);
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("thp-storage", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("thp-storage", callback);
  };
}
function useLocalState<T>(
  key: string,
  initial: T,
): [T, (update: (previous: T) => T) => void] {
  const snapshot = useCallback(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const read = useCallback(
    (value: string | null): T => {
      try {
        return value ? JSON.parse(value) : initial;
      } catch {
        return initial;
      }
    },
    [initial],
  );
  const value = useMemo(() => read(raw), [read, raw]);
  const save = useCallback(
    (update: (previous: T) => T) => {
      const next = update(read(snapshot()));
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("thp-storage"));
    },
    [key, read, snapshot],
  );
  return [value, save];
}
export function StoreProvider({
  initial,
  demo,
  children,
  initialAdmin = demoAdmin,
  adminMode = false,
}: {
  initial: SiteData;
  demo: boolean;
  children: ReactNode;
  initialAdmin?: AdminData;
  adminMode?: boolean;
}) {
  const pathname = usePathname();
  const [connectedData, setConnectedData] = useState(initial);
  const [connectedAdmin, setConnectedAdmin] = useState(initialAdmin);
  const [connectedPoints, setConnectedPoints] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [message, setMessage] = useState("");
  const demoInitial = useMemo(
    () => ({ data: initial, admin: initialAdmin, points: 1250 }),
    [initial, initialAdmin],
  );
  const shoppingInitial = useMemo(
    () => ({ cart: [] as CartLine[], wishlist: [] as string[] }),
    [],
  );
  const [preview, setPreview] = useLocalState("thp-demo-v1", demoInitial);
  const [shopping, setShopping] = useLocalState(
    "thp-shopping-v1",
    shoppingInitial,
  );
  const data = demo
    ? {
        ...initial,
        ...preview.data,
        settings: { ...initial.settings, ...preview.data.settings },
      }
    : connectedData;
  const admin = demo ? preview.admin : connectedAdmin;
  const points = demo ? preview.points : connectedPoints;
  useEffect(() => {
    if (demo || adminMode || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/store", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json();
        if (active) setConnectedData(result);
      } catch {
        /* Keep the current catalogue if a background refresh fails. */
      }
    };
    void load();
    const interval = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pathname, demo, adminMode]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const utm = Object.fromEntries(
      [...params].filter(([key]) => key.startsWith("utm_")),
    );
    if (Object.keys(utm).length)
      sessionStorage.setItem("thp-utm", JSON.stringify(utm));
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  const saveData = useCallback(
    (value: Partial<SiteData>) => {
      if (demo) setPreview((p) => ({ ...p, data: { ...p.data, ...value } }));
      else setConnectedData((d) => ({ ...d, ...value }));
    },
    [demo, setPreview],
  );
  const saveAdmin = useCallback(
    (value: Partial<AdminData>) => {
      if (demo) setPreview((p) => ({ ...p, admin: { ...p.admin, ...value } }));
      else setConnectedAdmin((d) => ({ ...d, ...value }));
    },
    [demo, setPreview],
  );
  const setPoints = useCallback(
    (n: number) => {
      if (demo) setPreview((p) => ({ ...p, points: n }));
      else setConnectedPoints(n);
    },
    [demo, setPreview],
  );
  const clearCart = useCallback(
    () => setShopping((p) => ({ ...p, cart: [] })),
    [setShopping],
  );
  const add = (id: string, qty = 1) => {
    const variant = data.products
      .flatMap((p) => p.variants)
      .find((v) => v.id === id);
    if (!variant) return;
    setShopping((p) => {
      const old = p.cart.find((l) => l.variant_id === id);
      const max = Math.min(20, variant.stock ?? 20);
      if (max < 1) return p;
      const quantity = Math.min(max, (old?.quantity || 0) + qty);
      return {
        ...p,
        cart: old
          ? p.cart.map((l) => (l.variant_id === id ? { ...l, quantity } : l))
          : [...p.cart, { variant_id: id, quantity }],
      };
    });
    setMessage("Added to your bag");
  };
  return (
    <Context.Provider
      value={{
        ...data,
        demo,
        admin,
        points,
        cart: shopping.cart,
        wishlist: shopping.wishlist,
        cartOpen,
        setCartOpen,
        toast: setMessage,
        saveData,
        saveAdmin,
        setPoints,
        clearCart,
        add,
        setQuantity: (id, qty) =>
          setShopping((p) => ({
            ...p,
            cart:
              qty <= 0
                ? p.cart.filter((l) => l.variant_id !== id)
                : p.cart.map((l) =>
                    l.variant_id === id
                      ? { ...l, quantity: Math.min(20, qty) }
                      : l,
                  ),
          })),
        toggleWishlist: (id) =>
          setShopping((p) => ({
            ...p,
            wishlist: p.wishlist.includes(id)
              ? p.wishlist.filter((v) => v !== id)
              : [...p.wishlist, id],
          })),
        saveDemoOrder: (o) =>
          setPreview((p) => ({
            ...p,
            admin: { ...p.admin, orders: [o, ...p.admin.orders] },
          })),
      }}
    >
      <BrandTheme brand={resolveBranding(data.settings.branding)}>
        {children}
        {message && (
          <div className="toast" role="status">
            {message}
          </div>
        )}
      </BrandTheme>
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Store context missing");
  return value;
}
