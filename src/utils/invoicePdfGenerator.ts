import type jsPDF from "jspdf";
import { getLocalBiroProfile, BiroProfile } from "./biroProfile";
import { getCurrentEntitlements } from "./licenseEntitlement";
import { savePdf } from "./pdfSaver";
import { terbilang } from "./terbilang";

export interface InvoiceItem {
  deskripsi: string;
  kuantitas: number;
  satuan?: string;
  hargaSatuan: number;
  total: number;
}

export interface GenerateInvoiceKwitansiOptions {
  docType: "kwitansi" | "invoice";
  nomorDokumen: string;
  tanggal: string; // YYYY-MM-DD
  jatuhTempo?: string; // YYYY-MM-DD (invoice only)
  namaKlien: string; // Diterima dari / Ditagihkan kepada
  kontakKlien?: string;
  namaTrip: string;
  tujuanTrip?: string;
  tanggalTrip?: string;
  nominal: number; // Jumlah yang dibayar (kwitansi) atau total (invoice)
  peruntukan: string; // Catatan untuk pembayaran
  statusPembayaran?: "Lunas" | "Uang Muka (DP)" | "Termin 2" | "Belum Lunas";
  metodePembayaran?: string; // Transfer Bank, Tunai, QRIS
  items?: InvoiceItem[];
  terbayar?: number; // untuk invoice
  catatanTambahan?: string;
  profile?: BiroProfile;
  autoDownload?: boolean;
}

const formatRupiah = (num: number): string => {
  return "Rp " + Math.floor(num).toLocaleString("id-ID");
};

const formatTanggalIndo = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

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
 * Menggambar Kop Surat Resmi Biro Wisata
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

  const textCenter = (textStartX + marginRight) / 2;

  // Nama Biro Wisata
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 44, 89);
  doc.text((profile.nama_biro || "CATAT BIRO WISATA").toUpperCase(), textCenter, topY + 6, {
    align: "center",
  });

  // Slogan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text(
    (profile.slogan || "Biro Perjalanan Wisata & Sewa Bus Pariwisata").toUpperCase(),
    textCenter,
    topY + 11,
    { align: "center" }
  );

  // Alamat
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    profile.alamat || "Jl. Raya Demak - Kudus KM 4, Demak, Jawa Tengah",
    textCenter,
    topY + 16,
    { align: "center" }
  );

  // Kontak
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const kontakText = `Telp/WA: ${profile.telepon || "0812-2578-9000"}  |  Email: ${profile.email || "operasional@birowisata.id"}  |  Web: ${profile.website || "www.catatbirowisata.id"}`;
  doc.text(kontakText, textCenter, topY + 20.5, { align: "center" });

  // Garis Ganda Resmi Kop
  const lineY = topY + 24;
  doc.setDrawColor(15, 44, 89);
  doc.setLineWidth(1.2);
  doc.line(marginLeft, lineY, marginRight, lineY);

  doc.setLineWidth(0.4);
  doc.line(marginLeft, lineY + 1.2, marginRight, lineY + 1.2);

  return lineY + 6;
};

/**
 * Menggambar Stempel Digital Resmi Biro Wisata
 */
const drawDigitalStamp = (
  doc: jsPDF,
  x: number,
  y: number,
  profile: BiroProfile,
  status: string
) => {
  // Lingkaran stempel luar
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.circle(x, y, 16);

  // Lingkaran stempel dalam
  doc.setLineWidth(0.3);
  doc.circle(x, y, 14);

  // Teks stempel melingkar / dalam
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(37, 99, 235);
  const biroShort = (profile.nama_biro || "BIRO WISATA").substring(0, 18).toUpperCase();
  doc.text(biroShort, x, y - 7, { align: "center" });

  // Banner status tengah (e.g. LUNAS / VERIFIED)
  doc.setFillColor(37, 99, 235);
  doc.rect(x - 13, y - 3, 26, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text(status.toUpperCase(), x, y + 1.2, { align: "center" });

  doc.setTextColor(37, 99, 235);
  doc.setFontSize(5.5);
  doc.text("OFFICIAL VERIFIED", x, y + 8, { align: "center" });
};

/**
 * Generator Utama Kwitansi & Invoice PDF Resmi
 */
export async function generateInvoiceOrKwitansiPDF(
  options: GenerateInvoiceKwitansiOptions
): Promise<jsPDF> {
  const profile = options.profile || getLocalBiroProfile();
  const isKwitansi = options.docType === "kwitansi";
  const autoDownload = options.autoDownload !== false;

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
  const marginLeft = 14;
  const marginRight = pageWidth - 14;
  const contentWidth = marginRight - marginLeft;

  // Load logo jika ada
  let logoImg: HTMLImageElement | null = null;
  if (profile.logo_url) {
    try {
      logoImg = await loadImage(profile.logo_url);
    } catch {}
  }

  // 1. Gambar Kop Surat Resmi
  let currentY = drawKopSurat(doc, profile, logoImg);

  // 2. Judul Dokumen & Nomor Seri
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  const docTitle = isKwitansi ? "KWITANSI PEMBAYARAN RESMI" : "INVOICE TAGIHAN RESMI";
  doc.text(docTitle, pageWidth / 2, currentY + 3, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nomor: ${options.nomorDokumen}`, pageWidth / 2, currentY + 7.5, {
    align: "center",
  });

  currentY += 14;

  // 3. Metadata Box (Tanggal, Klien, Trip)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, currentY, contentWidth, 30, 2, 2, "FD");

  // Kolom Kiri: Pihak Terkait
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(isKwitansi ? "Telah Diterima Dari:" : "Ditagihkan Kepada:", marginLeft + 4, currentY + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(options.namaKlien, marginLeft + 4, currentY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  if (options.kontakKlien) {
    doc.text(`Kontak / Telp: ${options.kontakKlien}`, marginLeft + 4, currentY + 17);
  }
  doc.text(`Kegiatan: ${options.namaTrip}`, marginLeft + 4, currentY + 22);
  if (options.tujuanTrip) {
    doc.text(`Destinasi: ${options.tujuanTrip}`, marginLeft + 4, currentY + 26.5);
  }

  // Kolom Kanan: Info Administrasi Dokumen
  const colRightX = marginLeft + contentWidth / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Informasi Pembayaran:", colRightX, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tanggal Terbit: ${formatTanggalIndo(options.tanggal)}`, colRightX, currentY + 12);

  if (!isKwitansi && options.jatuhTempo) {
    doc.text(`Jatuh Tempo: ${formatTanggalIndo(options.jatuhTempo)}`, colRightX, currentY + 17);
  }

  doc.text(`Metode: ${options.metodePembayaran || "Transfer Bank"}`, colRightX, currentY + 22);

  const status = options.statusPembayaran || (isKwitansi ? "Lunas" : "Belum Lunas");
  doc.text(`Status Dokumen: `, colRightX, currentY + 26.5);

  doc.setFont("helvetica", "bold");
  if (status === "Lunas") {
    doc.setTextColor(16, 185, 129);
  } else if (status.includes("DP") || status.includes("Termin")) {
    doc.setTextColor(245, 158, 11);
  } else {
    doc.setTextColor(239, 68, 68);
  }
  doc.text(status.toUpperCase(), colRightX + 27, currentY + 26.5);

  currentY += 36;

  // 4. Spesifik Tampilan KWITANSI vs INVOICE
  if (isKwitansi) {
    // === LAYOUT KWITANSI RESMI INDONESIA ===
    // Kotak Terbilang (Ciri Khas Kwitansi Formal)
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginLeft, currentY, contentWidth, 22, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Sejumlah Uang (Terbilang):", marginLeft + 4, currentY + 6);

    const terbilangText = `# ${terbilang(options.nominal)} #`;
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    // Wrap terbilang jika panjang
    const splitTerbilang = doc.splitTextToSize(terbilangText, contentWidth - 8);
    doc.text(splitTerbilang, marginLeft + 4, currentY + 12.5);

    currentY += 28;

    // Untuk Pembayaran
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("Untuk Pembayaran / Keperluan:", marginLeft, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const splitPeruntukan = doc.splitTextToSize(
      options.peruntukan || `Pelunasan biaya kegiatan trip wisata ${options.namaTrip}`,
      contentWidth
    );
    doc.text(splitPeruntukan, marginLeft, currentY + 5);

    currentY += 10 + splitPeruntukan.length * 4.5;

    // Kotak Nominal Rupiah (Besar & Jelas)
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.8);
    doc.roundedRect(marginLeft, currentY, 80, 14, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(29, 78, 216);
    doc.text(formatRupiah(options.nominal), marginLeft + 40, currentY + 9.5, {
      align: "center",
    });

    currentY += 22;
  } else {
    // === LAYOUT INVOICE TAGIHAN RESMI (TABEL ITEM) ===
    const invoiceItems = options.items && options.items.length > 0
      ? options.items
      : [
          {
            deskripsi: options.peruntukan || `Paket Wisata & Transportasi ${options.namaTrip}`,
            kuantitas: 1,
            satuan: "Paket",
            hargaSatuan: options.nominal,
            total: options.nominal,
          },
        ];

    const tableRows = invoiceItems.map((item, idx) => [
      (idx + 1).toString(),
      item.deskripsi,
      item.kuantitas.toString(),
      item.satuan || "Pax/Unit",
      formatRupiah(item.hargaSatuan),
      formatRupiah(item.total),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["No", "Deskripsi Layanan / Item", "Qty", "Satuan", "Harga Satuan", "Total"]],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [15, 44, 89],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 51,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 72 },
        2: { halign: "center", cellWidth: 15 },
        3: { halign: "center", cellWidth: 20 },
        4: { halign: "right", cellWidth: 32 },
        5: { halign: "right", cellWidth: 33 },
      },
      margin: { left: marginLeft, right: marginRight },
    });

    // Ambil posisi akhir tabel
    const finalY = (doc as any).lastAutoTable?.finalY || currentY + 30;

    // Total Ringkasan Invoice
    const terbayar = options.terbayar || (status === "Lunas" ? options.nominal : 0);
    const sisaTagihan = Math.max(0, options.nominal - terbayar);

    const summaryX = marginRight - 80;
    let sumY = finalY + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    doc.text("Total Tagihan:", summaryX, sumY);
    doc.text(formatRupiah(options.nominal), marginRight, sumY, { align: "right" });

    sumY += 5;
    doc.text("Telah Terbayar:", summaryX, sumY);
    doc.text(formatRupiah(terbayar), marginRight, sumY, { align: "right" });

    sumY += 6;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(summaryX, sumY - 1, marginRight, sumY - 1);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Sisa Tagihan:", summaryX, sumY + 4);
    doc.setTextColor(220, 38, 38);
    doc.text(formatRupiah(sisaTagihan), marginRight, sumY + 4, { align: "right" });

    // Terbilang Sisa Tagihan
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Terbilang: ${terbilang(sisaTagihan > 0 ? sisaTagihan : options.nominal)}`,
      marginLeft,
      finalY + 8
    );

    currentY = Math.max(sumY + 14, finalY + 16);
  }

  // 5. Informasi Rekening Bank Resmi Biro (Penting untuk Kwitansi & Invoice)
  if (currentY + 45 > pageHeight - 18) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, currentY, 100, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("Rekening Resmi Pembayaran:", marginLeft + 3, currentY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Bank: ${profile.nama_bank || "Bank Mandiri / BCA"}`, marginLeft + 3, currentY + 10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`No. Rek: ${profile.nomor_rekening || "136-00-1234567-8"}`, marginLeft + 3, currentY + 15);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Atas Nama: ${profile.atas_nama_rekening || profile.nama_biro}`, marginLeft + 3, currentY + 19.5);

  // 6. Tanda Tangan & Stempel Resmi di Kanan Bawah
  const signX = marginRight - 32;
  const signY = currentY + 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const kotaPimpinan = profile.alamat?.split(",")?.[1]?.trim() || "Demak";
  doc.text(`${kotaPimpinan}, ${formatTanggalIndo(options.tanggal)}`, signX, signY, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.nama_biro || "Catat Biro Wisata", signX, signY + 4.5, {
    align: "center",
  });

  // Stempel Digital
  drawDigitalStamp(
    doc,
    signX - 10,
    signY + 15,
    profile,
    options.statusPembayaran || (isKwitansi ? "LUNAS" : "VERIFIED")
  );

  // Garis & Nama Pimpinan
  const bottomSignY = signY + 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.pimpinan || "H. Anjar Abidin, S.E.", signX, bottomSignY, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Pimpinan / Manajemen Keuangan", signX, bottomSignY + 3.5, {
    align: "center",
  });

  // 7. Catatan / Footer Legal Dokumen
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const footerLegal = `Dokumen ini diterbitkan sah secara digital oleh ${profile.nama_biro}. Bukti transaksi resmi sah tanpa tanda tangan basah berdasarkan ketentuan hukum digital.`;
  doc.text(footerLegal, pageWidth / 2, pageHeight - 10, { align: "center" });

  // Watermark proteksi jika fitur Clean PDF belum diaktifkan oleh Super Admin
  const entitlements = getCurrentEntitlements();
  if (!entitlements.canExportCleanPdf) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(220, 38, 38);
    doc.text(
      "⚡ Diterbitkan via CatatBiro Wisata (Paket Starter) • Hubungi Founder untuk Cetak Bersih Bebas Watermark",
      pageWidth / 2,
      pageHeight - 4,
      { align: "center" }
    );
  }

  if (autoDownload) {
    const filename = `${options.docType.toUpperCase()}_${options.nomorDokumen.replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;
    void savePdf(doc, filename);
  }

  return doc;
}
