export interface LearnGuide {
  id: string;
  slug: string;
  title: string;
  category: "Operasional & Jadwal" | "Manifest & Bus" | "Keuangan & Kas" | "Infrastruktur & Cloud" | "Kru & Keamanan";
  summary: string;
  readTime: string;
  tags: string[];
  difficulty: "Dasar" | "Menengah" | "Mahir";
  lastUpdated: string;
  actionUrl: string;
  actionText: string;
  highlights: string[];
  sections: {
    heading: string;
    content: string;
    checklist?: string[];
    callout?: {
      type: "info" | "warning" | "tip";
      text: string;
    };
  }[];
}

export const LEARN_CATEGORIES = [
  "Semua Kategori",
  "Operasional & Jadwal",
  "Manifest & Bus",
  "Keuangan & Kas",
  "Infrastruktur & Cloud",
  "Kru & Keamanan",
] as const;

export const LEARN_GUIDES: LearnGuide[] = [
  {
    id: "guide-rundown-word-pwa",
    slug: "konversi-rundown-word-ke-pwa",
    title: "Panduan Konversi Rundown Word (.docx) Otomatis ke Jadwal PWA",
    category: "Operasional & Jadwal",
    summary:
      "Cara cepat mengubah file susunan acara Microsoft Word (.docx) dari instansi atau sekolah menjadi rundown digital interaktif dengan deteksi jam dan lokasi otomatis.",
    readTime: "4 menit baca",
    tags: ["Word .docx", "Import Rundown", "Jadwal", "PWA Offline"],
    difficulty: "Dasar",
    lastUpdated: "Maret 2026",
    actionUrl: "/import-rundown",
    actionText: "Buka Menu Import Rundown Word",
    highlights: [
      "Deteksi otomatis jam format 07.00 - 08.00 atau 07:00",
      "Parsing tabel Microsoft Word langsung di browser tanpa upload ke server eksternal",
      "Kru lapangan langsung dapat melihat timeline interaktif di smartphone",
    ],
    sections: [
      {
        heading: "1. Mengapa Perlu Mengonversi Rundown Word ke PWA?",
        content:
          "Hampir setiap klien biro wisata (sekolah, dinas, instansi perusahaan, atau panitia family gathering) mengirimkan susunan acara dalam bentuk file Microsoft Word (.docx). Sebelumnya, Tour Leader harus mencetak kertas berlembar-lembar yang mudah basah dan kusut di lapangan, atau pemilik biro harus mengetik ulang rundown satu per satu. Dengan fitur Import Word di CatatBiro, file .docx langsung di-parse otomatis menjadi jadwal digital interaktif dalam 3 detik.",
        callout: {
          type: "tip",
          text: "PWA CatatBiro bekerja 100% offline. Setelah di-import, seluruh kru dapat melihat countdown jam keberangkatan bus tanpa sinyal internet di perjalanan.",
        },
      },
      {
        heading: "2. Format Dokumen Word (.docx) yang Didukung",
        content:
          "Sistem konverter CatatBiro dirancang fleksibel untuk membaca format susunan acara umum di Indonesia:",
        checklist: [
          "Format Tabel: Tabel dengan 2 sampai 5 kolom (Kolom Waktu / Jam, Kegiatan / Acara, Lokasi, dan Keterangan).",
          "Format Baris Teks: Baris dengan penanda waktu di awal baris, misalnya '06.30 - 07.00 Kumpul di Halaman Sekolah'.",
          "Header Dokumen: Judul trip, nama sekolah/klien, dan tanggal kegiatan otomatis diekstrak menjadi judul trip.",
        ],
      },
      {
        heading: "3. Langkah-Langkah Mengimpor Dokumen",
        content:
          "Berikut langkah praktis untuk mengimpor file susunan acara ke aplikasi:",
        checklist: [
          "Buka menu 'Import Rundown Word' di sidebar atau navigasi bawah.",
          "Klik area upload atau seret file dokumen (.docx) dari laptop/HP Anda.",
          "Sistem akan langsung membedah teks dan menampilkan pratinjau tabel timeline.",
          "Periksa dan sesuaikan jam atau nama tempat jika ada kesalahan ketik dari pihak panitia.",
          "Pilih apakah ingin membuat Trip Baru atau menautkan ke Trip yang sudah terdaftar di kalender.",
          "Klik 'Simpan ke Jadwal Trip' — jadwal otomatis sinkron ke seluruh kru lapangan.",
        ],
        callout: {
          type: "info",
          text: "Jika file Word memiliki proteksi kata sandi (password), buka file di Word terlebih dahulu, simpan ulang tanpa proteksi password, lalu import ke CatatBiro.",
        },
      },
      {
        heading: "4. Tips Pro Operasional Tour Leader di Lapangan",
        content:
          "Saat di perjalanan, Tour Leader dapat mencentang kegiatan yang sudah selesai langsung di HP. Indikator progres jadwal akan otomatis berubah warna dari abu-abu menjadi hijau. Jika terjadi keterlambatan macet di jalan tol, Tour Leader cukup menggeser jam kegiatan berikutnya langsung dari HP tanpa perlu membuka laptop.",
      },
    ],
  },
  {
    id: "guide-denah-kursi-manifest",
    slug: "sop-denah-kursi-bus-manifest",
    title: "SOP Denah Kursi Bus 50-Seat & Cetak Manifest Penumpang",
    category: "Manifest & Bus",
    summary:
      "Standar Operasional Prosedur penataan seat penumpang bus pariwisata formasi 2-2 (48-50 seat), penandaan kursi TL/Kru, dan export manifest resmi PDF untuk supir dan kantor polisi/dishub.",
    readTime: "5 menit baca",
    tags: ["Denah Kursi", "Manifest", "Bus 50-Seat", "Cetak PDF"],
    difficulty: "Dasar",
    lastUpdated: "Maret 2026",
    actionUrl: "/trips",
    actionText: "Buka Kalender & Kelola Bus",
    highlights: [
      "Visualisasi denah kursi bus 2-2 interaktif (Seat 1A - 12D)",
      "Cetak Manifest Penumpang Resmi ber-kop surat biro siap tanda tangan",
      "Tandai nomor kontak darurat & catatan khusus penumpang lansia/mabuk darat",
    ],
    sections: [
      {
        heading: "1. Urgensi Manifest & Denah Kursi Tertib",
        content:
          "Kekacauan paling sering terjadi pada 30 menit awal keberangkatan saat peserta berebut tempat duduk bus. Tanpa denah kursi resmi, peserta yang membawa balita atau lansia kerap terdorong ke barisan belakang yang berayun keras. Selain itu, aturan Dinas Perhubungan dan Kepolisian mewajibkan setiap bus pariwisata mengantongi lembar Manifest Penumpang bertanda tangan pimpinan rombongan demi klaim asuransi Jasa Raharja.",
        callout: {
          type: "warning",
          text: "Pastikan kru selalu mencetak minimal 2 rangkap Manifest PDF: 1 lembar diserahkan kepada Driver Bus, dan 1 lembar dipegang Tour Leader untuk absensi tiap naik-turun rest area.",
        },
      },
      {
        heading: "2. Formasi Standar Bus Pariwisata 50-Seat (2-2)",
        content:
          "CatatBiro mengadopsi standar karoseri bus Indonesia (Adiputro, Laksana, Tentrem) dengan formasi baris 2 kanan - 2 kiri:",
        checklist: [
          "Seat 1A, 1B, 1C, 1D: Prioritaskan untuk Ketua Panitia Rombongan atau Peserta yang mudah mabuk darat.",
          "Kursi Pemandu (TL Seat): Berada di sebelah pintu masuk depan samping driver, dilengkapi mic pengeras suara.",
          "Baris Tengah (Seat 5 s/d 8): Ideal untuk peserta lansia dan keluarga dengan anak kecil karena minim guncangan suspensi.",
          "Baris Belakang (Seat 11 s/d 12): Disarankan untuk peserta muda atau kru logistik biro.",
        ],
      },
      {
        heading: "3. Cara Menata Kursi & Mengisi Data di CatatBiro",
        content:
          "Ikuti panduan berikut saat menyusun manifest bus:",
        checklist: [
          "Buka detail trip di menu 'Kalender & Jadwal Bus', lalu klik tab 'Denah Kursi & Penumpang'.",
          "Klik salah satu kursi kosong (misal 3B) untuk memasukkan nama penumpang dan nomor WhatsApp wali.",
          "Centang opsi 'Catatan Medis' jika penumpang memiliki riwayat mabuk darat atau asma agar kru lebih waspada.",
          "Jika ada peserta yang ingin bertukar kursi, cukup drag-and-drop atau klik 'Tukar Seat'.",
          "Klik tombol 'Cetak Manifest PDF' untuk menghasilkan dokumen resmi yang rapi dengan kop biro Anda.",
        ],
        callout: {
          type: "tip",
          text: "Anda juga dapat membagikan link manifest langsung via WhatsApp ke grup panitia agar peserta sudah mengetahui nomor kursinya sebelum tiba di titik kumpul.",
        },
      },
    ],
  },
  {
    id: "guide-petty-cash-vs-laba",
    slug: "manajemen-kas-saku-tl-vs-laba-owner",
    title: "Manajemen Kas Saku Tour Leader (Petty Cash) vs Laba Kotor Owner",
    category: "Keuangan & Kas",
    summary:
      "Panduan pemisahan keuangan lapangan (uang bensin, tol, tips driver, parkir, konsumsi darurat) yang dipegang TL dari kas penerimaan paket wisata dan margin keuntungan pemilik biro.",
    readTime: "6 menit baca",
    tags: ["Petty Cash", "Buku Kas", "Laba Bersih", "Keuangan Biro"],
    difficulty: "Menengah",
    lastUpdated: "Maret 2026",
    actionUrl: "/keuangan",
    actionText: "Buka Buku Kas & Laba",
    highlights: [
      "Pemisahan tegas modal jalan (uang saku TL) dengan pembayaran DP klien",
      "Kru lapangan hanya melihat saldo petty cash tanpa akses laba owner",
      "Rekonsiliasi otomatis struk BBM dan parkir saat kepulangan",
    ],
    sections: [
      {
        heading: "1. Titik Rawan Kebocoran Keuangan Biro Wisata",
        content:
          "Salah satu penyebab utama biro wisata merugi meski pesanan bus ramai adalah bercampurnya uang saku operasional jalan (Petty Cash) dengan kas laba perusahaan. Jika Tour Leader menggunakan uang muka dari klien untuk membayar bensin tanpa pencatatan real-time, pemilik biro akan kesulitan melacak berapa margin keuntungan riil yang didapat.",
        callout: {
          type: "warning",
          text: "Jangan pernah mengizinkan pengeluaran lapangan tanpa pencatatan langsung di aplikasi PWA, sekecil apapun nilai parkir atau tips porter.",
        },
      },
      {
        heading: "2. Alur Pembagian Pos Keuangan di CatatBiro",
        content:
          "CatatBiro membagi sistem keuangan menjadi 2 lapis keamanan:",
        checklist: [
          "Lapis 1 - Kas Saku TL (Petty Cash): Diberikan saat bus berangkat (misal Rp 3.000.000). TL mencatat pengeluaran bensin, tol, tiket retribusi, dan tips kru langsung di menu 'Kas Saku'. TL tidak bisa melihat nominal keuntungan biro.",
          "Lapis 2 - Kas Eksekutif Owner: Mencatat total pemasukan DP + Pelunasan dari klien, biaya sewa armada bus ke PO, biaya hotel, dan dikurangi pengeluaran petty cash TL untuk menghasilkan Laba Bersih Bersih.",
        ],
      },
      {
        heading: "3. Standar SOP Rekonsiliasi Akhir Perjalanan",
        content:
          "Saat bus tiba kembali di pangkalan biro, ikuti langkah berikut:",
        checklist: [
          "Buka ringkasan 'Rekap Kas Saku Trip' di aplikasi.",
          "Bandingkan uang modal awal dengan total pengeluaran yang di-input TL.",
          "Jika ada sisa uang (surplus kas saku), TL menyetorkan kembali ke kasir biro.",
          "Jika terjadi kekurangan (over-budget darurat karena macet/ban pecah), owner mengganti selisih dana kepada TL.",
          "Owner mengunci status trip menjadi 'Selesai & Tutup Buku' agar data tidak dapat diubah lagi.",
        ],
        callout: {
          type: "tip",
          text: "Fitur 'Kwitansi & Invoice' di CatatBiro dapat langsung digenerate begitu pelunasan masuk, lengkap dengan stempel lunas digital.",
        },
      },
    ],
  },
  {
    id: "guide-custom-domain-vps",
    slug: "custom-domain-cloud-vps-biro",
    title: "Panduan Custom Domain (namabiro.com) & Setting Cloud VPS",
    category: "Infrastruktur & Cloud",
    summary:
      "Cara menghubungkan nama domain profesional biro wisata Anda (contoh: www.kencanawisata.com) ke sistem PWA CatatBiro dengan Cloud VPS Singapore dedicated berkecepatan tinggi.",
    readTime: "7 menit baca",
    tags: ["Custom Domain", "Cloud VPS", "Branding", "SSL HTTPS"],
    difficulty: "Mahir",
    lastUpdated: "Maret 2026",
    actionUrl: "/boost",
    actionText: "Lihat Paket Add-On Domain & VPS",
    highlights: [
      "Tingkatkan wibawa biro di mata dinas dan sekolah dengan domain namabiro.com",
      "Server Cloud VPS Singapore dedicated dengan latensi < 20 milidetik",
      "Sertifikat keamanan SSL HTTPS gembok hijau otomatis aktif",
    ],
    sections: [
      {
        heading: "1. Mengapa Biro Wisata Membutuhkan Domain Sendiri?",
        content:
          "Di era digital, sekolah dan instansi pemerintahan selalu memeriksa kredibilitas biro sebelum menandatangani SPK (Surat Perjanjian Kerja). Memiliki aplikasi sistem reservasi dan katalog paket dengan alamat web resmi milik biro sendiri (misalnya www.nusantara-tour.com) melipatgandakan peluang memenangkan tender dibandingkan memakai email gratisan atau link acak.",
      },
      {
        heading: "2. Arsitektur Cloud VPS Singapore Dedicated",
        content:
          "Sistem PWA CatatBiro di-deploy pada infrastruktur Cloud VPS Singapore yang dirancang khusus untuk pasar pariwisata Indonesia:",
        checklist: [
          "Latensi Jaringan Rendah: Rute langsung Tier-1 ke Telkomsel, Indosat, dan XL dengan ping 15-25ms.",
          "Auto-Backup Harian: Database trip, data keuangan, dan manifest di-backup setiap tengah malam.",
          "Keamanan Data Terenkripsi: Menggunakan enkripsi TLS 1.3 dan perlindungan dari serangan bot/DDoS.",
          "Akses Offline Sync: Saat sinyal hilang di pegunungan, PWA tetap berjalan dan melakukan sinkronisasi otomatis ke VPS saat online kembali.",
        ],
        callout: {
          type: "info",
          text: "Paket Enterprise sudah mencakup biaya sewa domain .com / .id selama 1 tahun penuh beserta instalasi Cloud VPS Singapore siap pakai.",
        },
      },
      {
        heading: "3. Langkah Aktivasi Custom Domain",
        content:
          "Proses pemasangan domain sangat mudah dan dibantu langsung oleh tim teknis kami:",
        checklist: [
          "Tentukan nama domain yang diinginkan (misal: pesonajogja-tour.com).",
          "Pilih paket Pro atau Enterprise di halaman Upgrade Lisensi (/boost).",
          "Tim Super Admin kami akan membelikan dan mengatur DNS Record (CNAME & A Record).",
          "Dalam waktu maksimal 2x24 jam, sistem PWA biro Anda sudah live dengan logo dan nama domain sendiri.",
        ],
      },
    ],
  },
  {
    id: "guide-keamanan-kru-rbac",
    slug: "keamanan-akun-kru-pembatasan-rbac",
    title: "Keamanan Akun Kru & Pembatasan Menu Keuangan (RBAC)",
    category: "Kru & Keamanan",
    summary:
      "Mengamankan rahasia laba bersih dan rekening biro dari kru lapangan dengan sistem Role-Based Access Control (RBAC) dan pembatasan device login.",
    readTime: "5 menit baca",
    tags: ["RBAC", "Hak Akses", "Keamanan", "Privasi Laba"],
    difficulty: "Menengah",
    lastUpdated: "Maret 2026",
    actionUrl: "/manajemen-kru",
    actionText: "Buka Manajemen Kru & RBAC",
    highlights: [
      "Enkripsi hak akses per kru (Tour Leader, Pemandu Wisata, Driver, Admin)",
      "Pencegahan kebocoran tarif vendor hotel dan PO bus",
      "Fitur One-Click Revoke untuk mencabut akses kru yang resign",
    ],
    sections: [
      {
        heading: "1. Mengapa Privasi Keuangan Biro Harus Dijaga?",
        content:
          "Dalam industri biro perjalanan wisata, margin laba dan tarif sewa PO bus atau hotel rekanan adalah rahasia dapur perusahaan yang sensitif. Jika seluruh kru lapangan memiliki akses bebas melihat laporan laba bersih atau rekening giro biro, risiko kebocoran informasi ke kompetitor atau ketidakharmonisan antar kru lapangan sangat tinggi.",
        callout: {
          type: "warning",
          text: "Prinsip Zero-Trust: Berikan kru lapangan hanya informasi yang mereka butuhkan untuk menjalankan tugas di hari tersebut.",
        },
      },
      {
        heading: "2. Matriks Hak Akses (Role Matrix) di CatatBiro",
        content:
          "Sistem CatatBiro mengelompokkan izin akses ke dalam tingkatan:",
        checklist: [
          "Mode Pemilik (Owner): Akses mutlak 100% meliputi Buku Kas, Neraca Laba Rugi, Invoice Resmi, Profil Rekening Bank, Setting CMS, dan Kontrol Hak Akses Kru.",
          "Tour Leader (TL): Hanya dapat membuka Kalender Trip yang ditugaskan kepadanya, Rundown Acara, Absensi Penumpang / Kursi Bus, Catatan HTM Tempat Wisata, dan Kas Saku Operasional (Petty Cash).",
          "Co-TL / Driver: Akses terbatas hanya untuk melihat rute perjalanan, kontak darurat panitia, dan checklist logistik bus.",
        ],
      },
      {
        heading: "3. Cara Menambah dan Mengatur Izin Kru",
        content:
          "Untuk mengatur personel kru biro Anda:",
        checklist: [
          "Buka menu 'Monitor Kru & RBAC' dari sidebar desktop.",
          "Klik tombol 'Tambah Kru Baru' dan masukkan Nama Lengkap, Jabatan, dan Nomor Telepon/WhatsApp.",
          "Pilih Hak Akses: centang menu yang diizinkan untuk kru tersebut.",
          "Berikan Kode Akses / Link login langsung yang unik untuk smartphone kru.",
          "Jika kru telah menyelesaikan masa kontrak atau freelance lepas, klik 'Nonaktifkan Akun' untuk memutus sesi seketika.",
        ],
      },
    ],
  },
];
