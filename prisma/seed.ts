import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type UnitSeed = { satuan: string; grade: string | null; harga: number; convKeKg: number; estBerat: number; minOrder: number };

async function main() {
  // Harga varietas melon: real dari CSV penjualan DS Semarang (lihat handoff desain),
  // kecuali Sunray yang belum ada datanya — masih placeholder, ditandai jelas di bawah.
  const melonVarietas: { nama: string; slug: string; satuan: string; grades: { grade: string; harga: number }[] }[] = [
    { nama: "Sunray Melon", slug: "sunray-melon", satuan: "ons", grades: [{ grade: "A", harga: 3000 }] }, // placeholder
    { nama: "Greeniegal Melon", slug: "greeniegal-melon", satuan: "ons", grades: [{ grade: "A", harga: 3000 }] },
    { nama: "Midori Melon", slug: "midori-melon", satuan: "ons", grades: [{ grade: "A", harga: 1500 }] },
    {
      nama: "Greeniesweet Melon",
      slug: "greeniesweet-melon",
      satuan: "ons",
      grades: [
        { grade: "A", harga: 3600 },
        { grade: "B", harga: 3100 }, // placeholder — angka ilustrasi dari mockup
      ],
    },
    { nama: "Sarasuka Melon", slug: "sarasuka-melon", satuan: "ons", grades: [{ grade: "A", harga: 1500 }] },
    {
      nama: "Emeralda Melon",
      slug: "emeralda-melon",
      satuan: "ons",
      grades: [
        { grade: "A", harga: 3600 },
        { grade: "B", harga: 3100 }, // placeholder — angka ilustrasi dari mockup
      ],
    },
    { nama: "Amaiame Melon", slug: "amaiame-melon", satuan: "ons", grades: [{ grade: "A", harga: 1600 }] },
    { nama: "Elysia Melon", slug: "elysia-melon", satuan: "ons", grades: [{ grade: "A", harga: 3000 }] },
    { nama: "Aruni Melon", slug: "aruni-melon", satuan: "kg", grades: [{ grade: "A", harga: 4000 }] },
  ];

  const products: {
    nama: string;
    sku: string;
    jenisItem: "melon" | "buah_potong" | "paket" | "minuman" | "buah";
    asalKebun: string;
    deskripsi: string;
    foto?: string;
    units: UnitSeed[];
    stok: number;
  }[] = [
    ...melonVarietas.map((v, i) => {
      const convKeKg = v.satuan === "ons" ? 0.1 : 1;
      return {
        nama: v.nama,
        sku: `FH-MEL-${String(i + 1).padStart(3, "0")}`,
        jenisItem: "melon" as const,
        asalKebun: "Kebun hidroponik Farmhill",
        deskripsi: "Melon hidroponik premium, manis dan renyah.",
        foto: `/produk/${v.slug}.jpg`,
        units: v.grades.map((g) => ({ satuan: v.satuan, grade: g.grade, harga: g.harga, convKeKg, estBerat: convKeKg, minOrder: 1 })),
        stok: 20,
      };
    }),
    {
      nama: "Semangka Merah Potong",
      sku: "FH-BPT-001",
      jenisItem: "buah_potong",
      asalKebun: "Mitra petani — Boyolali",
      deskripsi: "Semangka merah tanpa biji, dipotong & dikemas segar per pack.",
      units: [{ satuan: "pack", grade: "A", harga: 15000, convKeKg: 0.25, estBerat: 0.25, minOrder: 1 }],
      stok: 60,
    },
    {
      nama: "Melon Slice",
      sku: "FH-BPT-002",
      jenisItem: "buah_potong",
      asalKebun: "Kebun hidroponik Farmhill",
      deskripsi: "Melon potong siap makan, dikemas segar per pack.",
      units: [{ satuan: "pack", grade: null, harga: 15000, convKeKg: 0.3, estBerat: 0.3, minOrder: 1 }],
      stok: 30,
    },
    {
      nama: "Fruit Box Mini",
      sku: "FH-PKT-001",
      jenisItem: "paket",
      asalKebun: "Kebun sendiri & mitra petani",
      deskripsi: "Campuran buah potong musiman dalam satu box — cocok untuk hampers kecil.",
      units: [{ satuan: "box", grade: "mix", harga: 35000, convKeKg: 0.5, estBerat: 0.5, minOrder: 1 }],
      stok: 25,
    },
    {
      nama: "Fruit Salad",
      sku: "FH-PKT-002",
      jenisItem: "paket",
      asalKebun: "Kebun sendiri & mitra petani",
      deskripsi: "Campuran buah potong segar dalam satu pack.",
      units: [{ satuan: "pack", grade: "mix", harga: 45000, convKeKg: 0.5, estBerat: 0.5, minOrder: 1 }],
      stok: 20,
    },
    {
      nama: "Hampers Melon",
      sku: "FH-PKT-003",
      jenisItem: "paket",
      asalKebun: "Kebun hidroponik Farmhill",
      deskripsi: "Parcel melon premium untuk hadiah atau oleh-oleh.",
      units: [{ satuan: "paket", grade: "A", harga: 220000, convKeKg: 2, estBerat: 2, minOrder: 1 }],
      stok: 10,
    },
    {
      nama: "Sweetmas Hampers",
      sku: "FH-PKT-004",
      jenisItem: "paket",
      asalKebun: "Kebun sendiri & mitra petani",
      deskripsi: "Parcel buah manis pilihan, cocok untuk hadiah.",
      units: [{ satuan: "paket", grade: "mix", harga: 125000, convKeKg: 1.5, estBerat: 1.5, minOrder: 1 }],
      stok: 10,
    },
    {
      nama: "Jus Melon Segar",
      sku: "FH-MIN-001",
      jenisItem: "minuman",
      asalKebun: "Kebun sendiri — Tohudan",
      deskripsi: "Jus melon tanpa pengawet, diproses harian dari melon grade A.",
      units: [{ satuan: "botol", grade: null, harga: 10000, convKeKg: 0.35, estBerat: 0.35, minOrder: 1 }],
      stok: 30,
    },
    {
      nama: "Jus Mangga",
      sku: "FH-MIN-002",
      jenisItem: "minuman",
      asalKebun: "Kebun sendiri & mitra petani",
      deskripsi: "Jus mangga segar tanpa pengawet, diproses harian.",
      units: [{ satuan: "botol", grade: null, harga: 13000, convKeKg: 0.35, estBerat: 0.35, minOrder: 1 }],
      stok: 25,
    },
    {
      nama: "Jus Alpukat",
      sku: "FH-MIN-003",
      jenisItem: "minuman",
      asalKebun: "Kebun sendiri & mitra petani",
      deskripsi: "Jus alpukat kental manis, diproses harian.",
      units: [{ satuan: "botol", grade: null, harga: 15000, convKeKg: 0.35, estBerat: 0.35, minOrder: 1 }],
      stok: 25,
    },
    {
      nama: "Anggur Import Black Autumn",
      sku: "FH-BUA-001",
      jenisItem: "buah",
      asalKebun: "Mitra petani",
      deskripsi: "Anggur import tanpa biji, manis dan renyah.",
      units: [{ satuan: "ons", grade: "A", harga: 12000, convKeKg: 0.1, estBerat: 0.1, minOrder: 2 }],
      stok: 0,
    },
  ];

  for (const p of products) {
    const product = await db.product.create({
      data: {
        nama: p.nama,
        sku: p.sku,
        jenisItem: p.jenisItem,
        asalKebun: p.asalKebun,
        deskripsi: p.deskripsi,
        status: p.stok > 0 ? "aktif" : "habis",
        ambangStokTipis: 10,
        saleUnits: { create: p.units },
        stock: { create: { jumlah: p.stok, ditahan: 0, ambangKritis: 10 } },
        photos: p.foto ? { create: [{ url: p.foto, urutan: 0 }] } : undefined,
      },
    });
    console.log(`Seeded: ${product.nama}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
