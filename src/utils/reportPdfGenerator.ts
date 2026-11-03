import type jsPDF from "jspdf";
import { getLocalBiroProfile, BiroProfile } from "./biroProfile";

export interface Trip {
  id?: string;
  nama_trip: string;
  tanggal: string;
  tanggal_selesai: string | null;
  tujuan: string;
  catatan?: string | null;
  nama_kendaraan?: string | null;
  nomor_polisi?: string | null;
  nama_driver?: string | null;
  jumlah_penumpang?: number | null;
  budget_estimasi?: number | null;
  budget_dp?: number | null;
  status?: string | null;
}

export interface Keuangan {
  id?: string;
  tanggal: string;
  keterangan: string;
  jumlah: number;
  jenis: string; // 'pemasukan' | 'pengeluaran'
  kategori?: string | null;
  cashback?: number | null;
  harga_satuan?: number | null;
  jumlah_item?: number | null;
  trips?: { nama_trip: string };
  trip_id?: string;
}

export interface Media {
  file_name: string;
  file_type: string;
  trips?: { nama_trip: string };
}

export interface ReportData {
  trips: Trip[];
  keuangan: Keuangan[];
  media?: Media[];
  filterTripId?: string;
  profile?: BiroProfile;
  nomorSurat?: string;
  periodeText?: string;
}

// Helper untuk format rupiah formal
const formatRupiah = (val: number): string => {
  return "Rp " + Math.round(val).toLocaleString("id-ID");
};

// Helper untuk format tanggal Indonesia
const formatTanggalIndo = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

// Helper load image async
const loadImage = (src: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

/**
 * Menggambar KOP SURAT FORMAL & PROFESIONAL
 */
const drawKopSurat = (
  doc: jsPDF,
  profile: BiroProfile,
  logoImg: HTMLImageElement | null
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = pageWidth - 14;
  const topY = 12;

  // 1. Gambar Logo (jika ada) di sisi kiri Kop
  const logoWidth = 24;
  const logoHeight = 24;
  let textStartX = marginLeft;

  if (logoImg) {
    try {
      doc.addImage(logoImg, "PNG", marginLeft, topY, logoWidth, logoHeight);
      textStartX = marginLeft + logoWidth + 4;
    } catch {
      textStartX = marginLeft;
    }
  }

  // 2. Teks Kop Surat Resmi (Center / Terstruktur Rapi)
  const textCenter = (textStartX + marginRight) / 2;

  // Nama Biro (Besar, Bold, Warna Navy Formal)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 44, 89); // Deep Navy
  doc.text((profile.nama_biro || "BIRO PERJALANAN WISATA").toUpperCase(), textCenter, topY + 6, {
    align: "center",
  });

  // Slogan / Bidang Usaha
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138); // Royal Blue
  doc.text(
    (profile.slogan || "Biro Perjalanan Wisata & Layanan Transportasi Pariwisata").toUpperCase(),
    textCenter,
    topY + 11,
    { align: "center" }
  );

  // Alamat Kantor
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85); // Slate 700
  const alamatText = profile.alamat || "Kantor Pusat Operasional & Reservasi Armada Wisata Nusantara";
  doc.text(alamatText, textCenter, topY + 16, { align: "center" });

  // Kontak Resmi (Telepon, Email, Website)
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  const kontakText = `Telp/WA: ${profile.telepon || "0812-2578-9000"}  |  Email: ${profile.email || "operasional@birowisata.id"}  |  Web: ${profile.website || "www.catatbirowisata.id"}`;
  doc.text(kontakText, textCenter, topY + 20.5, { align: "center" });

  // 3. Garis Ganda Resmi Kop Surat (Ciri Khas Dokumen Formal Indonesia)
  const lineY = topY + 24;
  // Garis tebal atas
  doc.setDrawColor(15, 44, 89);
  doc.setLineWidth(1.2);
  doc.line(marginLeft, lineY, marginRight, lineY);

  // Garis tipis bawah
  doc.setLineWidth(0.4);
  doc.line(marginLeft, lineY + 1.2, marginRight, lineY + 1.2);

  return lineY + 6;
};

export const generateReportPDF = async (data: ReportData): Promise<jsPDF> => {
  const [{ default: jsPDFClass }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDFClass({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const profile = data.profile || getLocalBiroProfile();

  // Load logo jika tersedia
  let logoImg: HTMLImageElement | null = null;
  if (profile.logo_url) {
    logoImg = await loadImage(profile.logo_url);
  }
  if (!logoImg) {
    // Fallback load default logo dari public
    logoImg = await loadImage("/pwa-icon.svg");
  }

  // 1. Gambar Kop Surat di Halaman Pertama
  let currentY = drawKopSurat(doc, profile, logoImg);

  // 2. Judul Dokumen Formal & Nomor Surat
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("LAPORAN PERTANGGUNGJAWABAN OPERASIONAL & KEUANGAN", pageWidth / 2, currentY + 3, {
    align: "center",
  });

  currentY += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const tglCetak = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const nomorSurat = data.nomorSurat || `LPK/BPW/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}/${Math.floor(100 + Math.random() * 900)}`;
  doc.text(`Nomor Dokumen : ${nomorSurat}`, 14, currentY);
  doc.text(`Tanggal Cetak  : ${tglCetak}`, pageWidth - 14, currentY, { align: "right" });

  currentY += 5;
  const periodeText = data.periodeText || (data.filterTripId && data.filterTripId !== "all"
    ? `Trip Tertentu (${data.trips.find(t => t.id === data.filterTripId)?.nama_trip || "Spesifik"})`
    : "Semua Riwayat Operasional");
  doc.text(`Klasifikasi    : ${periodeText}`, 14, currentY);
  doc.text(`Penyusun       : Bagian Keuangan & Tour Leader`, pageWidth - 14, currentY, { align: "right" });

  currentY += 8;

  // 3. Perhitungan Rekapitulasi Keuangan & Key Metrics
  const pemasukan = data.keuangan
    .filter((k) => k.jenis === "pemasukan")
    .reduce((sum, k) => sum + Number(k.jumlah || 0), 0);

  const pengeluaran = data.keuangan
    .filter((k) => k.jenis === "pengeluaran")
    .reduce((sum, k) => sum + Number(k.jumlah || 0), 0);

  const saldo = pemasukan - pengeluaran;
  const isSurplus = saldo >= 0;
  const profitMargin = pemasukan > 0 ? ((saldo / pemasukan) * 100).toFixed(1) : "0";

  // TABEL RINGKASAN EKSEKUTIF (Executive Summary Box)
  autoTable(doc, {
    startY: currentY,
    head: [["RINGKASAN KINERJA OPERASIONAL & KEUANGAN", "NILAI / REKAPITULASI"]],
    body: [
      ["Total Trip Terdata", `${data.trips.length} Perjalanan Wisata`],
      ["Total Pemasukan Kas (Kredit)", formatRupiah(pemasukan)],
      ["Total Pengeluaran Kas (Debit)", formatRupiah(pengeluaran)],
      ["Sisa Saldo Kas Bersih (Laba Bersih)", `${formatRupiah(saldo)}  (${isSurplus ? "SURPLUS" : "DEFISIT"})`],
      ["Margin Efisiensi / Keuntungan", `${profitMargin}%`],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [15, 44, 89],
      textColor: 255,
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 100 },
      1: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index === 3 && hookData.column.index === 1) {
        hookData.cell.styles.textColor = isSurplus ? [16, 120, 60] : [200, 30, 30];
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 4. TABEL I: RINCIAN RIWAYAT TRIP & ARMADA PERJALANAN
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 44, 89);
  doc.text("I. RINCIAN DATA TRIP & ARMADA PERJALANAN", 14, currentY);
  currentY += 3;

  if (data.trips.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Tidak ada data perjalanan wisata pada periode ini.", 14, currentY + 4);
    currentY += 10;
  } else {
    const tripRows = data.trips.map((t, idx) => {
      const durasi = t.tanggal_selesai && t.tanggal_selesai !== t.tanggal
        ? `${formatTanggalIndo(t.tanggal)} s/d ${formatTanggalIndo(t.tanggal_selesai)}`
        : formatTanggalIndo(t.tanggal);

      const kendaraan = [t.nama_kendaraan, t.nomor_polisi].filter(Boolean).join(" - ") || "-";
      const driverPax = [
        t.nama_driver ? `Kru: ${t.nama_driver}` : null,
        t.jumlah_penumpang ? `${t.jumlah_penumpang} Pax` : null,
      ].filter(Boolean).join(" | ") || "-";

      return [
        (idx + 1).toString(),
        t.nama_trip,
        t.tujuan,
        durasi,
        kendaraan,
        driverPax,
        (t.status || "Selesai").toUpperCase(),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["No", "Nama Trip / Rombongan", "Kota Tujuan", "Tanggal Pelaksanaan", "Armada & Plat", "Kru & Peserta", "Status"]],
      body: tripRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: 255,
        fontSize: 8,
        fontStyle: "bold",
        halign: "center",
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { fontStyle: "bold", cellWidth: 38 },
        2: { cellWidth: 26 },
        3: { cellWidth: 34 },
        4: { cellWidth: 30 },
        5: { cellWidth: 28 },
        6: { halign: "center", cellWidth: 18 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Cek apakah halaman hampir penuh sebelum tabel keuangan
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 20;
  }

  // 5. TABEL II: JURNAL BUKU KAS KEUANGAN RINCI
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 44, 89);
  doc.text("II. BUKU KAS OPERASIONAL (MUTASI PEMASUKAN & PENGELUARAN)", 14, currentY);
  currentY += 3;

  if (data.keuangan.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Belum ada pencatatan transaksi kas untuk filter ini.", 14, currentY + 4);
    currentY += 10;
  } else {
    let runningSaldo = 0;
    // Urutkan transaksi dari terlama ke terbaru untuk running saldo yang logis
    const sortedKeuangan = [...data.keuangan].sort(
      (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    );

    const keuanganRows = sortedKeuangan.map((k, idx) => {
      const isMasuk = k.jenis === "pemasukan";
      const nominal = Number(k.jumlah || 0);
      if (isMasuk) {
        runningSaldo += nominal;
      } else {
        runningSaldo -= nominal;
      }

      // Detil rincian jika ada harga satuan / cashback
      let detailDesc = k.keterangan || "-";
      if (k.harga_satuan && k.jumlah_item) {
        detailDesc += ` (${k.jumlah_item} x ${formatRupiah(k.harga_satuan)})`;
      }
      if (k.cashback && k.cashback > 0) {
        detailDesc += ` [Cashback: ${formatRupiah(k.cashback)}]`;
      }

      const tripNama = k.trips?.nama_trip || (data.trips.find(t => t.id === k.trip_id)?.nama_trip) || "Umum/Operasional";

      return [
        (idx + 1).toString(),
        formatTanggalIndo(k.tanggal),
        tripNama,
        detailDesc,
        isMasuk ? formatRupiah(nominal) : "-",
        !isMasuk ? formatRupiah(nominal) : "-",
        formatRupiah(runningSaldo),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["No", "Tanggal", "Alokasi Trip", "Uraian / Keterangan Transaksi", "Pemasukan", "Pengeluaran", "Saldo Kas"]],
      body: keuanganRows,
      foot: [
        [
          "TOTAL",
          "",
          "",
          "TOTAL MUTASI KAS OPERASIONAL",
          formatRupiah(pemasukan),
          formatRupiah(pengeluaran),
          formatRupiah(saldo),
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [15, 44, 89],
        textColor: 255,
        fontSize: 8,
        fontStyle: "bold",
        halign: "center",
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.2,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "center", cellWidth: 20 },
        2: { cellWidth: 32 },
        3: { cellWidth: 58 },
        4: { halign: "right", textColor: [16, 120, 60], cellWidth: 24 },
        5: { halign: "right", textColor: [200, 30, 30], cellWidth: 24 },
        6: { halign: "right", fontStyle: "bold", cellWidth: 26 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. TABEL III: REKAPITULASI POS BIAYA PENGELUARAN (BREAKDOWN)
  if (data.keuangan.length > 0) {
    if (currentY > pageHeight - 65) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 44, 89);
    doc.text("III. REKAPITULASI POS BIAYA PENGELUARAN OPERASIONAL", 14, currentY);
    currentY += 3;

    // Klasifikasi kategori umum
    const breakdown = {
      transport: 0,
      konsumsi: 0,
      tiket: 0,
      fee: 0,
      lainnya: 0,
    };

    data.keuangan
      .filter((k) => k.jenis === "pengeluaran")
      .forEach((k) => {
        const text = (k.keterangan || "").toLowerCase();
        const amt = Number(k.jumlah || 0);
        if (text.includes("bus") || text.includes("bbm") || text.includes("solar") || text.includes("tol") || text.includes("parkir")) {
          breakdown.transport += amt;
        } else if (text.includes("makan") || text.includes("katering") || text.includes("snack") || text.includes("air") || text.includes("resto")) {
          breakdown.konsumsi += amt;
        } else if (text.includes("tiket") || text.includes("wisata") || text.includes("jeep") || text.includes("shuttle") || text.includes("pantai")) {
          breakdown.tiket += amt;
        } else if (text.includes("fee") || text.includes("tips") || text.includes("driver") || text.includes("tl") || text.includes("tour leader") || text.includes("guide")) {
          breakdown.fee += amt;
        } else {
          breakdown.lainnya += amt;
        }
      });

    const categoryRows = [
      ["1", "Transportasi & Armada", "Sewa Bus, Pembelian BBM/Solar, Saldo Tol & Retribusi Parkir", formatRupiah(breakdown.transport), pengeluaran > 0 ? `${((breakdown.transport / pengeluaran) * 100).toFixed(1)}%` : "0%"],
      ["2", "Konsumsi & Logistik", "Prasmanan Restoran, Nasi Kotak, Snack Box & Air Mineral", formatRupiah(breakdown.konsumsi), pengeluaran > 0 ? `${((breakdown.konsumsi / pengeluaran) * 100).toFixed(1)}%` : "0%"],
      ["3", "Destinasi & Wisata", "Tiket Masuk Objek Wisata, Sewa Jeep/Shuttle & Guide Lokal", formatRupiah(breakdown.tiket), pengeluaran > 0 ? `${((breakdown.tiket / pengeluaran) * 100).toFixed(1)}%` : "0%"],
      ["4", "Honor & Fee Lapangan", "Tips Driver, Co-Driver, Tour Leader & Kru Pendamping", formatRupiah(breakdown.fee), pengeluaran > 0 ? `${((breakdown.fee / pengeluaran) * 100).toFixed(1)}%` : "0%"],
      ["5", "Operasional & Lain-lain", "Obat P3K, Spanduk Banner Rombongan & Pengeluaran Darurat", formatRupiah(breakdown.lainnya), pengeluaran > 0 ? `${((breakdown.lainnya / pengeluaran) * 100).toFixed(1)}%` : "0%"],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["No", "Pos Anggaran Biaya", "Cakupan Uraian Operasional", "Total Biaya (Rp)", "Persentase"]],
      body: categoryRows,
      foot: [["", "TOTAL PENGELUARAN OPERASIONAL", "", formatRupiah(pengeluaran), "100.0%"]],
      theme: "grid",
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: 255,
        fontSize: 8,
        fontStyle: "bold",
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.2,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { fontStyle: "bold", cellWidth: 44 },
        2: { cellWidth: 86 },
        3: { halign: "right", fontStyle: "bold", cellWidth: 30 },
        4: { halign: "center", cellWidth: 16 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 7. CATATAN OPERASIONAL & PERNYATAAN RESMI
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 44, 89);
  doc.text("CATATAN & KETENTUAN OPERASIONAL:", 14, currentY);
  currentY += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("1. Seluruh bukti transaksi (struk BBM, bukti top up tol, invoice katering & kwitansi sewa bus) telah diverifikasi dan tersimpan rapi.", 14, currentY);
  currentY += 3.5;
  doc.text("2. Laporan ini merupakan dokumen pertanggungjawaban sah yang diterbitkan secara resmi melalui Sistem Informasi Catat Biro Wisata.", 14, currentY);
  currentY += 9;

  // 8. LEMBAR PENGESAHAN & TANDA TANGAN FORMAL (DUAL SIGNATURE)
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 20;
  }

  const kotaBiro = (profile.alamat && profile.alamat.includes("Demak")) ? "Demak" : "Indonesia";
  const tglPengesahan = `${kotaBiro}, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;

  // Posisi tanggal di sisi kanan
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(tglPengesahan, pageWidth - 14, currentY, { align: "right" });
  currentY += 6;

  // Kolom Kiri: Dibuat Oleh (Bendahara / Tour Leader)
  const colLeftX = 14;
  doc.setFont("helvetica", "bold");
  doc.text("Dibuat & Dilaporkan Oleh:", colLeftX, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Bagian Administrasi & Keuangan", colLeftX, currentY + 4);

  // Kolom Kanan: Mengetahui & Menyetujui (Pimpinan Biro)
  const colRightX = pageWidth - 65;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Mengetahui & Menyetujui:", colRightX, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Pimpinan / Direktur Biro Wisata", colRightX, currentY + 4);

  // Area Tanda Tangan & Stempel (Space 20mm)
  const signY = currentY + 22;

  // Nama Terang & Garis Tanda Tangan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  // Kiri
  doc.text("( .................................................... )", colLeftX, signY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Tour Leader / Bag. Kas Operasional", colLeftX, signY + 4);

  // Kanan
  const namaPimpinan = profile.pimpinan || "H. Anjar Abidin, S.E.";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`( ${namaPimpinan} )`, colRightX, signY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Direktur Utama", colRightX, signY + 4);

  // 9. FOOTER DI SETIAP HALAMAN
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Garis tipis footer
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 9, pageWidth - 14, pageHeight - 9);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);

    doc.text(
      `Dokumen Resmi ${profile.nama_biro || "Biro Wisata"} • Dicetak dari Sistem Catat Biro Wisata`,
      14,
      pageHeight - 5.5
    );

    doc.text(
      `Halaman ${i} dari ${totalPages}`,
      pageWidth - 14,
      pageHeight - 5.5,
      { align: "right" }
    );
  }

  return doc;
};
