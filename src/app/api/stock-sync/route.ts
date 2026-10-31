import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getStockSnapshot, syncStockRows } from "@/lib/stock-sync";

const MAX_ROWS = 200;

/**
 * Pintu masuk sinkron stok dari Google Sheet (Apps Script di scripts/sheet-sync).
 * Dilindungi STOCK_SYNC_SECRET — sama seperti CRON_SECRET, bukan login staf, karena
 * pemanggilnya script, bukan orang.
 */
function authorized(request: Request) {
  const secret = process.env.STOCK_SYNC_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { rows?: unknown } | null;
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Body harus { rows: [...] }" }, { status: 400 });
  }
  if (body.rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Maksimal ${MAX_ROWS} baris per request.` }, { status: 400 });
  }

  const results = await syncStockRows(body.rows);
  if (results.some((r) => r.status === "ok")) revalidatePath("/admin/stok");
  return NextResponse.json({ results });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getStockSnapshot());
}
