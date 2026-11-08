import mammoth from "mammoth";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "./authHelper";
import { logCrewActivity } from "./rbacAuditLogger";
import { getStoredApiKey } from "./asistenWisataAI";

export interface ParsedRundownItem {
  id: string;
  hari_ke: number;
  jam_mulai: string;
  jam_selesai: string;
  judul_acara: string;
  keterangan: string;
}

export interface WordExtractedData {
  rawText: string;
  html: string;
}

/**
 * Normalisasi format jam ke standar HH:MM (contoh: "07.00" -> "07:00", "7:30" -> "07:30")
 */
export function normalizeTimeString(hStr: string, mStr: string): string {
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return "08:00";
  return `${String(Math.min(23, Math.max(0, h))).padStart(2, "0")}:${String(
    Math.min(59, Math.max(0, m))
  ).padStart(2, "0")}`;
}

/**
 * Ekstraksi rentang waktu fleksibel (Mendukung: 07.00 - 08.30, 07:00 s/d 08:30, 08.00 - Selesai, Pkl 07.00 WIB, 00.00 WIB)
 */
export function parseTimeRange(timeStr: string): { jamMulai: string; jamSelesai: string } | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();

  // Pattern 1: Rentang 2 waktu numerik (07.00 - 08.30, 07:00 s/d 08:30, 07.00 sd 08.30, 07.00-08.30)
  const rangeRegex = /(?:pukul|pkl|jam)?\s*(\d{1,2})[.:](\d{2})\s*(?:wib|wita|wit)?\s*(?:-|–|—|s\/d|sd|sampai|hingga|to)\s*(?:pukul|pkl|jam)?\s*(\d{1,2})[.:](\d{2})/i;
  const matchRange = clean.match(rangeRegex);
  if (matchRange) {
    return {
      jamMulai: normalizeTimeString(matchRange[1], matchRange[2]),
      jamSelesai: normalizeTimeString(matchRange[3], matchRange[4]),
    };
  }

  // Pattern 2: Waktu sampai selesai (08.00 - Selesai, 20.00 s/d Selesai, 21.00 - Drop Off / Tuntas)
  const selesaiRegex = /(?:pukul|pkl|jam)?\s*(\d{1,2})[.:](\d{2})\s*(?:wib|wita|wit)?\s*(?:-|–|—|s\/d|sd|sampai|hingga|to)\s*(?:selesai|selese|end|till end|tuntas|drop off)/i;
  const matchSelesai = clean.match(selesaiRegex);
  if (matchSelesai) {
    return {
      jamMulai: normalizeTimeString(matchSelesai[1], matchSelesai[2]),
      jamSelesai: "Selesai",
    };
  }

  // Pattern 3: Waktu tunggal (07.00 WIB, 08.30WIB, Pukul 07.30, 00.00 WIB)
  const singleRegex = /(?:pukul|pkl|jam)?\s*(\d{1,2})[.:](\d{2})(?:\s*(?:wib|wita|wit))?/i;
  const matchSingle = clean.match(singleRegex);
  if (matchSingle) {
    const start = normalizeTimeString(matchSingle[1], matchSingle[2]);
    const startH = parseInt(matchSingle[1], 10);
    const endH = (startH + 1) % 24;
    const end = `${String(endH).padStart(2, "0")}:${matchSingle[2]}`;
    return {
      jamMulai: start,
      jamSelesai: end,
    };
  }

  return null;
}

/**
 * Deteksi pergantian hari baik numerik ("Hari 2", "Day 2") maupun kata Indonesia ("Hari Pertama", "Hari Kedua")
 */
export function parseDayNumber(text: string): number | null {
  if (!text) return null;
  const clean = text.trim();

  // 1. Cek angka numerik: "Hari 1", "Hari ke 1", "Hari ke-1", "Day 1", "Day-1", "H-1", "D1"
  const numMatch = clean.match(/(?:hari|day|itinerary\s*hari|jadwal\s*hari|rundown\s*hari|h)[-:\s]*(?:ke[- ]?)?\s*(\d{1,2})/i);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    if (val > 0 && val <= 30) return val;
  }

  // 2. Cek kata bahasa Indonesia: "Hari Pertama", "Hari Kesatu", "Hari Kedua", dst.
  const wordMap: [RegExp, number][] = [
    [/(?:hari|day)\s*(?:ke[- ]?)?(?:pertama|kesatu|satu)\b/i, 1],
    [/(?:hari|day)\s*(?:ke[- ]?)?(?:kedua|dua)\b/i, 2],
    [/(?:hari|day)\s*(?:ke[- ]?)?(?:ketiga|tiga)\b/i, 3],
    [/(?:hari|day)\s*(?:ke[- ]?)?(?:keempat|empat)\b/i, 4],
    [/(?:hari|day)\s*(?:ke[- ]?)?(?:kelima|lima)\b/i, 5],
    [/(?:hari|day)\s*(?:ke[- ]?)?(?:keenam|enam)\b/i, 6],
    [/(?:hari|day)\s*(?:ke[- ]?)?(?:ketujuh|tujuh)\b/i, 7],
    [/(?:hari|day)\s*(?:ke[- ]?)?(?:kedelapan|delapan)\b/i, 8],
    [/(?:hari|day)\s*(?:ke[- ]?)?(?:kesembilan|sembilan)\b/i, 9],
    [/(?:hari|day)\s*(?:ke[- ]?)?(?:kesepuluh|sepuluh)\b/i, 10],
  ];

  for (const [pattern, dayNum] of wordMap) {
    if (pattern.test(clean)) return dayNum;
  }

  return null;
}

/**
 * Ekstraksi item terpisah di dalam satu sel tabel Word (misal: <ul><li>...</li></ul> atau beberapa <p>...</p>)
 */
export function extractCellItems(cell: Element): string[] {
  // 1. Cek tag <li> jika berupa daftar bullet/numbered
  const liElements = Array.from(cell.querySelectorAll("li"));
  if (liElements.length > 0) {
    const liTexts = liElements.map((li) => li.textContent?.trim() || "").filter(Boolean);
    if (liTexts.length > 0) return liTexts;
  }

  // 2. Cek tag <p> jika berupa paragraf bertumpuk
  const pElements = Array.from(cell.querySelectorAll("p"));
  if (pElements.length > 1) {
    const pTexts = pElements.map((p) => p.textContent?.trim() || "").filter(Boolean);
    if (pTexts.length > 1) return pTexts;
  }

  // 3. Cek baris baru (\n atau <br>)
  const clone = cell.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  const raw = clone.textContent || "";
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length > 1) return lines;

  const single = raw.trim();
  return single ? [single] : [];
}

/**
 * Ekstrak seluruh teks & HTML dari file Word (.docx) atau teks (.txt)
 */
export async function extractWordDocument(file: File): Promise<WordExtractedData> {
  const fileName = file.name.toLowerCase();

  // Jika file teks biasa (.txt)
  if (fileName.endsWith(".txt")) {
    const text = await file.text();
    return { rawText: text, html: `<pre>${text}</pre>` };
  }

  // Jika file Word (.docx)
  if (fileName.endsWith(".docx") || file.type.includes("wordprocessingml")) {
    const arrayBuffer = await file.arrayBuffer();
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ arrayBuffer }),
      mammoth.extractRawText({ arrayBuffer }),
    ]);

    return {
      rawText: textResult.value || "",
      html: htmlResult.value || "",
    };
  }

  // Fallback
  const text = await file.text();
  return { rawText: text, html: `<pre>${text}</pre>` };
}

/**
 * Fungsi pembantu kompatibilitas backward
 */
export async function extractTextFromWordFile(file: File): Promise<string> {
  const res = await extractWordDocument(file);
  return res.rawText;
}

/**
 * ENGINE 1: PARSER TABEL HTML DOM
 * Mampu membaca:
 * - Format Tabel Standar (1 baris = 1 acara)
 * - Format Multi-Item Cell Row (1 baris berisi daftar <ul><li>...</li></ul> di sel kegiatan, dan daftar <p> jam di sel waktu)
 * - Format Merged Header Hari (Hari ke 1, Hari ke-2, dsb.)
 */
export function extractRundownFromHtmlTables(htmlString: string): ParsedRundownItem[] {
  if (!htmlString || typeof window === "undefined") return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const tables = doc.querySelectorAll("table");
  if (tables.length === 0) return [];

  const results: ParsedRundownItem[] = [];
  let currentHari = 1;

  // Telusuri elemen body secara berurutan
  const allNodes = doc.body.children;
  for (let nodeIdx = 0; nodeIdx < allNodes.length; nodeIdx++) {
    const node = allNodes[nodeIdx];

    // Cek judul hari di luar tabel (<p> atau <hX>)
    if (node.tagName !== "TABLE") {
      const text = node.textContent?.trim() || "";
      const dayDetected = parseDayNumber(text);
      if (dayDetected !== null) {
        currentHari = dayDetected;
      }
      continue;
    }

    // Jika node adalah Tabel
    const table = node as HTMLTableElement;
    const rows = table.querySelectorAll("tr");

    let timeColIdx = -1;
    let titleColIdx = -1;
    let descColIdx = -1;
    let dayColIdx = -1;
    let extraCols: number[] = [];

    let headerMapped = false;

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      const cells = Array.from(row.querySelectorAll("th, td"));
      if (cells.length === 0) continue;

      const rowFullText = row.textContent?.trim() || "";

      // 1. Cek baris penanda hari (misal baris merged: "Hari ke 1", "HARI PERTAMA")
      const dayInRow = parseDayNumber(rowFullText);
      const timeInRow = parseTimeRange(rowFullText);

      if (dayInRow !== null && !timeInRow) {
        currentHari = dayInRow;
        continue;
      }

      // 2. Cek baris header tabel
      const isHeaderRow = cells.some((c) => {
        const txt = (c.textContent || "").toLowerCase().trim();
        return (
          txt.includes("waktu") ||
          txt.includes("jam") ||
          txt.includes("pukul") ||
          txt.includes("acara") ||
          txt.includes("kegiatan") ||
          txt.includes("uraian") ||
          txt.includes("keterangan") ||
          txt.includes("agenda")
        );
      });

      if (isHeaderRow && !headerMapped) {
        timeColIdx = -1;
        titleColIdx = -1;
        descColIdx = -1;
        dayColIdx = -1;
        extraCols = [];

        cells.forEach((cell, idx) => {
          const txt = (cell.textContent || "").toLowerCase().trim();
          if (
            txt.includes("waktu") ||
            txt.includes("jam") ||
            txt.includes("pukul") ||
            txt.includes("time") ||
            txt.includes("durasi")
          ) {
            timeColIdx = idx;
          } else if (
            txt.includes("acara") ||
            txt.includes("kegiatan") ||
            txt.includes("agenda") ||
            txt.includes("tujuan") ||
            txt.includes("program") ||
            txt.includes("aktivitas") ||
            txt.includes("destinasi")
          ) {
            titleColIdx = idx;
          } else if (
            txt.includes("uraian") ||
            txt.includes("keterangan") ||
            txt.includes("catatan") ||
            txt.includes("detail") ||
            txt.includes("tempat") ||
            txt.includes("lokasi") ||
            txt.includes("fasilitas") ||
            txt.includes("ket") ||
            txt.includes("menu")
          ) {
            if (descColIdx === -1) {
              descColIdx = idx;
            } else {
              extraCols.push(idx);
            }
          } else if (txt.includes("hari") || txt.includes("day")) {
            dayColIdx = idx;
          } else if (!txt.match(/^(?:no|no\.?|nomor|#)$/i)) {
            extraCols.push(idx);
          }
        });

        // Jika ada kolom "Uraian" tapi tidak ada kolom "Acara/Kegiatan",
        // maka kolom "Uraian" adalah kolom utama Judul Acara (Title)!
        if (titleColIdx === -1 && descColIdx !== -1) {
          titleColIdx = descColIdx;
          descColIdx = -1;
        }

        headerMapped = true;
        continue;
      }

      // 3. Cek apakah ada kolom hari di baris data
      if (dayColIdx !== -1 && cells[dayColIdx]) {
        const dText = cells[dayColIdx].textContent?.trim() || "";
        const parsedD = parseDayNumber(dText) || parseInt(dText, 10);
        if (!isNaN(parsedD) && parsedD > 0 && parsedD <= 30) {
          currentHari = parsedD;
        }
      }

      // 4. Deteksi Sel Aktivitas & Sel Waktu pada Baris Ini
      let actCell: Element | null = null;
      let timeCell: Element | null = null;

      if (titleColIdx !== -1 && cells[titleColIdx]) {
        actCell = cells[titleColIdx];
      }
      if (timeColIdx !== -1 && cells[timeColIdx]) {
        timeCell = cells[timeColIdx];
      }

      // Fallback deteksi jika kolom belum terpetakan
      if (!timeCell || !actCell) {
        cells.forEach((c) => {
          const tMatch = parseTimeRange(c.textContent || "");
          if (tMatch && !timeCell) {
            timeCell = c;
          } else if (!actCell) {
            const raw = (c.textContent || "").trim();
            if (!raw.match(/^\d{1,3}[.)]?$/) && parseDayNumber(raw) === null && raw.length > 0) {
              actCell = c;
            }
          }
        });
      }

      if (!actCell && !timeCell) continue;

      // Ambil daftar item di dalam masing-masing sel
      const actItems = actCell ? extractCellItems(actCell) : [];
      const timeItems = timeCell ? extractCellItems(timeCell) : [];

      // ==============================================================
      // KASUS A: MULTI-EVENT CELL ROW (Contoh: "rundonw paket 2.docx")
      // Satu baris <tr> memuat daftar 12 <li> kegiatan dan 12 <p> waktu!
      // ==============================================================
      if (actItems.length > 1 && timeItems.length > 1) {
        const maxLen = Math.max(actItems.length, timeItems.length);

        for (let k = 0; k < maxLen; k++) {
          const actRaw = actItems[k] || actItems[actItems.length - 1] || "Kegiatan";
          const timeRaw = timeItems[k] || timeItems[timeItems.length - 1] || "08.00";
          const nextTimeRaw = timeItems[k + 1];

          const curTime = parseTimeRange(timeRaw);
          const nxtTime = nextTimeRaw ? parseTimeRange(nextTimeRaw) : null;

          const jamMulai = curTime ? curTime.jamMulai : "08:00";
          let jamSelesai = "09:00";

          // Jika format waktu aslinya sudah berupa rentang ("07.00 - 08.30"), gunakan rentang tersebut
          if (
            curTime &&
            curTime.jamSelesai &&
            curTime.jamSelesai !== "Selesai" &&
            curTime.jamSelesai !== curTime.jamMulai
          ) {
            jamSelesai = curTime.jamSelesai;
          } else if (nxtTime) {
            // Jam selesai otomatis adalah jam mulai acara berikutnya!
            jamSelesai = nxtTime.jamMulai;
          } else {
            jamSelesai = curTime && curTime.jamSelesai ? curTime.jamSelesai : "Selesai";
          }

          // Bersihkan judul acara dari simbol bullet / strip di depan
          let cleanTitle = actRaw.replace(/^[-•*–—\d.)\s]+/, "").trim();
          let cleanDesc = "";

          if (cleanTitle.includes(" - ")) {
            const parts = cleanTitle.split(" - ");
            cleanTitle = parts[0].trim();
            cleanDesc = parts.slice(1).join(" - ").trim();
          } else if (cleanTitle.includes(" (") && cleanTitle.endsWith(")")) {
            const pIdx = cleanTitle.indexOf(" (");
            cleanDesc = cleanTitle.substring(pIdx + 2, cleanTitle.length - 1).trim();
            cleanTitle = cleanTitle.substring(0, pIdx).trim();
          }

          results.push({
            id: `item-html-multi-${Date.now()}-${results.length}`,
            hari_ke: currentHari,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai,
            judul_acara: cleanTitle || "Kegiatan",
            keterangan: cleanDesc || "",
          });
        }
        continue;
      }

      // ==============================================================
      // KASUS B: SINGLE-EVENT ROW (Baris Standar 1 Acara Per <tr>)
      // ==============================================================
      const timeData = timeCell ? parseTimeRange(timeCell.textContent || "") : null;
      let singleTitle = actCell ? extractCellItems(actCell)[0] || "" : "";
      let singleDesc = "";

      // Bersihkan karakter bullet/strip di depan
      singleTitle = singleTitle.replace(/^[-•*–—\d.)\s]+/, "").trim();

      // Cek apakah ada kolom keterangan terpisah
      if (descColIdx !== -1 && cells[descColIdx]) {
        const descItems = extractCellItems(cells[descColIdx]);
        if (descItems.length > 0) {
          singleDesc = descItems.join(" • ");
        }
      }

      // Cek pemisah judul dan keterangan jika ada di dalam judul
      if (singleTitle.includes(" - ")) {
        const parts = singleTitle.split(" - ");
        singleTitle = parts[0].trim();
        singleDesc = singleDesc
          ? `${singleDesc} • ${parts.slice(1).join(" - ").trim()}`
          : parts.slice(1).join(" - ").trim();
      } else if (singleTitle.includes(" (") && singleTitle.endsWith(")")) {
        const pIdx = singleTitle.indexOf(" (");
        const inParen = singleTitle.substring(pIdx + 2, singleTitle.length - 1).trim();
        singleTitle = singleTitle.substring(0, pIdx).trim();
        singleDesc = singleDesc ? `${singleDesc} • ${inParen}` : inParen;
      }

      if (singleTitle || timeData) {
        results.push({
          id: `item-html-single-${Date.now()}-${results.length}`,
          hari_ke: currentHari,
          jam_mulai: timeData ? timeData.jamMulai : "08:00",
          jam_selesai: timeData ? timeData.jamSelesai : "09:00",
          judul_acara: singleTitle || "Kegiatan Wisata",
          keterangan: singleDesc || "",
        });
      }
    }
  }

  return results;
}

/**
 * ENGINE 2: PARSER TEKS MULTI-PATTERN & BLOCK-CORRELATION (MODE TEMPEL TEKS)
 */
export function extractRundownWithRegexFallback(rawText: string): ParsedRundownItem[] {
  if (!rawText) return [];

  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedRundownItem[] = [];
  let currentHari = 1;

  // 1. Coba deteksi pola blok berurutan (Block-Correlation):
  // Blok daftar kegiatan (N baris) diikuti langsung oleh blok daftar waktu (N baris)
  const actBlock: string[] = [];
  const timeBlock: string[] = [];
  let readingTimes = false;

  for (const line of rawLines) {
    const day = parseDayNumber(line);
    const t = parseTimeRange(line);

    if (day !== null && !t) {
      currentHari = day;
      continue;
    }

    if (t) {
      readingTimes = true;
      timeBlock.push(line);
    } else {
      if (readingTimes) {
        // Sudah membaca waktu lalu ada teks baru (misal baris penutup)
        break;
      }
      // Jangan masukkan teks header biro ke daftar acara
      if (!line.match(/^(?:no|uraian|hari|day|jadwal|biro|paket|tanggal|waktu|telepon|email|lisensi)/i)) {
        actBlock.push(line);
      }
    }
  }

  // Jika terdeteksi pasangan blok kegiatan dan blok waktu
  if (actBlock.length >= 2 && timeBlock.length >= 2 && Math.abs(actBlock.length - timeBlock.length) <= 3) {
    const maxLen = Math.max(actBlock.length, timeBlock.length);
    for (let k = 0; k < maxLen; k++) {
      const actRaw = actBlock[k] || actBlock[actBlock.length - 1];
      const timeRaw = timeBlock[k] || timeBlock[timeBlock.length - 1];
      const nextTimeRaw = timeBlock[k + 1];

      const curTime = parseTimeRange(timeRaw);
      const nxtTime = nextTimeRaw ? parseTimeRange(nextTimeRaw) : null;

      const jamMulai = curTime ? curTime.jamMulai : "08:00";
      let jamSelesai = "09:00";

      if (curTime && curTime.jamSelesai && curTime.jamSelesai !== "Selesai" && curTime.jamSelesai !== curTime.jamMulai) {
        jamSelesai = curTime.jamSelesai;
      } else if (nxtTime) {
        jamSelesai = nxtTime.jamMulai;
      } else {
        jamSelesai = curTime && curTime.jamSelesai ? curTime.jamSelesai : "Selesai";
      }

      let cleanTitle = actRaw.replace(/^[-•*–—\d.)\s]+/, "").trim();
      let cleanDesc = "";

      if (cleanTitle.includes(" - ")) {
        const parts = cleanTitle.split(" - ");
        cleanTitle = parts[0].trim();
        cleanDesc = parts.slice(1).join(" - ").trim();
      }

      results.push({
        id: `item-block-${Date.now()}-${results.length}`,
        hari_ke: currentHari,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        judul_acara: cleanTitle || "Kegiatan",
        keterangan: cleanDesc || "",
      });
    }

    return results;
  }

  // 2. Parser Teks Standar Baris Per Baris
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    const dayDetected = parseDayNumber(line);
    const timeInLine = parseTimeRange(line);

    if (dayDetected !== null && !timeInLine) {
      currentHari = dayDetected;
      continue;
    }

    // Format Tab-Separated (TSV)
    if (line.includes("\t")) {
      const parts = line.split("\t").map((p) => p.trim()).filter((p) => p.length > 0);
      let tMatch: { jamMulai: string; jamSelesai: string } | null = null;
      let timeIdx = -1;

      for (let pIdx = 0; pIdx < parts.length; pIdx++) {
        const checkTime = parseTimeRange(parts[pIdx]);
        if (checkTime) {
          tMatch = checkTime;
          timeIdx = pIdx;
          break;
        }
      }

      if (tMatch) {
        const otherParts = parts.filter((_, idx) => idx !== timeIdx && !parts[idx].match(/^\d{1,3}[.)]?$/));
        let title = (otherParts[0] || "Kegiatan").replace(/^[-•*–—\d.)\s]+/, "").trim();
        let desc = otherParts.slice(1).join(" • ");

        results.push({
          id: `item-tsv-${Date.now()}-${results.length}`,
          hari_ke: currentHari,
          jam_mulai: tMatch.jamMulai,
          jam_selesai: tMatch.jamSelesai,
          judul_acara: title,
          keterangan: desc,
        });
        continue;
      }
    }

    // Format Pipe (|)
    if (line.includes("|")) {
      const parts = line.split("|").map((p) => p.trim()).filter((p) => p.length > 0);
      let tMatch: { jamMulai: string; jamSelesai: string } | null = null;
      let timeIdx = -1;

      for (let pIdx = 0; pIdx < parts.length; pIdx++) {
        const checkTime = parseTimeRange(parts[pIdx]);
        if (checkTime) {
          tMatch = checkTime;
          timeIdx = pIdx;
          break;
        }
      }

      if (tMatch) {
        const otherParts = parts.filter((_, idx) => idx !== timeIdx && !parts[idx].match(/^\d{1,3}[.)]?$/));
        let title = (otherParts[0] || "Kegiatan").replace(/^[-•*–—\d.)\s]+/, "").trim();
        let desc = otherParts.slice(1).join(" • ");

        results.push({
          id: `item-pipe-${Date.now()}-${results.length}`,
          hari_ke: currentHari,
          jam_mulai: tMatch.jamMulai,
          jam_selesai: tMatch.jamSelesai,
          judul_acara: title,
          keterangan: desc,
        });
        continue;
      }
    }

    // Baris Standar Berisi Jam
    if (timeInLine) {
      const textAfterTime = line
        .replace(/(?:pukul|pkl|jam)?\s*\d{1,2}[.:]\d{2}(?:\s*(?:wib|wita|wit))?(?:\s*(?:-|–|—|s\/d|sd|sampai|hingga|to)\s*(?:(?:pukul|pkl|jam)?\s*\d{1,2}[.:]\d{2}|selesai|selese|end|till end))?/i, "")
        .replace(/^[\s:–\-•*.|]+/, "")
        .trim();

      let judul = textAfterTime;
      let keterangan = "";

      if (!judul && i + 1 < rawLines.length) {
        const nextLine = rawLines[i + 1];
        if (!parseTimeRange(nextLine) && parseDayNumber(nextLine) === null) {
          judul = nextLine;
          i++;

          if (i + 1 < rawLines.length) {
            const line3 = rawLines[i + 1];
            if (!parseTimeRange(line3) && parseDayNumber(line3) === null && !line3.match(/^(?:hari|day|itinerary)/i)) {
              keterangan = line3;
              i++;
            }
          }
        }
      }

      if (judul) {
        judul = judul.replace(/^[-•*–—\d.)\s]+/, "").trim();

        if (judul.includes(" - ")) {
          const parts = judul.split(" - ");
          judul = parts[0].trim();
          keterangan = keterangan
            ? `${keterangan} • ${parts.slice(1).join(" - ").trim()}`
            : parts.slice(1).join(" - ").trim();
        } else if (judul.includes(" (") && judul.endsWith(")")) {
          const pIdx = judul.indexOf(" (");
          const inParen = judul.substring(pIdx + 2, judul.length - 1).trim();
          judul = judul.substring(0, pIdx).trim();
          keterangan = keterangan ? `${keterangan} • ${inParen}` : inParen;
        }

        results.push({
          id: `item-txt-${Date.now()}-${results.length}`,
          hari_ke: currentHari,
          jam_mulai: timeInLine.jamMulai,
          jam_selesai: timeInLine.jamSelesai,
          judul_acara: judul,
          keterangan: keterangan,
        });
        continue;
      }
    }

    // Baris kelanjutan uraian
    if (results.length > 0 && !line.match(/^(?:hari|day|itinerary|rundown|jadwal|acara)/i)) {
      const last = results[results.length - 1];
      last.keterangan = last.keterangan ? `${last.keterangan} • ${line}` : line;
    }
  }

  return results;
}

/**
 * ENGINE 3: GEMINI AI FALLBACK
 */
async function parseWithGeminiAI(
  rawDocumentText: string,
  tripContext?: { nama_trip?: string; tujuan?: string }
): Promise<ParsedRundownItem[]> {
  const apiKey = getStoredApiKey();
  if (!apiKey) return [];

  try {
    const prompt = `Kamu adalah sistem asisten operasional biro perjalanan wisata di Indonesia.
Tolong ekstrak SELURUH butir jadwal acara dan uraian kegiatan dari dokumen rundown berikut menjadi JSON array murni tanpa markdown formatting.

Format output WAJIB array JSON:
[
  {
    "hari_ke": 1,
    "jam_mulai": "07:00",
    "jam_selesai": "08:30",
    "judul_acara": "Nama kegiatan utama atau destinasi",
    "keterangan": "Uraian detail, catatan TL, konsumsi, atau fasilitas"
  }
]

Konteks Trip: ${tripContext?.nama_trip || "Wisata"} - Tujuan: ${tripContext?.tujuan || "Pariwisata"}.
Dokumen Rundown:
${rawDocumentText.substring(0, 10000)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!response.ok) return [];

    const json = await response.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return [];

    const parsed = JSON.parse(candidateText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any, idx: number) => ({
        id: `item-ai-${Date.now()}-${idx}`,
        hari_ke: Number(item.hari_ke) || 1,
        jam_mulai: item.jam_mulai || "08:00",
        jam_selesai: item.jam_selesai || "09:00",
        judul_acara: item.judul_acara || "Kegiatan",
        keterangan: item.keterangan || "",
      }));
    }
    return [];
  } catch (err) {
    console.warn("Gemini AI rundown parsing skipped:", err);
    return [];
  }
}

/**
 * UTAMA: Rangkum dokumen Word / teks itinerary menjadi daftar jadwal acara terstruktur.
 */
export async function summarizeWordRundownWithAI(
  rawDocumentText: string,
  tripContext?: { nama_trip?: string; tujuan?: string },
  htmlContent?: string
): Promise<ParsedRundownItem[]> {
  const trimmedText = rawDocumentText.trim();
  const trimmedHtml = (htmlContent || "").trim();

  if (!trimmedText && !trimmedHtml) {
    throw new Error("Dokumen kosong atau tidak memuat teks yang dapat dibaca.");
  }

  // 1. Coba Parser Tabel HTML jika dokumen memiliki elemen tabel
  if (trimmedHtml && trimmedHtml.includes("<table")) {
    const tableItems = extractRundownFromHtmlTables(trimmedHtml);
    if (tableItems.length > 0) {
      return tableItems;
    }
  }

  // 2. Coba Parser Teks Lanjutan (Mendukung TSV, Pipe, Label, dan Multi-line Block)
  const textItems = extractRundownWithRegexFallback(trimmedText);
  if (textItems.length > 0) {
    return textItems;
  }

  // 3. Fallback ke Gemini AI jika tersedia
  const aiItems = await parseWithGeminiAI(trimmedText, tripContext);
  if (aiItems.length > 0) {
    return aiItems;
  }

  throw new Error(
    "Jadwal acara atau format jam belum berhasil terbaca secara otomatis. Pastikan dokumen memuat tabel jadwal atau baris waktu (contoh: 07.00 - 08.30 Kumpul di Titik Pertemuan)."
  );
}

/**
 * Simpan seluruh hasil rangkuman rundown langsung ke database Supabase
 */
export async function batchSaveRundownToTrip(
  tripId: string,
  items: ParsedRundownItem[],
  tripName?: string
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  if (!tripId) {
    return { success: false, insertedCount: 0, error: "Pilih trip terlebih dahulu" };
  }
  if (!items || items.length === 0) {
    return { success: false, insertedCount: 0, error: "Tidak ada jadwal acara untuk disimpan" };
  }

  try {
    const user = await getActiveUser();
    if (!user) throw new Error("Pengguna belum login");

    const rowsToInsert = items.map((it) => ({
      trip_id: tripId,
      user_id: user.id,
      hari_ke: Number(it.hari_ke) || 1,
      jam_mulai: it.jam_mulai || "08:00",
      jam_selesai: it.jam_selesai || "09:00",
      judul_acara: it.judul_acara,
      keterangan: it.keterangan || null,
    }));

    const { error } = await supabase.from("rundown_acara").insert(rowsToInsert);
    if (error) throw error;

    logCrewActivity({
      kategori: "operasional_trip",
      aksi: `Import Rundown Dokumen Word (${items.length} Jadwal)`,
      detail: `Mengimpor ${items.length} butir jadwal acara langsung dari dokumen Word ke jadwal trip.`,
      tripName,
      status: "sukses",
    });

    return { success: true, insertedCount: items.length };
  } catch (err: any) {
    return { success: false, insertedCount: 0, error: err.message || "Gagal menyimpan jadwal ke database" };
  }
}
