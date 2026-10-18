/**
 * Asisten AI Wisata Nusantara (Pakar Konsultasi Lapangan Biro & PO Bus)
 * Menyusun proposal rundown, estimasi HTM, resto rombongan, dan akses bus
 * berbasis Google Gemini AI & Native Engine Lapangan.
 */

import { getLocalBiroProfile, getActiveGeminiApiKey } from "./biroProfile";

export type TargetRombonganType = 
  | "tk_sd" 
  | "smp" 
  | "sma_smk" 
  | "univ" 
  | "kantoran" 
  | "ziarah" 
  | "keluarga_umum";

export interface TourConsultationParams {
  targetRombongan: TargetRombonganType;
  kotaTujuan: string;
  kotaAsal?: string;
  durasiHari: "1" | "2" | "3";
  armadaBus: "big_bus" | "medium_bus" | "microbus";
  catatanKhusus?: string;
}

export interface RundownItem {
  jamMulai: string;
  jamSelesai: string;
  kegiatan: string;
  lokasi: string;
  kategori: "ziarah" | "wisata" | "makan" | "sholat" | "perjalanan" | "istirahat";
  keterangan: string;
}

export interface TourProposalResult {
  judulTrip: string;
  kotaTujuan: string;
  targetLabel: string;
  durasiLabel: string;
  armadaLabel: string;
  karakteristikTarget: string[];
  peringatanKeselamatan: string;
  rundown: RundownItem[];
  destinasiRekomendasi: Array<{
    nama: string;
    htmPerOrang: string;
    aksesBus: string;
    alasanCocok: string;
  }>;
  restoRekomendasi: Array<{
    nama: string;
    kapasitas: string;
    parkirBus: string;
    menuFavorit: string;
  }>;
  tipsKruLapangan: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
  parsedRundown?: RundownItem[];
}

export const TARGET_LABELS: Record<
  TargetRombonganType,
  { title: string; subtitle: string; tag: string }
> = {
  tk_sd: {
    title: "Sekolah (TK / SD)",
    subtitle: "Wisata edukasi satwa/alam, jalur aman, bebas tanjakan ekstrem",
    tag: "Edukasi Ramah Anak",
  },
  smp: {
    title: "Pelajar (SMP / MTs)",
    subtitle: "Study tour edukatif, budaya, sejarah & spot belanja oleh-oleh",
    tag: "Study Tour",
  },
  sma_smk: {
    title: "Remaja (SMA / SMK)",
    subtitle: "Wisata petualangan, outbound alam, pantai & spot foto kekinian",
    tag: "Outbound & Petualangan",
  },
  univ: {
    title: "Mahasiswa / KKL",
    subtitle: "Studi lapangan, riset industri/kebudayaan, malam keakraban",
    tag: "KKL & Riset",
  },
  kantoran: {
    title: "Kantoran / Corporate",
    subtitle: "Family gathering, team building outbound, gala dinner & resto VIP",
    tag: "Corporate Gathering",
  },
  ziarah: {
    title: "Ziarah / Majelis Taklim",
    subtitle: "Makam Wali & Aulia, masjid agung, sholat 5 waktu terjaga",
    tag: "Religi & Ibadah",
  },
  keluarga_umum: {
    title: "Keluarga / Komunitas",
    subtitle: "Wisata santai, kuliner khas daerah, tempo santai tanpa terburu-buru",
    tag: "Santai & Kuliner",
  },
};

/**
 * Tes validitas Google Gemini API Key secara langsung
 */
export async function testGeminiApiKey(
  apiKey: string
): Promise<{ success: boolean; message: string; model?: string }> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { success: false, message: "API key tidak boleh kosong" };
  }

  const models = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"];
  let lastError = "";

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(trimmed)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Tes koneksi." }] }],
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return {
          success: true,
          message: `Koneksi Google Gemini API berhasil (${model})`,
          model,
        };
      }

      if (data.error?.message) {
        lastError = data.error.message;
        if (data.error.code === 404) continue;
        return { success: false, message: data.error.message };
      }
    } catch (err: any) {
      lastError = err.message || "Gagal menghubungi server Google AI";
    }
  }

  return {
    success: false,
    message: lastError || "Gagal menghubungkan ke Google Gemini API",
  };
}

/**
 * Panggil Google Gemini AI untuk obrolan interaktif biro perjalanan
 */
export async function callGeminiChat(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  context?: {
    targetRombongan?: TargetRombonganType;
    kotaTujuan?: string;
    durasiHari?: string;
    armadaBus?: string;
  }
): Promise<string> {
  const apiKey = getActiveGeminiApiKey();

  const targetInfo = context?.targetRombongan
    ? TARGET_LABELS[context.targetRombongan]
    : null;

  const systemInstruction = `Anda adalah "Asisten Wisata AI", pakar operasional lapangan biro perjalanan wisata dan PO Bus Pariwisata di Indonesia.
Keahlian Anda meliputi:
1. Perencanaan rundown perjalanan yang presisi dan realistis (mempertimbangkan macet, jarak antar titik wisata, waktu sholat 5 waktu, dan jam operasional).
2. Estimasi tiket masuk (HTM), retribusi parkir bus, dan biaya operasional lapangan.
3. Rekomendasi restoran rombongan: kapasitas besar (100 - 1000 pax), fasilitas parkir bus besar (SHD/HDD) luas, toilet banyak, dan menu prasmanan halal.
4. Kelayakan akses jalan bus: apakah bisa dilalui Big Bus 50-seat (lebar jalan, jembatan, tanjakan ekstrem, perizinan ojek/shuttle lokal jika jalan sempit) atau butuh Medium Bus / HiAce.
5. Rekomendasi khusus segmen:
   - TK/SD: Hindari tanjakan curam/jurang, jeda toilet tiap 1.5-2 jam, menu anak non-pedas, selesai sebelum maghrib.
   - SMP/MTs & SMA/SMK: Edukasi, kedisiplinan jadwal meeting point, spot foto, belanja oleh-oleh.
   - Mahasiswa / KKL: Kunjungan industri, budaya, sharing session.
   - Kantor / Corporate: Fun games ice breaking, resto VIP ber-AC, rundown terjadwal rapi.
   - Ziarah: Sholat 5 waktu berjamaah tidak boleh telat, akses ramah lansia, ojek/shuttle makam Kadilangu/Kudus/Muria/dll.
   - Keluarga / Komunitas: Tempo santai, kuliner khas daerah.

${context?.targetRombongan ? `Konteks Segmen Rombongan: ${targetInfo?.title} (${targetInfo?.subtitle})` : ""}
${context?.kotaTujuan ? `Destinasi Tujuan Utama: ${context.kotaTujuan}` : ""}
${context?.durasiHari ? `Durasi Rencana: ${context.durasiHari} Hari` : ""}
${context?.armadaBus ? `Armada yang Digunakan: ${context.armadaBus === "big_bus" ? "Big Bus 50 seat" : context.armadaBus === "medium_bus" ? "Medium Bus 33 seat" : "Microbus / HiAce"}` : ""}

Aturan Komunikasi:
- DILARANG menggunakan banyak emoji atau emoji yang tidak perlu. Tulis dengan gaya bahasa profesional, lugas, ramah, solutif, dan rapi ala konsultan biro wisata profesional.
- Format Markdown rapi: gunakan heading (*###*), bullet points yang ringkas dan padat, serta format waktu yang jelas untuk rundown (contoh: * **08.00 – 10.00 | Nama Objek / Aktivitas** dengan sub-poin rincian).
- Bersifat interaktif: Anda siap merevisi rute, mengubah durasi, mengganti tempat makan, memberi alternatif jika bus tidak muat, atau menjawab pertanyaan apa pun dari pengguna.`;

  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const models = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"];
  let lastErrorMsg = "";

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      if (data.error?.message) {
        lastErrorMsg = data.error.message;
        if (data.error.code === 404) continue;
        throw new Error(data.error.message);
      }
    } catch (err: any) {
      lastErrorMsg = err.message || "Gagal memproses permintaan";
    }
  }

  // Jika koneksi API gagal, berikan fallback cerdas berbasis Native Engine
  if (context?.targetRombongan && context?.kotaTujuan) {
    const fallbackProposal = generateTourProposal({
      targetRombongan: context.targetRombongan,
      kotaTujuan: context.kotaTujuan,
      durasiHari: (context.durasiHari as any) || "1",
      armadaBus: (context.armadaBus as any) || "big_bus",
    });
    return formatProposalAsMarkdown(fallbackProposal);
  }

  throw new Error(lastErrorMsg || "Koneksi ke Asisten AI sedang tidak stabil. Silakan periksa koneksi internet atau kunci API.");
}

/**
 * Format proposal bawaan ke markdown bersih untuk fallback
 */
function formatProposalAsMarkdown(p: TourProposalResult): string {
  let md = `### ${p.judulTrip}\n\n`;
  md += `**Durasi:** ${p.durasiLabel} | **Armada:** ${p.armadaLabel}\n\n`;
  md += `#### Catatan Operasional & Keselamatan Lapangan\n`;
  md += `${p.peringatanKeselamatan}\n\n`;

  md += `#### Rundown Acara Lapangan (Siap Pakai)\n`;
  p.rundown.forEach((r) => {
    md += `* **${r.jamMulai} – ${r.jamSelesai} | ${r.kegiatan}**\n`;
    md += `  * Lokasi: ${r.lokasi} (${r.kategori})\n`;
    if (r.keterangan) md += `  * Info: ${r.keterangan}\n`;
  });

  md += `\n#### Rekomendasi Resto Rombongan (Akses Bus Luas)\n`;
  p.restoRekomendasi.forEach((resto) => {
    md += `* **${resto.nama}** (Kapasitas: ${resto.kapasitas})\n`;
    md += `  * Parkir: ${resto.parkirBus} | Menu: ${resto.menuFavorit}\n`;
  });

  return md;
}

/**
 * Parser otomatis untuk mengekstrak item rundown dari teks balasan AI
 */
export function parseRundownFromText(text: string): RundownItem[] {
  const lines = text.split("\n");
  const items: RundownItem[] = [];
  const timeRegex = /(?:^|\*|\-|\b)(\d{1,2}[.:]\d{2})\s*(?:–|-|s\/d|to)\s*(\d{1,2}[.:]\d{2})\s*(?:\||:|-)?\s*([^\n*]+)/i;

  let currentItem: RundownItem | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const match = rawLine.match(timeRegex);
    if (match) {
      if (currentItem) items.push(currentItem);

      const start = match[1].replace(":", ".");
      const end = match[2].replace(":", ".");
      let title = match[3].replace(/^[\s*|:\-]+|[\s*|:\-]+$/g, "").trim();

      let kategori: RundownItem["kategori"] = "wisata";
      const lower = (title + " " + rawLine).toLowerCase();
      if (lower.includes("ziarah") || lower.includes("makam")) kategori = "ziarah";
      else if (
        lower.includes("makan") ||
        lower.includes("resto") ||
        lower.includes("kuliner") ||
        lower.includes("isoma") ||
        lower.includes("lunch") ||
        lower.includes("dinner")
      )
        kategori = "makan";
      else if (lower.includes("sholat") || lower.includes("masjid"))
        kategori = "sholat";
      else if (
        lower.includes("perjalanan") ||
        lower.includes("otw") ||
        lower.includes("pulang") ||
        lower.includes("berangkat") ||
        lower.includes("kumpul")
      )
        kategori = "perjalanan";
      else if (
        lower.includes("istirahat") ||
        lower.includes("check in") ||
        lower.includes("hotel")
      )
        kategori = "istirahat";

      currentItem = {
        jamMulai: start.length === 4 ? "0" + start : start,
        jamSelesai: end.length === 4 ? "0" + end : end,
        kegiatan: title,
        lokasi: title,
        kategori,
        keterangan: "",
      };
    } else if (
      currentItem &&
      (rawLine.startsWith("*") || rawLine.startsWith("-") || rawLine.startsWith("•"))
    ) {
      const bullet = rawLine
        .replace(/^[*•\-]\s*/, "")
        .replace(/\*\*/g, "")
        .trim();
      if (bullet) {
        if (bullet.toLowerCase().startsWith("lokasi:")) {
          currentItem.lokasi = bullet.replace(/lokasi:\s*/i, "").trim();
        } else {
          currentItem.keterangan = currentItem.keterangan
            ? `${currentItem.keterangan} • ${bullet}`
            : bullet;
        }
      }
    }
  }

  if (currentItem) items.push(currentItem);
  return items;
}

/**
 * Native Engine: Penyusun Proposal Tour Lapangan Otomatis Presisi
 */
export function generateTourProposal(params: TourConsultationParams): TourProposalResult {
  const targetInfo = TARGET_LABELS[params.targetRombongan];
  const tujuan = params.kotaTujuan.trim();
  const tujuanLower = tujuan.toLowerCase();

  const isZiarah = params.targetRombongan === "ziarah";
  const isTkSd = params.targetRombongan === "tk_sd";
  const isKantor = params.targetRombongan === "kantoran";

  const isSemarang =
    tujuanLower.includes("semarang") ||
    tujuanLower.includes("demak") ||
    tujuanLower.includes("kudus");
  const isJogja =
    tujuanLower.includes("jogja") ||
    tujuanLower.includes("yogyakarta") ||
    tujuanLower.includes("magelang") ||
    tujuanLower.includes("borobudur");
  const isMalang =
    tujuanLower.includes("malang") ||
    tujuanLower.includes("batu") ||
    tujuanLower.includes("bromo");
  const isBandung =
    tujuanLower.includes("bandung") ||
    tujuanLower.includes("lembang") ||
    tujuanLower.includes("ciwidey");

  let karakteristik: string[] = [];
  let peringatan = "";

  if (isZiarah) {
    karakteristik = [
      "Fokus ziarah makam waliyullah dan tadabbur masjid bersejarah.",
      "Pergerakan bus wajib menyelaraskan 5 waktu sholat fardhu berjamaah.",
      "Mayoritas rombongan orang tua/lansia: butuh akses jalan datar dan parkir terdekat.",
      "Konsumsi mengutamakan rumah makan prasmanan dengan toilet dan wudhu luas.",
    ];
    peringatan =
      "Siapkan uang operasional retribusi parkir dan koordinasikan ojek/shuttle lokal untuk makam dengan akses gang sempit (seperti Menara Kudus & Kadilangu).";
  } else if (isTkSd) {
    karakteristik = [
      "Anak-anak mudah lelah: alokasikan waktu jeda toilet setiap 1.5 - 2 jam.",
      "Pilihan objek wisata wajib memiliki pagar pengaman kokoh (bebas jurang/tebing).",
      "Menu makan praktis disukai anak (nasi bento ayam krispi/olahan non-pedas).",
      "Pukul 18.00 - 18.30 rombongan idealnya sudah selesai perjalanan.",
    ];
    peringatan =
      "Kru bus wajib menyiapkan kantong plastik anti-mabuk, P3K anak, dan hiburan audio anak di bus.";
  } else if (isKantor) {
    karakteristik = [
      "Menuntut ketepatan waktu, kenyamanan bus maksimal, dan fasilitas AC prima.",
      "Butuh venue lapang untuk fun games / ice breaking / team building.",
      "Resto representatif, ber-AC, dan memiliki fasilitas sound system/mic sambutan.",
    ];
    peringatan =
      "Pastikan driver menguasai rute jalan tol tercepat dan reservasi resto rombongan terkonfirmasi H-1.";
  } else {
    karakteristik = [
      "Peserta aktif dan menyukai spot foto kekinian serta wisata kuliner khas.",
      "Alokasi waktu cukup untuk belanja oleh-oleh khas daerah.",
      "Ritme perjalanan dinamis namun tetap terkontrol agar tidak tertinggal jadwal.",
    ];
    peringatan =
      "Selalu tentukan titik kumpul (Meeting Point) dan batas toleransi jam kembali ke bus sebelum rombongan berpencar.";
  }

  let rundown: RundownItem[] = [];

  if (isZiarah) {
    rundown = [
      {
        jamMulai: "06.30",
        jamSelesai: "07.30",
        kegiatan: "Penjemputan jamaah & Doa safar keberangkatan",
        lokasi: "Titik Kumpul Jamaah",
        kategori: "perjalanan",
        keterangan: "Tour Leader memimpin doa & mengecek kelengkapan kursi bus",
      },
      {
        jamMulai: "08.30",
        jamSelesai: "10.30",
        kegiatan: "Ziarah Makam Sunan Kalijaga & Tahlil Jamaah",
        lokasi: "Kadilangu, Demak",
        kategori: "ziarah",
        keterangan: "Bus parkir di terminal Kadilangu, jalan kaki 150m ke cungkup makam",
      },
      {
        jamMulai: "11.00",
        jamSelesai: "13.00",
        kegiatan: "Sholat Dzuhur Berjamaah & Ziarah Sultan Fatah",
        lokasi: "Masjid Agung Demak",
        kategori: "sholat",
        keterangan: "Tadabbur arsitektur wali & sholat jama' qashar",
      },
      {
        jamMulai: "13.15",
        jamSelesai: "14.15",
        kegiatan: "Makan Siang Prasmanan Rombongan",
        lokasi: "RM Raos Eco / Resto Halal Sekitar",
        kategori: "makan",
        keterangan: "Menu masakan Jawa halal, toilet bersih & musholla luas",
      },
      {
        jamMulai: "15.00",
        jamSelesai: "17.00",
        kegiatan: "Kunjungan & Sholat Ashar di Masjid Agung Jawa Tengah",
        lokasi: "MAJT Semarang",
        kategori: "wisata",
        keterangan: "Payung hidrolik raksasa & menara Asmaul Husna",
      },
      {
        jamMulai: "17.30",
        jamSelesai: "19.00",
        kegiatan: "Belanja Oleh-Oleh Khas & Sholat Maghrib",
        lokasi: "Pusat Oleh-oleh Pandanaran",
        kategori: "wisata",
        keterangan: "Belanja Bandeng Presto & Lumpia khas Semarang",
      },
      {
        jamMulai: "19.30",
        jamSelesai: "21.00",
        kegiatan: "Perjalanan kembali ke kota asal & penutupan trip",
        lokasi: "Perjalanan Pulang",
        kategori: "perjalanan",
        keterangan: "Tiba kembali dengan selamat dan tertib",
      },
    ];
  } else if (isTkSd) {
    rundown = [
      {
        jamMulai: "07.00",
        jamSelesai: "08.00",
        kegiatan: "Kumpul di Sekolah & Pembagian Snack Pagi",
        lokasi: "Halaman Sekolah",
        kategori: "perjalanan",
        keterangan: "Absensi siswa per bus, briefing wali murid & doa bersama",
      },
      {
        jamMulai: "09.00",
        jamSelesai: "11.30",
        kegiatan: "Wisata Edukasi Satwa & Wahana Alam Ramah Anak",
        lokasi: isSemarang
          ? "Cimory Dairyland / Dusun Semilir"
          : isJogja
          ? "Gembira Loka Zoo"
          : isMalang
          ? "Jatim Park 2 (Batu Secret Zoo)"
          : "Taman Rekreasi Edukasi",
        kategori: "wisata",
        keterangan: "Melihat hewan, mini farm, wahana interaktif dengan pemandu",
      },
      {
        jamMulai: "11.45",
        jamSelesai: "13.00",
        kegiatan: "Makan Siang Anak & Sholat Dzuhur",
        lokasi: "Resto Area Wisata / Pendopo Khusus",
        kategori: "makan",
        keterangan: "Menu box ramah anak (ayam krispi, buah, teh manis hangat)",
      },
      {
        jamMulai: "13.30",
        jamSelesai: "15.30",
        kegiatan: "Taman Rekreasi / Wahana Bermain Air Dangkal",
        lokasi: "Wahana Permainan Ramah Anak",
        kategori: "wisata",
        keterangan: "Aktivitas gembira dengan pendampingan guru & tour guide",
      },
      {
        jamMulai: "16.00",
        jamSelesai: "17.00",
        kegiatan: "Mampir Oleh-Oleh Ramah Anak & Snack Sore",
        lokasi: "Pusat Jajanan Daerah",
        kategori: "wisata",
        keterangan: "Beli kue bolu & jajanan khas",
      },
      {
        jamMulai: "17.30",
        jamSelesai: "19.00",
        kegiatan: "Perjalanan pulang kembali ke sekolah",
        lokasi: "Perjalanan Bus",
        kategori: "perjalanan",
        keterangan: "Siswa istirahat di bus, penyerahan kembali ke orang tua",
      },
    ];
  } else if (isKantor) {
    rundown = [
      {
        jamMulai: "06.30",
        jamSelesai: "07.30",
        kegiatan: "Penjemputan di Kantor & Snack Box Eksklusif",
        lokasi: "Lobby Kantor",
        kategori: "perjalanan",
        keterangan: "Briefing panitia & pembagian perlengkapan trip",
      },
      {
        jamMulai: "09.30",
        jamSelesai: "12.00",
        kegiatan: "Fun Games & Team Building Outbound",
        lokasi: "Resort / Area Outbound",
        kategori: "wisata",
        keterangan: "Dipandu fasilitator profesional untuk meningkatkan kekompakan kerja",
      },
      {
        jamMulai: "12.15",
        jamSelesai: "13.30",
        kegiatan: "Makan Siang Prasmanan & Sholat Dzuhur",
        lokasi: "Restoran Representatif Rombongan",
        kategori: "makan",
        keterangan: "Menu lengkap prasmanan, ruang makan VIP ber-AC",
      },
      {
        jamMulai: "14.00",
        jamSelesai: "16.30",
        kegiatan: "Jelajah Wisata Ikonik & Santai",
        lokasi: isSemarang
          ? "Kota Lama & Lawang Sewu"
          : isJogja
          ? "HeHa Ocean View / Tebing Breksi"
          : isBandung
          ? "Floating Market Lembang"
          : "Destinasi Unggulan",
        kategori: "wisata",
        keterangan: "Waktu santai, coffee break & foto bersama unit kerja",
      },
      {
        jamMulai: "17.00",
        jamSelesai: "18.30",
        kegiatan: "Belanja Oleh-Oleh Premium",
        lokasi: "Pusat Oleh-Oleh Pilihan",
        kategori: "wisata",
        keterangan: "Kemasan rapi siap bagasi bus",
      },
      {
        jamMulai: "19.00",
        jamSelesai: "20.30",
        kegiatan: "Makan Malam & Evaluasi Kebersamaan",
        lokasi: "Restoran Khas Daerah",
        kategori: "makan",
        keterangan: "Malam keakraban santai sebelum perjalanan pulang",
      },
    ];
  } else {
    rundown = [
      {
        jamMulai: "07.00",
        jamSelesai: "08.00",
        kegiatan: "Kumpul Rombongan & Berangkat",
        lokasi: "Titik Kumpul",
        kategori: "perjalanan",
        keterangan: "Briefing agenda oleh Tour Leader & pembagian snack",
      },
      {
        jamMulai: "09.00",
        jamSelesai: "12.00",
        kegiatan: "Kunjungan Objek Wisata Edukasi & Spot Utama",
        lokasi: isSemarang
          ? "Lawang Sewu & Sam Poo Kong"
          : isJogja
          ? "Candi Prambanan & Breksi"
          : isMalang
          ? "Museum Angkut / Jatim Park"
          : "Destinasi Utama",
        kategori: "wisata",
        keterangan: "Eksplorasi bersama tour guide lokal & foto bersama",
      },
      {
        jamMulai: "12.15",
        jamSelesai: "13.30",
        kegiatan: "Makan Siang Rombongan & Sholat Dzuhur",
        lokasi: "Resto Spesialis Bus Rombongan",
        kategori: "makan",
        keterangan: "Toilet banyak, parkir bus luas, menu cepat saji",
      },
      {
        jamMulai: "14.00",
        jamSelesai: "16.30",
        kegiatan: "Wisata Alam & Spot Foto Budaya",
        lokasi: isSemarang
          ? "Kota Lama Semarang"
          : isJogja
          ? "Kawasan Malioboro"
          : isMalang
          ? "San Terra Pujon"
          : "Wisata Alam",
        kategori: "wisata",
        keterangan: "Jalan santai dan menikmati suasana daerah",
      },
      {
        jamMulai: "17.00",
        jamSelesai: "18.30",
        kegiatan: "Pusat Oleh-Oleh & Kerajinan Khas",
        lokasi: "Sentra Belanja Oleh-Oleh",
        kategori: "wisata",
        keterangan: "Waktu belanja oleh-oleh untuk keluarga di rumah",
      },
      {
        jamMulai: "19.00",
        jamSelesai: "21.00",
        kegiatan: "Makan Malam & Perjalanan Pulang",
        lokasi: "Perjalanan Kembali",
        kategori: "perjalanan",
        keterangan: "Evaluasi tour & tiba kembali di titik kumpul",
      },
    ];
  }

  let destinasiRekomendasi = [];
  if (isZiarah) {
    destinasiRekomendasi = [
      {
        nama: "Makam Sunan Kalijaga (Kadilangu)",
        htmPerOrang: "Infaq Sukarela (Ojek Rp 10.000 jika diperlukan)",
        aksesBus: "Terminal Bus Kadilangu Demak muat 30+ Big Bus",
        alasanCocok: "Makam salah satu Walisongo paling dikunjungi, jalur ramah lansia",
      },
      {
        nama: "Masjid Agung Demak & Makam Raden Patah",
        htmPerOrang: "Gratis (Infaq Masjid)",
        aksesBus: "Kantong Parkir Tembiring Demak / Depan Alun-alun",
        alasanCocok: "Pusat Kesultanan Islam pertama di Jawa, fasilitas wudhu & sholat sangat memadai",
      },
      {
        nama: "Masjid Agung Jawa Tengah (MAJT Semarang)",
        htmPerOrang: "Gratis (Naik Menara Rp 10.000)",
        aksesBus: "Parkiran bus dalam sangat luas (kapasitas 50 bus)",
        alasanCocok: "Tempat transit ibadah megah dengan 6 payung raksasa ala Madinah",
      },
    ];
  } else if (isTkSd) {
    destinasiRekomendasi = [
      {
        nama: isSemarang
          ? "Cimory Dairyland On The Valley"
          : isJogja
          ? "Gembira Loka Zoo"
          : "Taman Rekreasi Edukasi",
        htmPerOrang: "Rp 25.000 - Rp 35.000",
        aksesBus: "Akses bus pariwisata sangat aman di pinggir jalan raya utama",
        alasanCocok: "Edukasi satwa jinak, mini farm, aman tanpa tebing curam",
      },
      {
        nama: isSemarang
          ? "Dusun Semilir Eco Park Bawen"
          : isJogja
          ? "Taman Pintar Yogyakarta"
          : "Taman Bermain Ramah Anak",
        htmPerOrang: "Rp 30.000 - Rp 40.000",
        aksesBus: "Akses 300 meter dari Exit Tol, parkir bus sangat lapang",
        alasanCocok: "Spot foto ceria, wahana ramah anak, dan area istirahat teduh",
      },
    ];
  } else {
    destinasiRekomendasi = [
      {
        nama: isSemarang
          ? "Lawang Sewu"
          : isJogja
          ? "Candi Prambanan"
          : isMalang
          ? "Museum Angkut"
          : "Destinasi Ikonik",
        htmPerOrang: "Rp 20.000 - Rp 50.000",
        aksesBus: "Kantong parkir resmi bus pariwisata tersedia",
        alasanCocok: "Ikon pariwisata utama yang wajib dikunjungi rombongan",
      },
      {
        nama: isSemarang
          ? "Kota Lama Semarang"
          : isJogja
          ? "Malioboro / Titik Nol"
          : isMalang
          ? "Flora Wisata San Terra"
          : "Spot Foto & Budaya",
        htmPerOrang: "Gratis / Rp 30.000",
        aksesBus: "Titik drop bus besar teratur di kantong parkir khusus",
        alasanCocok: "Kawasan pedestrian ramah rombongan untuk jalan santai & foto bersama",
      },
    ];
  }

  let restoRekomendasi = [
    {
      nama: isSemarang
        ? "Kampoeng Laut Semarang"
        : isJogja
        ? "Jejamuran Resto"
        : isMalang
        ? "Khas Jawa Resto Batu"
        : "Resto Rombongan Spesialis",
      kapasitas: "800 - 1500 Pax",
      parkirBus: "Muat 20+ Bus Besar (SHD/HDD)",
      menuFavorit: isZiarah
        ? "Prasmanan Tradisional Jawa & Ikan Bakar"
        : isTkSd
        ? "Paket Ayam Krispi & Sayur Manis"
        : "Paket Gurameh, Ayam Bakar & Aneka Sambal",
    },
    {
      nama: isSemarang
        ? "RM Pringgading / Mang Engking"
        : isJogja
        ? "Bale Raos / Mang Engking"
        : "Resto Lesehan Luas",
      kapasitas: "400 - 600 Pax",
      parkirBus: "Parkir bus aman & teratur",
      menuFavorit: "Paket Prasmanan Lengkap + Minuman Hangat",
    },
  ];

  const tipsKruLapangan = [
    `Armada: Gunakan ${params.armadaBus === "big_bus" ? "Big Bus SHD/HDD (Jalur wajib kelas 1 & 2)" : params.armadaBus === "medium_bus" ? "Medium Bus (Lebih fleksibel di jalan antar-kecamatan)" : "Microbus (Bisa masuk gang sempit)"}.`,
    "Pastikan Tour Leader memegang nomor HP Koordinator Rombongan & Ketua Kloter.",
    "Selalu siapkan uang tunai operasional retribusi parkir bus.",
    "Sediakan kru bus untuk memandu penyeberangan rombongan di jalan raya.",
  ];

  return {
    judulTrip: `${targetInfo.title}: Eksplor ${tujuan.toUpperCase()}`,
    kotaTujuan: tujuan,
    targetLabel: targetInfo.title,
    durasiLabel: `${params.durasiHari} Hari Penuh`,
    armadaLabel:
      params.armadaBus === "big_bus"
        ? "Big Bus (SHD/HDD 50 Seat)"
        : params.armadaBus === "medium_bus"
        ? "Medium Bus (33 Seat)"
        : "Microbus / HiAce",
    karakteristikTarget: karakteristik,
    peringatanKeselamatan: peringatan,
    rundown,
    destinasiRekomendasi,
    restoRekomendasi,
    tipsKruLapangan,
  };
}
