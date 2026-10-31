import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import SarankanProdukForm from "./SarankanProdukForm";

export default async function SarankanProdukPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">Sarankan Produk</h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
        Ada buah atau produk yang kamu mau tapi belum ada di katalog? Kasih tau kami.
      </p>
      <SarankanProdukForm />
    </div>
  );
}
