/** Normalisasi nomor lokal (08xx / +62xx / spasi-strip) ke format 62xx yang stabil di Fonnte. */
function normalizeWaNumber(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

/**
 * Kirim WhatsApp lewat gateway pihak ketiga (default: Fonnte). Kalau
 * WA_GATEWAY_TOKEN belum diisi di .env, pesan cuma di-log ke console —
 * supaya alur order/konfirmasi tidak gagal cuma karena notifikasi belum
 * disetel saat development.
 */
export async function sendWhatsApp(to: string, message: string) {
  const token = process.env.WA_GATEWAY_TOKEN;
  const baseUrl = process.env.WA_GATEWAY_BASE_URL || "https://api.fonnte.com";
  const target = normalizeWaNumber(to);

  if (!token) {
    console.log(`[WA belum disetel] Ke ${target}:\n${message}`);
    return { ok: false as const, skipped: true as const };
  }

  try {
    const res = await fetch(`${baseUrl}/send`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ target, message }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.status === false) {
      console.error("Gagal kirim WA:", res.status, data);
      return { ok: false as const, error: data?.reason || `HTTP ${res.status}` };
    }
    return { ok: true as const, data };
  } catch (err) {
    console.error("Gagal kirim WA:", err);
    return { ok: false as const, error: err instanceof Error ? err.message : "unknown" };
  }
}

/** Kirim WhatsApp dengan lampiran dokumen (mis. PDF invoice) — `message` jadi caption-nya. */
export async function sendWhatsAppDocument(to: string, message: string, fileUrl: string, filename: string) {
  const token = process.env.WA_GATEWAY_TOKEN;
  const baseUrl = process.env.WA_GATEWAY_BASE_URL || "https://api.fonnte.com";
  const target = normalizeWaNumber(to);

  if (!token) {
    console.log(`[WA belum disetel] Dokumen ke ${target}: ${filename}\n${message}`);
    return { ok: false as const, skipped: true as const };
  }

  try {
    const res = await fetch(`${baseUrl}/send`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ target, message, url: fileUrl, filename }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.status === false) {
      console.error("Gagal kirim dokumen WA:", res.status, data);
      return { ok: false as const, error: data?.reason || `HTTP ${res.status}` };
    }
    return { ok: true as const, data };
  } catch (err) {
    console.error("Gagal kirim dokumen WA:", err);
    return { ok: false as const, error: err instanceof Error ? err.message : "unknown" };
  }
}
