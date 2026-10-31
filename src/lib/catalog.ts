export const CATEGORY_LABEL: Record<string, string> = {
  melon: "Melon",
  buah: "Buah",
  buah_potong: "Buah Potong",
  paket: "Paket",
  paket_melon: "Paket Melon",
  minuman: "Minuman",
  kurma: "Kurma",
  sayur: "Sayur",
  snack: "Snack Buah",
  frozen: "Frozen Food",
};

import { Sprout, Scale, Package, Droplets, Leaf, Carrot, Snowflake, type LucideIcon } from "lucide-react";

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  melon: Sprout,
  buah_potong: Scale,
  paket: Package,
  paket_melon: Package,
  minuman: Droplets,
  buah: Leaf,
  kurma: Leaf,
  sayur: Carrot,
  snack: Scale,
  frozen: Snowflake,
};

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}
