import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RundownItem {
  hari_ke: number;
  jam_mulai: string;
  jam_selesai: string;
  judul_acara: string;
  keterangan: string | null;
}

interface TripInfo {
  nama_trip: string;
  tanggal: string;
  tanggal_selesai: string | null;
  tujuan: string;
}

export const generateRundownPDF = (
  tripInfo: TripInfo,
  rundownData: RundownItem[]
): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("RUNDOWN ACARA", pageWidth / 2, 20, { align: "center" });

  // Trip Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Trip: ${tripInfo.nama_trip}`, 14, 35);
  doc.text(`Tujuan: ${tripInfo.tujuan}`, 14, 42);
  
  const tanggalText = tripInfo.tanggal_selesai
    ? `${tripInfo.tanggal} - ${tripInfo.tanggal_selesai}`
    : tripInfo.tanggal;
  doc.text(`Tanggal: ${tanggalText}`, 14, 49);

  // Group by day
  const groupedByDay = rundownData.reduce((acc, item) => {
    if (!acc[item.hari_ke]) {
      acc[item.hari_ke] = [];
    }
    acc[item.hari_ke].push(item);
    return acc;
  }, {} as Record<number, RundownItem[]>);

  let currentY = 60;

  // Generate tables for each day
  Object.keys(groupedByDay)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((day) => {
      const dayNumber = parseInt(day);
      const items = groupedByDay[dayNumber];

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Hari ke-${dayNumber}`, 14, currentY);
      currentY += 5;

      const tableData = items.map((item) => [
        `${item.jam_mulai} - ${item.jam_selesai}`,
        item.judul_acara,
        item.keterangan || "-",
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Waktu", "Acara", "Keterangan"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 60 },
          2: { cellWidth: 80 },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Add new page if needed
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
    });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Malika Tour - Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  return doc;
};
