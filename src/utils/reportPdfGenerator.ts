import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Trip {
  nama_trip: string;
  tanggal: string;
  tanggal_selesai: string | null;
  tujuan: string;
}

interface Keuangan {
  tanggal: string;
  keterangan: string;
  jumlah: number;
  jenis: string;
  trips?: { nama_trip: string };
}

interface Media {
  file_name: string;
  file_type: string;
  trips?: { nama_trip: string };
}

interface ReportData {
  trips: Trip[];
  keuangan: Keuangan[];
  media?: Media[];
  filterTripId?: string;
}

export const generateReportPDF = (data: ReportData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  let currentY = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN TRIP & KEUANGAN", pageWidth / 2, currentY, {
    align: "center",
  });

  currentY += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(`Tanggal Cetak: ${today}`, pageWidth / 2, currentY, {
    align: "center",
  });

  currentY += 15;

  // Summary Section
  const pemasukan = data.keuangan
    .filter((k) => k.jenis === "pemasukan")
    .reduce((sum, k) => sum + Number(k.jumlah), 0);
  const pengeluaran = data.keuangan
    .filter((k) => k.jenis === "pengeluaran")
    .reduce((sum, k) => sum + Number(k.jumlah), 0);
  const saldo = pemasukan - pengeluaran;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RINGKASAN", 14, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Trip: ${data.trips.length}`, 20, currentY);
  currentY += 6;
  doc.setTextColor(0, 128, 0);
  doc.text(
    `Total Pemasukan: Rp ${pemasukan.toLocaleString("id-ID")}`,
    20,
    currentY
  );
  currentY += 6;
  doc.setTextColor(255, 0, 0);
  doc.text(
    `Total Pengeluaran: Rp ${pengeluaran.toLocaleString("id-ID")}`,
    20,
    currentY
  );
  currentY += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(`Saldo: Rp ${saldo.toLocaleString("id-ID")}`, 20, currentY);
  currentY += 12;

  // Trips Table
  if (data.trips.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RIWAYAT TRIP", 14, currentY);
    currentY += 5;

    const tripTableData = data.trips.map((trip) => {
      const tanggalRange = trip.tanggal_selesai
        ? `${new Date(trip.tanggal).toLocaleDateString("id-ID")} - ${new Date(
            trip.tanggal_selesai
          ).toLocaleDateString("id-ID")}`
        : new Date(trip.tanggal).toLocaleDateString("id-ID");
      return [trip.nama_trip, tanggalRange, trip.tujuan];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Nama Trip", "Tanggal", "Tujuan"]],
      body: tripTableData,
      theme: "striped",
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // Keuangan Table
  if (data.keuangan.length > 0) {
    // Add new page if needed
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RIWAYAT KEUANGAN", 14, currentY);
    currentY += 5;

    const keuanganTableData = data.keuangan.map((k) => {
      const tanggal = new Date(k.tanggal).toLocaleDateString("id-ID");
      const tripName = k.trips?.nama_trip || "-";
      const jumlahFormatted = `Rp ${Number(k.jumlah).toLocaleString("id-ID")}`;
      return [tanggal, tripName, k.keterangan, jumlahFormatted, k.jenis];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Tanggal", "Trip", "Keterangan", "Jumlah", "Jenis"]],
      body: keuanganTableData,
      theme: "striped",
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        3: { halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const jenis = data.cell.raw as string;
          if (jenis === "pemasukan") {
            data.cell.styles.textColor = [0, 128, 0];
          } else {
            data.cell.styles.textColor = [255, 0, 0];
          }
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Malika Tour - Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  return doc;
};
