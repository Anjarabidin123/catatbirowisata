/**
 * aiAutomationEngine.ts
 * Conversational Rule-Based Dialog Engine & State Machine (FSM)
 * 
 * Karakteristik Arsitektur:
 * 1. ZERO TOKEN & GRATIS SELAMANYA: Berjalan 100% lokal di browser tanpa menguras kuota Google Gemini.
 * 2. STEP-BY-STEP GUIDED WIZARD:
 *    - Tambah Trip: Nama Trip -> Tanggal -> Tujuan -> Jumlah Bus -> Merek Bus (skip/ga) -> Pilih TL Biro -> Konfirmasi.
 *    - Tambah Bus: Nama PO -> Plat Polisi -> Kapasitas Seat -> Driver -> Telepon -> Konfirmasi.
 *    - Tambah Kru: Nama Kru -> Jabatan -> Telepon -> Konfirmasi.
 *    - Catat Kas: Pilih Trip -> Jenis -> Nominal -> Keterangan -> Konfirmasi.
 * 3. DILENGKAPI TOMBOL PILIHAN INTERAKTIF (Options Pills): Pengguna bisa langsung KLIK tanpa harus mengetik panjang.
 * 4. HYBRID FALLBACK: Gemini API hanya dipanggil jika pengguna mengajukan pertanyaan bebas di luar menu wizard.
 */

import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { getBiroCmsData, saveBiroCmsData, RekananBus } from "@/utils/biroCmsStore";
import { addCrewMemberDB, getCrewMembers, CrewJabatan, logCrewActivity, assignTripToMultipleCrewDB } from "@/utils/rbacAuditLogger";
import { getCurrentEntitlements } from "@/utils/licenseEntitlement";
import { getStoredApiKey } from "@/utils/asistenWisataAI";
import { format } from "date-fns";

export type WizardType = "TRIP_WIZARD" | "BUS_WIZARD" | "CREW_WIZARD" | "EXPENSE_WIZARD" | "NONE";

export interface DialogResponse {
  botMessage: string;
  options?: string[]; // Tombol opsi klik cepat untuk user
  isComplete?: boolean;
  actionType?: string;
  navigationPath?: string;
  wizardType?: WizardType;
  stepIndex?: number;
  totalSteps?: number;
}

// In-Memory Session State untuk Dialog Wizard
interface WizardDraft {
  wizardType: WizardType;
  step: number;
  data: Record<string, any>;
}

let activeDraft: WizardDraft = {
  wizardType: "NONE",
  step: 0,
  data: {},
};

export const getActiveWizardState = (): WizardDraft => activeDraft;

export const resetWizard = (): void => {
  activeDraft = {
    wizardType: "NONE",
    step: 0,
    data: {},
  };
};

/**
 * Smart Date Parser Lokal untuk Bahasa Indonesia (Bulan, Hari, Rentang)
 * Contoh: "15-18 Desember 2026", "25 Okt 2026", "15/12/2026", "besok", "lusa"
 */
export function parseIndonesianDateRange(input: string): { start: string; end?: string; display: string } {
  const text = input.trim();
  const lower = text.toLowerCase();
  const currentYear = new Date().getFullYear();

  if (lower === "besok" || lower.includes("besok")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const iso = format(d, "yyyy-MM-dd");
    return { start: iso, display: format(d, "dd MMMM yyyy") };
  }
  if (lower === "lusa" || lower.includes("lusa")) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    const iso = format(d, "yyyy-MM-dd");
    return { start: iso, display: format(d, "dd MMMM yyyy") };
  }

  // Regex ISO: 2026-12-15
  const isoMatch = text.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})/);
  if (isoMatch) {
    return { start: isoMatch[0], display: isoMatch[0] };
  }

  // Peta Nama Bulan
  const monthMap: Record<string, string> = {
    jan: "01", januari: "01",
    feb: "02", februari: "02",
    mar: "03", maret: "03",
    apr: "04", april: "04",
    mei: "05",
    jun: "06", juni: "06",
    jul: "07", juli: "07",
    agu: "08", agustus: "08", ags: "08",
    sep: "09", september: "09",
    okt: "10", oktober: "10",
    nov: "11", november: "11",
    des: "12", desember: "12",
  };

  // Rentang: "15-18 Desember 2026" atau "15 s/d 18 Desember 2026"
  const rangeMatch = text.match(/([0-9]{1,2})\s*(?:-|s\/d|sampai)\s*([0-9]{1,2})\s+([A-Za-z]+)(?:\s+([0-9]{4}))?/i);
  if (rangeMatch) {
    const d1 = rangeMatch[1].padStart(2, "0");
    const d2 = rangeMatch[2].padStart(2, "0");
    const mStr = rangeMatch[3].toLowerCase();
    const yStr = rangeMatch[4] || String(currentYear);
    const mNum = monthMap[mStr] || "12";

    const startIso = `${yStr}-${mNum}-${d1}`;
    const endIso = `${yStr}-${mNum}-${d2}`;
    return {
      start: startIso,
      end: endIso,
      display: `${d1} s/d ${d2} ${rangeMatch[3]} ${yStr}`,
    };
  }

  // Tanggal tunggal: "15 Desember 2026" atau "15 Des"
  const singleMatch = text.match(/([0-9]{1,2})\s+([A-Za-z]+)(?:\s+([0-9]{4}))?/i);
  if (singleMatch) {
    const d = singleMatch[1].padStart(2, "0");
    const mStr = singleMatch[2].toLowerCase();
    const yStr = singleMatch[3] || String(currentYear);
    const mNum = monthMap[mStr] || "12";
    const iso = `${yStr}-${mNum}-${d}`;
    return {
      start: iso,
      display: `${d} ${singleMatch[2]} ${yStr}`,
    };
  }

  // Default: tanggal hari ini
  const todayIso = format(new Date(), "yyyy-MM-dd");
  return { start: todayIso, display: text || todayIso };
}

/**
 * Engine Utama Dialog Wizard FSM (Finite State Machine)
 * Memandu proses langkah demi langkah tanpa mengonsumsi API token.
 */
export async function processConversationalMessage(rawInput: string): Promise<DialogResponse> {
  const text = rawInput.trim();
  const lower = text.toLowerCase();

  // 1. CEK PERINTAH BATAL GLOBAL
  if (lower === "batal" || lower === "cancel" || lower === "keluar" || lower.includes("batal")) {
    resetWizard();
    return {
      botMessage: "❌ **Sesi automasi telah dibatalkan.** Ada keperluan operasional lain yang bisa saya bantu?",
      options: [
        "📅 Buat Trip Baru",
        "🚌 Tambah Bus",
        "👤 Daftarkan Kru",
        "💰 Catat Kas Operasional",
        "📊 Cek Kuota & Kru",
      ],
      wizardType: "NONE",
    };
  }

  // =========================================================================
  // JIKA SEDANG BERADA DALAM WIZARD AKTIF
  // =========================================================================

  // A. WIZARD TAMBAH TRIP
  if (activeDraft.wizardType === "TRIP_WIZARD") {
    return handleTripWizardStep(text);
  }

  // B. WIZARD TAMBAH BUS
  if (activeDraft.wizardType === "BUS_WIZARD") {
    return handleBusWizardStep(text);
  }

  // C. WIZARD TAMBAH KRU
  if (activeDraft.wizardType === "CREW_WIZARD") {
    return handleCrewWizardStep(text);
  }

  // D. WIZARD CATAT TRANSAKSI / KAS
  if (activeDraft.wizardType === "EXPENSE_WIZARD") {
    return handleExpenseWizardStep(text);
  }

  // =========================================================================
  // JIKA WIZARD BELUM AKTIF (IDLE) -> DETEKSI INTENT AWAL
  // =========================================================================

  // 1. INISIASI: BUAT TRIP
  if (
    lower.includes("buat trip") ||
    lower.includes("tambah trip") ||
    lower.includes("jadwalkan trip") ||
    lower.includes("trip baru")
  ) {
    activeDraft = {
      wizardType: "TRIP_WIZARD",
      step: 1,
      data: {},
    };

    // Ekstrak pre-fill jika user sudah mengetik sebagian info di awal
    let initialHint = "";
    const nameMatch = text.match(/(?:nama|trip|rombongan|paket)\s+([A-Za-z0-9\s\-]+?)(?=\s+(?:ke|tujuan|tanggal|tgl|$))/i);
    if (nameMatch && nameMatch[1].trim()) {
      activeDraft.data.nama_trip = nameMatch[1].trim();
      activeDraft.step = 2; // Langsung ke langkah tanggal
      initialHint = `Nama rombongan telah dicatat: **${activeDraft.data.nama_trip}**.\n\n`;
      return {
        botMessage:
          `${initialHint}📅 **Langkah 2 dari 6: Tanggal Keberangkatan**\n\n` +
          "Kapan **tanggal keberangkatan / rentang tripnya?**\n" +
          "*(Bisa rentang seperti `15-18 Desember 2026`, atau tanggal tunggal)*",
        options: ["15-18 Desember 2026", "25-28 Oktober 2026", "Besok Pagi", "❌ Batal"],
        wizardType: "TRIP_WIZARD",
        stepIndex: 2,
        totalSteps: 6,
      };
    }

    return {
      botMessage:
        "📋 **Panduan Pembuatan Jadwal Trip Baru (Langkah 1 dari 6)**\n\n" +
        "Mari kita isi detailnya satu per satu layaknya asisten pribadi.\n\n" +
        "Pertama, **apa nama acara / rombongannya?**\n" +
        "*(Contoh: Study Tour SMPN 1 Kudus, Gathering PT Maju Jaya, Ziarah Wali)*",
      options: [
        "Study Tour SMPN 1 Kudus",
        "Gathering Perusahaan",
        "Ziarah Wali Songo",
        "Family Tour Jogja",
        "❌ Batal",
      ],
      wizardType: "TRIP_WIZARD",
      stepIndex: 1,
      totalSteps: 6,
    };
  }

  // 2. INISIASI: TAMBAH BUS
  if (
    lower.includes("tambah bus") ||
    lower.includes("tambahkan bus") ||
    lower.includes("buat bus") ||
    lower.includes("armada bus")
  ) {
    activeDraft = {
      wizardType: "BUS_WIZARD",
      step: 1,
      data: {},
    };

    return {
      botMessage:
        "🚌 **Registrasi Master Armada Bus (Langkah 1 dari 5)**\n\n" +
        "Apa **Nama PO Bus / Perusahaan Otobus** yang ingin didaftarkan ke katalog rekanan biro?\n" +
        "*(Contoh: PO Subur Jaya, PO Haryanto, PO Shantika)*",
      options: ["PO Subur Jaya", "PO Haryanto Pariwisata", "PO Shantika", "PO Nusantara", "❌ Batal"],
      wizardType: "BUS_WIZARD",
      stepIndex: 1,
      totalSteps: 5,
    };
  }

  // 3. INISIASI: TAMBAH KRU
  if (
    lower.includes("tambah kru") ||
    lower.includes("tambahkan kru") ||
    lower.includes("daftar kru") ||
    lower.includes("tambah driver") ||
    lower.includes("tambah tour leader") ||
    lower.includes("tambah tl")
  ) {
    activeDraft = {
      wizardType: "CREW_WIZARD",
      step: 1,
      data: {},
    };

    return {
      botMessage:
        "👤 **Pendaftaran Personel Kru Baru (Langkah 1 dari 3)**\n\n" +
        "Siapa **nama lengkap kru** yang ingin didaftarkan ke sistem biro?\n" +
        "*(Contoh: Mas Danang, Slamet Riyadi, Rina Wulandari)*",
      options: ["Budi Santoso", "Slamet Riyadi", "Rina Wulandari", "Mas Joko", "❌ Batal"],
      wizardType: "CREW_WIZARD",
      stepIndex: 1,
      totalSteps: 3,
    };
  }

  // 4. INISIASI: CATAT KAS / PENGELUARAN
  if (
    lower.includes("catat pengeluaran") ||
    lower.includes("catat biaya") ||
    lower.includes("catat kas") ||
    lower.includes("kas operasional") ||
    lower.includes("pengeluaran operasional") ||
    lower.includes("beli bensin") ||
    lower.includes("isi bbm") ||
    lower.includes("bayar tol") ||
    lower.includes("pemasukan") ||
    lower.includes("terima dp")
  ) {
    activeDraft = {
      wizardType: "EXPENSE_WIZARD",
      step: 1,
      data: {
        jenis: lower.includes("pemasukan") || lower.includes("dp") ? "pemasukan" : "pengeluaran",
      },
    };

    // Ambil daftar trip aktif milik user untuk dijadikan opsi tombol
    const user = await getActiveUser();
    let tripQuery = supabase
      .from("trips")
      .select("id, nama_trip")
      .order("tanggal", { ascending: false });

    if (user?.id) {
      tripQuery = tripQuery.eq("user_id", user.id);
    }
    const { data: recentTrips } = await tripQuery.limit(5);

    const tripOptions = (recentTrips || []).map((t) => `📍 ${t.nama_trip}`);
    tripOptions.push("🏢 Kas Umum / Kantor", "❌ Batal");

    return {
      botMessage:
        "💰 **Pencatatan Keuangan / Buku Kas (Langkah 1 dari 4)**\n\n" +
        "Transaksi ini dialokasikan untuk **trip mana?**\n" +
        "*(Pilih dari jadwal trip biro Anda di bawah ini)*",
      options: tripOptions,
      wizardType: "EXPENSE_WIZARD",
      stepIndex: 1,
      totalSteps: 4,
    };
  }

  // 5. QUERY INFORMASI STATUS / KUOTA
  if (
    lower.includes("status") ||
    lower.includes("berapa") ||
    lower.includes("kuota") ||
    lower.includes("kru aktif") ||
    lower.includes("ringkasan")
  ) {
    const members = getCrewMembers();
    const cms = getBiroCmsData();
    const entitlements = getCurrentEntitlements();
    const { count: tripCount } = await supabase.from("trips").select("*", { count: "exact", head: true });

    return {
      botMessage:
        `📊 **Ringkasan Real-Time Biro Wisata:**\n\n` +
        `• **Jadwal Trip Aktif:** ${tripCount ?? 0} dari kuota ${entitlements.maxActiveTrips} trip\n` +
        `• **Personel Kru Terdaftar:** ${members.length} dari kuota ${entitlements.maxCrewAccounts} akun\n` +
        `• **Katalog Armada Bus:** ${cms.rekananBus.length} unit bus terdaftar\n` +
        `• **Paket Lisensi:** ${entitlements.tierName} (${entitlements.isLifetime ? "Sekali Bayar / Lifetime" : "Langganan"})\n` +
        `• **Mode Desktop PC:** ${entitlements.allowDesktopMode ? "Aktif (Layar Bento Terbuka)" : "Mobile Only"}\n\n` +
        `Ingin menjalankan perintah apa sekarang?`,
      options: [
        "📅 Buat Trip Baru",
        "🚌 Tambah Bus",
        "👤 Daftarkan Kru",
        "💰 Catat Kas Operasional",
      ],
      wizardType: "NONE",
    };
  }

  // DEFAULT FALLBACK MENU
  return {
    botMessage:
      "👋 Halo! Saya **Asisten Pribadi Otomasi CatatBiro** (Zero Token Engine).\n\n" +
      "Silakan pilih aksi atau ketik perintah yang ingin Anda jalankan secara terpandu:",
    options: [
      "📅 Buat Trip Baru",
      "🚌 Tambah Bus",
      "👤 Daftarkan Kru",
      "💰 Catat Kas Operasional",
      "📊 Cek Kuota & Kru",
    ],
    wizardType: "NONE",
  };
}

// =========================================================================
// HANDLER SUB-STEP WIZARD
// =========================================================================

/**
 * A. WIZARD TAMBAH TRIP STEP-BY-STEP
 */
async function handleTripWizardStep(input: string): Promise<DialogResponse> {
  const lower = input.toLowerCase();
  const isSkip = lower === "skip" || lower === "ga" || lower === "lewati" || lower === "tidak" || lower === "nanti";

  // Langkah 1: Input Nama Trip
  if (activeDraft.step === 1) {
    activeDraft.data.nama_trip = input.trim();
    activeDraft.step = 2;

    return {
      botMessage:
        `✅ Nama rombongan dicatat: **${input.trim()}**\n\n` +
        "📅 **Langkah 2 dari 6: Tanggal Pelaksanaan**\n\n" +
        "Kapan **tanggal keberangkatan atau rentang perjalanannya?**\n" +
        "*(Contoh: `15-18 Desember 2026`, `25 Okt 2026`, atau `Besok Pagi`)*",
      options: ["15-18 Desember 2026", "25-28 Oktober 2026", "Besok Pagi", "❌ Batal"],
      wizardType: "TRIP_WIZARD",
      stepIndex: 2,
      totalSteps: 6,
    };
  }

  // Langkah 2: Input Tanggal
  if (activeDraft.step === 2) {
    const parsedDate = parseIndonesianDateRange(input);
    activeDraft.data.tanggal = parsedDate.start;
    activeDraft.data.tanggal_selesai = parsedDate.end || null;
    activeDraft.data.tanggal_display = parsedDate.display;
    activeDraft.step = 3;

    return {
      botMessage:
        `✅ Tanggal keberangkatan: **${parsedDate.display}**\n\n` +
        "📍 **Langkah 3 dari 6: Destinasi / Kota Tujuan**\n\n" +
        "Rombongan ini **tujuannya ke mana?**\n" +
        "*(Contoh: Bali, Yogyakarta, Malang & Bromo, Bandung)*",
      options: ["Bali", "Yogyakarta", "Malang & Bromo", "Bandung", "Dieng", "❌ Batal"],
      wizardType: "TRIP_WIZARD",
      stepIndex: 3,
      totalSteps: 6,
    };
  }

  // Langkah 3: Input Tujuan
  if (activeDraft.step === 3) {
    activeDraft.data.tujuan = input.trim();
    activeDraft.step = 4;

    return {
      botMessage:
        `✅ Destinasi tujuan: **${input.trim()}**\n\n` +
        "🚌 **Langkah 4 dari 6: Jumlah Armada Bus**\n\n" +
        "Rombongan ini berencana **membawa berapa unit bus?**\n" +
        "*(Pilih atau ketik angka jumlah bus, contoh: 1, 2, atau 3)*",
      options: ["1 Bus", "2 Bus", "3 Bus", "4 Bus", "5+ Bus", "❌ Batal"],
      wizardType: "TRIP_WIZARD",
      stepIndex: 4,
      totalSteps: 6,
    };
  }

  // Langkah 4: Input Jumlah Bus
  if (activeDraft.step === 4) {
    const busNum = parseInt(input.replace(/[^0-9]/g, ""), 10) || 1;
    activeDraft.data.jumlah_bus = busNum;
    activeDraft.step = 5;

    // Ambil master PO Bus rekanan biro untuk opsi cepat
    const cmsData = getBiroCmsData();
    const poOptions = cmsData.rekananBus.map((b) => b.namaPO).slice(0, 4);
    poOptions.push("⏩ Lewati / ga", "❌ Batal");

    return {
      botMessage:
        `✅ Jumlah armada: **${busNum} Unit Bus**\n\n` +
        "🏷️ **Langkah 5 dari 6: Merek / PO Bus (Opsional)**\n\n" +
        "Merek atau PO Bus apa yang digunakan?\n" +
        "*(Pilih PO rekanan biro di bawah, ketik nama PO, atau ketik **ga** / **skip** jika belum ditentukan)*",
      options: poOptions,
      wizardType: "TRIP_WIZARD",
      stepIndex: 5,
      totalSteps: 6,
    };
  }

  // Langkah 5: Input Merek / PO Bus (Bisa "ga" / "skip")
  if (activeDraft.step === 5) {
    if (isSkip) {
      activeDraft.data.po_bus = null;
    } else {
      activeDraft.data.po_bus = input.replace(/^(po|bus)\s*/i, "PO ").trim();
    }
    activeDraft.step = 6;
    activeDraft.data.selectedCrewIds = [];
    activeDraft.data.selectedCrewNames = [];

    // Ambil daftar kru / Tour Leader terdaftar untuk opsi tombol
    const members = getCrewMembers();
    const tlOptions = members
      .filter((m) => m.status !== "nonaktif")
      .map((m) => `👤 ${m.nama} (${m.jabatan})`);
    tlOptions.push("⏩ Lewati / skip", "❌ Batal");

    return {
      botMessage:
        `✅ PO Bus: **${activeDraft.data.po_bus || "Belum ditentukan (Dilewati)"}**\n\n` +
        "👤 **Langkah 6 dari 6: Tour Leader (TL) / Kru yang Bertugas**\n\n" +
        "Siapa **Tour Leader (TL) / Kru yang bertugas?** *(Bisa pilih lebih dari 1 orang)*\n\n" +
        "*(Silakan klik nama kru di bawah ini, atau ketik **skip** jika belum ditentukan)*",
      options: tlOptions,
      wizardType: "TRIP_WIZARD",
      stepIndex: 6,
      totalSteps: 6,
    };
  }

  // Langkah 6: Input TL / Kru yang bertugas -> Multi-TL Selection & Ringkasan
  if (activeDraft.step === 6) {
    if (!Array.isArray(activeDraft.data.selectedCrewIds)) {
      activeDraft.data.selectedCrewIds = [];
    }
    if (!Array.isArray(activeDraft.data.selectedCrewNames)) {
      activeDraft.data.selectedCrewNames = [];
    }

    const isFinish =
      lower === "selesai" ||
      lower === "lanjut" ||
      lower.includes("selesai");

    if (isFinish) {
      activeDraft.data.tl_crew =
        activeDraft.data.selectedCrewNames.length > 0
          ? activeDraft.data.selectedCrewNames.join(", ")
          : null;
      activeDraft.step = 7;
    } else if (isSkip) {
      if (activeDraft.data.selectedCrewNames.length > 0) {
        activeDraft.data.tl_crew = activeDraft.data.selectedCrewNames.join(", ");
      } else {
        activeDraft.data.tl_crew = null;
        activeDraft.data.selectedCrewIds = [];
        activeDraft.data.selectedCrewNames = [];
      }
      activeDraft.step = 7;
    } else {
      // Input nama kru (bisa via tombol atau ketikan dengan koma, dan, &)
      const rawTokens = input
        .split(/[,&]|(?:\s+dan\s+)/i)
        .map((t) => t.replace(/^[👤+\s]+/, "").trim())
        .filter(Boolean);

      const members = getCrewMembers().filter((m) => m.status !== "nonaktif");

      for (const raw of rawTokens) {
        const cleanName = raw.split("(")[0].trim().toLowerCase();
        if (!cleanName) continue;

        const matched = members.find(
          (m) =>
            m.nama.toLowerCase().includes(cleanName) ||
            cleanName.includes(m.nama.toLowerCase())
        );

        if (matched) {
          if (!activeDraft.data.selectedCrewIds.includes(matched.id)) {
            activeDraft.data.selectedCrewIds.push(matched.id);
            activeDraft.data.selectedCrewNames.push(`${matched.nama} (${matched.jabatan})`);
          }
        } else {
          const customName = raw.split("(")[0].trim();
          if (customName && !activeDraft.data.selectedCrewNames.includes(customName)) {
            activeDraft.data.selectedCrewNames.push(customName);
          }
        }
      }

      // Tetap di Step 6: Tampilkan TL yang sudah dipilih dan sisa TL yang belum dipilih
      const unselectedMembers = members.filter(
        (m) => !activeDraft.data.selectedCrewIds.includes(m.id)
      );

      const options: string[] = ["✅ Selesai Pilih TL & Lanjut"];
      unselectedMembers.forEach((m) => {
        options.push(`👤 + ${m.nama} (${m.jabatan})`);
      });
      options.push("❌ Batal");

      const selectedListStr =
        activeDraft.data.selectedCrewNames.length > 0
          ? activeDraft.data.selectedCrewNames
              .map((name: string, i: number) => `${i + 1}. **${name}**`)
              .join("\n")
          : "_Belum ada kru yang dipilih_";

      return {
        botMessage:
          `✅ **Personel TL / Kru yang Dipilih (${activeDraft.data.selectedCrewNames.length}):**\n` +
          `${selectedListStr}\n\n` +
          `Klik tombol kru di bawah untuk menambah lagi, atau klik **"Selesai Pilih TL & Lanjut"** jika sudah cukup:`,
        options,
        wizardType: "TRIP_WIZARD",
        stepIndex: 6,
        totalSteps: 6,
      };
    }

    // Masuk ke Step 7: Tampilkan ringkasan final
    const summaryText =
      "📋 **Ringkasan Jadwal Trip Baru:**\n" +
      `• **Nama Acara:** ${activeDraft.data.nama_trip}\n` +
      `• **Tujuan:** ${activeDraft.data.tujuan}\n` +
      `• **Tanggal:** ${activeDraft.data.tanggal_display}\n` +
      `• **Jumlah Armada:** ${activeDraft.data.jumlah_bus} Unit Bus\n` +
      `• **Merek / PO Bus:** ${activeDraft.data.po_bus || "Belum ditentukan (Bisa diatur nanti)"}\n` +
      `• Personel TL / Kru (${activeDraft.data.selectedCrewNames?.length || 0}): ${activeDraft.data.tl_crew || "Belum ditugaskan"}\n\n` +
      "Apakah data di atas sudah benar dan siap disimpan ke sistem?";

    return {
      botMessage: summaryText,
      options: ["✅ Ya, Simpan ke Database", "❌ Batal"],
      wizardType: "TRIP_WIZARD",
      stepIndex: 7,
      totalSteps: 6,
    };
  }

  // Langkah 7: Eksekusi Final Simpan Trip ke Supabase
  if (activeDraft.step === 7) {
    if (lower.includes("ya") || lower.includes("simpan") || lower.includes("buat") || lower.includes("oke")) {
      const user = await getActiveUser();
      if (!user) {
        resetWizard();
        return {
          botMessage: "⚠️ Sesi autentikasi telah berakhir. Harap login kembali terlebih dahulu.",
          wizardType: "NONE",
        };
      }

      // Verifikasi Kuota Trip Aktif
      const entitlements = getCurrentEntitlements();
      const { count: currentTripCount } = await supabase
        .from("trips")
        .select("*", { count: "exact", head: true });

      if (typeof currentTripCount === "number" && currentTripCount >= entitlements.maxActiveTrips) {
        resetWizard();
        return {
          botMessage: `⚠️ Batas kuota trip aktif (${entitlements.maxActiveTrips} trip) untuk paket Anda telah tercapai. Hubungi Founder untuk upgrade kuota.`,
          wizardType: "NONE",
        };
      }

      const vehicleName = activeDraft.data.po_bus
        ? `${activeDraft.data.jumlah_bus} Bus • ${activeDraft.data.po_bus}`
        : `${activeDraft.data.jumlah_bus} Bus`;

      const { data, error } = await supabase
        .from("trips")
        .insert({
          nama_trip: activeDraft.data.nama_trip,
          tujuan: activeDraft.data.tujuan,
          tanggal: activeDraft.data.tanggal,
          tanggal_selesai: activeDraft.data.tanggal_selesai || null,
          nama_kendaraan: vehicleName,
          nama_driver: activeDraft.data.tl_crew || null,
          catatan: `Armada: ${activeDraft.data.jumlah_bus} Bus. Dibuat via Asisten Pribadi Otomasi CatatBiro.`,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (error) {
        resetWizard();
        return {
          botMessage: `❌ Gagal menyimpan trip ke database: ${error.message}`,
          wizardType: "NONE",
        };
      }

      // Jika ada TL yang dipilih, tugaskan langsung
      if (data && activeDraft.data.selectedCrewIds && activeDraft.data.selectedCrewIds.length > 0) {
        await assignTripToMultipleCrewDB(data.id, activeDraft.data.nama_trip, activeDraft.data.selectedCrewIds);
      }

      logCrewActivity({
        kategori: "operasional_trip",
        aksi: "Asisten AI: Buat Jadwal Trip Baru",
        detail: `Trip "${activeDraft.data.nama_trip}" (${activeDraft.data.jumlah_bus} Bus) ke ${activeDraft.data.tujuan} berhasil dibuat`,
        tripName: activeDraft.data.nama_trip,
        status: "penting",
      });

      const tripId = data.id;
      resetWizard();

      return {
        botMessage:
          `🎉 **Alhamdulillah! Jadwal trip berhasil dibuat.**\n\n` +
          `• ID Trip: \`${tripId.substring(0, 8)}...\`\n` +
          `• Status: Siap diberangkatkan & dikelola di kalender.\n\n` +
          `Klik tombol **"Lihat Hasil"** di bawah untuk langsung membuka rincian trip, denah kursi, dan rundown!`,
        isComplete: true,
        actionType: "CREATE_TRIP",
        navigationPath: `/trips/${tripId}`,
        options: ["📅 Buat Trip Lainnya", "💰 Catat Kas Operasional", "🏠 Kembali ke Beranda"],
        wizardType: "NONE",
      };
    }

    // Jika ragu atau ingin membatalkan
    resetWizard();
    return {
      botMessage: "❌ Pembuatan trip dibatalkan. Data draf telah dihapus. Ada hal lain yang bisa saya bantu?",
      options: ["📅 Buat Trip Baru", "🚌 Tambah Bus", "👤 Daftarkan Kru"],
      wizardType: "NONE",
    };
  }

  return {
    botMessage: "Instruksi tidak dikenali. Ketik 'batal' untuk membatalkan proses wizard.",
    options: ["❌ Batal"],
  };
}

/**
 * B. WIZARD TAMBAH BUS STEP-BY-STEP
 */
async function handleBusWizardStep(input: string): Promise<DialogResponse> {
  const lower = input.toLowerCase();
  const isSkip = lower === "skip" || lower === "ga" || lower === "lewati" || lower === "tidak";

  // Langkah 1: Input Nama PO Bus
  if (activeDraft.step === 1) {
    activeDraft.data.namaPO = input.trim().replace(/^(po|bus)\s*/i, "PO ");
    activeDraft.step = 2;

    return {
      botMessage:
        `✅ PO Bus: **${activeDraft.data.namaPO}**\n\n` +
        "🔢 **Langkah 2 dari 5: Nomor Plat Polisi (Opsional)**\n\n" +
        "Berapa nomor plat polisi armada ini? *(Ketik contoh `H 1234 AB`, atau ketik **ga** / **skip** jika belum ada)*",
      options: ["H 1234 AB", "B 7788 XYZ", "AD 9900 CD", "⏩ Lewati / ga", "❌ Batal"],
      wizardType: "BUS_WIZARD",
      stepIndex: 2,
      totalSteps: 5,
    };
  }

  // Langkah 2: Input Plat Polisi
  if (activeDraft.step === 2) {
    activeDraft.data.nopol = isSkip ? "" : input.trim().toUpperCase();
    activeDraft.step = 3;

    return {
      botMessage:
        `✅ Plat polisi: **${activeDraft.data.nopol || "Dilewati"}**\n\n` +
        "🪑 **Langkah 3 dari 5: Kapasitas Kursi (Seat)**\n\n" +
        "Berapa kapasitas kursi penumpang bus ini?",
      options: ["50 Seat (Big Bus)", "48 Seat (SHD)", "35 Seat (Medium)", "14 Seat (HiAce)", "❌ Batal"],
      wizardType: "BUS_WIZARD",
      stepIndex: 3,
      totalSteps: 5,
    };
  }

  // Langkah 3: Input Kapasitas Kursi
  if (activeDraft.step === 3) {
    const seatNum = parseInt(input.replace(/[^0-9]/g, ""), 10) || 50;
    activeDraft.data.kapasitas = seatNum;
    activeDraft.step = 4;

    return {
      botMessage:
        `✅ Kapasitas: **${seatNum} Seat**\n\n` +
        "👨‍✈️ **Langkah 4 dari 5: Nama Driver / Sopir (Opsional)**\n\n" +
        "Siapa nama driver yang membawa bus ini? *(Ketik nama, atau ketik **skip** jika belum tahu)*",
      options: ["Pak Budi", "Pak Slamet", "Pak Joko", "⏩ Lewati / skip", "❌ Batal"],
      wizardType: "BUS_WIZARD",
      stepIndex: 4,
      totalSteps: 5,
    };
  }

  // Langkah 4: Input Nama Driver
  if (activeDraft.step === 4) {
    activeDraft.data.driver = isSkip ? "Driver Utama" : input.trim();
    activeDraft.step = 5;

    return {
      botMessage:
        `✅ Driver: **${activeDraft.data.driver}**\n\n` +
        "📞 **Langkah 5 dari 5: Nomor Kontak / WhatsApp (Opsional)**\n\n" +
        "Berapa nomor HP driver / pengurus PO bus? *(Contoh `0812345678`, atau ketik **skip**)*",
      options: ["0812-3456-7890", "⏩ Lewati / skip", "❌ Batal"],
      wizardType: "BUS_WIZARD",
      stepIndex: 5,
      totalSteps: 5,
    };
  }

  // Langkah 5: Input Kontak & Konfirmasi
  if (activeDraft.step === 5) {
    activeDraft.data.telepon = isSkip ? "0812-0000-0000" : input.trim();
    activeDraft.step = 6;

    const summary =
      "📋 **Ringkasan Master Bus Baru:**\n" +
      `• **Nama PO:** ${activeDraft.data.namaPO}\n` +
      `• **Plat Polisi:** ${activeDraft.data.nopol || "Belum ada plat"}\n` +
      `• **Kapasitas:** ${activeDraft.data.kapasitas} Seat\n` +
      `• **Driver Utama:** ${activeDraft.data.driver}\n` +
      `• **Kontak Person:** ${activeDraft.data.telepon}\n\n` +
      "Simpan armada ini ke katalog rekanan biro?";

    return {
      botMessage: summary,
      options: ["✅ Ya, Simpan Bus", "❌ Batal"],
      wizardType: "BUS_WIZARD",
      stepIndex: 6,
      totalSteps: 5,
    };
  }

  // Langkah 6: Eksekusi Simpan Bus
  if (activeDraft.step === 6) {
    if (lower.includes("ya") || lower.includes("simpan") || lower.includes("buat")) {
      const currentCms = getBiroCmsData();
      const newBus: RekananBus = {
        id: `bus-fsm-${Date.now()}`,
        namaPO: activeDraft.data.namaPO,
        kontakPerson: activeDraft.data.driver,
        telepon: activeDraft.data.telepon,
        alamatGarasi: "Garasi Rekanan",
        catatanArmada: `${activeDraft.data.kapasitas} Seat • Driver: ${activeDraft.data.driver}${
          activeDraft.data.nopol ? ` • Plat: ${activeDraft.data.nopol}` : ""
        }`,
      };

      const updated = [newBus, ...currentCms.rekananBus];
      saveBiroCmsData({ rekananBus: updated });

      logCrewActivity({
        kategori: "checklist_armada",
        aksi: "Asisten AI: Tambah Master Armada Bus",
        detail: `Menambahkan bus baru: ${newBus.namaPO} (${newBus.catatanArmada})`,
        status: "sukses",
      });

      resetWizard();
      return {
        botMessage: `🎉 **Bus ${newBus.namaPO} (${activeDraft.data.kapasitas} Seat) berhasil disimpan!** Armada ini sekarang sudah muncul di katalog rekanan biro.`,
        isComplete: true,
        actionType: "ADD_BUS",
        navigationPath: "/pengaturan-biro",
        options: ["🚌 Tambah Bus Lain", "📅 Buat Trip Cepat", "🏠 Beranda"],
        wizardType: "NONE",
      };
    }

    resetWizard();
    return {
      botMessage: "❌ Penambahan bus dibatalkan.",
      wizardType: "NONE",
    };
  }

  return { botMessage: "Perintah tidak dikenali.", options: ["❌ Batal"] };
}

/**
 * C. WIZARD TAMBAH KRU STEP-BY-STEP
 */
async function handleCrewWizardStep(input: string): Promise<DialogResponse> {
  const lower = input.toLowerCase();
  const isSkip = lower === "skip" || lower === "ga" || lower === "lewati" || lower === "tidak";

  // Langkah 1: Input Nama Kru
  if (activeDraft.step === 1) {
    activeDraft.data.nama = input.trim();
    activeDraft.step = 2;

    return {
      botMessage:
        `✅ Nama kru: **${input.trim()}**\n\n` +
        "👔 **Langkah 2 dari 3: Jabatan / Peran di Lapangan**\n\n" +
        "Apa tugas / jabatan personel ini di biro wisata Anda?",
      options: [
        "Tour Leader",
        "Driver Utama",
        "Co-Driver / Kernet",
        "Koordinator Lapangan",
        "Staf Operasional",
        "❌ Batal",
      ],
      wizardType: "CREW_WIZARD",
      stepIndex: 2,
      totalSteps: 3,
    };
  }

  // Langkah 2: Input Jabatan
  if (activeDraft.step === 2) {
    let roleName: CrewJabatan = "Tour Leader";
    if (lower.includes("driver") || lower.includes("sopir")) roleName = "Driver Utama";
    else if (lower.includes("kernet") || lower.includes("co-driver")) roleName = "Co-Driver / Kernet";
    else if (lower.includes("korlap") || lower.includes("koordinator")) roleName = "Koordinator Lapangan";
    else if (lower.includes("staf") || lower.includes("admin")) roleName = "Staf Operasional";

    activeDraft.data.jabatan = roleName;
    activeDraft.step = 3;

    return {
      botMessage:
        `✅ Jabatan: **${roleName}**\n\n` +
        "📱 **Langkah 3 dari 3: Nomor WhatsApp / Telepon (Opsional)**\n\n" +
        "Berapa nomor kontak kru ini? *(Contoh `0812345678`, atau ketik **skip**)*",
      options: ["0812-3456-7890", "⏩ Lewati / skip", "❌ Batal"],
      wizardType: "CREW_WIZARD",
      stepIndex: 3,
      totalSteps: 3,
    };
  }

  // Langkah 3: Input Telepon & Konfirmasi
  if (activeDraft.step === 3) {
    activeDraft.data.telepon = isSkip ? "0812-0000-0000" : input.trim();
    activeDraft.step = 4;

    const summary =
      "📋 **Ringkasan Personel Kru Baru:**\n" +
      `• **Nama Lengkap:** ${activeDraft.data.nama}\n` +
      `• **Jabatan:** ${activeDraft.data.jabatan}\n` +
      `• **Nomor WhatsApp:** ${activeDraft.data.telepon}\n\n` +
      "Daftarkan kru ini ke database biro sekarang?";

    return {
      botMessage: summary,
      options: ["✅ Ya, Daftarkan Kru", "❌ Batal"],
      wizardType: "CREW_WIZARD",
      stepIndex: 4,
      totalSteps: 3,
    };
  }

  // Langkah 4: Eksekusi Pendaftaran Kru
  if (activeDraft.step === 4) {
    if (lower.includes("ya") || lower.includes("daftar") || lower.includes("simpan")) {
      const entitlements = getCurrentEntitlements();
      const existingMembers = getCrewMembers();
      if (existingMembers.length >= entitlements.maxCrewAccounts) {
        resetWizard();
        return {
          botMessage: `⚠️ Batas kuota akun kru (${entitlements.maxCrewAccounts} akun) telah tercapai. Hubungi Founder untuk menambah slot akun kru biro Anda.`,
          wizardType: "NONE",
        };
      }

      const newMember = await addCrewMemberDB({
        nama: activeDraft.data.nama,
        jabatan: activeDraft.data.jabatan,
        telepon: activeDraft.data.telepon,
        email: `${activeDraft.data.nama.toLowerCase().replace(/[^a-z0-9]/g, "")}@kru.biro`,
        assignedTrip: "Standby Operasional",
      });

      resetWizard();
      return {
        botMessage: `🎉 **Kru ${newMember.nama} (${newMember.jabatan}) berhasil terdaftar!**\nKode Kru: \`${newMember.kodeKru}\`. Personel ini kini sudah bisa ditugaskan di jadwal trip mana pun.`,
        isComplete: true,
        actionType: "ADD_CREW",
        navigationPath: "/manajemen-kru",
        options: ["👤 Tambah Kru Lain", "📅 Buat Trip Baru", "🏠 Beranda"],
        wizardType: "NONE",
      };
    }

    resetWizard();
    return {
      botMessage: "❌ Pendaftaran kru dibatalkan.",
      wizardType: "NONE",
    };
  }

  return { botMessage: "Perintah tidak dikenali.", options: ["❌ Batal"] };
}

/**
 * D. WIZARD CATAT TRANSAKSI / KAS STEP-BY-STEP
 */
async function handleExpenseWizardStep(input: string): Promise<DialogResponse> {
  const lower = input.toLowerCase();

  // Langkah 1: Pilih Alokasi Trip
  if (activeDraft.step === 1) {
    const cleanTripName = input.replace(/^[📍🏢\s]+/, "").trim();
    const user = await getActiveUser();

    // Ambil daftar trip milik biro/user
    let tripQuery = supabase
      .from("trips")
      .select("id, nama_trip")
      .order("tanggal", { ascending: false });

    if (user?.id) {
      tripQuery = tripQuery.eq("user_id", user.id);
    }
    const { data: trips } = await tripQuery;

    let matchedTrip = trips?.find(
      (t) =>
        t.id === cleanTripName ||
        t.nama_trip.toLowerCase() === cleanTripName.toLowerCase() ||
        t.nama_trip.toLowerCase().includes(cleanTripName.toLowerCase()) ||
        cleanTripName.toLowerCase().includes(t.nama_trip.toLowerCase())
    );

    const isOffice =
      cleanTripName.toLowerCase().includes("kantor") ||
      cleanTripName.toLowerCase().includes("umum") ||
      cleanTripName.toLowerCase().includes("kas umum");

    if (!matchedTrip && isOffice) {
      // Cari apakah sudah pernah dibuat trip khusus kantor
      matchedTrip = trips?.find(
        (t) =>
          t.nama_trip.toLowerCase().includes("kantor") ||
          t.nama_trip.toLowerCase().includes("kas umum")
      );

      // Jika belum ada, buatkan otomatis 1 trip resmi kantor
      if (!matchedTrip && user?.id) {
        const todayIso = format(new Date(), "yyyy-MM-dd");
        const { data: newOfficeTrip } = await supabase
          .from("trips")
          .insert({
            nama_trip: "Kas Kantor & Operasional Umum",
            tujuan: "Kantor Operasional Biro",
            tanggal: todayIso,
            nama_kendaraan: "Operasional Kantor",
            user_id: user.id,
          })
          .select("id, nama_trip")
          .single();
        if (newOfficeTrip) {
          matchedTrip = newOfficeTrip;
        }
      }
    }

    // Fallback: Jika user mengetik nama sembarang tapi ada trip di database, gunakan trip pertama
    if (!matchedTrip && trips && trips.length > 0) {
      matchedTrip = trips[0];
    }

    if (!matchedTrip) {
      resetWizard();
      return {
        botMessage:
          "⚠️ **Belum ada jadwal trip yang terdaftar di sistem biro Anda.**\n\n" +
          "Silakan buat trip baru terlebih dahulu agar transaksi kas memiliki alokasi kegiatan yang sah.",
        options: ["📅 Buat Trip Baru", "❌ Batal"],
        wizardType: "NONE",
      };
    }

    activeDraft.data.trip_id = matchedTrip.id;
    activeDraft.data.trip_name = matchedTrip.nama_trip;
    activeDraft.step = 2;

    return {
      botMessage:
        `✅ Alokasi: **${matchedTrip.nama_trip}**\n\n` +
        "💸 **Langkah 2 dari 4: Jenis Arus Kas**\n\n" +
        "Apakah ini transaksi pengeluaran lapangan atau pemasukan?",
      options: ["Pengeluaran (Beban / Biaya Lapangan)", "Pemasukan (DP / Pelunasan)", "❌ Batal"],
      wizardType: "EXPENSE_WIZARD",
      stepIndex: 2,
      totalSteps: 4,
    };
  }

  // Langkah 2: Jenis Transaksi
  if (activeDraft.step === 2) {
    activeDraft.data.jenis = lower.includes("masuk") || lower.includes("dp") ? "pemasukan" : "pengeluaran";
    activeDraft.step = 3;

    return {
      botMessage:
        `✅ Jenis: **${activeDraft.data.jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran"}**\n\n` +
        "💵 **Langkah 3 dari 4: Nominal Transaksi**\n\n" +
        "Berapa jumlah nominal rupiahnya? *(Contoh `50.000`, `360.000`, atau `1.500.000`)*",
      options: ["50.000", "150.000", "360.000", "500.000", "1.000.000", "❌ Batal"],
      wizardType: "EXPENSE_WIZARD",
      stepIndex: 3,
      totalSteps: 4,
    };
  }

  // Langkah 3: Input Nominal Rupiah
  if (activeDraft.step === 3) {
    let nominal = 0;
    const cleanNum = input.replace(/rp\.?/gi, "").trim();
    if (cleanNum.toLowerCase().includes("jt") || cleanNum.toLowerCase().includes("juta")) {
      nominal = parseFloat(cleanNum.replace(/[^0-9\.]/g, "")) * 1000000;
    } else if (cleanNum.toLowerCase().includes("rb") || cleanNum.toLowerCase().includes("ribu")) {
      nominal = parseFloat(cleanNum.replace(/[^0-9\.]/g, "")) * 1000;
    } else {
      nominal = parseInt(cleanNum.replace(/\./g, "").replace(/[^0-9]/g, ""), 10) || 0;
    }

    activeDraft.data.jumlah = nominal;
    activeDraft.step = 4;

    return {
      botMessage:
        `✅ Nominal: **Rp ${nominal.toLocaleString("id-ID")}**\n\n` +
        "📝 **Langkah 4 dari 4: Keterangan / Keperluan**\n\n" +
        "Untuk keperluan apa transaksi ini? *(Contoh: Saldo E-Toll Trans Jawa, Tiket Masuk Wisata, Parkir & Retribusi, Konsumsi Driver)*",
      options: ["E-Toll Trans Jawa", "Parkir Wisata & Retribusi", "Konsumsi Kru / Driver", "Tiket Masuk Wisata", "❌ Batal"],
      wizardType: "EXPENSE_WIZARD",
      stepIndex: 4,
      totalSteps: 4,
    };
  }

  // Langkah 4: Keterangan & Eksekusi Simpan
  if (activeDraft.step === 4) {
    activeDraft.data.keterangan = input.trim();
    const user = await getActiveUser();
    if (!user) {
      resetWizard();
      return { botMessage: "Sesi telah berakhir. Harap login kembali.", wizardType: "NONE" };
    }

    // Perlindungan lapis ganda agar trip_id tidak pernah null
    let tripId = activeDraft.data.trip_id;
    if (!tripId) {
      let fallbackQuery = supabase
        .from("trips")
        .select("id, nama_trip")
        .order("tanggal", { ascending: false });
      if (user.id) {
        fallbackQuery = fallbackQuery.eq("user_id", user.id);
      }
      const { data: latestTrip } = await fallbackQuery.limit(1).maybeSingle();
      if (latestTrip) {
        tripId = latestTrip.id;
        activeDraft.data.trip_id = latestTrip.id;
        activeDraft.data.trip_name = activeDraft.data.trip_name || latestTrip.nama_trip;
      }
    }

    if (!tripId) {
      resetWizard();
      return {
        botMessage: "❌ Gagal mencatat transaksi: Jadwal trip tidak ditemukan. Silakan buat trip baru terlebih dahulu.",
        options: ["📅 Buat Trip Baru", "❌ Batal"],
        wizardType: "NONE",
      };
    }

    const todayDate = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("keuangan").insert({
      trip_id: tripId,
      user_id: user.id,
      jenis: activeDraft.data.jenis,
      jumlah: activeDraft.data.jumlah,
      keterangan: `${activeDraft.data.keterangan}`,
      tanggal: todayDate,
    });

    if (error) {
      resetWizard();
      return { botMessage: `❌ Gagal menyimpan transaksi: ${error.message}`, wizardType: "NONE" };
    }

    logCrewActivity({
      kategori: "keuangan_lapangan",
      aksi: `Asisten AI: Catat ${activeDraft.data.jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran"}`,
      detail: `Nominal Rp ${activeDraft.data.jumlah.toLocaleString("id-ID")} (${activeDraft.data.keterangan})`,
      tripName: activeDraft.data.trip_name,
      status: "sukses",
    });

    const finalTripId = tripId;
    const finalTripName = activeDraft.data.trip_name;
    const finalJenis = activeDraft.data.jenis;
    const finalJumlah = activeDraft.data.jumlah;
    const finalKet = activeDraft.data.keterangan;

    resetWizard();
    return {
      botMessage:
        `🎉 **Transaksi berhasil dicatat ke buku kas!**\n\n` +
        `• Alokasi: **${finalTripName}**\n` +
        `• Jenis: ${finalJenis === "pemasukan" ? "Pemasukan" : "Pengeluaran"}\n` +
        `• Nominal: **Rp ${finalJumlah.toLocaleString("id-ID")}**\n` +
        `• Keterangan: ${finalKet}\n\n` +
        `Saldo kas dan margin laba telah diperbarui secara otomatis.`,
      isComplete: true,
      actionType: "ADD_TRANSACTION",
      navigationPath: `/trips/${finalTripId}`,
      options: ["💰 Catat Kas Lagi", "📅 Buat Trip Baru", "🏠 Beranda"],
      wizardType: "NONE",
    };
  }

  return { botMessage: "Perintah tidak dikenali.", options: ["❌ Batal"] };
}
