/**
 * biroCmsStore.ts
 * Pusat Kontrol CMS Biro:
 * 1. CMS Pengaturan Dokumen & Penandatangan PDF
 * 2. CMS Kategori Keuangan (Dinamis: Tambah/Edit/Hapus)
 * 3. CMS Master Data Rekanan (PO Bus, Rumah Makan, Pemandu)
 */

export interface CmsDocumentSettings {
  formatNomorSurat: string;
  footerTeksLaporan: string;
  syaratKwitansi: string;
  namaBagianKeuangan: string;
  jabatanBagianKeuangan: string;
  tampilkanStempelDigital: boolean;
}

export interface CmsKategoriItem {
  id: string;
  nama: string;
  jenis: "pemasukan" | "pengeluaran";
  deskripsi?: string;
  isDefault?: boolean;
}

export interface RekananBus {
  id: string;
  namaPO: string;
  kontakPerson: string;
  telepon: string;
  alamatGarasi?: string;
  catatanArmada?: string;
}

export interface RekananResto {
  id: string;
  namaResto: string;
  lokasiRute: string;
  kontakPerson: string;
  telepon: string;
  hargaPerPax?: number;
  menuFavorit?: string;
}

export interface RekananGuide {
  id: string;
  nama: string;
  destinasi: string;
  telepon: string;
  tarifStandar?: number;
  catatan?: string;
}

export interface BiroCmsData {
  dokumen: CmsDocumentSettings;
  kategoriKeuangan: CmsKategoriItem[];
  rekananBus: RekananBus[];
  rekananResto: RekananResto[];
  rekananGuide: RekananGuide[];
}

const STORAGE_KEY = "catatbiro_cms_data_v1";

export const DEFAULT_CMS_DATA: BiroCmsData = {
  dokumen: {
    formatNomorSurat: "CBW/KEU/{YYYY}/{MM}/{NO}",
    footerTeksLaporan: "Dokumen resmi dan sah diterbitkan melalui Sistem Informasi Catat Biro Wisata.",
    syaratKwitansi: "Pembayaran sah apabila disertai transfer bank resmi atau tanda terima bermaterai/stempel.",
    namaBagianKeuangan: "Staff Keuangan & Kasir",
    jabatanBagianKeuangan: "Bagian Administrasi & Keuangan",
    tampilkanStempelDigital: true,
  },
  kategoriKeuangan: [
    { id: "kat-in-1", nama: "Pelunasan Paket Wisata", jenis: "pemasukan", deskripsi: "Pembayaran lunas dari instansi/sekolah" },
    { id: "kat-in-2", nama: "Uang Muka (DP) Rombongan", jenis: "pemasukan", deskripsi: "DP booking tanggal trip" },
    { id: "kat-in-3", nama: "Sewa Bus Lepas / Carter", jenis: "pemasukan", deskripsi: "Pendapatan sewa armada saja" },
    { id: "kat-in-4", nama: "Cashback & Komisi Vendor", jenis: "pemasukan", deskripsi: "Cashback resto, oleh-oleh, dll" },
    { id: "kat-out-2", nama: "Saldo Tol & Parkir", jenis: "pengeluaran", deskripsi: "E-Toll dan retribusi parkir wisata" },
    { id: "kat-out-3", nama: "Prasmanan & Restoran", jenis: "pengeluaran", deskripsi: "Makan siang/malam rombongan" },
    { id: "kat-out-4", nama: "Snack Box & Air Mineral", jenis: "pengeluaran", deskripsi: "Logistik konsumsi perjalanan" },
    { id: "kat-out-5", nama: "Tiket Masuk & Shuttle Wisata", jenis: "pengeluaran", deskripsi: "HTM objek wisata, jeep, atau kapal" },
    { id: "kat-out-6", nama: "Honor Sopir & Kru Armada", jenis: "pengeluaran", deskripsi: "Fee driver dan co-driver" },
    { id: "kat-out-7", nama: "Honor Kru & Tim Lapangan", jenis: "pengeluaran", deskripsi: "Fee pendamping lapangan dan logistik" },
    { id: "kat-out-8", nama: "Operasional Darurat & P3K", jenis: "pengeluaran", deskripsi: "Banner, obat-obatan, dan insidental" },
  ],
  rekananBus: [
    {
      id: "bus-1",
      namaPO: "PO Haryanto Pariwisata",
      kontakPerson: "Pak Haryanto",
      telepon: "0812-2890-7711",
      alamatGarasi: "Kudus / Demak",
      catatanArmada: "Jetbus 3+ HDD (50 Seat) & SHD (48 Seat)",
    },
    {
      id: "bus-2",
      namaPO: "PO Shantika Bus Pariwisata",
      kontakPerson: "Mas Danang",
      telepon: "0852-9011-2233",
      alamatGarasi: "Jepara",
      catatanArmada: "Medium Bus (31-35 Seat) & Big Bus Luxury",
    },
    {
      id: "bus-3",
      namaPO: "PO Nusantara Tour",
      kontakPerson: "Pak Bambang",
      telepon: "0813-2612-4455",
      alamatGarasi: "Kudus",
      catatanArmada: "Big Bus Scania & Mercedes-Benz",
    },
  ],
  rekananResto: [
    {
      id: "resto-1",
      namaResto: "RM Grafika Cikole / Kalasan",
      lokasiRute: "Jalur Wisata Lembang / Jogja",
      kontakPerson: "Bu Rina (Bag. Reservasi)",
      telepon: "0812-3456-7890",
      hargaPerPax: 35000,
      menuFavorit: "Paket Nasi Timbel Komplit + Ayam Bakar Madu",
    },
    {
      id: "resto-2",
      namaResto: "RM Candisari Karanganyar Kebumen",
      lokasiRute: "Jalur Selatan Jawa",
      kontakPerson: "Pak Joko",
      telepon: "0828-9876-5432",
      hargaPerPax: 30000,
      menuFavorit: "Prasmanan Jawa Lengkap, Parkir Bus Luas & Toilet Bersih",
    },
    {
      id: "resto-3",
      namaResto: "RM Baledono Purworejo",
      lokasiRute: "Jalur Jogja - Purworejo",
      kontakPerson: "Ibu Indah",
      telepon: "0857-1122-3344",
      hargaPerPax: 28000,
      menuFavorit: "Prasmanan Ayam Goreng Kampung & Sayur Asem",
    },
  ],
  rekananGuide: [
    {
      id: "guide-1",
      nama: "Paguyuban Jeep Bromo Semeru",
      destinasi: "Gunung Bromo & Penanjakan",
      telepon: "0821-3344-5566",
      tarifStandar: 650000,
      catatan: "Sewa Hardtop 4x4 PP Sunrise & Pasir Berbisik",
    },
    {
      id: "guide-2",
      nama: "Paguyuban Jeep Merapi Lava Tour",
      destinasi: "Kaliurang / Bunker Merapi",
      telepon: "0813-4455-6677",
      tarifStandar: 450000,
      catatan: "Rute Medium Tour Kaliadem & Museum Sisa Hartaku",
    },
    {
      id: "guide-3",
      nama: "HPI Borobudur & Prambanan",
      destinasi: "Candi Borobudur & Candi Prambanan",
      telepon: "0858-6677-8899",
      tarifStandar: 150000,
      catatan: "Pemandu resmi bersertifikat HPI per rombongan bus",
    },
  ],
};

let memoryCmsCache: BiroCmsData | null = null;

export function getBiroCmsData(): BiroCmsData {
  if (memoryCmsCache) return memoryCmsCache;

  if (typeof window === "undefined") return DEFAULT_CMS_DATA;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawCategories = parsed.kategoriKeuangan || DEFAULT_CMS_DATA.kategoriKeuangan;
      // Bersihkan kategori Tour Leader lama dan pos BBM (karena sudah include paket bayar bus)
      const sanitizedCategories = rawCategories
        .filter((k: any) => {
          const lower = (k.nama || "").toLowerCase();
          if (lower.includes("tour leader")) return false;
          if (lower.includes("bahan bakar") || lower.includes("solar") || lower === "bbm" || lower.includes("kas bbm")) return false;
          return true;
        })
        .map((k: any) => ({ ...k, isDefault: false }));

      memoryCmsCache = {
        ...DEFAULT_CMS_DATA,
        ...parsed,
        dokumen: { ...DEFAULT_CMS_DATA.dokumen, ...(parsed.dokumen || {}) },
        kategoriKeuangan: sanitizedCategories,
        rekananBus: parsed.rekananBus || DEFAULT_CMS_DATA.rekananBus,
        rekananResto: parsed.rekananResto || DEFAULT_CMS_DATA.rekananResto,
        rekananGuide: parsed.rekananGuide || DEFAULT_CMS_DATA.rekananGuide,
      };
      return memoryCmsCache;
    }
  } catch (e) {
    console.warn("Gagal memuat cache CMS:", e);
  }

  memoryCmsCache = DEFAULT_CMS_DATA;
  return memoryCmsCache;
}

export function saveBiroCmsData(newData: Partial<BiroCmsData>): BiroCmsData {
  const current = getBiroCmsData();
  const updated: BiroCmsData = {
    ...current,
    ...newData,
    dokumen: { ...current.dokumen, ...(newData.dokumen || {}) },
  };

  memoryCmsCache = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("biro-cms-updated", { detail: updated }));
    } catch (e) {
      console.warn("Gagal menyimpan ke localStorage:", e);
    }
  }

  return updated;
}

export function resetDefaultKategoriKeuangan(): BiroCmsData {
  return saveBiroCmsData({ kategoriKeuangan: DEFAULT_CMS_DATA.kategoriKeuangan });
}
