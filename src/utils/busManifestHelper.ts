/**
 * Bus Manifest & Cabin Architecture Helper
 * Mendukung kustomisasi penuh formasi kursi:
 * - Kiri 2 atau 3 kursi
 * - Kanan 2 atau 3 kursi
 * - Lorong tengah
 * - Penomoran berurutan (1, 2, 3... seperti sketsa bus) atau huruf (1A, 1B, 1C...)
 * - Tangga pintu depan, kursi Tour Leader, kursi Sopir, pintu belakang, dan bangku belakang.
 */

import { getStoredApiKey } from "./asistenWisataAI";
import { BiroProfile, formatLegalitasBiro } from "./biroProfile";

export type BusLayoutType =
  | "medium_bus_31"
  | "big_bus_50"
  | "big_bus_59"
  | "big_bus_60"
  | "hiace_14"
  | "custom";

export interface BusConfig {
  layout: BusLayoutType;
  leftSeatsPerRow: number; // 1, 2, atau 3
  rightSeatsPerRow: number; // 1, 2, atau 3
  rowCount: number; // jumlah baris (misal 6, 7, 10, 11)
  hasBackRow: boolean; // ada bangku paling belakang
  backRowSeatsCount: number; // jumlah kursi di baris belakang (misal 5 atau 6)
  hasRearDoor: boolean; // pintu belakang di sisi kiri sebelum baris belakang
  numberingStyle: "sequential" | "letter"; // "sequential" = 1, 2, 3... | "letter" = 1A, 1B, 1C...
}

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
  isRearDoorRow?: boolean; // jika sisi kiri dipakai tangga pintu belakang
  isBackRow?: boolean;
  backSeats?: string[];
}

export interface BusStructure {
  config: BusConfig;
  title: string;
  totalSeats: number;
  configLabel: string;
  rows: BusRow[];
}

/**
 * Konfigurasi default berdasarkan preset
 */
export const getDefaultBusConfig = (layout: BusLayoutType): BusConfig => {
  switch (layout) {
    case "medium_bus_31":
      // Persis seperti gambar sketsa user (2-2, 6 baris penuh, baris 7 ada pintu belakang di kiri & 2 kursi di kanan, bangku belakang 5 kursi) = 31 kursi
      return {
        layout: "medium_bus_31",
        leftSeatsPerRow: 2,
        rightSeatsPerRow: 2,
        rowCount: 7,
        hasBackRow: true,
        backRowSeatsCount: 5,
        hasRearDoor: true,
        numberingStyle: "sequential",
      };

    case "big_bus_50":
      // 11 baris 2-2 (44 kursi) + 6 kursi belakang = 50 kursi
      return {
        layout: "big_bus_50",
        leftSeatsPerRow: 2,
        rightSeatsPerRow: 2,
        rowCount: 11,
        hasBackRow: true,
        backRowSeatsCount: 6,
        hasRearDoor: false,
        numberingStyle: "sequential",
      };

    case "big_bus_59":
      // 11 baris 2-3 (55 kursi) + 4 kursi belakang = 59 kursi
      return {
        layout: "big_bus_59",
        leftSeatsPerRow: 2,
        rightSeatsPerRow: 3,
        rowCount: 11,
        hasBackRow: true,
        backRowSeatsCount: 4,
        hasRearDoor: false,
        numberingStyle: "sequential",
      };

    case "big_bus_60":
      // 10 baris 3-3 (54 kursi) + 6 kursi belakang = 60 kursi
      return {
        layout: "big_bus_60",
        leftSeatsPerRow: 3,
        rightSeatsPerRow: 3,
        rowCount: 9,
        hasBackRow: true,
        backRowSeatsCount: 6,
        hasRearDoor: false,
        numberingStyle: "sequential",
      };

    case "hiace_14":
      return {
        layout: "hiace_14",
        leftSeatsPerRow: 1,
        rightSeatsPerRow: 2,
        rowCount: 4,
        hasBackRow: true,
        backRowSeatsCount: 4,
        hasRearDoor: false,
        numberingStyle: "sequential",
      };

    case "custom":
    default:
      return {
        layout: "custom",
        leftSeatsPerRow: 2,
        rightSeatsPerRow: 2,
        rowCount: 8,
        hasBackRow: true,
        backRowSeatsCount: 5,
        hasRearDoor: false,
        numberingStyle: "sequential",
      };
  }
};

/**
 * Generator struktur kabin bus berdasarkan konfigurasi yang dapat diatur bebas
 */
export const buildBusStructureFromConfig = (config: BusConfig): BusStructure => {
  const rows: BusRow[] = [];
  let seatCounter = 1;

  const colLetters = ["A", "B", "C", "D", "E", "F", "G"];

  for (let r = 1; r <= config.rowCount; r++) {
    // Cek apakah baris ini adalah baris pintu belakang (biasanya baris sebelum baris belakang jika hasRearDoor)
    const isRearDoor = config.hasRearDoor && r === config.rowCount;

    const leftSeats: string[] = [];
    const rightSeats: string[] = [];

    if (!isRearDoor) {
      for (let i = 0; i < config.leftSeatsPerRow; i++) {
        if (config.numberingStyle === "sequential") {
          leftSeats.push(String(seatCounter++));
        } else {
          leftSeats.push(`${r}${colLetters[i]}`);
        }
      }
    }

    for (let i = 0; i < config.rightSeatsPerRow; i++) {
      if (config.numberingStyle === "sequential") {
        rightSeats.push(String(seatCounter++));
      } else {
        const letterIdx = isRearDoor ? i : config.leftSeatsPerRow + i;
        rightSeats.push(`${r}${colLetters[letterIdx]}`);
      }
    }

    rows.push({
      rowNumber: r,
      leftSeats,
      rightSeats,
      isRearDoorRow: isRearDoor,
    });
  }

  // Baris Paling Belakang (Bangku Panjang)
  if (config.hasBackRow && config.backRowSeatsCount > 0) {
    const backSeats: string[] = [];
    const backRowIdx = config.rowCount + 1;

    for (let i = 0; i < config.backRowSeatsCount; i++) {
      if (config.numberingStyle === "sequential") {
        backSeats.push(String(seatCounter++));
      } else {
        backSeats.push(`${backRowIdx}${colLetters[i]}`);
      }
    }

    rows.push({
      rowNumber: backRowIdx,
      leftSeats: [],
      rightSeats: [],
      isBackRow: true,
      backSeats,
    });
  }

  // Hitung total kursi
  let total = 0;
  rows.forEach((row) => {
    if (row.isBackRow && row.backSeats) {
      total += row.backSeats.length;
    } else {
      total += row.leftSeats.length + row.rightSeats.length;
    }
  });

  let title = "Bus Pariwisata";
  if (config.layout === "medium_bus_31") title = "Medium Bus 31 Seat";
  else if (config.layout === "big_bus_50") title = "Big Bus 50 Seat";
  else if (config.layout === "big_bus_59") title = "Big Bus 59 Seat";
  else if (config.layout === "big_bus_60") title = "Big Bus 60 Seat";
  else if (config.layout === "hiace_14") title = "Toyota HiAce 14 Seat";
  else title = `Custom Bus (${config.leftSeatsPerRow}-${config.rightSeatsPerRow})`;

  return {
    config,
    title: `${title} (${total} Seat)`,
    totalSeats: total,
    configLabel: `${config.leftSeatsPerRow} Kiri - Lorong - ${config.rightSeatsPerRow} Kanan`,
    rows,
  };
};

/**
 * Generator kompatibilitas lama
 */
export const generateBusStructure = (layout: BusLayoutType): BusStructure => {
  const cfg = getDefaultBusConfig(layout);
  return buildBusStructureFromConfig(cfg);
};

/**
 * Mengambil semua nomor kursi dari struktur bus
 */
export const getAllSeatNumbers = (structureOrLayout: BusStructure | BusLayoutType): string[] => {
  const structure =
    typeof structureOrLayout === "string"
      ? generateBusStructure(structureOrLayout)
      : structureOrLayout;

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

  // Format 1: Kursi huruf/angka seperti "1A: Budi" atau "12: Budi" atau "1 - Budi"
  const seatPrefixRegex = /^([0-9]{1,2}[A-F]?)\s*[:\-\.\|]\s*(.+)$/i;

  // Format 2: Nomor urut "1. Budi"
  const numberedListRegex = /^[0-9]{1,3}[\.\)\-]\s*(.+)$/;

  for (const line of lines) {
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

    if (line.length >= 2 && !line.startsWith("===") && !line.startsWith("---")) {
      results.push({ name: line });
    }
  }

  return results;
}

/**
 * Scan Foto/Gambar Manifest menggunakan Gemini Vision AI
 */
export async function scanPhotoManifestWithAI(
  file: File,
  apiKeyParam?: string
): Promise<{ seat?: string; name: string; notes?: string }[]> {
  const apiKey = (apiKeyParam || getStoredApiKey() || "").trim();

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(",");
      resolve(commaIdx !== -1 ? result.substring(commaIdx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const prompt = `Anda adalah sistem OCR cerdas biro perjalanan wisata.
Tugas Anda: Analisis foto kertas denah bus, foto tulisan tangan daftar peserta, atau foto tabel manifest penumpang ini.
Ekstrak nama-nama penumpang dan nomor kursinya jika ada (contoh: 1, 2, 1A, dll).
PENTING: Berikan balasan HANYA dalam format JSON array tanpa tanda petik markdown:
[
  { "seat": "1", "name": "Budi Santoso", "notes": "" },
  { "seat": "2", "name": "Siti Aminah", "notes": "" }
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
  structure: BusStructure,
  profile: BiroProfile
): void {
  const allSeats = getAllSeatNumbers(structure);
  const occupiedCount = Object.keys(manifest).filter((k) => allSeats.includes(k)).length;
  const emptyCount = structure.totalSeats - occupiedCount;

  // Baris Tabel Denah Kursi dalam Dokumen Word
  let visualRowsHtml = "";
  structure.rows.forEach((row) => {
    if (row.isBackRow && row.backSeats) {
      visualRowsHtml += `
        <tr>
          <td colspan="7" style="background:#e2e8f0; text-align:center; font-weight:bold; font-size:9pt; padding:4px;">
            BANGKU BELAKANG (${row.backSeats.join(", ")})
          </td>
        </tr>
        <tr>
          <td colspan="7" style="padding:6px; background:#f8fafc;">
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
    } else if (row.isRearDoorRow) {
      // Baris dengan tangga pintu belakang di kiri
      visualRowsHtml += `
        <tr>
          <td colspan="${structure.config.leftSeatsPerRow}" style="border:2px dashed #94a3b8; background:#f1f5f9; text-align:center; padding:8px; font-weight:bold; color:#475569; font-size:8.5pt;">
            [ TANGGA PINTU BELAKANG ]
          </td>
          <td style="border:none; width:12%; text-align:center; background:#f8fafc; color:#94a3b8; font-size:8pt; font-weight:bold;">
            LORONG
          </td>
          ${row.rightSeats
            .map((seatNo) => {
              const pass = manifest[seatNo];
              return `
              <td style="border:1px solid #cbd5e1; padding:6px; text-align:center; background:${
                pass ? "#eff6ff" : "#ffffff"
              };">
                <strong style="color:#1d4ed8; font-size:10pt;">${seatNo}</strong><br/>
                <span style="font-size:9pt; font-weight:bold; color:#0f172a;">${
                  pass ? pass.name : "(Kosong)"
                }</span>
              </td>`;
            })
            .join("")}
        </tr>
      `;
    } else {
      const renderMiniSeat = (seatNo?: string) => {
        if (!seatNo) return `<td style="border:none;"></td>`;
        const pass = manifest[seatNo];
        return `
          <td style="border:1px solid #cbd5e1; padding:6px; text-align:center; background:${
            pass ? "#eff6ff" : "#ffffff"
          };">
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
          ${row.leftSeats.map((s) => renderMiniSeat(s)).join("")}
          <td style="border:none; width:10%; text-align:center; background:#f1f5f9; color:#94a3b8; font-size:8pt; font-weight:bold;">
            LORONG
          </td>
          ${row.rightSeats.map((s) => renderMiniSeat(s)).join("")}
        </tr>
      `;
    }
  });

  // Tabel Rekapitulasi Penumpang
  const sortedSeats = [...allSeats].sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    return isNaN(numA) || isNaN(numB)
      ? a.localeCompare(b)
      : numA === numB
      ? a.localeCompare(b)
      : numA - numB;
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
        table { border-collapse: collapse; width: 100%; margin-bottom: 14px; }
      </style>
    </head>
    <body>
      <!-- Kop Surat Biro -->
      <table style="width:100%; border-bottom:2px solid #0f2c59; padding-bottom:8px; margin-bottom:14px;">
        <tr>
          <td style="vertical-align:middle;">
            <h1 style="color:#0f2c59; font-size:16pt; font-weight:bold; letter-spacing:-0.5px; margin:0;">
              ${(profile.nama_biro || "BIRO PERJALANAN WISATA").toUpperCase()}
            </h1>
            ${formatLegalitasBiro(profile) ? `<p style="margin:2px 0; font-size:8.5pt; font-weight:bold; color:#1e293b; text-transform:uppercase; letter-spacing:0.5px;">${formatLegalitasBiro(profile)}</p>` : ""}<p style="margin:2px 0; font-size:9pt; color:#475569;">
              ${profile.slogan || "Layanan Tour & Travel Pariwisata Profesional"}
            </p>
            <p style="margin:2px 0; font-size:8.5pt; color:#64748b;">
              Alamat: ${profile.alamat || "-"} | Telp/WA: ${profile.telepon || "-"}
            </p>
          </td>
          <td style="text-align:right; vertical-align:middle;">
            <div style="display:inline-block; padding:6px 12px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; text-align:right;">
              <span style="font-size:8pt; font-weight:bold; color:#1e40af; text-transform:uppercase;">DOKUMEN RESMI</span><br/>
              <strong style="font-size:10pt; color:#0f172a;">MANIFEST DENAH KURSI</strong>
            </div>
          </td>
        </tr>
      </table>

      <!-- Judul & Rincian Trip -->
      <div style="text-align:center; margin-bottom:14px;">
        <h2 style="font-size:13pt; color:#0f2c59; font-weight:bold; text-transform:uppercase; margin:0;">
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
        <tr style="background:#0f2c59; color:#ffffff;">
          <td colspan="${structure.config.leftSeatsPerRow}" style="padding:6px; font-size:8.5pt; font-weight:bold; text-align:center;">
            PINTU MASUK DEPAN & TL
          </td>
          <td style="padding:6px; font-size:8.5pt; font-weight:bold; text-align:center; background:#1e3a8a;">
            KACA DEPAN
          </td>
          <td colspan="${structure.config.rightSeatsPerRow}" style="padding:6px; font-size:8.5pt; font-weight:bold; text-align:center;">
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
