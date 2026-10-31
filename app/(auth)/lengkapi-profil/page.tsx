import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import ProfilForm from "./ProfilForm";

/**
 * Langkah kedua untuk pelanggan yang baru masuk lewat Google: akun Google tidak membawa nomor
 * WhatsApp, padahal pesanan dan notifikasi kita butuh nomor itu.
 */
export default async function LengkapiProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const sudahAda = await db.customer.findUnique({ where: { email: user.email } });
  if (sudahAda) redirect("/");

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const namaAwal = meta.full_name ?? meta.name ?? "";

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Image src="/logo-farmhill-store.png" alt="Farmhill Store" width={174} height={58} priority className="mb-8 h-[52px] w-auto self-start" />
      <h1 className="font-serif text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--text-heading)]">
        Satu langkah lagi
      </h1>
      <p className="mt-2 text-[15px] leading-snug text-[var(--text-muted)]">
        Kamu masuk sebagai <strong className="text-[var(--text-body)]">{user.email}</strong>. Lengkapi nomor WhatsApp supaya
        kami bisa mengabari status pesananmu.
      </p>
      <ProfilForm namaAwal={namaAwal} />
    </div>
  );
}
