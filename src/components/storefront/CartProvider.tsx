"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartLine = {
  productId: string;
  name: string;
  slug: string;
  image: string;
  sellPrice: number;
  qty: number;
  stock: number;
};

type CartContextValue = {
  items: CartLine[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  ready: boolean;
};

const STORAGE_KEY = "kitchen-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const addItem = useCallback(
    (item: Omit<CartLine, "qty">, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((line) => line.productId === item.productId);
        if (existing) {
          return prev.map((line) =>
            line.productId === item.productId
              ? {
                  ...line,
                  ...item,
                  qty: Math.min(item.stock, line.qty + qty),
                }
              : line
          );
        }
        return [
          ...prev,
          { ...item, qty: Math.min(item.stock, Math.max(1, qty)) },
        ];
      });
    },
    []
  );

  const setQty = useCallback((productId: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((line) =>
          line.productId === productId
            ? { ...line, qty: Math.min(line.stock, Math.max(0, qty)) }
            : line
        )
        .filter((line) => line.qty > 0)
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((line) => line.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, line) => sum + line.qty, 0);
    const subtotal = items.reduce(
      (sum, line) => sum + line.sellPrice * line.qty,
      0
    );
    return { items, count, subtotal, addItem, setQty, removeItem, clear, ready };
  }, [items, addItem, setQty, removeItem, clear, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
