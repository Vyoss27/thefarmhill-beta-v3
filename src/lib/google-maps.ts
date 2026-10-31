/** Koordinat gudang Cinde Barat, Semarang — titik asal perhitungan ongkir. */
export const GUDANG_COORDS = { lat: -7.010118212133372, lng: 110.43617711594013 };

/**
 * Jarak tempuh jalan (bukan garis lurus) dari gudang ke alamat pelanggan,
 * lewat Google Distance Matrix API. Alamat pelanggan dikirim sebagai teks —
 * Google yang geocode di sisi mereka, tidak perlu langkah geocoding terpisah.
 */
export async function getDrivingDistanceKm(destinationAddress: string): Promise<{ ok: true; km: number } | { ok: false; error: string }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { ok: false, error: "GOOGLE_MAPS_API_KEY belum diisi di environment." };
  if (!destinationAddress.trim()) return { ok: false, error: "Alamat pelanggan kosong." };

  const origin = `${GUDANG_COORDS.lat},${GUDANG_COORDS.lng}`;
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", origin);
  url.searchParams.set("destinations", destinationAddress);
  url.searchParams.set("units", "metric");
  url.searchParams.set("mode", "driving");
  url.searchParams.set("region", "id");
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== "OK") return { ok: false, error: `Google Maps API error: ${data.status}` };

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      return { ok: false, error: "Alamat tidak ditemukan/tidak bisa dihitung jaraknya — isi ongkir manual." };
    }

    return { ok: true, km: element.distance.value / 1000 };
  } catch {
    return { ok: false, error: "Gagal menghubungi Google Maps, coba lagi atau isi manual." };
  }
}

/** BR-01 ongkir: gratis dalam radius 10km, di atas itu Rp2.500/km untuk kelebihannya saja. */
export function calculateOngkir(distanceKm: number): number {
  if (distanceKm <= 10) return 0;
  return Math.round((distanceKm - 10) * 2500);
}
