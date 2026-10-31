import { db } from "@/lib/db";
import { melonGradeLabel } from "@/lib/melon-grade";
import AddProductForm from "./AddProductForm";
import AddStockBatchForm from "./AddStockBatchForm";
import StockMovementForm from "./StockMovementForm";
import ProductRow from "./ProductRow";

const MOVEMENT_LABEL: Record<string, string> = {
  terjual: "Terjual",
  waste_kulit: "Waste kulit",
  waste_busuk: "Waste tidak manis",
  waste_reject: "Waste reject",
  penyesuaian: "Penyesuaian",
};

export default async function AdminStokPage() {
  const products = await db.product.findMany({
    include: { stock: true, saleUnits: { include: { stock: true } } },
    orderBy: { nama: "asc" },
  });

  const recentBatches = await db.stockBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { product: true, saleUnit: true, dicatatOleh: true },
  });

  const recentMovements = await db.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { product: true, saleUnit: true, dicatatOleh: true },
  });

  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
        Panel admin
      </span>
      <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
        Stok &amp; Panen
      </h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
        Stok gudang Cinde Barat. Transfer antar lokasi belum dibangun — tapi harga, status tayang, dan barang masuk
        sudah bisa dicatat langsung di sini.
      </p>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <AddProductForm />
        <AddStockBatchForm
          products={products.map((p) => ({
            id: p.id,
            nama: p.nama,
            isMelon: p.jenisItem === "melon" || p.jenisItem === "paket_melon",
            sizeUnits: p.saleUnits.filter((u) => u.ukuran).map((u) => ({ id: u.id, ukuran: u.ukuran! })),
            flatUnits: p.saleUnits.filter((u) => !u.ukuran).map((u) => ({ id: u.id, satuan: u.satuan, grade: u.grade })),
          }))}
        />
        <StockMovementForm
          products={products.map((p) => ({
            id: p.id,
            nama: p.nama,
            sizeUnits: p.saleUnits.filter((u) => u.ukuran).map((u) => ({ id: u.id, ukuran: u.ukuran! })),
            flatUnits: p.saleUnits.filter((u) => !u.ukuran).map((u) => ({ id: u.id, satuan: u.satuan, grade: u.grade })),
          }))}
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-5 py-2.5 font-semibold">Produk</th>
                <th className="px-3 py-2.5 font-semibold">Kategori</th>
                <th className="px-3 py-2.5 font-semibold">Harga</th>
                <th className="px-3 py-2.5 text-right font-semibold">Stok</th>
                <th className="px-3 py-2.5 text-right font-semibold">Ditahan</th>
                <th className="px-3 py-2.5 text-right font-semibold">Tersedia</th>
                <th className="px-5 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <ProductRow
                  key={p.id}
                  zebra={idx % 2 === 1}
                  product={{
                    id: p.id,
                    nama: p.nama,
                    jenisItem: p.jenisItem,
                    status: p.status,
                    ambangStokTipis: p.ambangStokTipis ? p.ambangStokTipis.toString() : null,
                    stock: p.stock ? { jumlah: p.stock.jumlah.toString(), ditahan: p.stock.ditahan.toString() } : null,
                    saleUnits: p.saleUnits.map((u) => ({
                      id: u.id,
                      satuan: u.satuan,
                      grade: u.grade,
                      ukuran: u.ukuran,
                      stokUnitId: u.stokUnitId,
                      harga: u.harga.toString(),
                      minOrder: u.minOrder,
                      stock: u.stock ? { jumlah: u.stock.jumlah.toString(), ditahan: u.stock.ditahan.toString() } : null,
                    })),
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
        Riwayat stok masuk (20 terakhir)
      </h2>
      <div className="mt-2.5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-5 py-2.5 font-semibold">Tanggal masuk</th>
                <th className="px-3 py-2.5 font-semibold">Produk</th>
                <th className="px-3 py-2.5 font-semibold">Grade</th>
                <th className="px-3 py-2.5 text-right font-semibold">Jumlah</th>
                <th className="px-3 py-2.5 font-semibold">Lokasi</th>
                <th className="px-3 py-2.5 font-semibold">Dicatat oleh</th>
                <th className="px-5 py-2.5 font-semibold">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {recentBatches.map((b, idx) => (
                <tr
                  key={b.id}
                  className={`border-b border-[var(--border-subtle)] last:border-0 ${idx % 2 === 1 ? "bg-[var(--surface-sunken)]/40" : ""}`}
                >
                  <td className="fh-numeric px-5 py-2.5 text-[var(--text-body)]">
                    {b.tanggalMasuk.toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "UTC" })}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-body)]">
                    {b.product.nama}
                    {b.saleUnit?.ukuran && <span className="text-[var(--text-subtle)]"> · Size {b.saleUnit.ukuran}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-body)]">{melonGradeLabel(b.grade) ?? "—"}</td>
                  <td className="fh-numeric px-3 py-2.5 text-right font-semibold text-[var(--text-heading)]">
                    {Number(b.jumlah)}
                    {b.saleUnit ? " kg" : ""}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-body)]">{b.lokasiSimpan ?? "—"}</td>
                  <td className="px-3 py-2.5 text-[var(--text-body)]">{b.dicatatOleh?.nama ?? "—"}</td>
                  <td className="px-5 py-2.5 text-[var(--text-muted)]">{b.catatan ?? "—"}</td>
                </tr>
              ))}
              {recentBatches.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[var(--text-muted)]">
                    Belum ada stok masuk tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
        Riwayat stok keluar (20 terakhir)
      </h2>
      <div className="mt-2.5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-5 py-2.5 font-semibold">Tanggal</th>
                <th className="px-3 py-2.5 font-semibold">Produk</th>
                <th className="px-3 py-2.5 font-semibold">Jenis</th>
                <th className="px-3 py-2.5 text-right font-semibold">Perubahan</th>
                <th className="px-3 py-2.5 font-semibold">Dicatat oleh</th>
                <th className="px-5 py-2.5 font-semibold">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map((m, idx) => (
                <tr
                  key={m.id}
                  className={`border-b border-[var(--border-subtle)] last:border-0 ${idx % 2 === 1 ? "bg-[var(--surface-sunken)]/40" : ""}`}
                >
                  <td className="fh-numeric px-5 py-2.5 text-[var(--text-body)]">
                    {m.tanggal.toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "UTC" })}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-body)]">
                    {m.product.nama}
                    {m.saleUnit?.ukuran && <span className="text-[var(--text-subtle)]"> · Size {m.saleUnit.ukuran}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-body)]">{MOVEMENT_LABEL[m.jenis] ?? m.jenis}</td>
                  <td
                    className={`fh-numeric px-3 py-2.5 text-right font-semibold ${
                      Number(m.perubahan) < 0 ? "text-[var(--status-danger-fg)]" : "text-[var(--status-success-fg)]"
                    }`}
                  >
                    {Number(m.perubahan) > 0 ? "+" : ""}
                    {Number(m.perubahan)} kg
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-body)]">{m.dicatatOleh?.nama ?? (m.orderId ? "Sistem (order)" : "—")}</td>
                  <td className="px-5 py-2.5 text-[var(--text-muted)]">{m.catatan ?? "—"}</td>
                </tr>
              ))}
              {recentMovements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[var(--text-muted)]">
                    Belum ada stok keluar tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
