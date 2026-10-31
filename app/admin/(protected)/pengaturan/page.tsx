import Image from "next/image";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import { getStoreSetting } from "@/lib/store-settings";
import StaffTable from "./StaffTable";
import AddStaffForm from "./AddStaffForm";
import StoreSettingForm from "./StoreSettingForm";

export default async function AdminPengaturanPage() {
  const staff = await getCurrentStaff();
  const isAdmin = staff?.role === "admin";

  const staffList = isAdmin ? await db.user.findMany({ orderBy: { createdAt: "asc" } }) : [];
  const setting = await getStoreSetting();

  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">Panel admin</span>
      <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">Pengaturan</h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">Profil toko, info pembayaran, dan hak akses staf.</p>

      <section className="mt-6">
        <h2 className="text-[15px] font-semibold text-[var(--text-heading)]">Hak akses staf</h2>
        {isAdmin ? (
          <div className="mt-3 flex flex-col gap-3">
            <StaffTable staffList={staffList} currentUserId={staff.id} />
            <AddStaffForm />
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Cuma admin yang bisa mengelola akun staf.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold text-[var(--text-heading)]">Profil gudang &amp; pembayaran</h2>
        <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
            <dt className="text-[var(--text-muted)]">Nama gudang</dt>
            <dd className="text-[var(--text-body)]">{setting.namaGudang}</dd>
            <dt className="text-[var(--text-muted)]">Alamat</dt>
            <dd className="text-[var(--text-body)]">{setting.alamatGudang || "—"}</dd>
          </dl>

          <div className="mt-4 flex flex-wrap items-start gap-6 border-t border-[var(--border-subtle)] pt-4">
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">Transfer bank</p>
              {setting.banks.length === 0 && <p className="text-sm text-[var(--text-muted)]">Belum ada rekening.</p>}
              {setting.banks.map((bank, idx) => (
                <div key={idx}>
                  <p className="fh-numeric text-sm font-semibold text-[var(--text-heading)]">
                    {bank.nama} {bank.noRekening}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">a.n. {bank.atasNama}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">QRIS</p>
              <Image
                src={setting.qrisImageUrl}
                alt="QRIS Farmhill Store"
                width={100}
                height={100}
                className="mt-1.5 rounded-[var(--radius-control)] border border-[var(--border-default)]"
              />
            </div>
          </div>

          {isAdmin && <StoreSettingForm setting={setting} />}

          <p className="mt-3 border-t border-[var(--border-subtle)] pt-3 text-[13px] text-[var(--text-muted)]">
            Belum terhubung ke payment gateway (Midtrans dsb.) — semua verifikasi masih manual lewat menu Pembayaran.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold text-[var(--text-heading)]">Template pesan WhatsApp</h2>
        <div className="mt-3 rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-card)] p-5">
          <p className="text-sm font-semibold text-[var(--text-accent)]">Belum dibangun</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Isi pesan notifikasi (konfirmasi pesanan, tagihan, verifikasi bayar, dikirim, selesai, kedaluwarsa) masih tertulis
            langsung di kode, belum bisa diedit lewat panel ini.
          </p>
        </div>
      </section>
    </div>
  );
}
