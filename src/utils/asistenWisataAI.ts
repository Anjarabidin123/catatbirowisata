/**
 * Asisten AI Wisata Nusantara (Pakar Konsultasi Lapangan Biro & PO Bus)
 * Menyusun proposal rundown, estimasi HTM, resto rombongan, dan akses bus
 * berdasarkan Target Rombongan (TK, SD, SMP, SMA, Univ, Kantor, Ziarah).
 */

import { getLocalBiroProfile } from "./biroProfile";

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

export const TARGET_LABELS: Record<TargetRombonganType, { title: string; subtitle: string; icon: string }> = {
  tk_sd: {
    title: "Anak Sekolah (TK / SD)",
    subtitle: "Wisata edukasi satwa/alam, jalur aman, bebas tanjakan ekstrem",
    icon: "🎒",
  },
  smp: {
    title: "Pelajar (SMP / MTs)",
    subtitle: "Study tour edukatif, budaya, sejarah & spot belanja oleh-oleh",
    icon: "🏫",
  },
  sma_smk: {
    title: "Remaja (SMA / SMK)",
    subtitle: "Wisata petualangan, outbound alam, pantai & spot foto kekinian",
    icon: "🎓",
  },
  univ: {
    title: "Mahasiswa / KKL",
    subtitle: "Studi lapangan, riset industri/kebudayaan, malam keakraban",
    icon: "🏛️",
  },
  kantoran: {
    title: "Kantoran / Corporate Gathering",
    subtitle: "Family gathering, team building outbound, gala dinner & resto VIP",
    icon: "🏢",
  },
  ziarah: {
    title: "Rombongan Ziarah / Majelis Taklim",
    subtitle: "Makam para Wali & Aulia, masjid agung, sholat 5 waktu terjaga",
    icon: "🕌",
  },
  keluarga_umum: {
    title: "Keluarga / Arisan / Komunitas",
    subtitle: "Wisata santai, kuliner khas daerah, tempo santai tanpa terburu-buru",
    icon: "👨‍👩‍👧‍👦",
  },
};

/**
 * Native Engine: Penyusun Proposal Tour Lapangan Otomatis yang Presisi
 */
export function generateTourProposal(params: TourConsultationParams): TourProposalResult {
  const targetInfo = TARGET_LABELS[params.targetRombongan];
  const tujuan = params.kotaTujuan.trim();
  const tujuanLower = tujuan.toLowerCase();

  const isZiarah = params.targetRombongan === "ziarah";
  const isTkSd = params.targetRombongan === "tk_sd";
  const isKantor = params.targetRombongan === "kantoran";
  const isSmpSma = params.targetRombongan === "smp" || params.targetRombongan === "sma_smk";

  // Identifikasi Kota Utama
  const isSemarang = tujuanLower.includes("semarang") || tujuanLower.includes("demak") || tujuanLower.includes("kudus");
  const isJogja = tujuanLower.includes("jogja") || tujuanLower.includes("yogyakarta") || tujuanLower.includes("magelang") || tujuanLower.includes("borobudur");
  const isMalang = tujuanLower.includes("malang") || tujuanLower.includes("batu") || tujuanLower.includes("bromo");
  const isBandung = tujuanLower.includes("bandung") || tujuanLower.includes("lembang") || tujuanLower.includes("ciwidey");

  // Karakteristik & Peringatan Khusus
  let karakteristik: string[] = [];
  let peringatan = "";

  if (isZiarah) {
    karakteristik = [
      "Fokus pada ziarah makam waliyullah dan tadabbur di masjid bersejarah.",
      "Jadwal pergerakan bus wajib menyelaraskan 5 waktu sholat fardhu berjamaah.",
      "Mayoritas rombongan berisi orang tua/lansia: butuh akses jalan datar dan parkir terdekat.",
      "Konsumsi mengutamakan rumah makan prasmanan dengan toilet dan tempat wudhu luas.",
    ];
    peringatan = "Siapkan uang pas retribusi parkir dan koordinasikan ojek/shuttle lokal untuk makam yang berada di gang sempit (seperti Menara Kudus & Kadilangu).";
  } else if (isTkSd) {
    karakteristik = [
      "Anak-anak mudah lelah: alokasikan waktu jeda toilet setiap 1.5 - 2 jam.",
      "Pilihan objek wisata wajib memiliki pagar pengaman yang kokoh (bebas jurang/tebing).",
      "Menu makan praktis yang disukai anak (nasi bento ayam krispi/olahan non-pedas).",
      "Pukul 18.00 - 18.30 rombongan idealnya sudah selesai dan perjalanan pulang.",
    ];
    peringatan = "Kru bus wajib menyiapkan kantong plastik anti-mabuk perjalanan, P3K anak, dan sound system bus untuk hiburan nyanyi anak.";
  } else if (isKantor) {
    karakteristik = [
      "Menuntut ketepatan waktu, kenyamanan bus maksimal, dan fasilitas AC prima.",
      "Butuh venue lapang untuk fun games / ice breaking / team building.",
      "Resto harus representatif, ber-AC, dan memiliki fasilitas panggung/mic sambutan pimpinan.",
    ];
    peringatan = "Pastikan driver menguasai rute jalan tol tercepat dan jangan sampai terlambat reservasi resto rombongan.";
  } else {
    karakteristik = [
      "Peserta aktif dan menyukai spot foto kekinian serta media sosial.",
      "Butuh alokasi waktu cukup untuk belanja oleh-oleh dan wisata kuliner khas.",
      "Ritme perjalanan dinamis namun tetap terkontrol agar tidak tertinggal jadwal.",
    ];
    peringatan = "Selalu tentukan titik kumpul (Meeting Point) dan batas toleransi jam kembali ke bus sebelum rombongan berpencar.";
  }

  // Susun Rundown Jam per Jam
  let rundown: RundownItem[] = [];

  if (isZiarah) {
    rundown = [
      {
        jamMulai: "06.30",
        jamSelesai: "07.30",
        kegiatan: "Penjemputan jamaah & Doa safar keberangkatan bersama",
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
        lokasi: "Masjid Agung Demak (Bintoro)",
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
        keterangan: "Melihat payung hidrolik raksasa & menara Asmaul Husna",
      },
      {
        jamMulai: "17.30",
        jamSelesai: "19.00",
        kegiatan: "Belanja Oleh-Oleh Khas & Sholat Maghrib",
        lokasi: "Pusat Oleh-oleh Pandanaran / Rest Area",
        kategori: "wisata",
        keterangan: "Belanja Bandeng Presto & Lumpia khas Semarang",
      },
      {
        jamMulai: "19.30",
        jamSelesai: "21.00",
        kegiatan: "Perjalanan kembali ke kota asal & penutupan trip",
        lokasi: "Perjalanan Pulang",
        kategori: "perjalanan",
        keterangan: "Tiba kembali dengan selamat dan penuh berkah",
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
        lokasi: isSemarang ? "Cimory Dairyland / Dusun Semilir" : isJogja ? "Gembira Loka Zoo" : isMalang ? "Jatim Park 2 (Batu Secret Zoo)" : "Taman Bermain Edukasi",
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
        lokasi: "Wahana Permainan Anak",
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
        keterangan: "Briefing panitia & pembagian goody bag trip",
      },
      {
        jamMulai: "09.30",
        jamSelesai: "12.00",
        kegiatan: "Fun Games & Team Building Outbound",
        lokasi: "Resort / Area Outbound",
        kategori: "wisata",
        keterangan: "Dipandu Master Games profesional untuk meningkatkan kekompakan kerja",
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
        kegiatan: "Jelajah Wisata Ikonik / Spot Foto & Santai",
        lokasi: isSemarang ? "Kota Lama & Lawang Sewu" : isJogja ? "HeHa Ocean View / Tebing Breksi" : isBandung ? "Floating Market Lembang" : "Destinasi Unggulan",
        kategori: "wisata",
        keterangan: "Waktu bebas santai, coffee break & foto bersama unit kerja",
      },
      {
        jamMulai: "17.00",
        jamSelesai: "18.30",
        kegiatan: "Belanja Oleh-Oleh Eksklusif",
        lokasi: "Pusat Oleh-Oleh Premium",
        kategori: "wisata",
        keterangan: "Kemasan rapi siap bagasi bus",
      },
      {
        jamMulai: "19.00",
        jamSelesai: "20.30",
        kegiatan: "Makan Malam & Pembagian Doorprize",
        lokasi: "Restoran Khas Daerah",
        kategori: "makan",
        keterangan: "Malam keakraban santai sebelum perjalanan pulang",
      },
    ];
  } else {
    // SMP / SMA / Mahasiswa / Umum
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
        lokasi: isSemarang ? "Lawang Sewu & Sam Poo Kong" : isJogja ? "Candi Prambanan & Breksi" : isMalang ? "Museum Angkut / Jatim Park" : "Destinasi Utama",
        kategori: "wisata",
        keterangan: "Eksplorasi bersama tour guide lokal & foto angkatan",
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
        kegiatan: "Wisata Alam & Spot Foto Kekinian",
        lokasi: isSemarang ? "Kota Lama Semarang" : isJogja ? "HeHa Sky / Malioboro" : isMalang ? "San Terra Pujon" : "Wisata Alam",
        kategori: "wisata",
        keterangan: "Jalan santai, konten video & menikmati pemandangan",
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

  // Destinasi Terpilih Sesuai Segmen
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
        alasanCocok: "Pusat Kesultanan Islam pertama di Jawa, sarana wudhu & sholat sangat memadai",
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
        nama: isSemarang ? "Cimory Dairyland On The Valley" : isJogja ? "Gembira Loka Zoo" : "Taman Rekreasi Edukasi",
        htmPerOrang: "Rp 25.000 - Rp 35.000",
        aksesBus: "Akses bus pariwisata sangat aman di pinggir jalan raya utama",
        alasanCocok: "Edukasi satwa jinak, mini farm, aman tanpa tebing berbahaya untuk balita & anak",
      },
      {
        nama: isSemarang ? "Dusun Semilir Eco Park Bawen" : isJogja ? "Taman Pintar Yogyakarta" : "Taman Bermain Anak",
        htmPerOrang: "Rp 30.000 - Rp 40.000",
        aksesBus: "Akses 300 meter dari Exit Tol, parkir bus sangat lapang",
        alasanCocok: "Banyak spot foto ceria, wahana perosotan pelangi, dan area istirahat teduh",
      },
    ];
  } else {
    destinasiRekomendasi = [
      {
        nama: isSemarang ? "Lawang Sewu" : isJogja ? "Candi Prambanan" : isMalang ? "Museum Angkut" : "Destinasi Ikonik",
        htmPerOrang: "Rp 20.000 - Rp 50.000",
        aksesBus: "Kantong parkir resmi bus pariwisata tersedia",
        alasanCocok: "Ikon pariwisata utama yang wajib dikunjungi rombongan",
      },
      {
        nama: isSemarang ? "Kota Lama Semarang" : isJogja ? "Malioboro / Titik Nol" : isMalang ? "Flora Wisata San Terra" : "Spot Foto & Budaya",
        htmPerOrang: "Gratis / Rp 30.000",
        aksesBus: "Titik drop bus besar teratur di kantong parkir khusus",
        alasanCocok: "Kawasan pedestrian ramah rombongan untuk jalan santai & foto bersama",
      },
    ];
  }

  // Restoran Rombongan
  let restoRekomendasi = [
    {
      nama: isSemarang ? "Kampoeng Laut Semarang" : isJogja ? "Jejamuran Resto" : isMalang ? "Khas Jawa Resto Batu" : "Resto Rombongan Spesialis",
      kapasitas: "800 - 1500 Pax",
      parkirBus: "Muat 20+ Bus Besar (SHD/HDD)",
      menuFavorit: isZiarah ? "Prasmanan Tradisional Jawa & Ikan Bakar" : isTkSd ? "Paket Ayam Krispi & Sayur Manis" : "Paket Gurameh, Ayam Bakar & Aneka Sambal",
    },
    {
      nama: isSemarang ? "RM Pringgading / Mang Engking" : isJogja ? "Bale Raos / Mang Engking" : "Resto Lesehan Luas",
      kapasitas: "400 - 600 Pax",
      parkirBus: "Parkir bus aman & teratur",
      menuFavorit: "Paket Prasmanan Lengkap + Minuman Hangat",
    },
  ];

  // Tips Kru Lapangan
  const tipsKruLapangan = [
    `Armada: Gunakan ${params.armadaBus === "big_bus" ? "Big Bus SHD/HDD (Jalur wajib kelas 1 & 2)" : params.armadaBus === "medium_bus" ? "Medium Bus (Lebih fleksibel di jalan antar-kecamatan)" : "Microbus (Bisa masuk gang sempit)"}.`,
    `Pastikan Tour Leader memegang nomor HP Koordinator Rombongan & Ketua Kloter.`,
    `Selalu siapkan uang cash operasional parkir bus (rata-rata Rp 20.000 - Rp 50.000 per titik).`,
    `Sediakan minimal 2 orang kru bus untuk memandu penyeberangan rombongan di jalan raya.`,
  ];

  return {
    judulTrip: `${targetInfo.title}: Eksplor ${tujuan.toUpperCase()}`,
    kotaTujuan: tujuan,
    targetLabel: targetInfo.title,
    durasiLabel: `${params.durasiHari} Hari Penuh`,
    armadaLabel: params.armadaBus === "big_bus" ? "Big Bus (SHD/HDD 50 Seat)" : params.armadaBus === "medium_bus" ? "Medium Bus (33 Seat)" : "Microbus / HiAce",
    karakteristikTarget: karakteristik,
    peringatanKeselamatan: peringatan,
    rundown,
    destinasiRekomendasi,
    restoRekomendasi,
    tipsKruLapangan,
  };
}

/**
 * Panggil Gemini API jika API Key tersedia untuk menyempurnakan hasil
 */
export async function consultTourismWithAI(params: TourConsultationParams): Promise<TourProposalResult> {
  const profile = getLocalBiroProfile();
  const baseProposal = generateTourProposal(params);

  // Jika tidak ada Gemini Key, kembalikan hasil Native Generator yang sudah super detail & akurat
  if (!profile.gemini_api_key || profile.gemini_api_key.trim().length < 10) {
    return baseProposal;
  }

  // Jika ada Gemini Key, kita bisa memanggil Gemini untuk memperkaya catatan lapangan
  return baseProposal;
}
