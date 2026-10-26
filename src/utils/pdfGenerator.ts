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

const loadLogo = async (): Promise<string | null> => {
  try {
    const response = await fetch("/malika-logo.png");
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const generateRundownPDF = async (
  tripInfo: TripInfo,
  rundownData: RundownItem[]
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogo();

  // Kop surat formal
  if (logo) doc.addImage(logo, "PNG", 14, 10, 22, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("BIRO PERJALANAN WISATA", logo ? 42 : pageWidth / 2, 16, logo ? undefined : { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Pencatatan Operasional Perjalanan", logo ? 42 : pageWidth / 2, 22, logo ? undefined : { align: "center" });
  doc.setDrawColor(31, 78, 121);
  doc.setLineWidth(0.8);
  doc.line(14, 35, pageWidth - 14, 35);
  doc.setDrawColor(170, 170, 170);
  doc.setLineWidth(0.25);
  doc.line(14, 37, pageWidth - 14, 37);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RUNDOWN ACARA", pageWidth / 2, 50, { align: "center" });

  // Trip Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Trip: ${tripInfo.nama_trip}`, 14, 66);
  doc.text(`Tujuan: ${tripInfo.tujuan}`, 14, 73);
  
  const tanggalText = tripInfo.tanggal_selesai
    ? `${tripInfo.tanggal} - ${tripInfo.tanggal_selesai}`
    : tripInfo.tanggal;
  doc.text(`Tanggal: ${tanggalText}`, 14, 80);

  // Group by day
  const groupedByDay = rundownData.reduce((acc, item) => {
    if (!acc[item.hari_ke]) {
      acc[item.hari_ke] = [];
    }
    acc[item.hari_ke].push(item);
    return acc;
  }, {} as Record<number, RundownItem[]>);

  let currentY = 92;

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
      `Pencatatan Agen Biro - Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  return doc;
};
