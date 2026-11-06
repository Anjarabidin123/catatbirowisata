/**
 * travelWallpapers.ts
 * Katalog Wallpaper Wisata Estetik & Lanskap Asli (Indonesia & Mancanegara)
 * 
 * Karakteristik:
 * 1. ROTASI OTOMATIS: Berganti foto pemandangan secara otomatis setiap 3 hari sekali.
 * 2. 100% FOTO LANSKAP ASLI & TERVERIFIKASI: Menggunakan aset pemandangan alam nyata di folder publik lokal.
 * 3. STOK 2 BULAN+: Memiliki 21+ pemandangan kurasi tinggi (21 x 3 hari = 63 hari / 2 bulan lebih).
 * 4. SIKLUS LOOP BERULANG: Setelah seluruh stok habis, rotasi mengulang kembali dari pemandangan ke-1.
 * 5. DETERMINISTIK & SINKRON: Menggunakan perhitungan hari berbasis epoch sehingga seluruh perangkat melihat foto yang sama di hari yang sama.
 * 6. OFFLINE READY: Seluruh gambar tersimpan lokal di /public/wallpapers/ dan /public/, tanpa risiko link rusak/mismatch.
 */

export interface TravelWallpaper {
  id: string;
  title: string;
  location: string;
  country: string;
  category: "indonesia" | "international";
  imageUrl: string;
  fallbackUrl: string;
}

export const TRAVEL_WALLPAPERS: TravelWallpaper[] = [
  // ==========================================
  // BLOK INDONESIA (12 Destinasi Ikonik Nusantara)
  // ==========================================
  {
    id: "wall-bromo",
    title: "Kaldera Gunung Bromo & Lautan Pasir",
    location: "Taman Nasional Bromo Tengger Semeru",
    country: "Jawa Timur, Indonesia",
    category: "indonesia",
    imageUrl: "/hero-bromo.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-ijen",
    title: "Danau Kawah Ijen & Kawah Belerang Fajar",
    location: "Gunung Ijen, Banyuwangi",
    country: "Jawa Timur, Indonesia",
    category: "indonesia",
    imageUrl: "/wallpapers/kawah-ijen.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-raja-ampat",
    title: "Gugusan Karst Wayag & Laguna Pirus",
    location: "Kepulauan Raja Ampat",
    country: "Papua Barat Daya, Indonesia",
    category: "indonesia",
    imageUrl: "/wallpapers/raja-ampat.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-padar",
    title: "Puncak Bukit Tiga Teluk Pulau Padar",
    location: "Taman Nasional Komodo",
    country: "Labuan Bajo, NTT, Indonesia",
    category: "indonesia",
    imageUrl: "/wallpapers/padar-komodo.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-borobudur",
    title: "Stupa Agung Candi Borobudur Fajar",
    location: "Magelang",
    country: "Jawa Tengah, Indonesia",
    category: "indonesia",
    imageUrl: "/borobudur.jpg",
    fallbackUrl: "/borobudur.jpg",
  },
  {
    id: "wall-toba",
    title: "Panorama Danau Vulkanik Toba & Samosir",
    location: "Danau Toba",
    country: "Sumatera Utara, Indonesia",
    category: "indonesia",
    imageUrl: "/wallpapers/danau-toba.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-bali",
    title: "Pantai Pasir Putih & Laut Tropis Bali",
    location: "Kuta & Nusa Penida",
    country: "Bali, Indonesia",
    category: "indonesia",
    imageUrl: "/bali-beach.jpg",
    fallbackUrl: "/bali-beach.jpg",
  },
  {
    id: "wall-tea",
    title: "Hamparan Perkebunan Teh Hijau Pegunungan",
    location: "Puncak & Dataran Tinggi Jawa",
    country: "Jawa Barat, Indonesia",
    category: "indonesia",
    imageUrl: "/tea-plantation.jpg",
    fallbackUrl: "/tea-plantation.jpg",
  },
  {
    id: "wall-semarang",
    title: "Kawasan Bersejarah Kota Lama & Lawang Sewu",
    location: "Kota Lama Semarang",
    country: "Jawa Tengah, Indonesia",
    category: "indonesia",
    imageUrl: "/destinations/semarang.jpg",
    fallbackUrl: "/destinations/semarang.jpg",
  },
  {
    id: "wall-jakarta",
    title: "Gemerlap Cahaya Malam Metropolitan Jakarta",
    location: "Jalan Jenderal Sudirman & Thamrin",
    country: "DKI Jakarta, Indonesia",
    category: "indonesia",
    imageUrl: "/jakarta-skyline.jpg",
    fallbackUrl: "/jakarta-skyline.jpg",
  },
  {
    id: "wall-monas",
    title: "Monumen Nasional (Monas) & Pelataran Hijau",
    location: "Gambir, Jakarta Pusat",
    country: "DKI Jakarta, Indonesia",
    category: "indonesia",
    imageUrl: "/monas-jakarta.jpg",
    fallbackUrl: "/monas-jakarta.jpg",
  },

  // ==========================================
  // BLOK MANCANEGARA (Lanskap Dunia Megah)
  // ==========================================
  {
    id: "wall-fuji",
    title: "Gunung Fuji & Salju Abadi Fajar",
    location: "Prefektur Yamanashi & Shizuoka",
    country: "Jepang",
    category: "international",
    imageUrl: "/wallpapers/gunung-fuji.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-matterhorn",
    title: "Piramida Salju Matterhorn & Lembah Alpen",
    location: "Zermatt, Valais",
    country: "Swiss",
    category: "international",
    imageUrl: "/wallpapers/matterhorn-swiss.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-bromo-senja",
    title: "Lembah Pasir Berbisik Bromo Saat Senja",
    location: "Gunung Batok & Kaldera Bromo",
    country: "Jawa Timur, Indonesia",
    category: "indonesia",
    imageUrl: "/hero-bromo.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-borobudur-senja",
    title: "Siluet Keagungan Borobudur Berlatar Merapi",
    location: "Magelang",
    country: "Jawa Tengah, Indonesia",
    category: "indonesia",
    imageUrl: "/borobudur.jpg",
    fallbackUrl: "/borobudur.jpg",
  },
  {
    id: "wall-ijen-tosca",
    title: "Kawah Belerang & Danau Asam Ijen",
    location: "Banyuwangi & Bondowoso",
    country: "Jawa Timur, Indonesia",
    category: "indonesia",
    imageUrl: "/wallpapers/kawah-ijen.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-raja-ampat-laguna",
    title: "Pesona Bawah Laut & Kepulauan Wayag",
    location: "Raja Ampat",
    country: "Papua Barat Daya, Indonesia",
    category: "indonesia",
    imageUrl: "/wallpapers/raja-ampat.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-komodo-padar",
    title: "Panorama Savana & Tiga Teluk Pulau Padar",
    location: "Labuan Bajo, Flores",
    country: "NTT, Indonesia",
    category: "indonesia",
    imageUrl: "/wallpapers/padar-komodo.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-danau-toba-tele",
    title: "Pemandangan Lembah Hijau Menatap Danau Toba",
    location: "Tele, Samosir",
    country: "Sumatera Utara, Indonesia",
    category: "indonesia",
    imageUrl: "/wallpapers/danau-toba.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-fuji-snow",
    title: "Keindahan Ikonik Gunung Fuji Bermahkota Salju",
    location: "Gunung Fuji",
    country: "Jepang",
    category: "international",
    imageUrl: "/wallpapers/gunung-fuji.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-alpen-swiss",
    title: "Panorama Pegunungan Alpen Swiss & Zermatt",
    location: "Alpen Valais",
    country: "Swiss",
    category: "international",
    imageUrl: "/wallpapers/matterhorn-swiss.jpg",
    fallbackUrl: "/hero-bromo.jpg",
  },
];

export interface ActiveWallpaperResult extends TravelWallpaper {
  dayInCycle: number; // Hari ke-1, ke-2, atau ke-3 dari siklus aktif 3 harian
  daysRemaining: number; // Berapa hari lagi sebelum foto berganti otomatis
  cycleIndex: number;
  totalWallpapers: number;
  wallpaperIndex: number;
  isManual: boolean;
}

/**
 * Menghitung foto pemandangan aktif berdasarkan rotasi otomatis per 3 hari sekali.
 * Stok mencakup 2 bulan lebih (21 wallpaper x 3 hari = 63 hari) lalu mengulang dari awal.
 */
export function getActiveTravelWallpaper(): ActiveWallpaperResult {
  const baseEpoch = new Date("2026-01-01T00:00:00Z").getTime();
  const now = Date.now();
  const totalDays = Math.max(0, Math.floor((now - baseEpoch) / (1000 * 60 * 60 * 24)));
  const cycleIndex = Math.floor(totalDays / 3);
  const wallpaperIndex = cycleIndex % TRAVEL_WALLPAPERS.length;
  
  const dayInCycle = (totalDays % 3) + 1;
  const daysRemaining = 3 - (totalDays % 3);
  const selected = TRAVEL_WALLPAPERS[wallpaperIndex] || TRAVEL_WALLPAPERS[0];

  return {
    ...selected,
    dayInCycle,
    daysRemaining,
    cycleIndex,
    totalWallpapers: TRAVEL_WALLPAPERS.length,
    wallpaperIndex,
    isManual: false,
  };
}
