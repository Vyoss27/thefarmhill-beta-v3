import { db } from "@/lib/db";

export type Bank = { nama: string; noRekening: string; atasNama: string };

export type StoreSettingData = {
  namaGudang: string;
  alamatGudang: string;
  banks: Bank[];
  qrisImageUrl: string;
};

const FALLBACK: StoreSettingData = {
  namaGudang: "Gudang Cinde Barat, Semarang",
  alamatGudang: "",
  banks: [],
  qrisImageUrl: "/payment/qris-farmhill.png",
};

/** Profil gudang & info pembayaran — dulu hardcode di kode, sekarang di DB (StoreSetting, baris tunggal "default"). */
export async function getStoreSetting(): Promise<StoreSettingData> {
  const row = await db.storeSetting.findUnique({ where: { id: "default" } });
  if (!row) return FALLBACK;
  return {
    namaGudang: row.namaGudang,
    alamatGudang: row.alamatGudang,
    banks: Array.isArray(row.banks) ? (row.banks as unknown as Bank[]) : [],
    qrisImageUrl: row.qrisImageUrl,
  };
}
