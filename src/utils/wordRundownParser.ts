import mammoth from "mammoth";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "./authHelper";
import { logCrewActivity } from "./rbacAuditLogger";

export interface ParsedRundownItem {
  id: string;
  hari_ke: number;
  jam_mulai: string;
  jam_selesai: string;
  judul_acara: string;
  keterangan: string;
}

/**
 * Ekstrak seluruh teks isi dari file Microsoft Word (.docx) atau file teks biasa
 */
export async function extractTextFromWordFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  // Jika file teks biasa (.txt)
  if (fileName.endsWith(".txt")) {
    return await file.text();
  }

  // Jika file Word (.docx)
  if (fileName.endsWith(".docx") || file.type.includes("wordprocessingml")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  }

  // Fallback membaca sebagai teks
  return await file.text();
}

/**
 * Ekstraksi jadwal acara otomatis berbasis Regex lokal
 */
export function extractRundownWithRegexFallback(rawText: string): ParsedRundownItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedRundownItem[] = [];
  let currentHari = 1;

  // Regex pola jam: 07:00, 07.00, 07:00 - 08:30, 07.00 s/d 08.30
  const timeRegex = /(?:(\d{1,2})[.:](\d{2}))(?:\s*(?:-|–|—|s\/d|sd|sampai)\s*(?:(\d{1,2})[.:](\d{2})))?/i;
  const dayRegex = /(?:hari|day)\s*(?:ke[- ]?)?\s*(\d{1,2})/i;

  for (const line of lines) {
    // Cek apakah baris menandakan pergantian hari (contoh: "HARI KE-2" atau "DAY 2")
    const dayMatch = line.match(dayRegex);
    if (dayMatch && dayMatch[1]) {
      const parsedDay = parseInt(dayMatch[1], 10);
      if (!isNaN(parsedDay) && parsedDay > 0) {
        currentHari = parsedDay;
        continue;
      }
    }

    const timeMatch = line.match(timeRegex);
    if (timeMatch) {
      const h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);

      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        const startH = String(h).padStart(2, "0");
        const startM = String(m).padStart(2, "0");
        const jamMulai = `${startH}:${startM}`;

        let jamSelesai = "";
        if (timeMatch[3] && timeMatch[4]) {
          const endH = parseInt(timeMatch[3], 10);
          const endM = parseInt(timeMatch[4], 10);
          if (endH >= 0 && endH < 24 && endM >= 0 && endM < 60) {
            jamSelesai = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
          }
        }

        if (!jamSelesai) {
          // Perkiraan jam selesai 1 jam setelah jam mulai
          const hNum = (h + 1) % 24;
          jamSelesai = `${String(hNum).padStart(2, "0")}:${startM}`;
        }

        // Bersihkan teks kegiatan dari bagian jam di awal
        const textAfterTime = line
          .replace(timeRegex, "")
          .replace(/^[\s:–\-•*.]+/, "")
          .trim();

        if (textAfterTime) {
          // Pisahkan judul acara dan keterangan jika ada tanda strip atau kurung
          let judul = textAfterTime;
          let keterangan = "";

          if (textAfterTime.includes(" - ")) {
            const parts = textAfterTime.split(" - ");
            judul = parts[0].trim();
            keterangan = parts.slice(1).join(" - ").trim();
          } else if (textAfterTime.includes(" (") && textAfterTime.endsWith(")")) {
            const parenIdx = textAfterTime.indexOf(" (");
            judul = textAfterTime.substring(0, parenIdx).trim();
            keterangan = textAfterTime.substring(parenIdx + 2, textAfterTime.length - 1).trim();
          }

          results.push({
            id: `item-${Date.now()}-${results.length}`,
            hari_ke: currentHari,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai,
            judul_acara: judul,
            keterangan: keterangan || "",
          });
          continue;
        }
      }
    }

    // Jika baris bukan format jam baru, tetapi baris lanjutan/keterangan dari acara sebelumnya
    if (results.length > 0 && !line.match(/^(?:hari|day|itinerary|rundown|jadwal|acara)/i)) {
      const last = results[results.length - 1];
      last.keterangan = last.keterangan
        ? `${last.keterangan}. ${line}`
        : line;
    }
  }

  return results;
}

/**
 * Rangkum dokumen Word / teks itinerary menjadi daftar jadwal acara terstruktur
 */
export async function summarizeWordRundownWithAI(
  rawDocumentText: string,
  _tripContext?: { nama_trip?: string; tujuan?: string }
): Promise<ParsedRundownItem[]> {
  const trimmed = rawDocumentText.trim();
  if (!trimmed) {
    throw new Error("Dokumen kosong atau tidak memuat teks yang dapat dibaca.");
  }

  const items = extractRundownWithRegexFallback(trimmed);
  if (items.length === 0) {
    throw new Error(
      "Jadwal jam tidak terdeteksi pada dokumen. Pastikan tiap baris acara diawali jam, contoh: 08.00 - 09.00 Berangkat"
    );
  }

  return items;
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
