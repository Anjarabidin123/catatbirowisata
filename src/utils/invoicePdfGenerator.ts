import type jsPDF from "jspdf";
import { getLocalBiroProfile, BiroProfile, formatLegalitasBiro } from "./biroProfile";
import { getCurrentEntitlements } from "./licenseEntitlement";
import { savePdf } from "./pdfSaver";
import { terbilang } from "./terbilang";
import { recordDownloadedDoc } from "./downloadedDocTracker";
import { drawDigitalStamp, ensureTransparentImage } from "./stampPdfHelper";

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
 * Menggambar Kop Surat Resmi Biro Wisata (AHU & NIB Legalitas, Alamat, Kontak, Garis Ganda)
 */
const drawKopSurat = (
  doc: jsPDF,
  profile: BiroProfile,
  logoImg: HTMLImageElement | null
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = pageWidth - 14;
  const topY = 4; // Margin atas kop surat dinaikkan presisi 4mm dari tepi kertas

  const maxLogoDim = 20;
  let logoActualH = maxLogoDim;

  if (logoImg) {
    try {
      const origW = logoImg.naturalWidth || logoImg.width || 1;
      const origH = logoImg.naturalHeight || logoImg.height || 1;
      const aspect = origW / origH;
      let renderW = maxLogoDim;
      let renderH = maxLogoDim;
      if (aspect > 1) {
        renderH = maxLogoDim / aspect;
      } else if (aspect < 1) {
        renderW = maxLogoDim * aspect;
      }
      logoActualH = renderH;
      const logoX = marginLeft + (maxLogoDim - renderW) / 2;
      const logoY = topY;
      doc.addImage(logoImg, "PNG", logoX, logoY, renderW, renderH);
    } catch {}
  }

  // Teks Kop Surat Tepat di Tengah Halaman (pageWidth / 2) & Berukuran Gagah
  const pageCenter = pageWidth / 2;
  const legalitasText = formatLegalitasBiro(profile);
  let curY = topY + 4.5; // Baseline huruf 18pt agar batas atas teks persis sejajar topY (4mm)

  // 1. Nama Biro Wisata (Besar 18pt, Bold, Navy Formal)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 44, 89);
  doc.text((profile.nama_biro || "CATAT BIRO WISATA").toUpperCase(), pageCenter, curY, {
    align: "center",
  });
  curY += 4.5;

  // 2. Baris Legalitas Resmi: SK Kemenkumham AHU & NIB OSS
  if (legalitasText) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(legalitasText.toUpperCase(), pageCenter, curY, { align: "center" });
    curY += 3.8;
  } else if (profile.slogan) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(profile.slogan.toUpperCase(), pageCenter, curY, { align: "center" });
    curY += 3.8;
  }

  // 3. Alamat Kantor
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const alamatText = profile.alamat
    ? `Alamat : ${profile.alamat}`
    : "Alamat : Jl. Stasiun No. 15 Kelurahan Bintoro Kec. Demak Kab. Demak Jawa Tengah 59511";
  doc.text(alamatText, pageCenter, curY, { align: "center" });
  curY += 3.6;

  // 4. Kontak Resmi
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const kontakText = `Contact Person / WA : ${profile.telepon || "0822-2630-1433"}${
    profile.email ? `  |  Email: ${profile.email}` : ""
  }${profile.website ? `  |  Web: ${profile.website}` : ""}`;
  doc.text(kontakText, pageCenter, curY, { align: "center" });
  curY += 3.6;

  // 5. Garis Ganda Resmi Kop Surat (Ciri Khas Dokumen Formal Indonesia)
  const lineY = Math.max(curY, topY + logoActualH + 1.2);
  doc.setDrawColor(15, 44, 89);
  doc.setLineWidth(1.2);
  doc.line(marginLeft, lineY, marginRight, lineY);

  doc.setLineWidth(0.35);
  doc.line(marginLeft, lineY + 1.1, marginRight, lineY + 1.1);

  return lineY + 4.5;
};

/**
 * Generator Utama Kwitansi & Invoice PDF Resmi
 */
export async function generateInvoiceOrKwitansiPDF(
  options: GenerateInvoiceKwitansiOptions
): Promise<jsPDF> {
  let profile = options.profile || getLocalBiroProfile();

  // Otomatis pastikan logo, stempel custom, dan tanda tangan bebas background putih & auto-crop (tidak kurus)
  if (profile.logo_url && !profile.logo_url.endsWith(".svg")) {
    const cleaned = await ensureTransparentImage(profile.logo_url);
    if (cleaned) profile = { ...profile, logo_url: cleaned };
  }
  if (profile.stempel_custom_image_url) {
    const cleaned = await ensureTransparentImage(profile.stempel_custom_image_url);
    if (cleaned) profile = { ...profile, stempel_custom_image_url: cleaned };
  }
  if (profile.tanda_tangan_url) {
    const cleaned = await ensureTransparentImage(profile.tanda_tangan_url);
    if (cleaned) profile = { ...profile, tanda_tangan_url: cleaned };
  }

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
  const kotaPimpinan = profile.kota_tanda_tangan || profile.alamat?.split(",")?.[1]?.trim() || "Demak";
  doc.text(`${kotaPimpinan}, ${formatTanggalIndo(options.tanggal)}`, signX, signY, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.nama_biro || "Catat Biro Wisata", signX, signY + 4.5, {
    align: "center",
  });

  // Tanda Tangan Basah Gambar (Jika diunggah) - tepat di atas nama, agak ke kanan
  if (profile.tanda_tangan_url) {
    try {
      doc.addImage(profile.tanda_tangan_url, "PNG", signX - 8, signY + 8, 26, 14);
    } catch (e) {
      console.warn("Gagal render ttd image:", e);
    }
  }

  // Stempel Digital / Basah (Posisi di sebelah kiri menimpa separuh kiri tanda tangan, sejajar vertikal)
  drawDigitalStamp(
    doc,
    signX - 7,
    signY + 15,
    profile,
    options.statusPembayaran || (isKwitansi ? "LUNAS" : "VERIFIED"),
    11
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
  doc.text(profile.jabatan_penandatangan || "Pimpinan / Manajemen Keuangan", signX, bottomSignY + 3.5, {
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

    // Simpan ke riwayat arsip dokumen PDF lokal
    try {
      recordDownloadedDoc({
        docType: options.docType,
        nomorDokumen: options.nomorDokumen,
        judul:
          options.docType === "kwitansi"
            ? `Kwitansi #${options.nomorDokumen} - ${options.peruntukan || "Pembayaran"}`
            : `Invoice #${options.nomorDokumen} - ${options.peruntukan || "Tagihan"}`,
        namaKlienOrTrip: `${options.namaKlien}${options.namaTrip ? ` (${options.namaTrip})` : ""}`,
        nominal: options.nominal,
        statusPembayaran: options.statusPembayaran || (isKwitansi ? "Lunas" : "Belum Lunas"),
        fileName: filename,
        metadata: options,
      });
    } catch (e) {
      console.warn("Gagal mencatat arsip unduhan:", e);
    }
  }

  return doc;
}
