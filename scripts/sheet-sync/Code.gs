/**
 * Farmhill — sinkron stok in/out dari Google Sheet "TRIAL DATA STOK DS SEMARANG" ke aplikasi.
 * Pasang lewat Extensions > Apps Script. Langkah lengkap: lihat README.md di folder ini.
 *
 * Alur: tab DATA IN / DATA OUT tetap dipakai seperti biasa. Script menambah 3 kolom di
 * kanan tiap tab (SIZE, SYNC_ID, SYNC_STATUS), lalu mengirim baris baru ke
 * POST /api/stock-sync. Saldo TIDAK dihitung di sini — saldo ada di database.
 */

var CONFIG_TABS = {
  IN: { name: "DATA IN", firstHeader: "TANGGAL MASUK", cols: { tanggal: "TANGGAL MASUK", varian: "VARIAN", jumlah: "KG", grade: "GRADE" } },
  OUT: { name: "DATA OUT", firstHeader: "Tanggal", cols: { tanggal: "Tanggal", jenis: "Jenis Barang", varian: "Varian", grade: "Grade", jumlah: "Real (Kg)", catatan: "Keterangan" } },
};
var EXTRA_HEADERS = ["SIZE", "SYNC_ID", "SYNC_STATUS"];
var MAP_TAB = "MAP_APP";
var SALDO_TAB = "SALDO APP";
var BATCH_SIZE = 100;
// VARIAN di sheet -> nama produk di app, untuk nama yang beda tapi barangnya sama.
var ALIASES = { "S7": "Amaiame" };
var MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
var GRADES = { PERFECT: "perfect", IMPERFECT: "imperfect", OUTSPEC: "outspec" };
// "Jenis Barang" di DATA OUT -> jenis stok keluar di app. Kosong = barang import yang terjual.
var OUT_KINDS = {
  "": "terjual", "butir": "terjual", "slice": "terjual",
  "waste kulit": "waste_kulit", "waste tidak manis": "waste_busuk", "waste reject": "waste_reject",
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Farmhill Sync")
    .addItem("Sinkron sekarang", "sinkronSekarang")
    .addItem("Tarik saldo dari app", "tarikSaldo")
    .addSeparator()
    .addItem("1. Setelan (URL, secret, tanggal mulai)", "setelan")
    .addItem("2. Siapkan sheet (kolom + tab MAP_APP)", "siapkanSheet")
    .addItem("3. Jalankan otomatis tiap 15 menit", "pasangTrigger")
    .addToUi();
}

// ─── Setelan ──────────────────────────────────────────────────────────────

function setelan() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();
  var fields = [
    ["API_URL", "URL endpoint (contoh https://domain-kamu.com/api/stock-sync)"],
    ["API_SECRET", "Isi STOCK_SYNC_SECRET (sama persis dengan di Vercel)"],
    ["SYNC_FROM", "Tanggal mulai sinkron, yyyy-mm-dd. Baris sebelum tanggal ini TIDAK dikirim."],
  ];
  fields.forEach(function (f) {
    var current = props.getProperty(f[0]);
    var shown = f[0] === "API_SECRET" && current ? "(sudah terisi, kosongkan untuk tetap)" : current || "(kosong)";
    var r = ui.prompt(f[1], "Sekarang: " + shown, ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return;
    var v = r.getResponseText().trim();
    if (v) props.setProperty(f[0], v);
  });
  ui.alert("Setelan tersimpan.");
}

function config_() {
  var p = PropertiesService.getScriptProperties().getProperties();
  if (!p.API_URL || !p.API_SECRET || !p.SYNC_FROM) throw new Error("Setelan belum lengkap — jalankan menu 1. Setelan.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.SYNC_FROM)) throw new Error("SYNC_FROM harus yyyy-mm-dd.");
  return p;
}

function callApi_(method, body) {
  var p = config_();
  var res = UrlFetchApp.fetch(p.API_URL, {
    method: method,
    contentType: "application/json",
    headers: { Authorization: "Bearer " + p.API_SECRET },
    payload: body ? JSON.stringify(body) : undefined,
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error("API " + res.getResponseCode() + ": " + res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText());
}

// ─── Siapkan sheet ────────────────────────────────────────────────────────

function siapkanSheet() {
  var ss = SpreadsheetApp.getActive();
  var varians = {};

  ["IN", "OUT"].forEach(function (key) {
    var t = readTab_(ss, key, false); // sekalian menambah kolom SIZE/SYNC_ID/SYNC_STATUS
    t.rows.forEach(function (r) {
      var v = String(r[t.col.varian] || "").trim();
      if (v) varians[v] = true;
    });
  });

  var produk = callApi_("GET").produk;
  var byNorm = {};
  produk.forEach(function (p) { byNorm[norm_(p.nama)] = p.sku; });
  // Nama lain di sheet untuk produk yang sama (S7 = Amaiame).
  Object.keys(ALIASES).forEach(function (alias) {
    if (byNorm[norm_(ALIASES[alias])]) byNorm[norm_(alias)] = byNorm[norm_(ALIASES[alias])];
  });

  var map = ss.getSheetByName(MAP_TAB) || ss.insertSheet(MAP_TAB);
  if (map.getLastRow() === 0) map.getRange(1, 1, 1, 3).setValues([["VARIAN (di sheet)", "SKU (di app)", "NAMA PRODUK APP"]]);
  var existing = {};
  if (map.getLastRow() > 1) map.getRange(2, 1, map.getLastRow() - 1, 1).getValues().forEach(function (r) { existing[String(r[0]).trim()] = true; });

  var add = Object.keys(varians).sort().filter(function (v) { return !existing[v]; }).map(function (v) {
    return [v, byNorm[norm_(v)] || "", ""];
  });
  if (add.length) map.getRange(map.getLastRow() + 1, 1, add.length, 3).setValues(add);

  // Kolom C = nama produk dari SKU, buat memastikan mapping benar secara visual.
  var last = map.getLastRow();
  if (last > 1) {
    var skuToNama = {};
    produk.forEach(function (p) { skuToNama[p.sku] = p.nama; });
    var skus = map.getRange(2, 2, last - 1, 1).getValues();
    map.getRange(2, 3, last - 1, 1).setValues(skus.map(function (r) { return [skuToNama[String(r[0]).trim()] || ""]; }));
  }

  var unmapped = add.filter(function (r) { return !r[1]; }).length;
  SpreadsheetApp.getUi().alert(
    "Sheet siap.\n\n" + add.length + " varian baru ditambahkan ke tab " + MAP_TAB + ", " + unmapped +
    " di antaranya belum ketemu otomatis — isi kolom SKU manual (baris tanpa SKU akan ditolak saat sinkron)."
  );
}

// ─── Sinkron ──────────────────────────────────────────────────────────────

function sinkronSekarang() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("Sinkron lain masih berjalan, coba lagi sebentar lagi.");
  try {
    var ss = SpreadsheetApp.getActive();
    var p = config_();
    var skuMap = loadMap_(ss);
    var summary = [];
    ["IN", "OUT"].forEach(function (key) { summary.push(key + ": " + syncTab_(ss, key, skuMap, p.SYNC_FROM)); });
    var msg = "Sinkron selesai — " + summary.join(" | ");
    ss.toast(msg, "Farmhill Sync", 8);
    return msg;
  } finally {
    lock.releaseLock();
  }
}

function syncTab_(ss, key, skuMap, syncFrom) {
  var t = readTab_(ss, key, false);
  var seen = {};
  var queue = []; // { idx, payload }

  t.rows.forEach(function (r, idx) {
    var tgl = ymd_(r[t.col.tanggal]);
    var varian = String(r[t.col.varian] || "").trim();
    var jumlah = num_(r[t.col.jumlah]);
    if (!varian || jumlah === null) return; // baris kosong
    if (!tgl) return setStatus_(r, t, "ERROR: tanggal tidak terbaca", idx, true);
    if (tgl < syncFrom) return;

    var status = String(r[t.col.syncStatus] || "").trim();
    var id = String(r[t.col.syncId] || "").trim();
    // Baris disalin beserta SYNC_ID-nya -> beri ID baru supaya tidak dianggap duplikat.
    if (id && seen[id]) { id = ""; status = ""; }
    if (!id) { id = Utilities.getUuid(); r[t.col.syncId] = id; t.changed[idx] = true; }
    seen[id] = true;

    if (status.indexOf("OK") === 0 || status === "DUPLIKAT") return;

    var sku = skuMap[varian];
    if (!sku) return setStatus_(r, t, "ERROR: varian \"" + varian + "\" belum ada SKU di tab " + MAP_TAB, idx, true);

    var payload = {
      id: id, tipe: key, sku: sku, tanggal: tgl, jumlah: jumlah,
      grade: GRADES[String(r[t.col.grade] || "").trim().toUpperCase()] || null,
      ukuran: String(r[t.col.size] || "").trim() || null,
      catatan: t.col.catatan !== undefined ? String(r[t.col.catatan] || "").trim() || null : null,
    };
    if (key === "OUT") {
      var jenisAsli = String(r[t.col.jenis] || "").trim();
      var jenis = OUT_KINDS[jenisAsli.toLowerCase()];
      if (!jenis) return setStatus_(r, t, "ERROR: Jenis Barang \"" + r[t.col.jenis] + "\" tidak dikenal", idx, true);
      payload.jenis = jenis;
      // Slice & Butir sama-sama "terjual" di app — jenis aslinya disimpan di catatan buat laporan.
      payload.catatan = [jenisAsli, payload.catatan].filter(Boolean).join(" · ") || null;
    }
    queue.push({ idx: idx, payload: payload });
  });

  var counts = { ok: 0, duplicate: 0, error: 0 };
  for (var i = 0; i < queue.length; i += BATCH_SIZE) {
    var chunk = queue.slice(i, i + BATCH_SIZE);
    var res = callApi_("POST", { rows: chunk.map(function (c) { return c.payload; }) }).results;
    var byId = {};
    res.forEach(function (x) { byId[x.id] = x; });
    chunk.forEach(function (c) {
      var x = byId[c.payload.id];
      var row = t.rows[c.idx];
      if (!x) return setStatus_(row, t, "ERROR: tidak ada respons dari app", c.idx);
      counts[x.status]++;
      setStatus_(row, t, x.status === "ok" ? "OK" + (x.message ? " ⚠ " + x.message : "") : x.status === "duplicate" ? "DUPLIKAT" : "ERROR: " + x.message, c.idx);
    });
  }

  // Tulis balik HANYA sel SYNC_ID + SYNC_STATUS milik baris yang berubah (per blok berurutan),
  // supaya isi/rumus di baris lain pada kolom yang sama tidak ikut tertimpa.
  var idxs = Object.keys(t.changed).map(Number).sort(function (x, y) { return x - y; });
  var start = 0;
  while (start < idxs.length) {
    var end = start;
    while (end + 1 < idxs.length && idxs[end + 1] === idxs[end] + 1) end++;
    var block = [];
    for (var k = idxs[start]; k <= idxs[end]; k++) block.push([t.rows[k][t.col.syncId], t.rows[k][t.col.syncStatus]]);
    t.sheet.getRange(t.headerRow + 1 + idxs[start], t.col.syncId + 1, block.length, 2).setValues(block);
    start = end + 1;
  }
  return counts.ok + " OK, " + counts.duplicate + " duplikat, " + counts.error + " error" + (t.dirty ? " (+ baris ditolak lokal)" : "");
}

function setStatus_(row, t, text, idx, ditolakLokal) {
  row[t.col.syncStatus] = text;
  t.changed[idx] = true;
  if (ditolakLokal) t.dirty = true;
}

// ─── Tarik saldo ──────────────────────────────────────────────────────────

function tarikSaldo() {
  var ss = SpreadsheetApp.getActive();
  var saldo = callApi_("GET").saldo;
  var sh = ss.getSheetByName(SALDO_TAB) || ss.insertSheet(SALDO_TAB);
  sh.clearContents();
  var head = [["SKU", "PRODUK", "GRADE", "SIZE", "JUMLAH", "DITAHAN", "TERSEDIA"]];
  var body = saldo.map(function (s) { return [s.sku, s.nama, s.grade, s.ukuran, s.jumlah, s.ditahan, s.jumlah - s.ditahan]; });
  sh.getRange(1, 1, 1, 7).setValues(head).setFontWeight("bold");
  if (body.length) sh.getRange(2, 1, body.length, 7).setValues(body);
  sh.getRange(1, 9).setValue("Ditarik: " + new Date().toLocaleString("id-ID"));
  ss.toast(body.length + " baris saldo dari app. Bandingkan dengan tab STOK.", "Farmhill Sync", 6);
}

function pasangTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sinkronSekarang") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sinkronSekarang").timeBased().everyMinutes(15).create();
  SpreadsheetApp.getUi().alert("Sinkron otomatis tiap 15 menit sudah aktif.");
}

// ─── Helper ───────────────────────────────────────────────────────────────

/** Baca satu tab: cari baris header, pastikan kolom tambahan ada, kembalikan baris data (array mutable). */
function readTab_(ss, key, readOnly) {
  var cfg = CONFIG_TABS[key];
  var sheet = ss.getSheetByName(cfg.name);
  if (!sheet) throw new Error("Tab \"" + cfg.name + "\" tidak ditemukan.");

  var scan = sheet.getRange(1, 1, Math.min(10, sheet.getLastRow()), Math.max(sheet.getLastColumn(), 10)).getValues();
  var headerRow = -1;
  for (var r = 0; r < scan.length; r++) {
    if (String(scan[r][0]).trim().toLowerCase() === cfg.firstHeader.toLowerCase()) { headerRow = r + 1; break; }
  }
  if (headerRow < 0) throw new Error("Baris header tab \"" + cfg.name + "\" (kolom A = \"" + cfg.firstHeader + "\") tidak ketemu.");

  var headers = scan[headerRow - 1].map(function (h) { return String(h).trim(); });
  var lastHeader = -1;
  headers.forEach(function (h, i) { if (h) lastHeader = i; });

  EXTRA_HEADERS.forEach(function (h) {
    if (headers.indexOf(h) >= 0) return;
    if (readOnly) return;
    lastHeader++;
    sheet.getRange(headerRow, lastHeader + 1).setValue(h).setFontWeight("bold");
    headers[lastHeader] = h;
  });

  var col = {};
  Object.keys(cfg.cols).forEach(function (k) {
    var i = headers.indexOf(cfg.cols[k]);
    if (i < 0 && k !== "catatan") throw new Error("Kolom \"" + cfg.cols[k] + "\" tidak ada di tab " + cfg.name + ".");
    if (i >= 0) col[k] = i;
  });
  col.size = headers.indexOf("SIZE");
  col.syncId = headers.indexOf("SYNC_ID");
  col.syncStatus = headers.indexOf("SYNC_STATUS");
  if (!readOnly && (col.size < 0 || col.syncId < 0 || col.syncStatus < 0)) throw new Error("Kolom SIZE/SYNC_ID/SYNC_STATUS belum ada — jalankan menu 2. Siapkan sheet.");
  if (!readOnly && col.syncStatus !== col.syncId + 1) throw new Error("Kolom SYNC_ID harus persis di kiri SYNC_STATUS di tab " + cfg.name + ".");

  var nCols = Math.max(sheet.getLastColumn(), lastHeader + 1);
  var nRows = Math.max(sheet.getLastRow() - headerRow, 0);
  var rows = nRows ? sheet.getRange(headerRow + 1, 1, nRows, nCols).getValues() : [];
  return { sheet: sheet, headerRow: headerRow, col: col, rows: rows, dirty: false, changed: {} };
}

function loadMap_(ss) {
  var sh = ss.getSheetByName(MAP_TAB);
  if (!sh || sh.getLastRow() < 2) throw new Error("Tab " + MAP_TAB + " belum ada — jalankan menu 2. Siapkan sheet.");
  var map = {};
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    var v = String(r[0]).trim(), s = String(r[1]).trim();
    if (v && s) map[v] = s;
  });
  return map;
}

function norm_(s) {
  return String(s).toLowerCase().replace(/^melon\s+/, "").replace(/[^a-z0-9]/g, "");
}

function pad_(n) { return (n < 10 ? "0" : "") + n; }

function ymd_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  var s = String(v || "").trim();
  // 03-Feb-26, 03 Oct 2026, 3/Oct/2026, 03 October 2026
  var m = s.match(/^(\d{1,2})[\s\-\/]+([A-Za-z]{3})[A-Za-z]*[\s\-\/,]+(\d{2,4})$/);
  if (m) {
    var mon = MONTHS.indexOf(m[2].toLowerCase());
    if (mon < 0) return null;
    var y = +m[3];
    if (y < 100) y += 2000;
    return y + "-" + pad_(mon + 1) + "-" + pad_(+m[1]);
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function num_(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  var s = String(v === null || v === undefined ? "" : v).replace(/\s/g, "");
  if (!s) return null;
  s = s.indexOf(".") >= 0 ? s.replace(/,/g, "") : s.replace(",", ".");
  var n = parseFloat(s);
  return isFinite(n) ? n : null;
}
