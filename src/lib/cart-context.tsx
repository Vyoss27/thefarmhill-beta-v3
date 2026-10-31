"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  saleUnitId: string;
  nama: string;
  satuan: string;
  harga: number;
  minOrder: number;
  qty: number;
  jenisItem?: string;
  /** Size melon per-butir (S/M/L/XL/JB) — hanya Grade Perfect. */
  ukuran?: string | null;
  /** Item dijual per-kg tapi qty dihitung per-butir — harga final baru pasti setelah
   * sales timbang berat aktual, jadi tidak ikut dijumlah ke subtotal keranjang. */
  perluTimbang?: boolean;
  /** Mode "kg": kg diminta langsung oleh pelanggan (qty diabaikan). Kalau kosong
   * & perluTimbang true, berarti mode "butir" — qty adalah jumlah buah. */
  kgDiminta?: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQty: (saleUnitId: string, qty: number) => void;
  updateKg: (saleUnitId: string, kgDiminta: number) => void;
  removeItem: (saleUnitId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "farmhill-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage tidak tersedia — keranjang mulai kosong, tidak fatal.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // abaikan — penyimpanan gagal tidak boleh menghentikan alur belanja.
    }
  }, [items, hydrated]);

  function addItem(item: CartItem) {
    setItems((prev) => {
      const existing = prev.find((i) => i.saleUnitId === item.saleUnitId);
      if (existing) {
        return prev.map((i) =>
          i.saleUnitId === item.saleUnitId
            ? item.kgDiminta !== undefined
              ? { ...i, kgDiminta: (i.kgDiminta ?? 0) + item.kgDiminta }
              : { ...i, qty: i.qty + item.qty }
            : i
        );
      }
      return [...prev, item];
    });
  }

  function updateQty(saleUnitId: string, qty: number) {
    setItems((prev) => prev.map((i) => (i.saleUnitId === saleUnitId ? { ...i, qty } : i)));
  }

  function updateKg(saleUnitId: string, kgDiminta: number) {
    setItems((prev) => prev.map((i) => (i.saleUnitId === saleUnitId ? { ...i, kgDiminta } : i)));
  }

  function removeItem(saleUnitId: string) {
    setItems((prev) => prev.filter((i) => i.saleUnitId !== saleUnitId));
  }

  function clear() {
    setItems([]);
  }

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, i) => (i.perluTimbang ? sum : sum + i.qty * i.harga), 0),
    [items]
  );

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, updateKg, removeItem, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam CartProvider");
  return ctx;
}
