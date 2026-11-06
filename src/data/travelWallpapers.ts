/**
 * travelWallpapers.ts
 * Katalog Wallpaper Wisata Estetik (Indonesia & Mancanegara)
 * 
 * Karakteristik:
 * 1. ROTASI OTOMATIS: Berganti gambar secara otomatis setiap 3 hari sekali.
 * 2. DROPDOWN MANUAL: Pengguna bisa memilih foto pemandangan favorit secara bebas lewat dropdown atau biarkan rotasi otomatis.
 * 3. STOK 2 BULAN LEBIH: Berisi 24 foto lanskap kurasi tinggi (24 foto x 3 hari = 72 hari / > 2 bulan).
 * 4. SIKLUS LOOP BERULANG: Setelah 72 hari habis, siklus mengulang kembali dari foto ke-1 secara mulus.
 * 5. DETERMINISTIK & SINKRON: Menggunakan perhitungan hari berbasis epoch tanggal sehingga seluruh perangkat melihat foto yang sama di hari yang sama.
 * 6. HIGH-PERFORMANCE & RELIABLE: Setiap item memiliki URL gambar resolusi tinggi + foto cadangan lokal (/hero-bromo.jpg, dll) jika pengguna sedang offline.
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
    imageUrl: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-raja-ampat",
    title: "Kepulauan Karst Wayag & Laguna Tosca",
    location: "Kepulauan Raja Ampat",
    country: "Papua Barat Daya, Indonesia",
    category: "indonesia",
    imageUrl: "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-borobudur",
    title: "Stupa Agung Candi Borobudur Fajar",
    location: "Magelang",
    country: "Jawa Tengah, Indonesia",
    category: "indonesia",
    imageUrl: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/borobudur.jpg",
  },
  {
    id: "wall-kelingking",
    title: "Tebing Kelingking & Laut Nusa Penida",
    location: "Nusa Penida",
    country: "Bali, Indonesia",
    category: "indonesia",
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/bali-beach.jpg",
  },
  {
    id: "wall-padar",
    title: "Puncak Bukit Tiga Teluk Pulau Padar",
    location: "Taman Nasional Komodo",
    country: "Labuan Bajo, NTT, Indonesia",
    category: "indonesia",
    imageUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-tumpak-sewu",
    title: "Tirai Air Terjun Megah Tumpak Sewu",
    location: "Pronojiwo, Lumajang",
    country: "Jawa Timur, Indonesia",
    category: "indonesia",
    imageUrl: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-toba",
    title: "Panorama Danau Vulkanik Toba & Samosir",
    location: "Danau Toba",
    country: "Sumatera Utara, Indonesia",
    category: "indonesia",
    imageUrl: "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-ijen",
    title: "Danau Tosca Kawah Ijen Fajar",
    location: "Gunung Ijen, Banyuwangi",
    country: "Jawa Timur, Indonesia",
    category: "indonesia",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-dieng",
    title: "Hamparan Bukit Kabut Dataran Tinggi Dieng",
    location: "Dataran Tinggi Dieng",
    country: "Wonosobo, Jawa Tengah, Indonesia",
    category: "indonesia",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/tea-plantation.jpg",
  },
  {
    id: "wall-belitung",
    title: "Pantai Granit Raksasa Tanjung Tinggi",
    location: "Sijuk, Belitung",
    country: "Bangka Belitung, Indonesia",
    category: "indonesia",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/bali-beach.jpg",
  },
  {
    id: "wall-beratan",
    title: "Pura Ulun Danu di Tengah Danau Beratan",
    location: "Bedugul, Tabanan",
    country: "Bali, Indonesia",
    category: "indonesia",
    imageUrl: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/borobudur.jpg",
  },
  {
    id: "wall-waerebo",
    title: "Desa Adat Mbaru Niang di Atas Awan",
    location: "Wae Rebo, Manggarai",
    country: "Flores, NTT, Indonesia",
    category: "indonesia",
    imageUrl: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/tea-plantation.jpg",
  },

  // ==========================================
  // BLOK MANCANEGARA (12 Lanskap Dunia Terbaik)
  // ==========================================
  {
    id: "wall-fuji",
    title: "Gunung Fuji & Danau Kawaguchiko",
    location: "Prefektur Yamanashi",
    country: "Jepang",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-matterhorn",
    title: "Puncak Piramida Salju Matterhorn & Zermatt",
    location: "Pegunungan Alpen, Valais",
    country: "Swiss",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-cappadocia",
    title: "Balon Udara di Lembah Peri Cappadocia",
    location: "Goreme, Cappadocia",
    country: "Turki",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-santorini",
    title: "Kubah Biru & Tebing Putih Kaldera Oia",
    location: "Santorini, Laut Aegea",
    country: "Yunani",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/bali-beach.jpg",
  },
  {
    id: "wall-hallstatt",
    title: "Desa Klasik Tepi Danau Salzkammergut",
    location: "Hallstatt, Upper Austria",
    country: "Austria",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-moraine",
    title: "Danau Pirus Moraine & Valley of the Ten Peaks",
    location: "Banff National Park, Alberta",
    country: "Kanada",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-guilin",
    title: "Sungai Li Berkelok di Antara Puncak Karst",
    location: "Guilin & Yangshuo, Guangxi",
    country: "Tiongkok",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-dolomites",
    title: "Pegunungan Val di Funes & Santa Magdalena",
    location: "Dolomites, South Tyrol",
    country: "Italia",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-arashiyama",
    title: "Lorong Hutan Bambu Hijau Sagano",
    location: "Arashiyama, Kyoto",
    country: "Jepang",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/tea-plantation.jpg",
  },
  {
    id: "wall-eiffel",
    title: "Senja Menara Eiffel & Sungai Seine",
    location: "Paris, Île-de-France",
    country: "Prancis",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/hero-bromo.jpg",
  },
  {
    id: "wall-tulips",
    title: "Hamparan Tulip Warna-Warni & Kincir Angin",
    location: "Lisse, Keukenhof",
    country: "Belanda",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/tea-plantation.jpg",
  },
  {
    id: "wall-sydney",
    title: "Sydney Opera House & Dermaga Harbour Bridge",
    location: "Sydney Harbour, NSW",
    country: "Australia",
    category: "international",
    imageUrl: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80",
    fallbackUrl: "/bali-beach.jpg",
  },
];

export interface ActiveWallpaperResult extends TravelWallpaper {
  dayInCycle: number; // Hari ke-1, ke-2, atau ke-3 dari siklus aktif
  daysRemaining: number; // Berapa hari lagi sebelum berganti
  cycleIndex: number;
  totalWallpapers: number;
  wallpaperIndex: number;
  isManual: boolean;
}

const STORAGE_KEY = "catatbiro_custom_wallpaper";

export function getCustomWallpaperSetting(): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(STORAGE_KEY);
    }
  } catch {}
  return null;
}

export function setCustomWallpaperSetting(wallpaperIdOrAuto: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      if (!wallpaperIdOrAuto || wallpaperIdOrAuto === "auto") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, wallpaperIdOrAuto);
      }
      window.dispatchEvent(new CustomEvent("wallpaper-changed"));
    }
  } catch {}
}

/**
 * Menghitung foto aktif berdasarkan rotasi per 3 hari sekali atau pilihan manual pengguna.
 */
export function getActiveTravelWallpaper(): ActiveWallpaperResult {
  const customId = getCustomWallpaperSetting();

  // Jika pengguna memilih foto spesifik lewat dropdown
  if (customId && customId !== "auto") {
    const foundIdx = TRAVEL_WALLPAPERS.findIndex((w) => w.id === customId);
    if (foundIdx !== -1) {
      const selected = TRAVEL_WALLPAPERS[foundIdx];
      return {
        ...selected,
        dayInCycle: 1,
        daysRemaining: 3,
        cycleIndex: foundIdx,
        totalWallpapers: TRAVEL_WALLPAPERS.length,
        wallpaperIndex: foundIdx,
        isManual: true,
      };
    }
  }

  // Jika mode otomatis (3 hari sekali)
  const baseEpoch = new Date("2026-01-01T00:00:00Z").getTime();
  const now = Date.now();
  const totalDays = Math.max(0, Math.floor((now - baseEpoch) / (1000 * 60 * 60 * 24)));
  const cycleIndex = Math.floor(totalDays / 3);
  const wallpaperIndex = cycleIndex % TRAVEL_WALLPAPERS.length;
  
  const dayInCycle = (totalDays % 3) + 1;
  const daysRemaining = 3 - (totalDays % 3);
  const selected = TRAVEL_WALLPAPERS[wallpaperIndex];

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
