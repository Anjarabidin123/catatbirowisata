/**
 * Bus Manifest & Cabin Architecture Helper
 * Mendukung visual denah kabin bus realistis (2-2, 2-3, HiAce),
 * import Word (.docx), scan foto AI manifest, export Word (.doc), dan export gambar PNG.
 */

import { getStoredApiKey } from "./asistenWisataAI";
import { BiroProfile } from "./biroProfile";

export type BusLayoutType = "big_bus_50" | "big_bus_59" | "medium_bus_31" | "hiace_14";

export interface SeatAssignment {
  seatNumber: string;
  name: string;
  category?: "Umum" | "Lansia" | "Anak" | "Ibu Hamil" | "Kru / TL";
  notes?: string;
  phone?: string;
}

export interface BusRow {
  rowNumber: number;
  leftSeats: string[];
  rightSeats: string[];
  isBackRow?: boolean;
  backSeats?: string[];
}

export interface BusStructure {
  layout: BusLayoutType;
  title: string;
  totalSeats: number;
  configLabel: string;
  rows: BusRow[];
}

/**
 * Generator struktur baris kabin bus realistis
 */
export const generateBusStructure = (layout: BusLayoutType): BusStructure => {
  if (layout === "big_bus_50") {
    // 11 baris 2-2 (44 kursi) + 1 baris belakang (6 kursi) = 50 kursi
    const rows: BusRow[] = [];
    for (let r = 1; r <= 11; r++) {
      rows.push({
        rowNumber: r,
        leftSeats: [`${r}A`, `${r}B`],
        rightSeats: [`${r}C`, `${r}D`],
      });
    }
    rows.push({
      rowNumber: 12,
      leftSeats: [],
      rightSeats: [],
      isBackRow: true,
      backSeats: ["12A", "12B", "12C", "12D", "12E", "12F"],
    });

    return {
      layout,
      title: "Big Bus 50 Seat",
      totalSeats: 50,
      configLabel: "2 - 2 + Bangku Belakang",
      rows,
    };
  }

  if (layout === "big_bus_59") {
    // 11 baris 2-3 (55 kursi) + 1 baris belakang (4 kursi) = 59 kursi
    const rows: BusRow[] = [];
    for (let r = 1; r <= 11; r++) {
      rows.push({
        rowNumber: r,
        leftSeats: [`${r}A`, `${r}B`],
        rightSeats: [`${r}C`, `${r}D`, `${r}E`],
      });
    }
    rows.push({
      rowNumber: 12,
      leftSeats: [],
      rightSeats: [],
      isBackRow: true,
      backSeats: ["12A", "12B", "12C", "12D"],
    });

    return {
      layout,
      title: "Big Bus 59 Seat",
      totalSeats: 59,
      configLabel: "2 - 3 + Bangku Belakang",
      rows,
    };
  }

  if (layout === "medium_bus_31") {
    // 7 baris 2-2 (28 kursi) + baris belakang (3 kursi) = 31 kursi
    const rows: BusRow[] = [];
    for (let r = 1; r <= 7; r++) {
      rows.push({
        rowNumber: r,
        leftSeats: [`${r}A`, `${r}B`],
        rightSeats: [`${r}C`, `${r}D`],
      });
    }
    rows.push({
      rowNumber: 8,
      leftSeats: [],
      rightSeats: [],
      isBackRow: true,
      backSeats: ["8A", "8B", "8C"],
    });

    return {
      layout,
      title: "Medium Bus 31 Seat",
      totalSeats: 31,
      configLabel: "2 - 2 Medium",
      rows,
    };
  }

  // Toyota HiAce 14 Seat
  const rows: BusRow[] = [
    {
      rowNumber: 1,
      leftSeats: ["1A"],
      rightSeats: [], // Sisi kanan adalah kemudi supir
    },
    {
      rowNumber: 2,
      leftSeats: ["2A"],
      rightSeats: ["2B", "2C"],
    },
    {
      rowNumber: 3,
      leftSeats: ["3A"],
      rightSeats: ["3B", "3C"],
    },
    {
      rowNumber: 4,
      leftSeats: ["4A"],
      rightSeats: ["4B", "4C"],
    },
    {
      rowNumber: 5,
      leftSeats: [],
      rightSeats: [],
      isBackRow: true,
      backSeats: ["5A", "5B", "5C", "5D"],
    },
  ];

  return {
    layout: "hiace_14",
    title: "Toyota HiAce 14 Seat",
    totalSeats: 14,
    configLabel: "Microbus Komuter",
    rows,
  };
};

/**
 * Mendapatkan seluruh list nomor kursi berurutan dari struktur
 */
export const getAllSeatNumbers = (layout: BusLayoutType): string[] => {
  const structure = generateBusStructure(layout);
  const seats: string[] = [];

  structure.rows.forEach((row) => {
    if (row.isBackRow && row.backSeats) {
      seats.push(...row.backSeats);
    } else {
      seats.push(...row.leftSeats);
      seats.push(...row.rightSeats);
    }
  });

  return seats;
};

/**
 * Ekstraksi file Word (.docx) atau Text (.txt) menjadi daftar nama penumpang
 */
export async function parseWordManifest(
  file: File
): Promise<{ seat?: string; name: string; notes?: string }[]> {
  const fileName = file.name.toLowerCase();
  let rawText = "";

  if (fileName.endsWith(".docx") || file.type.includes("wordprocessingml")) {
    const { default: mammoth } = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    rawText = result.value || "";
  } else {
    rawText = await file.text();
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: { seat?: string; name: string; notes?: string }[] = [];

  // Pola 1: Format "1A: Nama Peserta" atau "1A - Nama Peserta" atau "1A. Nama Peserta"
  const seatPrefixRegex = /^([0-9]{1,2}[A-F])\s*[:\-\.\|]\s*(.+)$/i;

  // Pola 2: Format nomor urut "1. Nama Peserta" atau "1) Nama Peserta"
  const numberedListRegex = /^[0-9]{1,3}[\.\)\-]\s*(.+)$/;

  for (const line of lines) {
    // Lewati baris judul umum
    if (
      /daftar\s*(nama|peserta|penumpang|manifest)|denah\s*kursi|rombongan|tujuan|driver|bus\s*pariwisata/i.test(
        line
      )
    ) {
      continue;
    }

    const seatMatch = line.match(seatPrefixRegex);
    if (seatMatch) {
      const seatNo = seatMatch[1].toUpperCase();
      const namePart = seatMatch[2].trim();
      if (namePart) {
        results.push({ seat: seatNo, name: namePart });
        continue;
      }
    }

    const numberedMatch = line.match(numberedListRegex);
    if (numberedMatch) {
      const namePart = numberedMatch[1].trim();
      if (namePart) {
        results.push({ name: namePart });
        continue;
      }
    }

    // Jika baris biasa (nama peserta langsung)
    if (line.length >= 2 && !line.startsWith("===") && !line.startsWith("---")) {
      results.push({ name: line });
    }
  }

  return results;
}

/**
 * Scan Foto/Gambar Manifest menggunakan Gemini Vision API
 */
export async function scanPhotoManifestWithAI(
  file: File,
  apiKeyParam?: string
): Promise<{ seat?: string; name: string; notes?: string }[]> {
  const fallbackKey = "AQ.Ab8RN6KzU9HOTTXOtiMly1vYqrgzwKPXpKYqXsEGTvJxlrdQnw";
  const apiKey = (apiKeyParam || getStoredApiKey() || fallbackKey).trim();

  // Convert File to Base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip metadata data:image/...;base64,
      const commaIdx = result.indexOf(",");
      resolve(commaIdx !== -1 ? result.substring(commaIdx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const prompt = `Anda adalah sistem OCR cerdas biro perjalanan wisata.
Tugas Anda: Analisis foto kertas denah bus, foto tulisan tangan daftar peserta, atau foto tabel manifest penumpang ini.
Ekstrak nama-nama penumpang dan nomor kursinya jika ada (contoh: 1A, 1B, 2C, dll).
PENTING: Berikan balasan HANYA dalam format JSON array tanpa tanda petik markdown:
[
  { "seat": "1A", "name": "Budi Santoso", "notes": "" },
  { "seat": "1B", "name": "Siti Aminah", "notes": "" }
]
Jika di foto tidak ada nomor kursi, kembalikan urutan nama:
[
  { "name": "Budi Santoso" },
  { "name": "Siti Aminah" }
]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.type || "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal memproses gambar AI: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  const textOutput = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Bersihkan markdown codeblock
  const cleaned = textOutput
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        seat: item.seat ? String(item.seat).toUpperCase().trim() : undefined,
        name: String(item.name || "").trim(),
        notes: item.notes ? String(item.notes).trim() : undefined,
      }));
    }
  } catch (err) {
    console.warn("Gagal parse output AI sebagai JSON:", textOutput);
  }

  return [];
}

/**
 * Ekspor Manifest Resmi ke Dokumen Microsoft Word (.doc)
 */
export function exportManifestToWordDoc(
  tripInfo: {
    nama_trip?: string;
    tujuan?: string;
    nama_kendaraan?: string | null;
    nomor_polisi?: string | null;
    nama_driver?: string | null;
  },
  manifest: Record<string, SeatAssignment>,
  layout: BusLayoutType,
  profile: BiroProfile
): void {
  const structure = generateBusStructure(layout);
  const allSeats = getAllSeatNumbers(layout);
  const occupiedCount = Object.keys(manifest).filter((k) => allSeats.includes(k)).length;
  const emptyCount = structure.totalSeats - occupiedCount;

  // Baris Tabel Denah Kursi dalam Dokumen Word
  let visualRowsHtml = "";
  structure.rows.forEach((row) => {
    if (row.isBackRow && row.backSeats) {
      visualRowsHtml += `
        <tr>
          <td colspan="5" style="background:#e2e8f0; text-align:center; font-weight:bold; font-size:9pt; padding:4px;">
            BARIS BELAKANG (${row.backSeats.join(", ")})
          </td>
        </tr>
        <tr>
          <td colspan="5" style="padding:6px; background:#f8fafc;">
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                ${row.backSeats
                  .map((s) => {
                    const pass = manifest[s];
                    return `
                    <td style="border:1px solid #cbd5e1; padding:6px; text-align:center; background:${
                      pass ? "#eff6ff" : "#ffffff"
                    }; width:${Math.floor(100 / row.backSeats!.length)}%;">
                      <strong style="color:#1d4ed8; font-size:10pt;">${s}</strong><br/>
                      <span style="font-size:9pt; font-weight:bold; color:#0f172a;">${
                        pass ? pass.name : "(Kosong)"
                      }</span>
                      ${pass?.notes ? `<br/><span style="font-size:7.5pt; color:#64748b;">${pass.notes}</span>` : ""}
                    </td>`;
                  })
                  .join("")}
              </tr>
            </table>
          </td>
        </tr>
      `;
    } else {
      const left1 = row.leftSeats[0];
      const left2 = row.leftSeats[1];
      const right1 = row.rightSeats[0];
      const right2 = row.rightSeats[1];
      const right3 = row.rightSeats[2];

      const renderMiniSeat = (seatNo?: string) => {
        if (!seatNo) return `<td style="border:none; width:22%;"></td>`;
        const pass = manifest[seatNo];
        return `
          <td style="border:1px solid #cbd5e1; padding:6px; text-align:center; background:${
            pass ? "#eff6ff" : "#ffffff"
          }; width:22%;">
            <strong style="color:#1d4ed8; font-size:10pt;">${seatNo}</strong><br/>
            <span style="font-size:9pt; font-weight:bold; color:#0f172a;">${
              pass ? pass.name : "(Kosong)"
            }</span>
            ${pass?.notes ? `<br/><span style="font-size:7.5pt; color:#64748b;">${pass.notes}</span>` : ""}
          </td>
        `;
      };

      visualRowsHtml += `
        <tr>
          ${renderMiniSeat(left1)}
          ${renderMiniSeat(left2)}
          <td style="border:none; width:12%; text-align:center; background:#f1f5f9; color:#94a3b8; font-size:8pt; font-weight:bold;">
            LORONG<br/>(B${row.rowNumber})
          </td>
          ${renderMiniSeat(right1)}
          ${renderMiniSeat(right2)}
          ${right3 ? renderMiniSeat(right3) : ""}
        </tr>
      `;
    }
  });

  // Tabel Rekapitulasi Penumpang
  const sortedSeats = [...allSeats].sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    return numA === numB ? a.localeCompare(b) : numA - numB;
  });

  let manifestTableRows = "";
  sortedSeats.forEach((seat, idx) => {
    const p = manifest[seat];
    manifestTableRows += `
      <tr style="background:${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="border:1px solid #cbd5e1; padding:5px 8px; text-align:center; font-weight:bold;">${seat}</td>
        <td style="border:1px solid #cbd5e1; padding:5px 8px; font-weight:${p ? "bold" : "normal"}; color:${
      p ? "#0f172a" : "#94a3b8"
    };">
          ${p ? p.name : "(Kursi Kosong)"}
        </td>
        <td style="border:1px solid #cbd5e1; padding:5px 8px; text-align:center;">${p?.category || "-"}</td>
        <td style="border:1px solid #cbd5e1; padding:5px 8px;">${p?.phone || "-"}</td>
        <td style="border:1px solid #cbd5e1; padding:5px 8px; font-size:8.5pt; color:#475569;">${
          p?.notes || "-"
        }</td>
      </tr>
    `;
  });

  const fullHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Manifest Bus - ${tripInfo.nama_trip || "Trip"}</title>
      <style>
        body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; margin: 20px; }
        h1, h2, h3 { margin: 0; padding: 0; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 14px; }
      </style>
    </head>
    <body>
      <!-- Kop Surat Biro -->
      <table style="width:100%; border-bottom:2px solid #0f2c59; padding-bottom:8px; margin-bottom:14px;">
        <tr>
          <td style="vertical-align:middle;">
            <h1 style="color:#0f2c59; font-size:16pt; font-weight:bold; letter-spacing:-0.5px;">
              ${(profile.nama_biro || "BIRO PERJALANAN WISATA").toUpperCase()}
            </h1>
            <p style="margin:2px 0; font-size:9pt; color:#475569;">
              ${profile.slogan || "Layanan Tour & Travel Pariwisata Profesional"}
            </p>
            <p style="margin:2px 0; font-size:8.5pt; color:#64748b;">
              Alamat: ${profile.alamat || "-"} | Telp/WA: ${profile.telepon || "-"}
            </p>
          </td>
          <td style="text-align:right; vertical-align:middle;">
            <div style="display:inline-block; padding:6px 12px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; text-align:right;">
              <span style="font-size:8pt; font-weight:bold; color:#1e40af; text-transform:uppercase;">DOKUMEN RESMI</span><br/>
              <strong style="font-size:10pt; color:#0f172a;">MANIFEST BUS</strong>
            </div>
          </td>
        </tr>
      </table>

      <!-- Judul & Rincian Trip -->
      <div style="text-align:center; margin-bottom:14px;">
        <h2 style="font-size:13pt; color:#0f2c59; font-weight:bold; text-transform:uppercase;">
          DENAH KURSI & MANIFEST PENUMPANG BUS PARIWISATA
        </h2>
        <p style="font-size:9pt; color:#64748b; margin-top:2px;">
          Tipe Armada: <strong>${structure.title} (${structure.configLabel})</strong>
        </p>
      </div>

      <!-- Info Box -->
      <table style="width:100%; border:1px solid #cbd5e1; background:#f8fafc; margin-bottom:16px;">
        <tr>
          <td style="padding:6px 10px; width:50%; font-size:9pt; border-right:1px solid #e2e8f0;">
            <strong>Nama Rombongan:</strong> ${tripInfo.nama_trip || "-"}<br/>
            <strong>Destinasi Tujuan:</strong> ${tripInfo.tujuan || "-"}
          </td>
          <td style="padding:6px 10px; width:50%; font-size:9pt;">
            <strong>Armada Bus:</strong> ${tripInfo.nama_kendaraan || "Bus Pariwisata"} (${tripInfo.nomor_polisi || "-" })<br/>
            <strong>Driver / Kru:</strong> ${tripInfo.nama_driver || "-"}<br/>
            <strong>Kapasitas:</strong> ${structure.totalSeats} Kursi (Terisi: <strong>${occupiedCount}</strong> | Kosong: <strong>${emptyCount}</strong>)
          </td>
        </tr>
      </table>

      <!-- Visual Denah Kabin Bus -->
      <h3 style="font-size:10.5pt; color:#0f2c59; border-bottom:1px solid #cbd5e1; padding-bottom:4px; margin-bottom:8px;">
        I. VISUAL DENAH TEMPAT DUDUK (SEAT LAYOUT)
      </h3>

      <table style="width:100%; border:1px solid #94a3b8; margin-bottom:20px;">
        <!-- Area Depan / Supir -->
        <tr style="background:#0f2c59; color:#ffffff;">
          <td colspan="2" style="padding:6px; font-size:8.5pt; font-weight:bold; text-align:center;">
            PINTU MASUK DEPAN & TOUR LEADER
          </td>
          <td style="padding:6px; font-size:8.5pt; font-weight:bold; text-align:center; background:#1e3a8a;">
            KACA DEPAN
          </td>
          <td colspan="2" style="padding:6px; font-size:8.5pt; font-weight:bold; text-align:center;">
            KEMUDI SUPIR (DRIVER)
          </td>
        </tr>
        ${visualRowsHtml}
      </table>

      <!-- Tabel Detail Manifest -->
      <h3 style="font-size:10.5pt; color:#0f2c59; border-bottom:1px solid #cbd5e1; padding-bottom:4px; margin-bottom:8px;">
        II. REKAPITULASI DATA LENGKAP PENUMPANG
      </h3>

      <table style="width:100%; border:1px solid #94a3b8; font-size:9pt;">
        <thead>
          <tr style="background:#0f2c59; color:#ffffff;">
            <th style="padding:6px; width:10%; text-align:center;">No Kursi</th>
            <th style="padding:6px; width:35%;">Nama Lengkap Peserta</th>
            <th style="padding:6px; width:15%; text-align:center;">Kategori</th>
            <th style="padding:6px; width:20%;">No. Telepon / WA</th>
            <th style="padding:6px; width:20%;">Catatan Khusus</th>
          </tr>
        </thead>
        <tbody>
          ${manifestTableRows}
        </tbody>
      </table>

      <!-- Tanda Tangan Pengesahan -->
      <table style="width:100%; margin-top:30px; border:none;">
        <tr style="border:none;">
          <td style="border:none; width:33%; text-align:center; font-size:9pt;">
            Mengetahui,<br/>
            <strong>Pimpinan Rombongan / Tamu</strong>
            <br/><br/><br/><br/>
            ( .................................................. )
          </td>
          <td style="border:none; width:33%; text-align:center; font-size:9pt;">
            Kru Lapangan,<br/>
            <strong>Driver / Pengemudi Bus</strong>
            <br/><br/><br/><br/>
            ( <strong>${tripInfo.nama_driver || ".................................................."}</strong> )
          </td>
          <td style="border:none; width:33%; text-align:center; font-size:9pt;">
            Penanggung Jawab Biro,<br/>
            <strong>Tour Leader (TL)</strong>
            <br/><br/><br/><br/>
            ( .................................................. )
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([fullHtml], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const cleanTripName = (tripInfo.nama_trip || "TRIP").replace(/[^a-zA-Z0-9_-]/g, "_");
  const a = document.createElement("a");
  a.href = url;
  a.download = `MANIFEST_KURSI_BUS_${cleanTripName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
