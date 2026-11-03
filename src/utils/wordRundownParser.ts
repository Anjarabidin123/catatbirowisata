import mammoth from "mammoth";
import { getActiveGeminiApiKey } from "./biroProfile";
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
 * Pemroses cadangan (Fallback Regex) bila AI offline atau tidak ada koneksi
 */
export function extractRundownWithRegexFallback(rawText: string): ParsedRundownItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedRundownItem[] = [];
  let currentHari = 1;

  // Regex pola jam: 07:00, 07.00, 07:00 - 08:30, 07.00 s/d 08.30
  const timeRegex = /(?:(\d{1,2})[.:](\d{2}))(?:\s*(?:-|–|s\/d|sd|sampai)\s*(?:(\d{1,2})[.:](\d{2})))?/i;
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
      const startH = timeMatch[1].padStart(2, "0");
      const startM = timeMatch[2];
      const jamMulai = `${startH}:${startM}`;

      let jamSelesai = "";
      if (timeMatch[3] && timeMatch[4]) {
        const endH = timeMatch[3].padStart(2, "0");
        const endM = timeMatch[4];
        jamSelesai = `${endH}:${endM}`;
      } else {
        // Buat perkiraan jam selesai 1 jam setelah jam mulai
        const hNum = (parseInt(startH, 10) + 1) % 24;
        jamSelesai = `${String(hNum).padStart(2, "0")}:${startM}`;
      }

      // Bersihkan teks kegiatan dari bagian jam di awal
      const textAfterTime = line
        .replace(timeRegex, "")
        .replace(/^[\s:–\-•*.]+/, "")
        .trim();

      if (textAfterTime) {
        // Pisahkan judul acara dan keterangan jika ada tanda kurung atau strip
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
      }
    }
  }

  return results;
}

/**
 * Rangkum dokumen Word / teks itinerary menjadi daftar jadwal acara terstruktur via Google Gemini AI
 */
export async function summarizeWordRundownWithAI(
  rawDocumentText: string,
  tripContext?: { nama_trip?: string; tujuan?: string }
): Promise<ParsedRundownItem[]> {
  const trimmed = rawDocumentText.trim();
  if (!trimmed) {
    throw new Error("Dokumen kosong atau tidak memuat teks yang dapat dibaca.");
  }

  const apiKey = getActiveGeminiApiKey();

  // Jika tidak ada API key, gunakan langsung parser regex lokal
  if (!apiKey) {
    console.warn("Kunci API Gemini tidak ditemukan, menggunakan parser lokal.");
    const fallbackItems = extractRundownWithRegexFallback(trimmed);
    if (fallbackItems.length === 0) {
      throw new Error(
        "Kunci API AI belum diatur dan pola jadwal jam tidak terdeteksi otomatis pada dokumen ini. Silakan periksa isi teks dokumen."
      );
    }
    return fallbackItems;
  }

  const prompt = `Anda adalah asisten khusus biro perjalanan wisata yang bertugas membaca naskah dokumen Word (itinerary/rundown) dan merangkumnya menjadi susunan jadwal acara yang terstruktur rapi.

Berikut adalah teks isi dokumen Word:
---
${trimmed.slice(0, 15000)}
---

${tripContext?.nama_trip ? `Konteks Trip: ${tripContext.nama_trip} (Tujuan: ${tripContext.tujuan || "-"})` : ""}

INSTRUKSI EKSTRAKSI:
1. Ekstrak SELURUH urutan kegiatan, jam keberangkatan, jam kunjungan wisata, sholat, makan prasmanan, dan istirahat.
2. Abaikan kop surat biro, nama pimpinan, syarat & ketentuan pembayaran, atau catatan kaki yang bukan jadwal acara.
3. Susun jadwal acara ke dalam format JSON ARRAY murni. Format tiap item:
   - "hari_ke": integer (1, 2, 3...)
   - "jam_mulai": format string "HH:MM" (contoh: "07:00", "13:30"). Jika di naskah tertulis titik seperti "07.00" atau "07.00 WIB", ubah menjadi "07:00".
   - "jam_selesai": format string "HH:MM" (contoh: "08:30"). Jika tidak ada jam selesai, buat estimasi waktu yang wajar (1-2 jam setelah jam mulai).
   - "judul_acara": nama singkat kegiatan atau destinasi yang dituju (contoh: "Kumpul di Titik Kumpul", "Ziarah Makam Sunan Kalijaga", "Makan Siang Resto Grafika", "Perjalanan Pulang").
   - "keterangan": catatan pendukung kegiatan jika ada (contoh: "Pembagian snack & air mineral", "Resto kapasitas Big Bus", "Sholat Dzuhur & Ashar Jamak Qashar").

PENTING:
- Keluarkan HANYA JSON array valid tanpa teks pengantar dan tanpa markdown code fence.
- Contoh output:
[{"hari_ke":1,"jam_mulai":"07:00","jam_selesai":"08:00","judul_acara":"Kumpul & Berangkat","keterangan":"Briefing dan pembagian snack box"}]`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Gemini API error, beralih ke fallback lokal:", errText);
      const fallback = extractRundownWithRegexFallback(trimmed);
      if (fallback.length > 0) return fallback;
      throw new Error(`Gagal memproses dokumen dengan AI (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Bersihkan pembungkus markdown jika ada
    let cleaned = rawContent.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
    }

    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any, idx: number) => ({
        id: `ai-${Date.now()}-${idx}`,
        hari_ke: Number(item.hari_ke) || 1,
        jam_mulai: String(item.jam_mulai || "08:00").trim(),
        jam_selesai: String(item.jam_selesai || "09:00").trim(),
        judul_acara: String(item.judul_acara || "Agenda Wisata").trim(),
        keterangan: String(item.keterangan || "").trim(),
      }));
    }

    // Jika hasil parsing JSON bukan array valid, fallback ke regex
    return extractRundownWithRegexFallback(trimmed);
  } catch (err: any) {
    console.warn("Kesalahan parsing AI, mencoba fallback lokal:", err);
    const fallback = extractRundownWithRegexFallback(trimmed);
    if (fallback.length > 0) return fallback;
    throw new Error("Gagal merangkum jadwal dari dokumen: " + (err.message || "Format tidak sesuai"));
  }
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
