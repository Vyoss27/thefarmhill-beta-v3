import path from "node:path";
import fs from "node:fs";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/catalog";
import { getStoreSetting } from "@/lib/store-settings";
import { tanggalDenganJam } from "@/lib/slot";
import { createAdminClient } from "@/lib/supabase/admin";
import { melonGradeLabel } from "@/lib/melon-grade";

const METODE_TERIMA_LABEL: Record<string, string> = {
  driver: "Diantar driver",
  ambil_sendiri: "Ambil di gudang",
  ekspedisi: "Ekspedisi pihak ke-3",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#2E2318", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#2E2318", paddingBottom: 16 },
  logo: { width: 130, height: 32, objectFit: "contain" },
  muted: { color: "#6B573F" },
  right: { textAlign: "right" },
  title: { fontSize: 20, fontWeight: 700 },
  badge: { marginTop: 6, alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 3, fontSize: 9, fontWeight: 700 },
  section: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  label: { fontSize: 9, fontWeight: 700, color: "#8A755C", textTransform: "uppercase", letterSpacing: 0.5 },
  table: { marginTop: 24, borderTopWidth: 2, borderTopColor: "#2E2318" },
  tableHeader: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: "#2E2318", paddingVertical: 6 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5DDD2", paddingVertical: 7 },
  colItem: { flex: 3 },
  colQty: { flex: 1.3, textAlign: "right" },
  colHarga: { flex: 1.3, textAlign: "right" },
  colTotal: { flex: 1.3, textAlign: "right", fontWeight: 700 },
  totalsBox: { marginTop: 12, marginLeft: "auto", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTopWidth: 2, borderTopColor: "#2E2318" },
  footer: { marginTop: 40, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5DDD2", textAlign: "center", fontSize: 8, color: "#8A755C" },
});

async function loadOrder(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: { include: { saleUnit: { include: { product: true } } } },
      payments: { orderBy: { waktu: "desc" } },
    },
  });
}

export async function renderInvoicePdfBuffer(orderId: string): Promise<Buffer | null> {
  const order = await loadOrder(orderId);
  if (!order) return null;
  const setting = await getStoreSetting();

  const lunas = order.payments.some((p) => p.status === "verified");
  const belumLunas = !lunas && order.status !== "dibatalkan" && order.status !== "kedaluwarsa";
  const statusLabel = lunas ? "LUNAS" : belumLunas ? "BELUM LUNAS" : order.status.replace(/_/g, " ").toUpperCase();
  const statusColor = lunas ? "#2A5527" : belumLunas ? "#9A4616" : "#55432F";
  const statusBg = lunas ? "#EDF5EC" : belumLunas ? "#FEF4EB" : "#F5EFE2";

  const tanggalInvoice = order.createdAt.toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
  const tanggalKirim = order.tanggalSlot.toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "UTC" });
  const logoPath = path.join(process.cwd(), "public", "logo-farmhill-store.png");
  const logoBuffer = fs.readFileSync(logoPath);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoBuffer} style={styles.logo} />
            <Text style={[styles.muted, { marginTop: 8 }]}>{setting.namaGudang}</Text>
            <Text style={styles.muted}>PT Kebun Bumi Lestari</Text>
          </View>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={[styles.muted, styles.right, { marginTop: 4 }]}>#{order.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={[styles.muted, styles.right]}>{tanggalInvoice}</Text>
            <Text style={[styles.badge, { color: statusColor, backgroundColor: statusBg }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View>
            <Text style={styles.label}>Ditagihkan kepada</Text>
            <Text style={{ marginTop: 4, fontWeight: 700 }}>{order.customer.nama}</Text>
            <Text style={styles.muted}>{order.customer.wa}</Text>
            {order.customer.alamat && <Text style={styles.muted}>{order.customer.alamat}</Text>}
          </View>
          <View>
            <Text style={[styles.label, styles.right]}>Pengiriman</Text>
            <Text style={[styles.right, { marginTop: 4 }]}>{METODE_TERIMA_LABEL[order.metodeTerima] ?? order.metodeTerima}</Text>
            <Text style={[styles.muted, styles.right]}>
              {tanggalDenganJam(tanggalKirim, order.jamSlot)}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colItem, styles.label]}>Item</Text>
            <Text style={[styles.colQty, styles.label]}>Qty</Text>
            <Text style={[styles.colHarga, styles.label]}>Harga satuan</Text>
            <Text style={[styles.colTotal, styles.label]}>Subtotal</Text>
          </View>
          {order.items.map((item) => {
            const perluTimbang = !!item.saleUnit.ukuran;
            const qtyLabel = perluTimbang
              ? item.beratAktual
                ? `${Number(item.beratAktual)} kg`
                : "menunggu ditimbang"
              : `${item.qty.toString()} ${item.saleUnit.satuan}`;
            const jumlah = perluTimbang
              ? item.beratAktual
                ? Number(item.hargaSaatPesan) * Number(item.beratAktual)
                : null
              : Number(item.hargaSaatPesan) * Number(item.qty);
            const namaLengkap = `${item.saleUnit.product.nama}${item.saleUnit.grade ? ` · Grade ${melonGradeLabel(item.saleUnit.grade)}` : ""}${item.saleUnit.ukuran ? ` · Size ${item.saleUnit.ukuran}` : ""}${item.butirDiminta ? ` (${item.butirDiminta} butir)` : ""}`;
            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.colItem}>{namaLengkap}</Text>
                <Text style={styles.colQty}>{qtyLabel}</Text>
                <Text style={styles.colHarga}>
                  {formatRupiah(Number(item.hargaSaatPesan))}
                  {perluTimbang ? "/kg" : ""}
                </Text>
                <Text style={styles.colTotal}>{jumlah !== null ? formatRupiah(jumlah) : "—"}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{formatRupiah(Number(order.subtotal))}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>Ongkir</Text>
            <Text>{order.ongkir !== null ? formatRupiah(Number(order.ongkir)) : "Menyusul"}</Text>
          </View>
          {Number(order.diskon) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.muted}>Diskon</Text>
              <Text>-{formatRupiah(Number(order.diskon))}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={{ fontWeight: 700 }}>Total</Text>
            <Text style={{ fontWeight: 700 }}>{formatRupiah(Number(order.total))}</Text>
          </View>
        </View>

        {belumLunas && (
          <View style={{ marginTop: 24, padding: 14, backgroundColor: "#F5EFE2", borderRadius: 4 }}>
            <Text style={styles.label}>Cara pembayaran</Text>
            <View style={{ marginTop: 8, flexDirection: "row", gap: 24 }}>
              <View>
                <Text style={{ fontWeight: 700 }}>Transfer bank</Text>
                {setting.banks.map((bank) => (
                  <View key={bank.nama} style={{ marginTop: 4 }}>
                    <Text>
                      {bank.nama} {bank.noRekening}
                    </Text>
                    <Text style={styles.muted}>a.n. {bank.atasNama}</Text>
                  </View>
                ))}
              </View>
              <View>
                <Text style={{ fontWeight: 700 }}>QRIS</Text>
                <Text style={[styles.muted, { marginTop: 4 }]}>Scan lewat halaman lacak pesanan untuk kode QRIS.</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.footer}>Invoice ini dibuat otomatis oleh sistem Farmhill Store — bukan bukti pembayaran resmi bermaterai.</Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}

/**
 * Generate PDF invoice, upload ke bucket privat "invoices", dan balikin signed URL
 * (7 hari — cukup buat langsung dikirim & diakses lewat WA). Dipanggil sekali di
 * confirmOrder, bukan tiap kali halaman invoice dibuka, supaya notifikasi WA bisa
 * bawa file asli, bukan cuma link.
 */
export async function generateAndUploadInvoicePdf(orderId: string): Promise<{ url: string; path: string } | null> {
  const buffer = await renderInvoicePdfBuffer(orderId);
  if (!buffer) return null;

  const supabase = createAdminClient();
  const filePath = `${orderId}/invoice.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("invoices")
    .upload(filePath, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) {
    console.error("Gagal upload invoice PDF:", uploadError);
    return null;
  }

  const { data, error: signError } = await supabase.storage.from("invoices").createSignedUrl(filePath, 60 * 60 * 24 * 7);
  if (signError || !data) {
    console.error("Gagal bikin signed URL invoice:", signError);
    return null;
  }

  return { url: data.signedUrl, path: filePath };
}
