/**
 * Helper Pencari Foto Destinasi Wisata Otomatis (AI & Curated Smart Search)
 * Mendeteksi nama kota / destinasi yang diketikkan pengguna (misal: "Semarang", "Jogja", "Bromo")
 * dan mencarikan foto landmark ikonik secara real-time.
 */

export interface DestinationPhoto {
  nama: string;
  lokasi: string;
  url: string;
  isCurated: boolean;
}

// 1. Koleksi kurasi destinasi wisata populer Indonesia (Instant & Super Cepat)
const CURATED_DESTINATIONS: Record<string, DestinationPhoto> = {
  semarang: {
    nama: "Semarang (Lawang Sewu & Kota Lama)",
    lokasi: "Jawa Tengah",
    url: "/destinations/semarang.jpg?v=2",
    isCurated: true,
  },
  kudus: {
    nama: "Kudus (Menara Kudus & Wisata Religi)",
    lokasi: "Jawa Tengah",
    url: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  menarakudus: {
    nama: "Menara Kudus & Makam Sunan Kudus",
    lokasi: "Kudus, Jawa Tengah",
    url: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  demak: {
    nama: "Demak (Masjid Agung & Sunan Kalijaga)",
    lokasi: "Jawa Tengah",
    url: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  jepara: {
    nama: "Jepara & Pantai Bandengan",
    lokasi: "Jawa Tengah",
    url: "/bali-beach.jpg",
    isCurated: true,
  },
  lawangsewu: {
    nama: "Lawang Sewu Semarang",
    lokasi: "Semarang, Jawa Tengah",
    url: "/destinations/semarang.jpg?v=2",
    isCurated: true,
  },
  kotalama: {
    nama: "Kota Lama Semarang",
    lokasi: "Semarang, Jawa Tengah",
    url: "/destinations/semarang.jpg?v=2",
    isCurated: true,
  },
  bromo: {
    nama: "Gunung Bromo & Lautan Pasir",
    lokasi: "Jawa Timur",
    url: "/hero-bromo.jpg",
    isCurated: true,
  },
  tengger: {
    nama: "Taman Nasional Bromo Tengger",
    lokasi: "Jawa Timur",
    url: "/hero-bromo.jpg",
    isCurated: true,
  },
  borobudur: {
    nama: "Candi Borobudur Heritage",
    lokasi: "Magelang & Yogyakarta",
    url: "/borobudur.jpg",
    isCurated: true,
  },
  magelang: {
    nama: "Candi Borobudur & Magelang",
    lokasi: "Jawa Tengah",
    url: "/borobudur.jpg",
    isCurated: true,
  },
  yogyakarta: {
    nama: "Yogyakarta (Tugu & Malioboro)",
    lokasi: "D.I. Yogyakarta",
    url: "https://images.unsplash.com/photo-1584810359583-96fc3448beaa?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  jogja: {
    nama: "Yogyakarta Istimewa",
    lokasi: "D.I. Yogyakarta",
    url: "https://images.unsplash.com/photo-1584810359583-96fc3448beaa?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  malioboro: {
    nama: "Kawasan Malioboro & Keraton",
    lokasi: "D.I. Yogyakarta",
    url: "https://images.unsplash.com/photo-1584810359583-96fc3448beaa?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  prambanan: {
    nama: "Candi Prambanan",
    lokasi: "Sleman, Yogyakarta",
    url: "https://images.unsplash.com/photo-1584810359583-96fc3448beaa?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  bali: {
    nama: "Pulau Dewata Bali",
    lokasi: "Bali",
    url: "/bali-beach.jpg",
    isCurated: true,
  },
  denpasar: {
    nama: "Denpasar & Pantai Sanur",
    lokasi: "Bali",
    url: "/bali-beach.jpg",
    isCurated: true,
  },
  kuta: {
    nama: "Pantai Kuta & Seminyak",
    lokasi: "Badung, Bali",
    url: "/bali-beach.jpg",
    isCurated: true,
  },
  ubud: {
    nama: "Terasering Sawah Ubud",
    lokasi: "Gianyar, Bali",
    url: "/bali-beach.jpg",
    isCurated: true,
  },
  puncak: {
    nama: "Agrowisata Kebun Teh Puncak",
    lokasi: "Bogor, Jawa Barat",
    url: "/tea-plantation.jpg",
    isCurated: true,
  },
  bogor: {
    nama: "Bogor & Agrowisata Puncak",
    lokasi: "Jawa Barat",
    url: "/tea-plantation.jpg",
    isCurated: true,
  },
  bandung: {
    nama: "Bandung (Gedung Sate & Lembang)",
    lokasi: "Jawa Barat",
    url: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  lembang: {
    nama: "Wisata Alam Lembang",
    lokasi: "Bandung Barat, Jawa Barat",
    url: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  ciwidey: {
    nama: "Kawah Putih Ciwidey",
    lokasi: "Bandung Selatan, Jawa Barat",
    url: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  malang: {
    nama: "Malang & Wisata Kota Batu",
    lokasi: "Jawa Timur",
    url: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  batu: {
    nama: "Kota Wisata Batu",
    lokasi: "Jawa Timur",
    url: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  solo: {
    nama: "Solo (Keraton Surakarta)",
    lokasi: "Jawa Tengah",
    url: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  surakarta: {
    nama: "Kota Budaya Surakarta",
    lokasi: "Jawa Tengah",
    url: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  surabaya: {
    nama: "Metropolis Surabaya & Suramadu",
    lokasi: "Jawa Timur",
    url: "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  jakarta: {
    nama: "Ibukota Jakarta & Monas",
    lokasi: "DKI Jakarta",
    url: "/monas-jakarta.jpg",
    isCurated: true,
  },
  monas: {
    nama: "Monumen Nasional (Monas)",
    lokasi: "DKI Jakarta",
    url: "/monas-jakarta.jpg",
    isCurated: true,
  },
  dieng: {
    nama: "Dataran Tinggi Dieng",
    lokasi: "Wonosobo & Banjarnegara",
    url: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  wonosobo: {
    nama: "Wonosobo & Dieng Plateau",
    lokasi: "Jawa Tengah",
    url: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  lombok: {
    nama: "Pulau Lombok & Mandalika",
    lokasi: "Nusa Tenggara Barat",
    url: "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  labuanbajo: {
    nama: "Labuan Bajo & Pulau Padar",
    lokasi: "Manggarai Barat, NTT",
    url: "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  komodo: {
    nama: "Taman Nasional Komodo",
    lokasi: "Nusa Tenggara Timur",
    url: "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  banyuwangi: {
    nama: "Banyuwangi (Kawah Ijen & Baluran)",
    lokasi: "Jawa Timur",
    url: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=900&auto=format&fit=crop&q=80",
    isCurated: true,
  },
  karimunjawa: {
    nama: "Kepulauan Karimunjawa",
    lokasi: "Jepara, Jawa Tengah",
    url: "/bali-beach.jpg",
    isCurated: true,
  },
  danautoba: {
    nama: "Danau Toba & Pulau Samosir",
    lokasi: "Sumatera Utara",
    url: "/tea-plantation.jpg",
    isCurated: true,
  },
  pangandaran: {
    nama: "Pantai Pangandaran",
    lokasi: "Jawa Barat",
    url: "/bali-beach.jpg",
    isCurated: true,
  },
  belitung: {
    nama: "Pantai Belitung & Batu Granit",
    lokasi: "Bangka Belitung",
    url: "/bali-beach.jpg",
    isCurated: true,
  },
};

// Default fallback photo jika destinasi belum terdaftar
const DEFAULT_PHOTO: DestinationPhoto = {
  nama: "Pesona Wisata Nusantara",
  lokasi: "Indonesia",
  url: "/borobudur.jpg",
  isCurated: true,
};

// LocalStorage cache key
const CACHE_KEY = "app_destination_photo_cache_v2";

const getCachedPhotos = (): Record<string, DestinationPhoto> => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveToCache = (key: string, data: DestinationPhoto) => {
  try {
    const cache = getCachedPhotos();
    cache[key] = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

/**
 * Mencari foto destinasi secara cerdas:
 * 1. Cek kurasi preset instan (Bromo, Semarang, Jogja, Bali, Bandung, dll)
 * 2. Cek cache lokal
 * 3. Jika tidak ada, panggil Wikipedia API secara dinamis di latar belakang
 */
export async function findDestinationPhoto(rawQuery: string): Promise<DestinationPhoto> {
  if (!rawQuery || rawQuery.trim().length === 0) {
    return DEFAULT_PHOTO;
  }

  const query = rawQuery.trim().toLowerCase();
  const cleanKey = query.replace(/[^a-z0-9]/g, "");

  // 1. Cek kecocokan langsung atau sebagian di curated preset
  for (const [key, item] of Object.entries(CURATED_DESTINATIONS)) {
    if (cleanKey.includes(key) || key.includes(cleanKey)) {
      return item;
    }
  }

  // 2. Cek di local cache
  const cache = getCachedPhotos();
  if (cache[cleanKey]) {
    return cache[cleanKey];
  }

  // 3. Fallback: Cari secara dinamis via Wikipedia API
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      rawQuery + " Indonesia"
    )}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=1000&format=json&origin=*`;

    const res = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      const pages = Object.values(data.query?.pages || {}) as any[];
      for (const p of pages) {
        if (p.thumbnail?.source) {
          const result: DestinationPhoto = {
            nama: p.title || rawQuery,
            lokasi: "Indonesia",
            url: p.thumbnail.source,
            isCurated: false,
          };
          saveToCache(cleanKey, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn("Gagal mencari foto online untuk:", rawQuery, err);
  }

  // Fallback default jika tidak ada hasil
  return {
    nama: rawQuery,
    lokasi: "Pariwisata Indonesia",
    url: DEFAULT_PHOTO.url,
    isCurated: true,
  };
}

/**
 * Versi sinkron untuk render instan pada UI (tidak menunggu network)
 */
export function getInstantDestinationPhoto(rawQuery?: string): DestinationPhoto {
  if (!rawQuery || rawQuery.trim().length === 0) {
    return DEFAULT_PHOTO;
  }

  const query = rawQuery.trim().toLowerCase();
  const cleanKey = query.replace(/[^a-z0-9]/g, "");

  // Cek curated
  for (const [key, item] of Object.entries(CURATED_DESTINATIONS)) {
    if (cleanKey.includes(key) || key.includes(cleanKey)) {
      return item;
    }
  }

  // Cek cache
  const cache = getCachedPhotos();
  if (cache[cleanKey]) {
    return cache[cleanKey];
  }

  return {
    nama: rawQuery,
    lokasi: "Indonesia",
    url: DEFAULT_PHOTO.url,
    isCurated: true,
  };
}
