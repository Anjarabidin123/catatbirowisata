/**
 * aiAutomationEngine.ts
 * Mesin Automasi Cerdas Berbasis AI (Gemini 2.0 / Flash + Heuristic Fallback)
 * Memproses perintah teks natural user ala CLI cerdas:
 * 1. Tambah Bus / Armada (PO Bus, Plat Polisi, Kapasitas, Driver, Kontak)
 * 2. Tambah / Registrasi Kru (Tour Leader, Driver, Kernet, Korlap)
 * 3. Buat Trip Baru Secara Otomatis
 * 4. Catat Transaksi Keuangan / Pengeluaran / Petty Cash Lapangan
 * 5. Tambah Jadwal Rundown Acara
 * 6. Kueri Informasi Cerdas (Status kuota, daftar armada, kru aktif)
 */

import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { getBiroCmsData, saveBiroCmsData, RekananBus } from "@/utils/biroCmsStore";
import { addCrewMemberDB, getCrewMembers, CrewJabatan, logCrewActivity } from "@/utils/rbacAuditLogger";
import { getCurrentEntitlements } from "@/utils/licenseEntitlement";
import { getStoredApiKey } from "@/utils/asistenWisataAI";
import { format } from "date-fns";

export type AiIntentType =
  | "ADD_BUS"
  | "ADD_CREW"
  | "CREATE_TRIP"
  | "ADD_TRANSACTION"
  | "ADD_RUNDOWN"
  | "QUERY_DATA"
  | "HELP"
  | "UNKNOWN";

export interface ParsedAiAction {
  intent: AiIntentType;
  confidence: number;
  rawText: string;
  summary: string;
  parameters: Record<string, any>;
  suggestedReply: string;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  actionType: AiIntentType;
  createdId?: string;
  navigationPath?: string;
}

const FALLBACK_GEMINI_KEY = "AQ.Ab8RN6KzU9HOTTXOtiMly1vYqrgzwKPXpKYqXsEGTvJxlrdQnw";

export const getEffectiveGeminiApiKey = (): string => {
  const stored = getStoredApiKey();
  if (stored && stored.trim().length > 5) return stored.trim();
  return FALLBACK_GEMINI_KEY;
};

/**
 * Heuristic Fallback Parser jika API offline atau user input langsung
 */
export function parseWithHeuristics(input: string): ParsedAiAction {
  const text = input.trim();
  const lower = text.toLowerCase();

  // 1. TAMBAH BUS
  if (
    lower.includes("tambah bus") ||
    lower.includes("tambahkan bus") ||
    lower.includes("buat bus") ||
    lower.includes("armada bus") ||
    lower.includes("rekanan bus")
  ) {
    // Ekstrak Nama PO Bus
    let namaPO = "Armada Pariwisata";
    const poMatch = text.match(/(?:po|bus|armada)\s+([A-Za-z0-9\s\.\-]+?)(?=\s+(?:plat|seat|kapasitas|driver|sopir|hp|no|harga|dp|$))/i);
    if (poMatch && poMatch[1].trim()) {
      namaPO = poMatch[1].trim();
      if (!namaPO.toLowerCase().startsWith("po ") && !namaPO.toLowerCase().startsWith("bus ")) {
        namaPO = `PO ${namaPO}`;
      }
    }

    // Ekstrak Plat Nomor Polisi (misal: H 1234 AB, B 9999 XYZ)
    const platMatch = text.match(/(?:plat|nopol|no\s*polisi)?\s*([A-Z]{1,2}\s*[0-9]{1,4}\s*[A-Z]{1,3})/i);
    const nopol = platMatch ? platMatch[1].toUpperCase().replace(/\s+/g, " ") : "";

    // Ekstrak Kapasitas / Seat
    const seatMatch = text.match(/([0-9]{1,3})\s*(?:seat|kursi|bangku|penumpang|pax)/i);
    const kapasitas = seatMatch ? parseInt(seatMatch[1], 10) : 50;

    // Ekstrak Nama Driver / Sopir
    const driverMatch = text.match(/(?:driver|sopir|supir|drivernya|kru)\s*(?:pak|mas|om)?\s*([A-Za-z\s]+?)(?=\s+(?:plat|seat|hp|no|harga|dp|$))/i);
    const namaDriver = driverMatch ? driverMatch[1].trim() : "Driver Utama";

    // Ekstrak Nomor HP / Telepon
    const phoneMatch = text.match(/(?:08[0-9\-]{8,13})/);
    const telepon = phoneMatch ? phoneMatch[0] : "";

    return {
      intent: "ADD_BUS",
      confidence: 0.9,
      rawText: text,
      summary: `Tambah Master Bus: ${namaPO} (${kapasitas} Seat${nopol ? `, Plat ${nopol}` : ""})`,
      parameters: {
        namaPO,
        nopol,
        kapasitas,
        namaDriver,
        telepon,
      },
      suggestedReply: `Menyiapkan penambahan unit bus **${namaPO}** (${kapasitas} Seat) dengan driver ${namaDriver}.`,
    };
  }

  // 2. TAMBAH KRU
  if (
    lower.includes("tambah kru") ||
    lower.includes("tambahkan kru") ||
    lower.includes("daftar kru") ||
    lower.includes("tambah driver") ||
    lower.includes("tambah tour leader") ||
    lower.includes("tambah tl")
  ) {
    let jabatan: CrewJabatan = "Tour Leader";
    if (lower.includes("driver") || lower.includes("sopir")) {
      jabatan = "Driver Utama";
    } else if (lower.includes("kernet") || lower.includes("co-driver") || lower.includes("codriver")) {
      jabatan = "Co-Driver / Kernet";
    } else if (lower.includes("korlap") || lower.includes("koordinator")) {
      jabatan = "Koordinator Lapangan";
    } else if (lower.includes("staf") || lower.includes("admin")) {
      jabatan = "Staf Operasional";
    }

    // Ekstrak Nama Kru
    let namaKru = "Personel Kru Baru";
    const nameMatch = text.match(/(?:nama|kru|driver|tl)\s*(?:pak|mas|mbak)?\s*([A-Za-z\s]{3,25}?)(?=\s+(?:role|jabatan|no|hp|telepon|untuk|trip|$))/i);
    if (nameMatch && nameMatch[1].trim()) {
      namaKru = nameMatch[1].trim();
    }

    // Ekstrak Nomor HP
    const phoneMatch = text.match(/(?:08[0-9\-]{8,13})/);
    const telepon = phoneMatch ? phoneMatch[0] : "0812-0000-0000";

    return {
      intent: "ADD_CREW",
      confidence: 0.9,
      rawText: text,
      summary: `Daftarkan Kru: ${namaKru} (${jabatan})`,
      parameters: {
        nama: namaKru,
        jabatan,
        telepon,
        email: `${namaKru.toLowerCase().replace(/[^a-z0-9]/g, "")}@kru.biro`,
      },
      suggestedReply: `Menyiapkan pendaftaran personel kru baru: **${namaKru}** sebagai **${jabatan}**.`,
    };
  }

  // 3. CATAT TRANSAKSI / PENGELUARAN / KAS
  if (
    lower.includes("catat pengeluaran") ||
    lower.includes("catat biaya") ||
    lower.includes("beli bensin") ||
    lower.includes("isi bbm") ||
    lower.includes("bayar tol") ||
    lower.includes("bayar parkir") ||
    lower.includes("catat kas") ||
    lower.includes("masukkan pemasukan") ||
    lower.includes("catat pemasukan") ||
    lower.includes("terima dp")
  ) {
    const isPemasukan = lower.includes("pemasukan") || lower.includes("terima dp") || lower.includes("lunas");
    const jenis = isPemasukan ? "pemasukan" : "pengeluaran";

    // Ekstrak Angka Rupiah
    let jumlah = 0;
    const nominalMatch = text.match(/(?:rp\.?|sebesar)?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\s*(?:rb|ribu|jt|juta)?/i);
    if (nominalMatch) {
      let rawNum = nominalMatch[1].replace(/\./g, "");
      let parsed = parseFloat(rawNum);
      const suffix = text.substring(nominalMatch.index || 0, (nominalMatch.index || 0) + 25).toLowerCase();
      if (suffix.includes("jt") || suffix.includes("juta")) {
        parsed = parsed * 1000000;
      } else if (suffix.includes("rb") || suffix.includes("ribu")) {
        parsed = parsed * 1000;
      }
      jumlah = parsed;
    }

    return {
      intent: "ADD_TRANSACTION",
      confidence: 0.85,
      rawText: text,
      summary: `Catat ${jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran"}: Rp ${jumlah.toLocaleString("id-ID")}`,
      parameters: {
        jenis,
        jumlah,
        keterangan: text.replace(/(?:catat|masukkan|tambahkan)\s+(?:pengeluaran|pemasukan|biaya)?/i, "").trim() || (isPemasukan ? "Pemasukan Operasional" : "Pengeluaran Lapangan"),
      },
      suggestedReply: `Siap mencatat ${jenis} sebesar **Rp ${jumlah.toLocaleString("id-ID")}**.`,
    };
  }

  // 4. BUAT TRIP BARU
  if (
    lower.includes("buat trip") ||
    lower.includes("tambah trip") ||
    lower.includes("jadwalkan trip") ||
    lower.includes("trip baru")
  ) {
    let tujuan = "Destinasi Wisata";
    const destMatch = text.match(/(?:ke|tujuan|destinasi)\s+([A-Za-z0-9\s\-]+?)(?=\s+(?:tanggal|tgl|tgl\.|dengan|bus|rombongan|$))/i);
    if (destMatch && destMatch[1].trim()) {
      tujuan = destMatch[1].trim();
    }

    let namaTrip = `Trip ${tujuan}`;
    const nameMatch = text.match(/(?:nama|rombongan|paket)\s+([A-Za-z0-9\s\-]+?)(?=\s+(?:ke|tujuan|tanggal|tgl|$))/i);
    if (nameMatch && nameMatch[1].trim()) {
      namaTrip = nameMatch[1].trim();
    }

    const today = format(new Date(), "yyyy-MM-dd");

    return {
      intent: "CREATE_TRIP",
      confidence: 0.85,
      rawText: text,
      summary: `Buat Trip Baru: ${namaTrip} ke ${tujuan}`,
      parameters: {
        nama_trip: namaTrip,
        tujuan,
        tanggal: today,
      },
      suggestedReply: `Menyiapkan jadwal trip baru: **${namaTrip}** dengan tujuan **${tujuan}**.`,
    };
  }

  // 5. QUERY / TANYA STATUS
  if (
    lower.includes("status") ||
    lower.includes("berapa") ||
    lower.includes("daftar") ||
    lower.includes("kru aktif") ||
    lower.includes("ringkasan") ||
    lower.includes("siapa saja")
  ) {
    return {
      intent: "QUERY_DATA",
      confidence: 0.8,
      rawText: text,
      summary: "Kueri Informasi Sistem Real-Time",
      parameters: { query: text },
      suggestedReply: "Mengambil data real-time biro wisata Anda...",
    };
  }

  // DEFAULT / HELP
  return {
    intent: "HELP",
    confidence: 0.5,
    rawText: text,
    summary: "Bantuan Perintah Otomasi Cerdas",
    parameters: {},
    suggestedReply:
      "Perintah tidak dikenali secara spesifik. Anda bisa mengetik:\n" +
      "• `tambah bus SUBUR JAYA plat H 1234 AB kapasitas 50 seat driver Pak Budi no hp 0812345678`\n" +
      "• `tambah kru Pak Slamet role Driver telepon 0852345678`\n" +
      "• `buat trip Study Tour SMPN 1 ke Bali tanggal 15 Desember`\n" +
      "• `catat pengeluaran beli bensin solar 500rb`\n" +
      "• `berapa sisa kuota trip dan kru saya?`",
  };
}

/**
 * Parsing Perintah Menggunakan Google Gemini API dengan Fallback Cerdas
 */
export async function parseCommandWithAI(prompt: string): Promise<ParsedAiAction> {
  const apiKey = getEffectiveGeminiApiKey();

  // Jika tidak ada API key yang valid, langsung gunakan parser heuristik yang andal
  if (!apiKey || apiKey.length < 10) {
    return parseWithHeuristics(prompt);
  }

  const systemInstruction = `
Kamu adalah AI Automation Engine untuk aplikasi manajemen Biro Wisata & Tour Organizer (CatatBiro).
Tugasmu: Menganalisa instruksi natural bahasa Indonesia dari pengguna dan mengubahnya menjadi format JSON perintah aksi yang siap dieksekusi secara otomatis.

Supported Intents:
1. "ADD_BUS": Menambahkan master bus armada rekanan.
   Parameters:
   - namaPO: string (contoh: "PO Subur Jaya", "PO Haryanto")
   - nopol: string (contoh: "H 1234 AB")
   - kapasitas: number (jumlah kursi, default 50 jika tidak disebutkan)
   - namaDriver: string (nama pengemudi / sopir)
   - telepon: string (nomor kontak / WA)
   - catatanArmada: string (opsional)

2. "ADD_CREW": Mendaftarkan kru baru ke sistem biro.
   Parameters:
   - nama: string (nama lengkap kru)
   - jabatan: "Tour Leader" | "Driver Utama" | "Co-Driver / Kernet" | "Koordinator Lapangan" | "Staf Operasional"
   - telepon: string (nomor HP)
   - assignedTrip: string (opsional)

3. "CREATE_TRIP": Membuat jadwal trip / paket wisata baru.
   Parameters:
   - nama_trip: string (nama acara / rombongan)
   - tujuan: string (kota atau objek wisata tujuan)
   - tanggal: string (format YYYY-MM-DD, gunakan tanggal hari ini atau tanggal yang diminta)
   - nama_kendaraan: string (opsional)
   - nomor_polisi: string (opsional)
   - nama_driver: string (opsional)
   - jumlah_penumpang: number (opsional)
   - budget_estimasi: number (opsional)

4. "ADD_TRANSACTION": Mencatat arus kas keuangan / pengeluaran lapangan / pemasukan.
   Parameters:
   - jenis: "pengeluaran" | "pemasukan"
   - jumlah: number (nominal murni angka rupiah)
   - keterangan: string (alasan/detail transaksi)

5. "QUERY_DATA": Pertanyaan tanya data (misal tanya kru, tanya saldo, tanya bus, dll.)
   Parameters:
   - topic: "trips" | "crew" | "finance" | "bus" | "general"

6. "HELP": Permintaan bantuan format perintah.

Format Balasan WAJIB berupa JSON murni tanpa markdown triple backtick:
{
  "intent": "ADD_BUS" | "ADD_CREW" | "CREATE_TRIP" | "ADD_TRANSACTION" | "QUERY_DATA" | "HELP",
  "confidence": number (0.0 - 1.0),
  "summary": "Ringkasan 1 baris yang jelas dalam bahasa Indonesia",
  "suggestedReply": "Respon percakapan ramah dan profesional dalam bahasa Indonesia",
  "parameters": {}
}
`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemInstruction}\n\nInstruksi Pengguna: "${prompt}"` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      console.warn("Gemini API call failed, falling back to heuristics:", response.statusText);
      return parseWithHeuristics(prompt);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return parseWithHeuristics(prompt);
    }

    // Bersihkan kemungkinan markdown fencing jika ada
    const cleaned = candidateText.replace(/^```json/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      intent: parsed.intent || "UNKNOWN",
      confidence: parsed.confidence || 0.9,
      rawText: prompt,
      summary: parsed.summary || "Perintah AI Terproses",
      suggestedReply: parsed.suggestedReply || "Perintah berhasil diproses.",
      parameters: parsed.parameters || {},
    };
  } catch (error) {
    console.warn("Error calling Gemini API for automation:", error);
    return parseWithHeuristics(prompt);
  }
}

/**
 * Eksekusi Aksi Nyata ke Database & State Aplikasi
 */
export async function executeAiAction(action: ParsedAiAction): Promise<ExecutionResult> {
  const { intent, parameters, summary } = action;

  try {
    // 1. EKSEKUSI TAMBAH BUS
    if (intent === "ADD_BUS") {
      const currentCms = getBiroCmsData();
      const namaPO = parameters.namaPO || "PO Pariwisata";
      const kapasitas = parameters.kapasitas || 50;
      const nopol = parameters.nopol || "";
      const namaDriver = parameters.namaDriver || "Driver Utama";
      const telepon = parameters.telepon || "0812-3456-7890";

      const newBus: RekananBus = {
        id: `bus-ai-${Date.now()}`,
        namaPO,
        kontakPerson: namaDriver,
        telepon,
        alamatGarasi: "Garasi Rekanan",
        catatanArmada: `${kapasitas} Seat • Driver: ${namaDriver}${nopol ? ` • Plat: ${nopol}` : ""}`,
      };

      const updatedBuses = [newBus, ...currentCms.rekananBus];
      saveBiroCmsData({ rekananBus: updatedBuses });

      logCrewActivity({
        kategori: "checklist_armada",
        aksi: "AI Copilot: Tambah Master Armada Bus",
        detail: `AI Automation mendaftarkan armada bus baru: ${namaPO} (${kapasitas} Seat, Driver: ${namaDriver}, Plat: ${nopol})`,
        status: "sukses",
      });

      return {
        success: true,
        actionType: "ADD_BUS",
        message: `✅ Berhasil menambahkan armada bus **${namaPO}** (${kapasitas} Seat) dengan driver **${namaDriver}** ke master rekanan biro!`,
        data: newBus,
        createdId: newBus.id,
        navigationPath: "/pengaturan-biro",
      };
    }

    // 2. EKSEKUSI TAMBAH KRU
    if (intent === "ADD_CREW") {
      const nama = parameters.nama || "Kru Baru";
      const jabatan: CrewJabatan = parameters.jabatan || "Tour Leader";
      const telepon = parameters.telepon || "0812-3456-7890";
      const email = parameters.email || `${nama.toLowerCase().replace(/[^a-z0-9]/g, "")}@kru.biro`;
      const assignedTrip = parameters.assignedTrip || "Standby Operasional";

      // Verifikasi batas kuota kru (Feature Gating)
      const entitlements = getCurrentEntitlements();
      const existingMembers = getCrewMembers();
      if (existingMembers.length >= entitlements.maxCrewAccounts) {
        return {
          success: false,
          actionType: "ADD_CREW",
          message: `⚠️ Gagal menambah kru: Batas kuota akun kru (${entitlements.maxCrewAccounts} akun) untuk paket Anda telah tercapai. Hubungi Founder untuk upgrade kuota kru.`,
        };
      }

      const newMember = await addCrewMemberDB({
        nama,
        jabatan,
        telepon,
        email,
        assignedTrip,
      });

      return {
        success: true,
        actionType: "ADD_CREW",
        message: `✅ Personel kru baru **${nama}** berhasil didaftarkan sebagai **${jabatan}** (Kode Kru: ${newMember.kodeKru})!`,
        data: newMember,
        createdId: newMember.id,
        navigationPath: "/manajemen-kru",
      };
    }

    // 3. EKSEKUSI BUAT TRIP BARU
    if (intent === "CREATE_TRIP") {
      const user = await getActiveUser();
      if (!user) {
        return {
          success: false,
          actionType: "CREATE_TRIP",
          message: "⚠️ Sesi autentikasi tidak ditemukan. Harap login terlebih dahulu.",
        };
      }

      // Verifikasi Kuota Trip Aktif
      const entitlements = getCurrentEntitlements();
      const { count: currentTripCount } = await supabase
        .from("trips")
        .select("*", { count: "exact", head: true });

      if (typeof currentTripCount === "number" && currentTripCount >= entitlements.maxActiveTrips) {
        return {
          success: false,
          actionType: "CREATE_TRIP",
          message: `⚠️ Batas kuota trip aktif (${entitlements.maxActiveTrips} trip) telah tercapai. Tingkatkan paket biro Anda untuk menambah trip.`,
        };
      }

      const namaTrip = parameters.nama_trip || `Trip Wisata ${format(new Date(), "dd MMM")}`;
      const tujuan = parameters.tujuan || "Destinasi Wisata";
      const tanggal = parameters.tanggal || format(new Date(), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("trips")
        .insert({
          nama_trip: namaTrip,
          tujuan,
          tanggal,
          nama_kendaraan: parameters.nama_kendaraan || null,
          nomor_polisi: parameters.nomor_polisi ? parameters.nomor_polisi.toUpperCase() : null,
          nama_driver: parameters.nama_driver || null,
          jumlah_penumpang: parameters.jumlah_penumpang ? parseInt(parameters.jumlah_penumpang, 10) : null,
          budget_estimasi: parameters.budget_estimasi || null,
          catatan: parameters.catatan || "Dibuat otomatis via CatatBiro AI Automation CLI",
          user_id: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      logCrewActivity({
        kategori: "operasional_trip",
        aksi: "AI Copilot: Pembuatan Trip Baru",
        detail: `AI Automation membuat trip baru: "${namaTrip}" ke ${tujuan} (Tanggal: ${tanggal})`,
        tripName: namaTrip,
        status: "penting",
      });

      return {
        success: true,
        actionType: "CREATE_TRIP",
        message: `✅ Jadwal trip baru **${namaTrip}** (Tujuan: ${tujuan}, Tanggal: ${tanggal}) berhasil dibuat dan tersimpan ke database!`,
        createdId: data.id,
        navigationPath: `/trips/${data.id}`,
      };
    }

    // 4. EKSEKUSI CATAT TRANSAKSI KEUANGAN
    if (intent === "ADD_TRANSACTION") {
      const user = await getActiveUser();
      if (!user) {
        return {
          success: false,
          actionType: "ADD_TRANSACTION",
          message: "⚠️ Sesi autentikasi tidak ditemukan. Harap login terlebih dahulu.",
        };
      }

      const jenis = parameters.jenis === "pemasukan" ? "pemasukan" : "pengeluaran";
      const jumlah = Number(parameters.jumlah) || 0;
      const keterangan = parameters.keterangan || "Transaksi Lapangan via AI Automation";

      // Ambil trip aktif jika ada
      const activeTripId = localStorage.getItem("active_trip_id") || null;

      const { data, error } = await supabase
        .from("keuangan")
        .insert({
          user_id: user.id,
          trip_id: activeTripId,
          jenis,
          jumlah,
          keterangan,
        })
        .select("id")
        .single();

      if (error) throw error;

      logCrewActivity({
        kategori: "keuangan_lapangan",
        aksi: `AI Copilot: Catat ${jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran"}`,
        detail: `AI mencatat transaksi ${jenis} sebesar Rp ${jumlah.toLocaleString("id-ID")} (${keterangan})`,
        status: "sukses",
      });

      return {
        success: true,
        actionType: "ADD_TRANSACTION",
        message: `✅ Catatan ${jenis} sebesar **Rp ${jumlah.toLocaleString("id-ID")}** (${keterangan}) telah berhasil disimpan ke buku kas!`,
        createdId: data?.id,
        navigationPath: "/keuangan",
      };
    }

    // 5. QUERY DATA REALTIME
    if (intent === "QUERY_DATA") {
      const members = getCrewMembers();
      const cms = getBiroCmsData();
      const entitlements = getCurrentEntitlements();

      const { count: tripCount } = await supabase
        .from("trips")
        .select("*", { count: "exact", head: true });

      const reply = [
        `📊 **Status Real-Time Biro Wisata:**`,
        `• **Jadwal Trip Aktif:** ${tripCount ?? 0} dari kuota ${entitlements.maxActiveTrips} trip`,
        `• **Personel Kru Terdaftar:** ${members.length} dari kuota ${entitlements.maxCrewAccounts} akun`,
        `• **Armada Bus Rekanan:** ${cms.rekananBus.length} unit bus terdata`,
        `• **Paket Lisensi:** ${entitlements.tierName} (${entitlements.isLifetime ? "Sekali Bayar / Lifetime" : "Langganan"})`,
        `• **Mode Desktop:** ${entitlements.allowDesktopMode ? "Aktif (Bisa Buka PC)" : "Mobile Only"}`,
      ].join("\n");

      return {
        success: true,
        actionType: "QUERY_DATA",
        message: reply,
      };
    }

    // HELP / DEFAULT
    return {
      success: true,
      actionType: "HELP",
      message:
        "💡 **Contoh Perintah yang Bisa Anda Ketik:**\n\n" +
        "1. `tambah bus PO Subur Jaya SHD plat H 1234 AB kapasitas 50 seat driver Pak Budi`\n" +
        "2. `tambah kru Mas Joko role Tour Leader nomor 0852345678`\n" +
        "3. `buat trip Study Tour SMPN 1 ke Bali tanggal 2026-12-15`\n" +
        "4. `catat pengeluaran isi bensin solar bus 650rb`\n" +
        "5. `cek status kuota dan kru aktif biro saya`",
    };
  } catch (error: any) {
    console.error("Error executing AI action:", error);
    return {
      success: false,
      actionType: intent,
      message: `❌ Terjadi kesalahan saat mengeksekusi perintah: ${error?.message || "Kesalahan database"}`,
    };
  }
}
