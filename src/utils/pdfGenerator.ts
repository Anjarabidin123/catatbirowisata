import type jsPDF from "jspdf";
import { getLocalBiroProfile, BiroProfile, formatLegalitasBiro } from "./biroProfile";
import { getCurrentEntitlements } from "./licenseEntitlement";
import { savePdf } from "./pdfSaver";
import { drawDigitalStamp, ensureTransparentImage } from "./stampPdfHelper";

export interface RundownItem {
  hari_ke?: number;
  hariKe?: number;
  jam_mulai?: string;
  jamMulai?: string;
  jam_selesai?: string;
  jamSelesai?: string;
  judul_acara?: string;
  judulAcara?: string;
  keterangan?: string | null;
  lokasi?: string | null;
}

export interface DestinationItem {
  nama?: string;
  nama_destinasi?: string;
  lokasi?: string | null;
  catatan?: string | null;
}

export interface TripDetails {
  nama_trip?: string;
  tripName?: string;
  tanggal?: string;
  tanggal_selesai?: string | null;
  tanggalSelesai?: string | null;
  tujuan?: string;
  nama_kendaraan?: string | null;
  nomor_polisi?: string | null;
  nama_driver?: string | null;
  jumlah_penumpang?: number | null;
  catatan?: string | null;
  tour_leader?: string | null;
}

export interface GenerateRundownOptions {
  trip?: TripDetails;
  tripInfo?: TripDetails;
  tripName?: string;
  tanggal?: string;
  tanggalSelesai?: string | null;
  tanggal_selesai?: string | null;
  tujuan?: string;
  nama_kendaraan?: string | null;
  nomor_polisi?: string | null;
  nama_driver?: string | null;
  jumlah_penumpang?: number | null;
  catatan?: string | null;
  destinations?: DestinationItem[];
  rundown?: RundownItem[];
  profile?: BiroProfile;
  autoDownload?: boolean;
}

// Helper format tanggal Indonesia
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

// Helper hitung durasi hari
const hitungDurasiHari = (startStr?: string, endStr?: string | null): string => {
  if (!startStr) return "";
  if (!endStr || startStr === endStr) return "1 Hari Penuh";
  try {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 1) {
      return `${diffDays} Hari ${diffDays - 1} Malam`;
    }
    return `${diffDays} Hari`;
  } catch {
    return "";
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
  const topY = 4; // Margin atas kop surat dinaikkan presisi 4mm dari tepi kertas

  // 1. Gambar Logo di sisi kiri Kop (jika ada) dengan aspect ratio asli (tidak gepeng/kurus)
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

  // 2. Teks Kop Surat Resmi - Tepat di Tengah Halaman (pageWidth / 2) & Berukuran Gagah
  const pageCenter = pageWidth / 2;
  const legalitasText = formatLegalitasBiro(profile);
  let curY = topY + 4.5; // Baseline huruf 18pt agar batas atas teks persis sejajar topY (4mm)

  // Nama Biro (Besar, Bold, Gagah 18pt, Navy Formal)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 44, 89);
  doc.text((profile.nama_biro || "CATAT BIRO WISATA").toUpperCase(), pageCenter, curY, {
    align: "center",
  });
  curY += 4.5;

  // Legalitas Resmi: AHU & NIB OSS (atau Slogan jika belum diisi)
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

  // Alamat Kantor
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const alamatText = profile.alamat || "Jl. Raya Demak - Kudus KM 4, Demak, Jawa Tengah";
  doc.text(alamatText, pageCenter, curY, { align: "center" });
  curY += 3.6;

  // Kontak Resmi
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const kontakText = `Telp/WA: ${profile.telepon || "0812-2578-9000"}  |  Email: ${profile.email || "operasional@birowisata.id"}  |  Web: ${profile.website || "www.catatbirowisata.id"}`;
  doc.text(kontakText, pageCenter, curY, { align: "center" });
  curY += 3.6;

  // 3. Garis Ganda Resmi Kop Surat (Ciri Khas Dokumen Formal Indonesia)
  const lineY = Math.max(curY, topY + logoActualH + 1.2);
  doc.setDrawColor(15, 44, 89);
  doc.setLineWidth(1.2);
  doc.line(marginLeft, lineY, marginRight, lineY);

  doc.setLineWidth(0.35);
  doc.line(marginLeft, lineY + 1.1, marginRight, lineY + 1.1);

  return lineY + 4.5;
};

/**
 * Generator PDF Rundown Acara Resmi dengan Kop Surat & Rincian Lengkap
 * Mendukung pemanggilan format opsi tunggal maupun (tripInfo, rundownData)
 */
export const generateRundownPDF = async (
  param1: GenerateRundownOptions | TripDetails,
  param2?: RundownItem[]
): Promise<jsPDF> => {
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

  // Parsing parameter fleksibel
  let tripInfo: TripDetails = {};
  let rundownItems: RundownItem[] = [];
  let destinations: DestinationItem[] = [];
  let autoDownload = true;
  let customProfile: BiroProfile | undefined = undefined;

  if (Array.isArray(param2)) {
    // Dipanggil dengan format lama: generateRundownPDF(tripInfo, rundownData)
    tripInfo = (param1 as TripDetails) || {};
    rundownItems = param2;
  } else if (typeof param1 === "object" && param1 !== null) {
    const opts = param1 as GenerateRundownOptions;
    tripInfo = opts.trip || opts.tripInfo || {
      nama_trip: opts.tripName,
      tanggal: opts.tanggal,
      tanggal_selesai: opts.tanggalSelesai || opts.tanggal_selesai,
      tujuan: opts.tujuan,
      nama_kendaraan: opts.nama_kendaraan,
      nomor_polisi: opts.nomor_polisi,
      nama_driver: opts.nama_driver,
      jumlah_penumpang: opts.jumlah_penumpang,
      catatan: opts.catatan,
    };
    rundownItems = opts.rundown || [];
    destinations = opts.destinations || [];
    if (opts.autoDownload !== undefined) autoDownload = opts.autoDownload;
    customProfile = opts.profile;
  }

  let profile = customProfile || getLocalBiroProfile();

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

  // Load logo jika ada
  let logoImg: HTMLImageElement | null = null;
  if (profile.logo_url) {
    logoImg = await loadImage(profile.logo_url);
  }
  if (!logoImg) {
    logoImg = await loadImage("/pwa-icon.svg");
  }

  // 1. Gambar Kop Surat Formal
  let currentY = drawKopSurat(doc, profile, logoImg);

  // 2. Judul Dokumen & Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("JADWAL OPERASIONAL & RUNDOWN PERJALANAN WISATA", pageWidth / 2, currentY + 3, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("AGENDA RESMI PELAKSANAAN KEGIATAN TOUR & TRANSPORTASI", pageWidth / 2, currentY + 7.5, {
    align: "center",
  });

  currentY += 12;

  // Metadata Dokumen
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const nomorDokumen = `RDW/BPW/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}/${Math.floor(100 + Math.random() * 900)}`;
  const tglTerbit = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  doc.text(`Nomor Dokumen : ${nomorDokumen}`, 14, currentY);
  doc.text(`Tanggal Terbit  : ${tglTerbit}`, pageWidth - 14, currentY, { align: "right" });

  currentY += 4;
  doc.text(`Status Dokumen : DIVERIFIKASI RESMI`, 14, currentY);
  doc.text(`Penanggung Jawab: Tour Leader & Kru Operasional`, pageWidth - 14, currentY, { align: "right" });

  currentY += 6;

  // 3. Rincian Spesifikasi Perjalanan Wisata (Trip Specifications Table)
  const tripTitle = tripInfo.nama_trip || (tripInfo as any).tripName || "Perjalanan Wisata";
  const destination = tripInfo.tujuan || "-";
  const tglMulai = formatTanggalIndo(tripInfo.tanggal);
  const tglSelesai = formatTanggalIndo(tripInfo.tanggal_selesai || (tripInfo as any).tanggalSelesai);
  const durasiText = hitungDurasiHari(tripInfo.tanggal, tripInfo.tanggal_selesai || (tripInfo as any).tanggalSelesai);
  const jadwalLengkap = tripInfo.tanggal_selesai && tripInfo.tanggal_selesai !== tripInfo.tanggal
    ? `${tglMulai} s/d ${tglSelesai} (${durasiText})`
    : `${tglMulai} (${durasiText})`;

  const busInfo = tripInfo.nama_kendaraan
    ? `${tripInfo.nama_kendaraan}${tripInfo.nomor_polisi ? ` (${tripInfo.nomor_polisi})` : ""}`
    : "Armada Bus Pariwisata";
  const driverInfo = tripInfo.nama_driver || "Kru Pengemudi & TL";
  const paxInfo = tripInfo.jumlah_penumpang ? `${tripInfo.jumlah_penumpang} Peserta (Pax)` : "Rombongan Wisata";

  const tripSpecsBody: any[] = [
    [
      { content: "Nama Rombongan / Trip", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      { content: tripTitle, styles: { fontStyle: "bold", textColor: [15, 44, 89] } },
      { content: "Armada Bus / Nopol", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      { content: busInfo },
    ],
    [
      { content: "Destinasi / Rute Utama", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      { content: destination },
      { content: "Kru Operasional (Driver/TL)", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      { content: driverInfo },
    ],
    [
      { content: "Jadwal & Durasi", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      { content: jadwalLengkap },
      { content: "Kapasitas Rombongan", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      { content: paxInfo },
    ],
  ];

  // Catatan internal trip (seperti deal harga, komitmen panitia, pengembalian uang, dan free kaos)
  // TIDAK DITAMPILKAN di dokumen Rundown resmi demi melindungi kerahasiaan & privasi komersial biro saat dibagikan ke peserta/tamu.

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        {
          content: "SPESIFIKASI OPERASIONAL PERJALANAN (TRIP DETAILS)",
          colSpan: 4,
          styles: { halign: "left", fillColor: [15, 44, 89], textColor: 255, fontSize: 8.5, fontStyle: "bold" },
        },
      ],
    ],
    body: tripSpecsBody,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2.4,
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 55 },
      2: { cellWidth: 40 },
      3: { cellWidth: 45 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 4. Daftar Objek Destinasi Wisata (Jika ada)
  if (destinations && destinations.length > 0) {
    const destRows = destinations.map((d, idx) => [
      String(idx + 1),
      d.nama || d.nama_destinasi || "-",
      d.lokasi || "-",
      d.catatan || "Kunjungan & eksplorasi wisata",
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          {
            content: "DAFTAR DESTINASI & OBJEK KUNJUNGAN WISATA",
            colSpan: 4,
            styles: { halign: "left", fillColor: [30, 58, 138], textColor: 255, fontSize: 8.5, fontStyle: "bold" },
          },
        ],
        ["No", "Nama Objek Wisata", "Lokasi / Daerah", "Catatan Kunjungan"],
      ],
      body: destRows,
      theme: "striped",
      headStyles: {
        fontSize: 8,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 60, fontStyle: "bold" },
        2: { cellWidth: 50 },
        3: { cellWidth: 62 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // 5. Susunan Rundown Acara Per Hari
  // Normalisasi dan grouping per hari
  const groupedByDay = (rundownItems || []).reduce((acc, item) => {
    const day = Number(item.hari_ke || item.hariKe || 1);
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(item);
    return acc;
  }, {} as Record<number, RundownItem[]>);

  const days = Object.keys(groupedByDay).map(Number).sort((a, b) => a - b);

  if (days.length === 0) {
    // Jika rundown kosong
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Belum ada susunan rundown acara yang dimasukkan.", 14, currentY + 5);
    currentY += 12;
  } else {
    days.forEach((dayNum) => {
      const items = groupedByDay[dayNum];

      // Periksa sisa ruang halaman sebelum render tabel hari
      if (currentY > pageHeight - 45) {
        doc.addPage();
        currentY = 20;
      }

      // Urutkan item berdasarkan jam mulai
      items.sort((a, b) => {
        const jamA = a.jam_mulai || a.jamMulai || "00:00";
        const jamB = b.jam_mulai || b.jamMulai || "00:00";
        return jamA.localeCompare(jamB);
      });

      const tableData = items.map((it, idx) => {
        const start = it.jam_mulai || it.jamMulai || "--:--";
        const end = it.jam_selesai || it.jamSelesai || "--:--";
        const timeRange = `${start} - ${end} WIB`;
        const title = it.judul_acara || it.judulAcara || "-";
        const location = it.lokasi || "-";
        const notes = it.keterangan || "-";
        return [String(idx + 1), timeRange, title, location, notes];
      });

      autoTable(doc, {
        startY: currentY,
        head: [
          [
            {
              content: `SUSUNAN ACARA HARI KE-${dayNum}`,
              colSpan: 5,
              styles: {
                fillColor: [15, 44, 89],
                textColor: 255,
                fontSize: 8.5,
                fontStyle: "bold",
                halign: "left",
              },
            },
          ],
          ["No", "Waktu", "Agenda / Aktivitas Acara", "Lokasi / Titik Kumpul", "Keterangan / Catatan PIC"],
        ],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 8,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.2,
          lineColor: [226, 232, 240],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 32, fontStyle: "bold", textColor: [15, 44, 89] },
          2: { cellWidth: 55, fontStyle: "bold" },
          3: { cellWidth: 40 },
          4: { cellWidth: 45 },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    });
  }

  // 6. Petunjuk & Ketentuan Operasional Wisata (Standard Operational Protocol)
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 20;
  }

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        {
          content: "PETUNJUK & KETENTUAN OPERASIONAL WISATA (TATA TERTIB)",
          styles: { fillColor: [15, 44, 89], textColor: 255, fontSize: 8, fontStyle: "bold" },
        },
      ],
    ],
    body: [
      ["1. Peserta diharapkan telah hadir dan berkumpul di titik temu paling lambat 15 menit sebelum jam keberangkatan."],
      ["2. Mohon selalu menjaga barang bawaan berharga masing-masing. Pihak biro tidak bertanggung jawab atas kehilangan akibat kelalaian pribadi."],
      ["3. Jagalah kebersihan di dalam armada bus dan patuhi instruksi Tour Leader serta pengemudi demi keselamatan rombongan."],
      ["4. Susunan jadwal rundown dapat disesuaikan di lapangan sesuai dengan dinamika lalu lintas dan kondisi cuaca demi kelancaran bersama."],
      ["5. Apabila ada peserta yang sakit atau memerlukan bantuan darurat, segera hubungi Tour Leader atau kru operasional yang bertugas."],
    ],
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [71, 85, 105],
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 7. Blok Tanda Tangan & Pengesahan Dokumen (Dual Signature Box)
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 25;
  }

  const tglPengesahan = formatTanggalIndo(new Date().toISOString());
  const kotaPimpinan = profile.kota_tanda_tangan || (profile.alamat?.includes("Demak") ? "Demak" : "Kantor Operasional");

  // Pusat koordinat kolom kiri & kanan
  const colLeftCenter = 46;
  const colRightCenter = pageWidth - 46;

  // Kolom Kanan: Tempat & Tanggal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`${kotaPimpinan}, ${tglPengesahan}`, colRightCenter, currentY, { align: "center" });

  // Header Kolom Kiri: Tour Leader
  doc.text("Dikoordinasikan oleh,", colLeftCenter, currentY + 4.5, { align: "center" });
  doc.text("Tour Leader / Koordinator Lapangan,", colLeftCenter, currentY + 9, { align: "center" });

  // Header Kolom Kanan: Pimpinan Biro Wisata
  doc.text("Mengetahui & Menyetujui,", colRightCenter, currentY + 4.5, { align: "center" });
  doc.text(profile.jabatan_penandatangan || "Pimpinan Biro Wisata", colRightCenter, currentY + 9, { align: "center" });

  const signY = currentY + 34;

  // Garis & Nama Tour Leader (Kiri)
  doc.text("( ..................................................... )", colLeftCenter, signY, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(tripInfo.tour_leader || "Tour Leader Lapangan", colLeftCenter, signY + 4.5, { align: "center" });

  // Tanda Tangan Coretan Gambar (Kanan) - posisi tepat di atas nama, agak ke kanan
  if (profile.tanda_tangan_url) {
    try {
      doc.addImage(profile.tanda_tangan_url, "PNG", colRightCenter - 8, currentY + 14, 26, 14);
    } catch (e) {
      console.warn("Gagal render ttd di rundown:", e);
    }
  }

  // Stempel Resmi Biro (Kanan) - di sebelah kiri menimpa separuh kiri tanda tangan, sejajar vertikal
  drawDigitalStamp(doc, colRightCenter - 7, currentY + 21, profile, "VERIFIED", 11);

  // Garis & Nama Pimpinan (Kanan)
  doc.setFont("helvetica", "bold");
  doc.text(`( ${profile.pimpinan || "H. Anjar Abidin, S.E."} )`, colRightCenter, signY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(profile.jabatan_penandatangan || "Pimpinan Operasional", colRightCenter, signY + 4.5, { align: "center" });

  // 8. Watermark Footer di Semua Halaman
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Dokumen Resmi Operasional - ${profile.nama_biro || "Catat Biro Wisata"}  |  Hotline: ${profile.telepon || "0812-2578-9000"}`,
      14,
      pageHeight - 6.5
    );
    doc.text(
      `Halaman ${i} dari ${totalPages}`,
      pageWidth - 14,
      pageHeight - 6.5,
      { align: "right" }
    );
  }

  // Auto download jika diaktifkan
  if (autoDownload !== false) {
    const cleanTitle = (tripTitle || "Trip").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `Rundown_${cleanTitle}_${safeDate}.pdf`;
    await savePdf(doc, fileName);
  }

  return doc;
};
