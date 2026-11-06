import { getLocalBiroProfile } from "./biroProfile";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "./authHelper";

export type CrewJabatan =
  | "Tour Leader"
  | "Driver Utama"
  | "Co-Driver / Kernet"
  | "Koordinator Lapangan"
  | "Staf Operasional";

export type DeviceType = "Smartphone" | "Tablet" | "Laptop / Desktop";

export type ActivityCategory =
  | "login_device"
  | "keuangan_lapangan"
  | "checklist_armada"
  | "manifest_kursi"
  | "operasional_trip"
  | "catatan_htm"
  | "keamanan_rbac";

export interface DetectedDeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  resolution: string;
  platform: string;
  userAgent: string;
  onlineStatus: boolean;
}

export interface CrewMember {
  id: string;
  nama: string;
  kodeKru: string;
  email: string;
  telepon: string;
  jabatan: CrewJabatan;
  role: "pemilik" | "kru";
  status: "online" | "bertugas" | "offline" | "nonaktif";
  assignedTrip: string;
  assignedTripIds?: string[];
  avatarColor: string;
  lastActive: string;
  currentDevice: {
    deviceName: string;
    deviceType: DeviceType;
    os: string;
    browser: string;
    locationHint: string;
    loginAt: string;
    isCurrentDevice?: boolean;
  };
  permissions: string[];
}

export interface DeviceSession {
  id: string;
  deviceId: string;
  crewId: string;
  crewName: string;
  jabatan: string;
  role: "pemilik" | "kru";
  deviceName: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  resolution: string;
  locationHint: string;
  loginTime: string;
  lastActive: string;
  isActive: boolean;
  isCurrentDevice: boolean;
}

export interface CrewActivityLog {
  id: string;
  crewId: string;
  crewName: string;
  jabatan: string;
  role: "pemilik" | "kru";
  kategori: ActivityCategory;
  aksi: string;
  detail: string;
  deviceUsed: string;
  deviceType: DeviceType;
  tripName?: string;
  timestamp: string;
  status: "sukses" | "peringatan" | "penting";
}

export interface RBACPermissionRule {
  id: string;
  modul: string;
  fitur: string;
  deskripsi: string;
  aksesPemilik: boolean;
  aksesKru: boolean;
  keteranganKru: string;
  kategori: "Finansial & Rahasia Dapur" | "Manajemen & Kontrol" | "Operasional Lapangan";
}

const CREW_STORAGE_KEY = "catatbiro_rbac_crew_v1";
const SESSIONS_STORAGE_KEY = "catatbiro_rbac_sessions_v1";
const LOGS_STORAGE_KEY = "catatbiro_rbac_activity_logs_v1";
const RULES_STORAGE_KEY = "catatbiro_rbac_rules_v1";
const DEVICE_ID_KEY = "catatbiro_current_device_id_v1";
const ACTIVE_CREW_KEY = "catatbiro_active_crew_identity_v1";

/**
 * Deteksi spesifikasi perangkat (Device, OS, Browser, Resolusi) secara real-time dari User-Agent
 */
export function detectCurrentDevice(): DetectedDeviceInfo {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      deviceId: "dev-server",
      deviceName: "Perangkat Web",
      deviceType: "Laptop / Desktop",
      os: "Windows / Web",
      browser: "Browser",
      resolution: "1920x1080",
      platform: "Web",
      userAgent: "",
      onlineStatus: true,
    };
  }

  let deviceId = "dev_local_default";
  try {
    const savedId = localStorage.getItem(DEVICE_ID_KEY);
    if (savedId) {
      deviceId = savedId;
    } else {
      deviceId = "DEV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
  } catch {}

  const ua = navigator.userAgent || "";
  const width = window.screen?.width || window.innerWidth || 1280;
  const height = window.screen?.height || window.innerHeight || 720;
  const resolution = `${width}x${height}`;

  // Detect OS
  let os = "Sistem Operasi Umum";
  let modelHint = "";
  if (/Windows NT 10\.0/i.test(ua)) {
    os = "Windows 10/11 (64-bit)";
    modelHint = "PC / Laptop Windows";
  } else if (/Windows/i.test(ua)) {
    os = "Microsoft Windows";
    modelHint = "PC / Laptop Windows";
  } else if (/Android/i.test(ua)) {
    const verMatch = ua.match(/Android\s+([0-9.]+)/i);
    os = verMatch ? `Android ${verMatch[1]}` : "Android OS";
    const modelMatch = ua.match(/;\s*([^;)]+?)\s+Build\//i);
    modelHint = modelMatch ? modelMatch[1].trim() : "Smartphone Android";
  } else if (/iPhone/i.test(ua)) {
    const verMatch = ua.match(/OS\s+([0-9_]+)/i);
    os = verMatch ? `iOS ${verMatch[1].replace(/_/g, ".")}` : "Apple iOS";
    modelHint = "Apple iPhone";
  } else if (/iPad/i.test(ua)) {
    os = "Apple iPadOS";
    modelHint = "Apple iPad";
  } else if (/Mac OS X/i.test(ua)) {
    os = "macOS";
    modelHint = "MacBook / Mac";
  } else if (/Linux/i.test(ua)) {
    os = "Linux OS";
    modelHint = "Perangkat Linux";
  }

  // Detect Browser
  let browser = "Web Browser";
  if (/Edg\/([0-9.]+)/i.test(ua)) {
    const m = ua.match(/Edg\/([0-9]+)/i);
    browser = `Microsoft Edge ${m ? m[1] : ""}`.trim();
  } else if (/OPR\/([0-9.]+)/i.test(ua)) {
    browser = "Opera Browser";
  } else if (/Chrome\/([0-9.]+)/i.test(ua)) {
    const m = ua.match(/Chrome\/([0-9]+)/i);
    const isMob = /Mobile/i.test(ua);
    browser = `Chrome ${isMob ? "Mobile " : ""}${m ? m[1] : ""}`.trim();
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    const m = ua.match(/Firefox\/([0-9]+)/i);
    browser = `Mozilla Firefox ${m ? m[1] : ""}`.trim();
  } else if (/Safari\/([0-9.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = /Mobile/i.test(ua) ? "Mobile Safari" : "Apple Safari";
  }

  // Detect Device Type
  let deviceType: DeviceType = "Laptop / Desktop";
  if (/iPad|Tablet|PlayBook/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    deviceType = "Tablet";
  } else if (/Mobile|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua) || width < 768) {
    deviceType = "Smartphone";
  }

  const deviceName = `${modelHint || (deviceType === "Smartphone" ? "Smartphone" : "Laptop / PC")} (${browser})`;

  return {
    deviceId,
    deviceName,
    deviceType,
    os,
    browser,
    resolution,
    platform: navigator.platform || "Web",
    userAgent: ua,
    onlineStatus: typeof navigator.onLine === "boolean" ? navigator.onLine : true,
  };
}

export const DEFAULT_RBAC_RULES: RBACPermissionRule[] = [
  {
    id: "rule_buku_kas_laba",
    modul: "Buku Kas Besar & Laba/Rugi Biro",
    fitur: "Melihat total omset klien, margin keuntungan & saldo akhir biro",
    deskripsi: "Data rahasia dapur perusahaan, arus kas masuk (DP/pelunasan klien), dan rekapitulasi laba bersih per trip.",
    aksesPemilik: true,
    aksesKru: false,
    keteranganKru: "Diblokir (Hanya akses Petty Cash / Uang Saku TL)",
    kategori: "Finansial & Rahasia Dapur",
  },
  {
    id: "rule_kwitansi_invoice",
    modul: "Kwitansi Resmi & Invoice Tagihan PDF",
    fitur: "Menerbitkan kwitansi berstempel & tagihan pembayaran rombongan",
    deskripsi: "Pembuatan dokumen penagihan resmi dengan kop surat dan nomor rekening bank biro.",
    aksesPemilik: true,
    aksesKru: false,
    keteranganKru: "Diblokir (Khusus Pemilik / Admin Keuangan)",
    kategori: "Finansial & Rahasia Dapur",
  },
  {
    id: "rule_pengaturan_biro",
    modul: "Profil Biro & Rekening Bank",
    fitur: "Mengubah identitas biro & nomor rekening bank",
    deskripsi: "Pengaturan sensitif perusahaan agar nomor rekening tagihan tidak diubah sembarangan.",
    aksesPemilik: true,
    aksesKru: false,
    keteranganKru: "Diblokir (Halaman Terkunci RBAC)",
    kategori: "Finansial & Rahasia Dapur",
  },
  {
    id: "rule_manajemen_kru",
    modul: "Manajemen Kru, Monitor Device & Audit Log",
    fitur: "Melihat daftar kru, device login aktif, memutus sesi & memantau aktivitas kru",
    deskripsi: "Pusat pengawasan personel lapangan, pelacakan perangkat login, dan log historis tindakan kru.",
    aksesPemilik: true,
    aksesKru: false,
    keteranganKru: "Diblokir (Khusus Pengawasan Pemilik Biro)",
    kategori: "Manajemen & Kontrol",
  },
  {
    id: "rule_hapus_buat_trip",
    modul: "Pembuatan & Penghapusan Master Trip",
    fitur: "Membuat paket trip baru atau menghapus jadwal trip dari database",
    deskripsi: "Menjaga agar jadwal trip resmi tidak terhapus secara tidak sengaja oleh kru di lapangan.",
    aksesPemilik: true,
    aksesKru: false,
    keteranganKru: "Read-Only Jadwal (Tidak bisa hapus trip)",
    kategori: "Manajemen & Kontrol",
  },
  {
    id: "rule_petty_cash",
    modul: "Kas Saku Lapangan (Petty Cash TL)",
    fitur: "Mencatat pengeluaran BBM, tol, parkir, konsumsi & sinkron ke kantor",
    deskripsi: "Pencatatan pemakaian modal uang saku lapangan oleh Tour Leader/Driver selama perjalanan.",
    aksesPemilik: true,
    aksesKru: true,
    keteranganKru: "Akses Penuh (Input & Sinkron Biaya Lapangan)",
    kategori: "Operasional Lapangan",
  },
  {
    id: "rule_checklist_14",
    modul: "Checklist 14 Poin Kesiapan Keberangkatan",
    fitur: "Memeriksa kesiapan surat jalan, P3K, banner bus, AC kabin & briefing driver",
    deskripsi: "Standar operasional prosedur (SOP) kru sebelum bus diberangkatkan dari titik kumpul.",
    aksesPemilik: true,
    aksesKru: true,
    keteranganKru: "Akses Utama Kru Lapangan",
    kategori: "Operasional Lapangan",
  },
  {
    id: "rule_manifest_kursi",
    modul: "Manifest Denah Kursi Bus & Absensi Peserta",
    fitur: "Mengatur nomor kursi penumpang, kategori lansia/anak & cetak manifest",
    deskripsi: "Pengelolaan tempat duduk penumpang di atas armada Big Bus, Medium Bus, atau HiAce.",
    aksesPemilik: true,
    aksesKru: true,
    keteranganKru: "Akses Penuh (Atur Kursi & Absensi)",
    kategori: "Operasional Lapangan",
  },
  {
    id: "rule_broadcast_wa",
    modul: "Broadcast WhatsApp Rombongan",
    fitur: "Mengirim pengumuman titik kumpul, rest area & makan bersama ke peserta",
    deskripsi: "Komunikasi cepat Tour Leader kepada peserta wisata selama agenda trip berlangsung.",
    aksesPemilik: true,
    aksesKru: true,
    keteranganKru: "Akses Penuh",
    kategori: "Operasional Lapangan",
  },
  {
    id: "rule_rundown_catatan",
    modul: "Rundown Acara & Catatan Lapangan / HTM",
    fitur: "Melihat/memperbarui jam rundown acara, catatan lapangan & info tiket objek wisata",
    deskripsi: "Koordinasi jadwal harian di lapangan serta referensi harga tiket masuk (HTM) dan katering.",
    aksesPemilik: true,
    aksesKru: true,
    keteranganKru: "Akses Penuh Operasional",
    kategori: "Operasional Lapangan",
  },
];

export function parseAssignedTrip(raw: string | null | undefined): { display: string; ids: string[] } {
  if (!raw || raw.trim() === "") {
    return { display: "Belum Ditugaskan", ids: [] };
  }
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      const ids = Array.isArray(parsed.ids) ? parsed.ids : [];
      let display = parsed.display;
      if (!display && Array.isArray(parsed.names) && parsed.names.length > 0) {
        display = parsed.names.join(", ");
      }
      return {
        display: display || "Belum Ditugaskan",
        ids,
      };
    }
  } catch {}
  return { display: raw, ids: [] };
}

export function serializeAssignedTrip(display: string, ids?: string[]): string {
  if (!ids || ids.length === 0) {
    return display || "Standby Operasional";
  }
  const names = display
    ? display
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return JSON.stringify({
    display: display || "Belum Ditugaskan",
    names,
    ids,
  });
}

export function getInitialSeedCrew(): CrewMember[] {
  const now = Date.now();
  const minAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString();

  return [
    {
      id: "kru_budi_01",
      nama: "Budi Santoso",
      kodeKru: "KRU-TL01",
      email: "budi.tl@birowisata.id",
      telepon: "0812-3456-7811",
      jabatan: "Tour Leader",
      role: "kru",
      status: "bertugas",
      assignedTrip: "Ziarah Wali Demak - Kudus, Ekskursi Bromo Sunrise",
      assignedTripIds: [
        "a67c57fa-1fcd-460e-be28-faf835e90af0",
        "e2aa825e-6a08-4f2e-9409-ab32907ce288",
      ],
      avatarColor: "bg-emerald-600",
      lastActive: minAgo(3),
      currentDevice: {
        deviceName: "Samsung Galaxy A54 5G (Chrome Mobile 130)",
        deviceType: "Smartphone",
        os: "Android 14 • OneUI 6.1",
        browser: "Chrome Mobile 130",
        locationHint: "Probolinggo / Bromo (Jaringan Telkomsel 4G)",
        loginAt: minAgo(145),
      },
      permissions: ["petty_cash", "checklist_14", "manifest_kursi", "broadcast_wa", "rundown_catatan"],
    },
    {
      id: "kru_slamet_02",
      nama: "Slamet Riyadi",
      kodeKru: "KRU-DRV01",
      email: "slamet.driver@birowisata.id",
      telepon: "0813-9876-5422",
      jabatan: "Driver Utama",
      role: "kru",
      status: "bertugas",
      assignedTrip: "Ziarah Wali Demak - Kudus",
      assignedTripIds: ["a67c57fa-1fcd-460e-be28-faf835e90af0"],
      avatarColor: "bg-blue-600",
      lastActive: minAgo(12),
      currentDevice: {
        deviceName: "Xiaomi Redmi Note 13 Pro (Chrome Mobile)",
        deviceType: "Smartphone",
        os: "Android 14 • HyperOS",
        browser: "Chrome Mobile 129",
        locationHint: "Rest Area KM 72A Tol Trans Jawa",
        loginAt: minAgo(210),
      },
      permissions: ["petty_cash", "checklist_14", "rundown_catatan"],
    },
    {
      id: "kru_rina_03",
      nama: "Rina Wulandari",
      kodeKru: "KRU-TL02",
      email: "rina.wulandari@birowisata.id",
      telepon: "0857-2345-6789",
      jabatan: "Tour Leader",
      role: "kru",
      status: "online",
      assignedTrip: "Study Tour SMP 1 Demak",
      assignedTripIds: ["318be895-bcf9-49d8-b76c-6321d81d5d80"],
      avatarColor: "bg-purple-600",
      lastActive: minAgo(8),
      currentDevice: {
        deviceName: "Apple iPhone 14 (Mobile Safari)",
        deviceType: "Smartphone",
        os: "iOS 17.5.1",
        browser: "Mobile Safari 17",
        locationHint: "Magelang / Yogyakarta (Indosat 5G)",
        loginAt: minAgo(95),
      },
      permissions: ["petty_cash", "checklist_14", "manifest_kursi", "broadcast_wa", "rundown_catatan"],
    },
    {
      id: "kru_agus_04",
      nama: "Agus Pratama",
      kodeKru: "KRU-CO01",
      email: "agus.kernet@birowisata.id",
      telepon: "0821-8765-4321",
      jabatan: "Co-Driver / Kernet",
      role: "kru",
      status: "online",
      assignedTrip: "Study Tour SMP 1 Demak",
      assignedTripIds: ["318be895-bcf9-49d8-b76c-6321d81d5d80"],
      avatarColor: "bg-teal-600",
      lastActive: minAgo(24),
      currentDevice: {
        deviceName: "OPPO Reno 10 5G (Chrome Mobile)",
        deviceType: "Smartphone",
        os: "Android 13 • ColorOS 13",
        browser: "Chrome Mobile 128",
        locationHint: "Pool Bus Demak / Jawa Tengah",
        loginAt: minAgo(320),
      },
      permissions: ["checklist_14", "manifest_kursi", "rundown_catatan"],
    },
    {
      id: "kru_hendra_05",
      nama: "Hendra Wijaya",
      kodeKru: "KRU-KOR01",
      email: "hendra.ops@birowisata.id",
      telepon: "0811-2233-4455",
      jabatan: "Koordinator Lapangan",
      role: "kru",
      status: "offline",
      assignedTrip: "Family Gathering Bank Jateng Demak",
      assignedTripIds: ["6e27d117-af31-40b9-b461-07c2b9f91016"],
      avatarColor: "bg-amber-600",
      lastActive: minAgo(410),
      currentDevice: {
        deviceName: "Samsung Galaxy Tab S9 FE (Chrome Tablet)",
        deviceType: "Tablet",
        os: "Android 14",
        browser: "Chrome Tablet 130",
        locationHint: "Denpasar, Bali",
        loginAt: minAgo(720),
      },
      permissions: ["petty_cash", "checklist_14", "manifest_kursi", "broadcast_wa", "rundown_catatan"],
    },
    {
      id: "kru_dimas_06",
      nama: "Dimas Anggara",
      kodeKru: "KRU-TL03",
      email: "dimas.tl@birowisata.id",
      telepon: "0819-3344-5566",
      jabatan: "Tour Leader",
      role: "kru",
      status: "online",
      assignedTrip: "Belum Ditugaskan",
      assignedTripIds: [],
      avatarColor: "bg-indigo-600",
      lastActive: minAgo(50),
      currentDevice: {
        deviceName: "Vivo V29 5G (Chrome Mobile)",
        deviceType: "Smartphone",
        os: "Android 14 • FuntouchOS",
        browser: "Chrome Mobile 129",
        locationHint: "Kantor Pusat Demak",
        loginAt: minAgo(120),
      },
      permissions: ["petty_cash", "checklist_14", "manifest_kursi", "broadcast_wa", "rundown_catatan"],
    },
  ];
}

export function getInitialSeedSessions(): DeviceSession[] {
  const now = Date.now();
  const minAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString();
  const currentDev = detectCurrentDevice();
  const profile = getLocalBiroProfile();

  return [
    {
      id: `sess_owner_${currentDev.deviceId}`,
      deviceId: currentDev.deviceId,
      crewId: "owner_primary",
      crewName: profile.pimpinan || "Pemilik Biro Utama",
      jabatan: "Pemilik Biro / Direktur",
      role: "pemilik",
      deviceName: currentDev.deviceName,
      deviceType: currentDev.deviceType,
      os: currentDev.os,
      browser: currentDev.browser,
      resolution: currentDev.resolution,
      locationHint: "Perangkat Aktif Saat Ini (Sesi Pemilik)",
      loginTime: minAgo(15),
      lastActive: new Date().toISOString(),
      isActive: true,
      isCurrentDevice: true,
    },
    {
      id: "sess_budi_s23",
      deviceId: "DEV-SM-A546E",
      crewId: "kru_budi_01",
      crewName: "Budi Santoso",
      jabatan: "Tour Leader",
      role: "kru",
      deviceName: "Samsung Galaxy A54 5G (SM-A546E)",
      deviceType: "Smartphone",
      os: "Android 14 • OneUI 6.1",
      browser: "Chrome Mobile 130.0",
      resolution: "384x854",
      locationHint: "Probolinggo / Bromo (Telkomsel 4G)",
      loginTime: minAgo(145),
      lastActive: minAgo(3),
      isActive: true,
      isCurrentDevice: false,
    },
    {
      id: "sess_slamet_redmi",
      deviceId: "DEV-REDMI-N13",
      crewId: "kru_slamet_02",
      crewName: "Slamet Riyadi",
      jabatan: "Driver Utama",
      role: "kru",
      deviceName: "Xiaomi Redmi Note 13 Pro",
      deviceType: "Smartphone",
      os: "Android 14 • HyperOS",
      browser: "Chrome Mobile 129.0",
      resolution: "393x873",
      locationHint: "Tol Trans Jawa KM 72A",
      loginTime: minAgo(210),
      lastActive: minAgo(12),
      isActive: true,
      isCurrentDevice: false,
    },
    {
      id: "sess_rina_iphone",
      deviceId: "DEV-IPHONE-14",
      crewId: "kru_rina_03",
      crewName: "Rina Wulandari",
      jabatan: "Tour Leader",
      role: "kru",
      deviceName: "Apple iPhone 14",
      deviceType: "Smartphone",
      os: "iOS 17.5.1",
      browser: "Mobile Safari 17.5",
      resolution: "390x844",
      locationHint: "Magelang / Candi Borobudur",
      loginTime: minAgo(95),
      lastActive: minAgo(8),
      isActive: true,
      isCurrentDevice: false,
    },
    {
      id: "sess_agus_oppo",
      deviceId: "DEV-OPPO-R10",
      crewId: "kru_agus_04",
      crewName: "Agus Pratama",
      jabatan: "Co-Driver / Kernet",
      role: "kru",
      deviceName: "OPPO Reno 10 5G",
      deviceType: "Smartphone",
      os: "Android 13 • ColorOS 13",
      browser: "Chrome Mobile 128.0",
      resolution: "360x800",
      locationHint: "Pool Bus Demak, Jawa Tengah",
      loginTime: minAgo(320),
      lastActive: minAgo(24),
      isActive: true,
      isCurrentDevice: false,
    },
    {
      id: "sess_hendra_tab",
      deviceId: "DEV-TAB-S9FE",
      crewId: "kru_hendra_05",
      crewName: "Hendra Wijaya",
      jabatan: "Koordinator Lapangan",
      role: "kru",
      deviceName: "Samsung Galaxy Tab S9 FE",
      deviceType: "Tablet",
      os: "Android 14",
      browser: "Chrome Tablet 130.0",
      resolution: "800x1280",
      locationHint: "Denpasar, Bali",
      loginTime: minAgo(720),
      lastActive: minAgo(410),
      isActive: false,
      isCurrentDevice: false,
    },
  ];
}

export function getInitialSeedLogs(): CrewActivityLog[] {
  const now = Date.now();
  const minAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString();

  return [
    {
      id: "log_seed_1",
      crewId: "kru_budi_01",
      crewName: "Budi Santoso",
      jabatan: "Tour Leader",
      role: "kru",
      kategori: "keuangan_lapangan",
      aksi: "Mencatat Pengeluaran Petty Cash",
      detail: "Input biaya lapangan [BBM / Solar]: Isi Solar Full Tank SPBU Probolinggo sebesar Rp 650.000",
      deviceUsed: "Samsung Galaxy A54 5G • Chrome Mobile (Android 14)",
      deviceType: "Smartphone",
      tripName: "Paket Bromo Sunrise & Kawah",
      timestamp: minAgo(4),
      status: "sukses",
    },
    {
      id: "log_seed_2",
      crewId: "kru_rina_03",
      crewName: "Rina Wulandari",
      jabatan: "Tour Leader",
      role: "kru",
      kategori: "manifest_kursi",
      aksi: "Memperbarui Manifest Kursi Bus",
      detail: "Menyimpan penempatan kursi 45 penumpang (Big Bus 50 Seat) & verifikasi 4 peserta kategori Lansia",
      deviceUsed: "Apple iPhone 14 • Mobile Safari (iOS 17.5)",
      deviceType: "Smartphone",
      tripName: "Heritage Tour Candi Borobudur",
      timestamp: minAgo(9),
      status: "sukses",
    },
    {
      id: "log_seed_3",
      crewId: "kru_slamet_02",
      crewName: "Slamet Riyadi",
      jabatan: "Driver Utama",
      role: "kru",
      kategori: "checklist_armada",
      aksi: "Menyelesaikan Checklist Armada & Kabin",
      detail: "Mencentang SOP: Cek Kebersihan Kabin & Dingin AC, Briefing Driver & Kernet, serta Surat Jalan Bus",
      deviceUsed: "Xiaomi Redmi Note 13 Pro • Chrome Mobile (Android 14)",
      deviceType: "Smartphone",
      tripName: "Paket Bromo Sunrise & Kawah",
      timestamp: minAgo(14),
      status: "sukses",
    },
    {
      id: "log_seed_4",
      crewId: "kru_budi_01",
      crewName: "Budi Santoso",
      jabatan: "Tour Leader",
      role: "kru",
      kategori: "operasional_trip",
      aksi: "Mengirim Broadcast WhatsApp Rombongan",
      detail: "Mengirim pengumuman template 'Rest Area & Waktu Istirahat 30 Menit' ke grup peserta rombongan",
      deviceUsed: "Samsung Galaxy A54 5G • Chrome Mobile (Android 14)",
      deviceType: "Smartphone",
      tripName: "Paket Bromo Sunrise & Kawah",
      timestamp: minAgo(22),
      status: "sukses",
    },
    {
      id: "log_seed_5",
      crewId: "kru_agus_04",
      crewName: "Agus Pratama",
      jabatan: "Co-Driver / Kernet",
      role: "kru",
      kategori: "checklist_armada",
      aksi: "Verifikasi Logistik & Bagasi Bus",
      detail: "Mencentang item: Air Mineral & Snack Box Peserta (50 pax), Tag Label Koper Bagasi & Spanduk Bus",
      deviceUsed: "OPPO Reno 10 5G • Chrome Mobile (Android 13)",
      deviceType: "Smartphone",
      tripName: "Paket Bromo Sunrise & Kawah",
      timestamp: minAgo(35),
      status: "sukses",
    },
    {
      id: "log_seed_6",
      crewId: "kru_rina_03",
      crewName: "Rina Wulandari",
      jabatan: "Tour Leader",
      role: "kru",
      kategori: "keuangan_lapangan",
      aksi: "Sinkronisasi Petty Cash ke Kantor",
      detail: "Menyinkronkan 3 transaksi pengeluaran lapangan (Tol, Parkir Zona 1, Retribusi) total Rp 275.000 ke kas kantor",
      deviceUsed: "Apple iPhone 14 • Mobile Safari (iOS 17.5)",
      deviceType: "Smartphone",
      tripName: "Heritage Tour Candi Borobudur",
      timestamp: minAgo(48),
      status: "penting",
    },
    {
      id: "log_seed_7",
      crewId: "kru_budi_01",
      crewName: "Budi Santoso",
      jabatan: "Tour Leader",
      role: "kru",
      kategori: "login_device",
      aksi: "Login Sistem Mode Kru Lapangan",
      detail: "Berhasil masuk sebagai Tour Leader menggunakan perangkat Samsung Galaxy A54 5G (Android 14)",
      deviceUsed: "Samsung Galaxy A54 5G • Chrome Mobile (Android 14)",
      deviceType: "Smartphone",
      tripName: "Paket Bromo Sunrise & Kawah",
      timestamp: minAgo(145),
      status: "sukses",
    },
  ];
}

export interface ActiveCrewIdentity {
  crewId: string;
  nama: string;
  jabatan: CrewJabatan;
  kodeKru: string;
}

export function getActiveCrewIdentity(): ActiveCrewIdentity {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(ACTIVE_CREW_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch {}
  return {
    crewId: "kru_budi_01",
    nama: "Budi Santoso",
    jabatan: "Tour Leader",
    kodeKru: "KRU-TL01",
  };
}

export function setActiveCrewIdentity(identity: ActiveCrewIdentity): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ACTIVE_CREW_KEY, JSON.stringify(identity));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rbac-audit-updated"));
    }
  } catch {}
}

// -------------------------------------------------------------
// Mapping Helpers (Database Rows <-> TypeScript Domain Models)
// -------------------------------------------------------------

export function mapDBCrewToModel(row: any, index = 0): CrewMember {
  const colors = [
    "bg-emerald-600",
    "bg-blue-600",
    "bg-purple-600",
    "bg-teal-600",
    "bg-indigo-600",
    "bg-amber-600",
  ];
  const parsedTrip = parseAssignedTrip(row.assigned_trip);

  return {
    id: row.id,
    nama: row.nama,
    kodeKru: row.kode_kru || `KRU-0${index + 1}`,
    email: row.email || "",
    telepon: row.telepon || "",
    jabatan: row.jabatan as CrewJabatan,
    role: (row.role as "pemilik" | "kru") || "kru",
    status: (row.status as CrewMember["status"]) || "bertugas",
    assignedTrip: parsedTrip.display,
    assignedTripIds: parsedTrip.ids,
    avatarColor: colors[index % colors.length],
    lastActive: row.last_active || new Date().toISOString(),
    currentDevice: {
      deviceName: row.device_name || "Perangkat Operasional",
      deviceType: (row.device_type as DeviceType) || "Smartphone",
      os: row.device_os || "Sistem Operasi",
      browser: row.device_browser || "Web Browser",
      locationHint: row.location_hint || "Lokasi Operasional",
      loginAt: row.last_active || new Date().toISOString(),
    },
    permissions: ["petty_cash", "checklist_14", "manifest_kursi", "broadcast_wa", "rundown_catatan"],
  };
}

export function mapModelToDBCrew(member: CrewMember, userId: string) {
  const serialized = serializeAssignedTrip(member.assignedTrip, member.assignedTripIds);
  return {
    id: member.id,
    user_id: userId,
    kode_kru: member.kodeKru,
    nama: member.nama,
    email: member.email || null,
    telepon: member.telepon || null,
    jabatan: member.jabatan,
    role: member.role || "kru",
    status: member.status || "bertugas",
    assigned_trip: serialized,
    device_name: member.currentDevice?.deviceName || null,
    device_type: member.currentDevice?.deviceType || "Smartphone",
    device_os: member.currentDevice?.os || null,
    device_browser: member.currentDevice?.browser || null,
    location_hint: member.currentDevice?.locationHint || null,
    last_active: member.lastActive || new Date().toISOString(),
  };
}

export function mapDBSessionToModel(row: any, currentDeviceId: string): DeviceSession {
  return {
    id: row.id,
    deviceId: row.device_id,
    crewId: row.crew_id,
    crewName: row.crew_name,
    jabatan: row.jabatan,
    role: (row.role as "pemilik" | "kru") || "kru",
    deviceName: row.device_name,
    deviceType: (row.device_type as DeviceType) || "Smartphone",
    os: row.os || "OS",
    browser: row.browser || "Browser",
    resolution: row.resolution || "1920x1080",
    locationHint: row.location_hint || "Lokasi",
    loginTime: row.login_time || new Date().toISOString(),
    lastActive: row.last_active || new Date().toISOString(),
    isActive: typeof row.is_active === "boolean" ? row.is_active : true,
    isCurrentDevice: row.device_id === currentDeviceId,
  };
}

export function mapModelToDBSession(session: DeviceSession, userId: string) {
  return {
    id: session.id,
    user_id: userId,
    device_id: session.deviceId,
    crew_id: session.crewId,
    crew_name: session.crewName,
    jabatan: session.jabatan,
    role: session.role || "kru",
    device_name: session.deviceName,
    device_type: session.deviceType,
    os: session.os,
    browser: session.browser,
    resolution: session.resolution || "1920x1080",
    location_hint: session.locationHint || "Perangkat Terdaftar",
    login_time: session.loginTime || new Date().toISOString(),
    last_active: session.lastActive || new Date().toISOString(),
    is_active: session.isActive,
  };
}

export function mapDBLogToModel(row: any): CrewActivityLog {
  return {
    id: row.id,
    crewId: row.crew_id,
    crewName: row.crew_name,
    jabatan: row.jabatan,
    role: (row.role as "pemilik" | "kru") || "kru",
    kategori: row.kategori as ActivityCategory,
    aksi: row.aksi,
    detail: row.detail,
    deviceUsed: row.device_used,
    deviceType: (row.device_type as DeviceType) || "Smartphone",
    tripName: row.trip_name || undefined,
    timestamp: row.timestamp || new Date().toISOString(),
    status: (row.status as CrewActivityLog["status"]) || "sukses",
  };
}

export function mapModelToDBLog(log: CrewActivityLog, userId: string) {
  return {
    id: log.id,
    user_id: userId,
    crew_id: log.crewId,
    crew_name: log.crewName,
    jabatan: log.jabatan,
    role: log.role || "kru",
    kategori: log.kategori,
    aksi: log.aksi,
    detail: log.detail,
    device_used: log.deviceUsed,
    device_type: log.deviceType,
    trip_name: log.tripName || null,
    status: log.status,
    timestamp: log.timestamp || new Date().toISOString(),
  };
}

export function mapDBRuleToModel(row: any): RBACPermissionRule {
  return {
    id: row.id,
    modul: row.modul,
    fitur: row.fitur,
    deskripsi: row.deskripsi || "",
    kategori: row.kategori as RBACPermissionRule["kategori"],
    aksesPemilik: typeof row.akses_pemilik === "boolean" ? row.akses_pemilik : true,
    aksesKru: typeof row.akses_kru === "boolean" ? row.akses_kru : false,
    keteranganKru: row.keterangan_kru || "",
  };
}

export function mapModelToDBRule(rule: RBACPermissionRule, userId: string) {
  return {
    id: rule.id,
    user_id: userId,
    modul: rule.modul,
    fitur: rule.fitur,
    deskripsi: rule.deskripsi,
    kategori: rule.kategori,
    akses_pemilik: rule.aksesPemilik,
    akses_kru: rule.aksesKru,
    keterangan_kru: rule.keteranganKru,
  };
}

// -------------------------------------------------------------
// Real Database Operations (Supabase PostgreSQL Integration)
// -------------------------------------------------------------

/**
 * Mengambil daftar seluruh trip dari Supabase database untuk referensi penugasan kru
 */
export async function fetchAllTripsDB(): Promise<Array<{
  id: string;
  nama_trip: string;
  tanggal: string;
  tujuan: string;
  nama_driver?: string | null;
  nama_kendaraan?: string | null;
}>> {
  try {
    const user = await getActiveUser();
    if (user) {
      const { data, error } = await supabase
        .from("trips")
        .select("id, nama_trip, tanggal, tujuan, nama_driver, nama_kendaraan")
        .order("tanggal", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Gagal membaca trips dari Supabase:", err);
  }

  try {
    if (typeof localStorage !== "undefined") {
      const cached = localStorage.getItem("catatbiro_cached_trips");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}

  return [
    {
      id: "a67c57fa-1fcd-460e-be28-faf835e90af0",
      nama_trip: "Ziarah Wali Demak - Kudus",
      tanggal: "2026-10-18",
      tujuan: "kudus",
      nama_driver: "Pak Joko Susilo (0812-3456-7811)",
      nama_kendaraan: "Big Bus HDD 50 Seat",
    },
    {
      id: "318be895-bcf9-49d8-b76c-6321d81d5d80",
      nama_trip: "Study Tour SMP 1 Demak",
      tanggal: "2026-10-27",
      tujuan: "semarang",
      nama_driver: "Pak Bambang S. & Mas Agus",
      nama_kendaraan: "Medium Bus 35 Seat",
    },
    {
      id: "e2aa825e-6a08-4f2e-9409-ab32907ce288",
      nama_trip: "Ekskursi Bromo Sunrise SMP 3 Demak",
      tanggal: "2026-10-30",
      tujuan: "bromo",
      nama_driver: "Pak Dian Supriyadi",
      nama_kendaraan: "Big Bus SHD 50 Seat",
    },
  ];
}

/**
 * Mengambil daftar kru langsung dari tabel database Supabase `crew_members`.
 * Jika tabel masih kosong untuk user aktif, otomatis mengisi dengan seed crew data.
 */
export async function fetchCrewMembersDB(): Promise<CrewMember[]> {
  try {
    const user = await getActiveUser();
    if (user) {
      const { data, error } = await supabase
        .from("crew_members")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          const mapped = data.map((row, idx) => mapDBCrewToModel(row, idx));
          saveCrewMembers(mapped);
          return mapped;
        } else {
          // Inisialisasi seed crew ke Supabase database jika pertama kali
          const initial = getInitialSeedCrew();
          const rowsToInsert = initial.map((c) => mapModelToDBCrew(c, user.id));
          const { data: inserted, error: insertErr } = await supabase
            .from("crew_members")
            .insert(rowsToInsert)
            .select();

          if (!insertErr && inserted && inserted.length > 0) {
            const mapped = inserted.map((row, idx) => mapDBCrewToModel(row, idx));
            saveCrewMembers(mapped);
            return mapped;
          }
        }
      } else if (error) {
        console.warn("Peringatan saat membaca crew_members dari Supabase:", error.message);
      }
    }
  } catch (err) {
    console.warn("Gagal terhubung ke database crew_members:", err);
  }
  return getCrewMembers();
}

/**
 * Menambahkan personel kru baru langsung ke Supabase `crew_members`
 */
export async function addCrewMemberDB(input: {
  nama: string;
  email: string;
  telepon: string;
  jabatan: CrewJabatan;
  assignedTrip: string;
  assignedTripIds?: string[];
}): Promise<CrewMember> {
  const currentDev = detectCurrentDevice();
  const members = getCrewMembers();
  const colors = ["bg-emerald-600", "bg-blue-600", "bg-purple-600", "bg-teal-600", "bg-indigo-600", "bg-amber-600"];

  const newMember: CrewMember = {
    id: "kru_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    nama: input.nama.trim(),
    kodeKru: `KRU-0${members.length + 1}`,
    email: input.email.trim() || `${input.nama.toLowerCase().replace(/\s+/g, ".")}@birowisata.id`,
    telepon: input.telepon.trim() || "0812-0000-0000",
    jabatan: input.jabatan,
    role: "kru",
    status: (input.assignedTripIds && input.assignedTripIds.length > 0 ? "bertugas" : "online") as CrewMember["status"],
    assignedTrip: input.assignedTrip.trim() || "Standby Operasional",
    assignedTripIds: input.assignedTripIds || [],
    avatarColor: colors[members.length % colors.length],
    lastActive: new Date().toISOString(),
    currentDevice: {
      deviceName: currentDev.deviceName,
      deviceType: currentDev.deviceType,
      os: currentDev.os,
      browser: currentDev.browser,
      locationHint: "Terdaftar via Panel Pemilik Biro",
      loginAt: new Date().toISOString(),
    },
    permissions: ["petty_cash", "checklist_14", "manifest_kursi", "broadcast_wa", "rundown_catatan"],
  };

  // Simpan ke memory & local cache
  const updated = [newMember, ...members];
  saveCrewMembers(updated);

  // Simpan ke Supabase Database
  try {
    const user = await getActiveUser();
    if (user) {
      await supabase.from("crew_members").insert(mapModelToDBCrew(newMember, user.id));
    }
  } catch (err) {
    console.warn("Gagal simpan crew_members ke Supabase:", err);
  }

  logCrewActivity({
    kategori: "keamanan_rbac",
    aksi: "Menambahkan Personel Kru Baru",
    detail: `Pemilik Biro mendaftarkan kru baru ke database: ${newMember.nama} (${newMember.jabatan}) untuk trip "${newMember.assignedTrip}"`,
    tripName: newMember.assignedTrip,
    status: "penting",
  });

  return newMember;
}

/**
 * Menugaskan kru ke satu atau beberapa trip spesifik (RBAC Trip Level)
 */
export async function assignCrewToTripsDB(
  crewId: string,
  tripIds: string[],
  tripNames: string[]
): Promise<void> {
  const members = getCrewMembers();
  const target = members.find((m) => m.id === crewId);
  if (!target) return;

  const display = tripNames.length > 0 ? tripNames.join(", ") : "Belum Ditugaskan";
  const nextStatus: CrewMember["status"] =
    target.status === "nonaktif"
      ? "nonaktif"
      : tripIds.length > 0
      ? "bertugas"
      : "online";

  const updatedMember: CrewMember = {
    ...target,
    assignedTrip: display,
    assignedTripIds: tripIds,
    status: nextStatus,
    lastActive: new Date().toISOString(),
  };

  const updatedMembers = members.map((m) => (m.id === crewId ? updatedMember : m));
  saveCrewMembers(updatedMembers);

  try {
    const user = await getActiveUser();
    if (user) {
      const serialized = serializeAssignedTrip(display, tripIds);
      await supabase
        .from("crew_members")
        .update({
          assigned_trip: serialized,
          status: nextStatus,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", crewId);
    }
  } catch (err) {
    console.warn("Gagal update penugasan trip kru ke Supabase:", err);
  }

  logCrewActivity({
    kategori: "keamanan_rbac",
    aksi: "Memperbarui Hak Akses Trip Kru",
    detail: `Pemilik Biro menetapkan ${tripIds.length} trip untuk ${target.nama} (${target.jabatan}): ${display}`,
    status: "penting",
  });
}

/**
 * Menugaskan sebuah trip ke beberapa kru sekaligus (dari Dialog Trip / Detail Trip)
 */
export async function assignTripToMultipleCrewDB(
  tripId: string,
  tripName: string,
  crewIds: string[]
): Promise<void> {
  const members = getCrewMembers();
  const user = await getActiveUser();

  const updatedMembers = members.map((m) => {
    const currentIds = m.assignedTripIds || [];
    const isSelected = crewIds.includes(m.id);

    let nextIds: string[];
    if (isSelected) {
      nextIds = Array.from(new Set([...currentIds, tripId]));
    } else {
      nextIds = currentIds.filter((id) => id !== tripId);
    }

    let nextDisplay = m.assignedTrip;
    if (isSelected && !m.assignedTrip.includes(tripName)) {
      nextDisplay =
        m.assignedTrip &&
        m.assignedTrip !== "Belum Ditugaskan" &&
        m.assignedTrip !== "Standby Operasional"
          ? `${m.assignedTrip}, ${tripName}`
          : tripName;
    } else if (!isSelected && m.assignedTrip.includes(tripName)) {
      const parts = m.assignedTrip
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p !== tripName);
      nextDisplay = parts.length > 0 ? parts.join(", ") : "Standby Operasional";
    }

    const nextStatus: CrewMember["status"] =
      m.status === "nonaktif"
        ? "nonaktif"
        : nextIds.length > 0
        ? "bertugas"
        : "online";

    return {
      ...m,
      assignedTrip: nextDisplay,
      assignedTripIds: nextIds,
      status: nextStatus,
    };
  });

  saveCrewMembers(updatedMembers);

  if (user) {
    for (const m of updatedMembers) {
      const serialized = serializeAssignedTrip(m.assignedTrip, m.assignedTripIds);
      supabase
        .from("crew_members")
        .update({
          assigned_trip: serialized,
          status: m.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", m.id)
        .then(() => {}, (err) => console.warn("Update crew member failed:", err));
    }
  }

  logCrewActivity({
    kategori: "keamanan_rbac",
    aksi: "Memperbarui Penugasan Kru pada Trip",
    detail: `Pemilik Biro menugaskan ${crewIds.length} kru untuk trip "${tripName}"`,
    tripName,
    status: "penting",
  });
}

/**
 * Menonaktifkan atau mengaktifkan kembali akun kru (Pengaturan Nonaktifkan Akun)
 */
export async function toggleCrewAccountStatusDB(crewId: string): Promise<boolean> {
  const members = getCrewMembers();
  const target = members.find((m) => m.id === crewId);
  if (!target) return false;

  const isCurrentlyDisabled = target.status === "nonaktif";
  const nextStatus: CrewMember["status"] = isCurrentlyDisabled
    ? (target.assignedTripIds && target.assignedTripIds.length > 0 ? "bertugas" : "online")
    : "nonaktif";

  const updatedMember: CrewMember = {
    ...target,
    status: nextStatus,
    lastActive: new Date().toISOString(),
  };

  const updatedMembers = members.map((m) => (m.id === crewId ? updatedMember : m));
  saveCrewMembers(updatedMembers);

  // Jika menonaktifkan akun, putus seluruh sesi perangkat aktif untuk kru ini
  const sessions = getDeviceSessions();
  const nextSessions = sessions.map((s) =>
    s.crewId === crewId ? { ...s, isActive: isCurrentlyDisabled } : s
  );
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(nextSessions));
    }
  } catch {}

  try {
    const user = await getActiveUser();
    if (user) {
      await supabase
        .from("crew_members")
        .update({
          status: nextStatus,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", crewId);

      await supabase
        .from("crew_device_sessions")
        .update({
          is_active: isCurrentlyDisabled,
          last_active: new Date().toISOString(),
        })
        .eq("crew_id", crewId);
    }
  } catch (err) {
    console.warn("Gagal update status akun kru ke Supabase:", err);
  }

  logCrewActivity({
    kategori: "keamanan_rbac",
    aksi: isCurrentlyDisabled ? "Mengaktifkan Kembali Akun Kru" : "Menonaktifkan Akun Kru",
    detail: isCurrentlyDisabled
      ? `Akun personel kru ${target.nama} (${target.jabatan}) telah diaktifkan kembali oleh Pemilik Biro.`
      : `Pemilik Biro menonaktifkan akun ${target.nama} (${target.jabatan}). Sesi perangkat diputus dan akses sistem diblokir total.`,
    status: isCurrentlyDisabled ? "sukses" : "peringatan",
  });

  return !isCurrentlyDisabled;
}

/**
 * Memeriksa apakah akun kru sedang dinonaktifkan oleh Pemilik Biro
 */
export function isCrewAccountDisabled(crewId: string): boolean {
  if (!crewId || crewId === "owner_primary") return false;
  const members = getCrewMembers();
  const member = members.find((m) => m.id === crewId);
  return member?.status === "nonaktif";
}

/**
 * Memperbarui data personel kru di Supabase database
 */
export async function updateCrewMemberDB(id: string, patch: Partial<CrewMember>): Promise<void> {
  updateCrewMember(id, patch);

  try {
    const user = await getActiveUser();
    if (user) {
      const dbPatch: any = {};
      if (patch.nama !== undefined) dbPatch.nama = patch.nama;
      if (patch.kodeKru !== undefined) dbPatch.kode_kru = patch.kodeKru;
      if (patch.email !== undefined) dbPatch.email = patch.email;
      if (patch.telepon !== undefined) dbPatch.telepon = patch.telepon;
      if (patch.jabatan !== undefined) dbPatch.jabatan = patch.jabatan;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.assignedTrip !== undefined || patch.assignedTripIds !== undefined) {
        dbPatch.assigned_trip = serializeAssignedTrip(
          patch.assignedTrip || "",
          patch.assignedTripIds
        );
      }
      if (patch.lastActive !== undefined) dbPatch.last_active = patch.lastActive;
      dbPatch.updated_at = new Date().toISOString();

      await supabase.from("crew_members").update(dbPatch).eq("id", id);
    }
  } catch (err) {
    console.warn("Gagal update crew_members di Supabase:", err);
  }
}

/**
 * Menghapus kru dari Supabase database
 */
export async function deleteCrewMemberDB(id: string): Promise<void> {
  const members = getCrewMembers();
  const target = members.find((m) => m.id === id);
  deleteCrewMember(id);

  try {
    const user = await getActiveUser();
    if (user) {
      await supabase.from("crew_members").delete().eq("id", id);
    }
  } catch (err) {
    console.warn("Gagal delete crew_members dari Supabase:", err);
  }

  if (target) {
    logCrewActivity({
      kategori: "keamanan_rbac",
      aksi: "Menghapus Akses Personel Kru",
      detail: `Mencabut akses dan menghapus kru dari database: ${target.nama} (${target.jabatan})`,
      status: "peringatan",
    });
  }
}

/**
 * Mengambil sesi perangkat login aktif dari Supabase `crew_device_sessions`
 */
export async function fetchDeviceSessionsDB(): Promise<DeviceSession[]> {
  const currentDev = detectCurrentDevice();
  try {
    const user = await getActiveUser();
    if (user) {
      const { data, error } = await supabase
        .from("crew_device_sessions")
        .select("*")
        .order("login_time", { ascending: false });

      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          const mapped = data.map((row) => mapDBSessionToModel(row, currentDev.deviceId));
          try {
            localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(mapped));
          } catch {}
          return mapped;
        } else {
          // Seed initial sessions ke database
          const initial = getInitialSeedSessions();
          const rowsToInsert = initial.map((s) => mapModelToDBSession(s, user.id));
          const { data: inserted, error: insertErr } = await supabase
            .from("crew_device_sessions")
            .insert(rowsToInsert)
            .select();

          if (!insertErr && inserted && inserted.length > 0) {
            const mapped = inserted.map((row) => mapDBSessionToModel(row, currentDev.deviceId));
            try {
              localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(mapped));
            } catch {}
            return mapped;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Gagal terhubung ke database crew_device_sessions:", err);
  }
  return getDeviceSessions();
}

/**
 * Menyimpan sesi perangkat ke Supabase database
 */
export async function saveDeviceSessionDB(session: DeviceSession): Promise<void> {
  try {
    const user = await getActiveUser();
    if (user) {
      await supabase
        .from("crew_device_sessions")
        .upsert(mapModelToDBSession(session, user.id));
    }
  } catch (err) {
    console.warn("Gagal simpan sesi perangkat ke Supabase:", err);
  }
}

/**
 * Memutus atau mengaktifkan kembali sesi login perangkat di Supabase database (Real-Time Revocation)
 */
export async function toggleDeviceSessionStatusDB(sessionId: string): Promise<void> {
  toggleDeviceSessionStatus(sessionId);

  try {
    const user = await getActiveUser();
    if (user) {
      const sessions = getDeviceSessions();
      const target = sessions.find((s) => s.id === sessionId);
      if (target) {
        await supabase
          .from("crew_device_sessions")
          .update({ is_active: target.isActive, last_active: new Date().toISOString() })
          .eq("id", sessionId);

        if (target.role === "kru" && target.crewId) {
          await supabase
            .from("crew_members")
            .update({
              status: target.isActive ? "online" : "nonaktif",
              last_active: new Date().toISOString(),
            })
            .eq("id", target.crewId);
        }
      }
    }
  } catch (err) {
    console.warn("Gagal update status sesi perangkat di Supabase:", err);
  }
}

/**
 * Mengambil log aktivitas kru (Audit Trail) langsung dari tabel Supabase `crew_activity_logs`
 */
export async function fetchActivityLogsDB(): Promise<CrewActivityLog[]> {
  try {
    const user = await getActiveUser();
    if (user) {
      const { data, error } = await supabase
        .from("crew_activity_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          const mapped = data.map((row) => mapDBLogToModel(row));
          try {
            localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(mapped));
          } catch {}
          return mapped;
        } else {
          // Seed initial logs ke Supabase
          const initial = getInitialSeedLogs();
          const rowsToInsert = initial.map((l) => mapModelToDBLog(l, user.id));
          const { data: inserted, error: insertErr } = await supabase
            .from("crew_activity_logs")
            .insert(rowsToInsert)
            .select();

          if (!insertErr && inserted && inserted.length > 0) {
            const mapped = inserted.map((row) => mapDBLogToModel(row));
            try {
              localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(mapped));
            } catch {}
            return mapped;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Gagal terhubung ke database crew_activity_logs:", err);
  }
  return getActivityLogs();
}

/**
 * Mencatat log aktivitas kru dan menyimpannya langsung ke database Supabase
 */
export async function logCrewActivityDB(
  entry: Parameters<typeof logCrewActivity>[0]
): Promise<CrewActivityLog> {
  const newLog = logCrewActivity(entry);

  try {
    const user = await getActiveUser();
    if (user) {
      await supabase.from("crew_activity_logs").insert(mapModelToDBLog(newLog, user.id));
    }
  } catch (err) {
    console.warn("Gagal menyimpan log aktivitas kru ke Supabase:", err);
  }

  return newLog;
}

/**
 * Mengambil matriks kebijakan hak akses RBAC dari Supabase `rbac_permission_rules`
 */
export async function fetchRBACPermissionRulesDB(): Promise<RBACPermissionRule[]> {
  try {
    const user = await getActiveUser();
    if (user) {
      const { data, error } = await supabase
        .from("rbac_permission_rules")
        .select("*");

      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          const mapped = data.map((row) => mapDBRuleToModel(row));
          try {
            localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(mapped));
          } catch {}
          return mapped;
        } else {
          // Seed default rules ke Supabase database
          const initial = DEFAULT_RBAC_RULES;
          const rowsToInsert = initial.map((r) => mapModelToDBRule(r, user.id));
          const { data: inserted, error: insertErr } = await supabase
            .from("rbac_permission_rules")
            .insert(rowsToInsert)
            .select();

          if (!insertErr && inserted && inserted.length > 0) {
            const mapped = inserted.map((row) => mapDBRuleToModel(row));
            try {
              localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(mapped));
            } catch {}
            return mapped;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Gagal terhubung ke database rbac_permission_rules:", err);
  }
  return getRBACPermissionRules();
}

/**
 * Mengubah izin hak akses kru pada modul tertentu di Supabase database
 */
export async function toggleKruPermissionRuleDB(ruleId: string): Promise<RBACPermissionRule[]> {
  const updated = toggleKruPermissionRule(ruleId);
  const target = updated.find((r) => r.id === ruleId);

  try {
    const user = await getActiveUser();
    if (user && target) {
      await supabase
        .from("rbac_permission_rules")
        .update({
          akses_kru: target.aksesKru,
          keterangan_kru: target.keteranganKru,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ruleId)
        .eq("user_id", user.id);
    }
  } catch (err) {
    console.warn("Gagal update rbac_permission_rules di Supabase:", err);
  }

  return updated;
}

/**
 * Berlangganan (Subscribe) ke Supabase Realtime Channel untuk tabel-tabel RBAC
 * Memastikan perubahan dari perangkat pemilik/kru lain langsung tercermin seketika (Live)
 */
export function subscribeToRBACRealtime(onUpdate: (tableName: string) => void): () => void {
  try {
    const channel = supabase
      .channel("catatbiro_rbac_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crew_members" },
        () => onUpdate("crew_members")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crew_device_sessions" },
        () => onUpdate("crew_device_sessions")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crew_activity_logs" },
        () => onUpdate("crew_activity_logs")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rbac_permission_rules" },
        () => onUpdate("rbac_permission_rules")
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn("Gagal membuat channel Supabase Realtime:", err);
    return () => {};
  }
}

// -------------------------------------------------------------
// Synchronous Cache Accessors & Local Storage Fallback
// -------------------------------------------------------------

export function getCrewMembers(): CrewMember[] {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(CREW_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any, idx: number) => {
            const parsedTrip = parseAssignedTrip(m.assignedTrip);
            return {
              ...m,
              assignedTrip: parsedTrip.display || m.assignedTrip,
              assignedTripIds: m.assignedTripIds || parsedTrip.ids,
            };
          });
        }
      }
    }
  } catch {}
  const seed = getInitialSeedCrew();
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CREW_STORAGE_KEY, JSON.stringify(seed));
    }
  } catch {}
  return seed;
}

export function saveCrewMembers(members: CrewMember[]): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CREW_STORAGE_KEY, JSON.stringify(members));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rbac-audit-updated"));
    }
  } catch {}
}

export function addCrewMember(input: {
  nama: string;
  email: string;
  telepon: string;
  jabatan: CrewJabatan;
  assignedTrip: string;
  assignedTripIds?: string[];
}): CrewMember {
  const members = getCrewMembers();
  const colors = ["bg-emerald-600", "bg-blue-600", "bg-purple-600", "bg-teal-600", "bg-indigo-600", "bg-amber-600"];
  const currentDev = detectCurrentDevice();

  const newMember: CrewMember = {
    id: "kru_" + Date.now(),
    nama: input.nama.trim(),
    kodeKru: `KRU-0${members.length + 1}`,
    email: input.email.trim() || `${input.nama.toLowerCase().replace(/\s+/g, ".")}@birowisata.id`,
    telepon: input.telepon.trim() || "0812-0000-0000",
    jabatan: input.jabatan,
    role: "kru",
    status: (input.assignedTripIds && input.assignedTripIds.length > 0 ? "bertugas" : "online") as CrewMember["status"],
    assignedTrip: input.assignedTrip.trim() || "Standby Operasional",
    assignedTripIds: input.assignedTripIds || [],
    avatarColor: colors[members.length % colors.length],
    lastActive: new Date().toISOString(),
    currentDevice: {
      deviceName: currentDev.deviceName,
      deviceType: currentDev.deviceType,
      os: currentDev.os,
      browser: currentDev.browser,
      locationHint: "Terdaftar via Panel Pemilik Biro",
      loginAt: new Date().toISOString(),
    },
    permissions: ["petty_cash", "checklist_14", "manifest_kursi", "broadcast_wa", "rundown_catatan"],
  };

  const updated = [newMember, ...members];
  saveCrewMembers(updated);

  // Sync ke Supabase di background
  getActiveUser()
    .then((user) => {
      if (user) {
        supabase.from("crew_members").insert(mapModelToDBCrew(newMember, user.id)).then(() => {}, () => {});
      }
    })
    .catch(() => {});

  logCrewActivity({
    kategori: "keamanan_rbac",
    aksi: "Menambahkan Personel Kru Baru",
    detail: `Pemilik Biro mendaftarkan kru baru: ${newMember.nama} (${newMember.jabatan}) untuk trip "${newMember.assignedTrip}"`,
    tripName: newMember.assignedTrip,
    status: "penting",
  });

  return newMember;
}

export function updateCrewMember(id: string, patch: Partial<CrewMember>): void {
  const members = getCrewMembers();
  const updated = members.map((m) => (m.id === id ? { ...m, ...patch } : m));
  saveCrewMembers(updated);

  // Sync ke Supabase di background
  getActiveUser()
    .then((user) => {
      if (user) {
        const dbPatch: any = {};
        if (patch.nama !== undefined) dbPatch.nama = patch.nama;
        if (patch.kodeKru !== undefined) dbPatch.kode_kru = patch.kodeKru;
        if (patch.email !== undefined) dbPatch.email = patch.email;
        if (patch.telepon !== undefined) dbPatch.telepon = patch.telepon;
        if (patch.jabatan !== undefined) dbPatch.jabatan = patch.jabatan;
        if (patch.status !== undefined) dbPatch.status = patch.status;
        if (patch.assignedTrip !== undefined || patch.assignedTripIds !== undefined) {
          dbPatch.assigned_trip = serializeAssignedTrip(
            patch.assignedTrip || "",
            patch.assignedTripIds
          );
        }
        if (patch.lastActive !== undefined) dbPatch.last_active = patch.lastActive;
        dbPatch.updated_at = new Date().toISOString();
        supabase.from("crew_members").update(dbPatch).eq("id", id).then(() => {}, () => {});
      }
    })
    .catch(() => {});
}

export function deleteCrewMember(id: string): void {
  const members = getCrewMembers();
  const target = members.find((m) => m.id === id);
  const updated = members.filter((m) => m.id !== id);
  saveCrewMembers(updated);

  // Sync ke Supabase di background
  getActiveUser()
    .then((user) => {
      if (user) {
        supabase.from("crew_members").delete().eq("id", id).then(() => {}, () => {});
      }
    })
    .catch(() => {});

  if (target) {
    logCrewActivity({
      kategori: "keamanan_rbac",
      aksi: "Menghapus Akses Personel Kru",
      detail: `Mencabut akses dan menghapus data kru: ${target.nama} (${target.jabatan})`,
      status: "peringatan",
    });
  }
}

export function getDeviceSessions(): DeviceSession[] {
  const currentDev = detectCurrentDevice();
  let sessions: DeviceSession[] = [];

  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          sessions = parsed;
        }
      }
    }
  } catch {}

  if (sessions.length === 0) {
    sessions = getInitialSeedSessions();
  }

  // Pastikan informasi device yang sedang digunakan saat ini selalu sinkron & akurat
  const hasCurrent = sessions.some((s) => s.isCurrentDevice);
  if (hasCurrent) {
    sessions = sessions.map((s) =>
      s.isCurrentDevice
        ? {
            ...s,
            deviceId: currentDev.deviceId,
            deviceName: currentDev.deviceName,
            deviceType: currentDev.deviceType,
            os: currentDev.os,
            browser: currentDev.browser,
            resolution: currentDev.resolution,
            lastActive: new Date().toISOString(),
          }
        : s
    );
  } else {
    const profile = getLocalBiroProfile();
    sessions.unshift({
      id: `sess_owner_${currentDev.deviceId}`,
      deviceId: currentDev.deviceId,
      crewId: "owner_primary",
      crewName: profile.pimpinan || "Pemilik Biro Utama",
      jabatan: "Pemilik Biro / Direktur",
      role: "pemilik",
      deviceName: currentDev.deviceName,
      deviceType: currentDev.deviceType,
      os: currentDev.os,
      browser: currentDev.browser,
      resolution: currentDev.resolution,
      locationHint: "Perangkat Aktif Saat Ini",
      loginTime: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      isActive: true,
      isCurrentDevice: true,
    });
  }

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    }
  } catch {}

  return sessions;
}

export function registerCurrentDeviceLogin(params: {
  role: "pemilik" | "kru";
  crewId?: string;
  crewName: string;
  jabatan: string;
  forceRestore?: boolean;
}): DeviceSession {
  const currentDev = detectCurrentDevice();
  const sessions = getDeviceSessions();
  const members = getCrewMembers();
  const nowIso = new Date().toISOString();

  const resolvedCrewId =
    params.crewId || (params.role === "pemilik" ? "owner_primary" : "kru_budi_01");

  // Cek apakah kru ini sedang dalam status dicabut/diputus sesinya oleh Pemilik Biro
  const memberRecord = members.find((m) => m.id === resolvedCrewId);
  const existingCrewSessions = sessions.filter((s) => s.crewId === resolvedCrewId);
  const wasRevoked =
    params.role === "kru" &&
    !params.forceRestore &&
    (memberRecord?.status === "nonaktif" ||
      (existingCrewSessions.length > 0 &&
        existingCrewSessions.every((s) => !s.isActive)));

  const nextActiveState = params.role === "pemilik" ? true : !wasRevoked;

  const updatedSession: DeviceSession = {
    id: `sess_${params.role}_${currentDev.deviceId}`,
    deviceId: currentDev.deviceId,
    crewId: resolvedCrewId,
    crewName: params.crewName,
    jabatan: params.jabatan,
    role: params.role,
    deviceName: currentDev.deviceName,
    deviceType: currentDev.deviceType,
    os: currentDev.os,
    browser: currentDev.browser,
    resolution: currentDev.resolution,
    locationHint: "Perangkat Ini (Terdeteksi Otomatis)",
    loginTime: nowIso,
    lastActive: nowIso,
    isActive: nextActiveState,
    isCurrentDevice: true,
  };

  const filtered = sessions.filter((s) => !s.isCurrentDevice);
  const nextSessions = [updatedSession, ...filtered];

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(nextSessions));
    }
  } catch {}

  // Simpan ke Supabase di background
  getActiveUser()
    .then((user) => {
      if (user) {
        supabase
          .from("crew_device_sessions")
          .upsert(mapModelToDBSession(updatedSession, user.id))
          .then(() => {}, () => {});
      }
    })
    .catch(() => {});

  // Jika login sebagai kru, perbarui juga info device di daftar kru
  if (params.role === "kru" && params.crewId) {
    const updatedMembers = members.map((m) =>
      m.id === params.crewId
        ? {
            ...m,
            status: (nextActiveState ? "online" : "nonaktif") as CrewMember["status"],
            lastActive: nowIso,
            currentDevice: {
              deviceName: currentDev.deviceName,
              deviceType: currentDev.deviceType,
              os: currentDev.os,
              browser: currentDev.browser,
              locationHint: "Perangkat Aktif Saat Ini",
              loginAt: nowIso,
              isCurrentDevice: true,
            },
          }
        : m
    );
    saveCrewMembers(updatedMembers);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rbac-audit-updated"));
  }

  return updatedSession;
}

export function toggleDeviceSessionStatus(sessionId: string): void {
  const sessions = getDeviceSessions();
  const target = sessions.find((s) => s.id === sessionId);
  if (!target) return;

  const nextActive = !target.isActive;
  let targetSession: DeviceSession | undefined;

  const updated = sessions.map((s) => {
    if (s.id === sessionId || (target.role === "kru" && s.crewId === target.crewId)) {
      const mod = { ...s, isActive: nextActive };
      if (s.id === sessionId) targetSession = mod;
      return mod;
    }
    return s;
  });

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}

  // Sinkronkan ke Supabase di background
  getActiveUser()
    .then((user) => {
      if (user) {
        supabase
          .from("crew_device_sessions")
          .update({ is_active: nextActive, last_active: new Date().toISOString() })
          .eq("id", sessionId)
          .then(() => {}, () => {});

        if (target.role === "kru" && target.crewId) {
          supabase
            .from("crew_members")
            .update({
              status: nextActive ? "online" : "nonaktif",
              last_active: new Date().toISOString(),
            })
            .eq("id", target.crewId)
            .then(() => {}, () => {});
        }
      }
    })
    .catch(() => {});

  // Sinkronkan status personel di daftar kru agar Daftar Kru & Sesi Login konsisten
  if (target.role === "kru" && target.crewId) {
    const members = getCrewMembers();
    const updatedMembers = members.map((m) =>
      m.id === target.crewId
        ? {
            ...m,
            status: (nextActive ? "online" : "nonaktif") as CrewMember["status"],
          }
        : m
    );
    saveCrewMembers(updatedMembers);
  }

  if (targetSession) {
    logCrewActivity({
      kategori: "keamanan_rbac",
      aksi: targetSession.isActive
        ? "Memulihkan Akses Perangkat Kru"
        : "Memutus Sesi Perangkat (Force Logout)",
      detail: `${targetSession.isActive ? "Mengaktifkan kembali" : "Memutus paksa"} sesi login perangkat ${targetSession.deviceName} milik ${targetSession.crewName} (${targetSession.jabatan})`,
      status: targetSession.isActive ? "sukses" : "peringatan",
    });
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rbac-audit-updated"));
  }
}

export function isCrewSessionRevoked(crewId: string): boolean {
  if (!crewId || crewId === "owner_primary") return false;
  const members = getCrewMembers();
  const member = members.find((m) => m.id === crewId);
  if (member && member.status === "nonaktif") return true;

  const sessions = getDeviceSessions();
  const crewSessions = sessions.filter((s) => s.crewId === crewId);
  if (crewSessions.length > 0 && crewSessions.every((s) => !s.isActive)) {
    return true;
  }
  return false;
}

export function restoreCrewAccess(crewId: string): void {
  const sessions = getDeviceSessions();
  const updatedSessions = sessions.map((s) =>
    s.crewId === crewId ? { ...s, isActive: true } : s
  );
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
    }
  } catch {}

  const members = getCrewMembers();
  const targetMember = members.find((m) => m.id === crewId);
  const updatedMembers = members.map((m) =>
    m.id === crewId ? { ...m, status: "online" as const } : m
  );
  saveCrewMembers(updatedMembers);

  // Sync ke Supabase di background
  getActiveUser()
    .then((user) => {
      if (user) {
        supabase
          .from("crew_device_sessions")
          .update({ is_active: true, last_active: new Date().toISOString() })
          .eq("crew_id", crewId)
          .then(() => {}, () => {});

        supabase
          .from("crew_members")
          .update({ status: "online", last_active: new Date().toISOString() })
          .eq("id", crewId)
          .then(() => {}, () => {});
      }
    })
    .catch(() => {});

  if (targetMember) {
    logCrewActivity({
      kategori: "keamanan_rbac",
      aksi: "Memulihkan Akses Sesi Kru",
      detail: `Akses perangkat untuk ${targetMember.nama} (${targetMember.jabatan}) telah dipulihkan kembali`,
      status: "sukses",
    });
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rbac-audit-updated"));
  }
}

export function getActivityLogs(): CrewActivityLog[] {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(LOGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}
  const seed = getInitialSeedLogs();
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(seed));
    }
  } catch {}
  return seed;
}

export function logCrewActivity(entry: {
  kategori?: ActivityCategory;
  aksi?: string;
  detail?: string;
  actionType?: string;
  actionTitle?: string;
  actionDetail?: string;
  tripName?: string;
  status?: "sukses" | "peringatan" | "penting";
  customActor?: {
    crewId: string;
    crewName: string;
    jabatan: string;
    role: "pemilik" | "kru";
  };
}): CrewActivityLog {
  const currentDev = detectCurrentDevice();
  const currentRole =
    (typeof localStorage !== "undefined" &&
      (localStorage.getItem("app_user_role") as "pemilik" | "kru")) ||
    "pemilik";
  const activeCrew = getActiveCrewIdentity();
  const profile = getLocalBiroProfile();

  const actor = entry.customActor || {
    crewId: currentRole === "kru" ? activeCrew.crewId : "owner_primary",
    crewName:
      currentRole === "kru"
        ? activeCrew.nama
        : profile.pimpinan || "Pemilik Biro",
    jabatan:
      currentRole === "kru" ? activeCrew.jabatan : "Pemilik Biro",
    role: currentRole,
  };

  const mapActionTypeToCategory = (at?: string): ActivityCategory => {
    switch (at) {
      case "finance":
        return "keuangan_lapangan";
      case "checklist":
      case "vehicle":
        return "checklist_armada";
      case "manifest":
        return "manifest_kursi";
      case "rundown":
      case "note":
        return "catatan_htm";
      case "system":
        return "keamanan_rbac";
      default:
        return "operasional_trip";
    }
  };

  const resolvedKategori: ActivityCategory =
    entry.kategori || mapActionTypeToCategory(entry.actionType);
  const resolvedAksi = entry.aksi || entry.actionTitle || "Aktivitas Operasional";
  const resolvedDetail = entry.detail || entry.actionDetail || "-";

  const newLog: CrewActivityLog = {
    id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    crewId: actor.crewId,
    crewName: actor.crewName,
    jabatan: actor.jabatan,
    role: actor.role,
    kategori: resolvedKategori,
    aksi: resolvedAksi,
    detail: resolvedDetail,
    deviceUsed: `${currentDev.deviceName} • ${currentDev.os}`,
    deviceType: currentDev.deviceType,
    tripName: entry.tripName,
    timestamp: new Date().toISOString(),
    status: entry.status || "sukses",
  };

  const existing = getActivityLogs();
  const updated = [newLog, ...existing].slice(0, 100);

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}

  // Sync log langsung ke tabel database Supabase di background
  getActiveUser()
    .then((user) => {
      if (user) {
        supabase
          .from("crew_activity_logs")
          .insert(mapModelToDBLog(newLog, user.id))
          .then(() => {}, () => {});
      }
    })
    .catch(() => {});

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rbac-audit-updated"));
  }

  return newLog;
}

export function getRBACPermissionRules(): RBACPermissionRule[] {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(RULES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}
  return DEFAULT_RBAC_RULES;
}

export function hasKruPermission(ruleId: string): boolean {
  const rules = getRBACPermissionRules();
  const found = rules.find((r) => r.id === ruleId);
  if (!found) return false;
  return Boolean(found.aksesKru);
}

export function toggleKruPermissionRule(ruleId: string): RBACPermissionRule[] {
  const rules = getRBACPermissionRules();
  let changedRule: RBACPermissionRule | undefined;

  const updated = rules.map((r) => {
    if (r.id === ruleId) {
      const nextAccess = !r.aksesKru;
      changedRule = {
        ...r,
        aksesKru: nextAccess,
        keteranganKru: nextAccess
          ? "Diizinkan oleh Pemilik Biro"
          : "Diblokir (Khusus Pemilik Biro)",
      };
      return changedRule;
    }
    return r;
  });

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}

  // Sync ke Supabase di background
  if (changedRule) {
    const updatedRule = changedRule;
    getActiveUser()
      .then((user) => {
        if (user) {
          supabase
            .from("rbac_permission_rules")
            .update({
              akses_kru: updatedRule.aksesKru,
              keterangan_kru: updatedRule.keteranganKru,
              updated_at: new Date().toISOString(),
            })
            .eq("id", ruleId)
            .eq("user_id", user.id)
            .then(() => {}, () => {});
        }
      })
      .catch(() => {});
  }

  if (changedRule) {
    logCrewActivity({
      kategori: "keamanan_rbac",
      aksi: "Mengubah Kebijakan Hak Akses RBAC",
      detail: `Hak akses Kru pada modul "${changedRule.modul}" diubah menjadi: ${
        changedRule.aksesKru ? "DIIZINKAN" : "DIBLOKIR"
      }`,
      status: "penting",
    });
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rbac-audit-updated"));
  }

  return updated;
}
