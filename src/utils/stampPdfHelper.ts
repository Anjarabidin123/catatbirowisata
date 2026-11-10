import type jsPDF from "jspdf";
import { BiroProfile } from "./biroProfile";
import { processSignatureOrStampImage } from "./imageTransparencyHelper";

const transparentImageCache = new Map<string, string>();

/**
 * Memastikan gambar stempel / tanda tangan memiliki latar belakang 100% transparan (tanpa kotak putih)
 */
export async function ensureTransparentImage(url?: string | null): Promise<string | null> {
  if (!url) return null;
  if (transparentImageCache.has(url)) {
    return transparentImageCache.get(url)!;
  }
  try {
    const cleaned = await processSignatureOrStampImage(url, {
      threshold: 195,
      rotationDeg: 0,
      tintColor: "original",
    });
    if (cleaned) {
      transparentImageCache.set(url, cleaned);
      return cleaned;
    }
  } catch (err) {
    console.warn("Gagal auto-clean background stempel:", err);
  }
  return url;
}

/**
 * Helper konversi hex color (#2563eb) ke tuple RGB [r, g, b]
 */
export function hexToRgb(hex?: string): [number, number, number] {
  if (!hex) return [37, 99, 235];
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c.split("").map((ch) => ch + ch).join("");
  }
  const num = parseInt(c, 16);
  if (isNaN(num) || c.length !== 6) return [37, 99, 235];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Menggambar Stempel Resmi Biro Wisata (Digital Vektor / Basah Custom)
 * Dapat dipanggil di SEMUA generator PDF: Kwitansi, Invoice, Laporan, Rundown, Manifest, dsb.
 */
export function drawDigitalStamp(
  doc: jsPDF,
  x: number,
  y: number,
  profile: BiroProfile,
  status: string = "LUNAS",
  radius: number = 15
): void {
  // 1. Jika pengguna memilih mode custom dan telah mengunggah file stempel gambar
  if (profile.stempel_mode === "custom" && profile.stempel_custom_image_url) {
    try {
      let renderW = radius * 2;
      let renderH = radius * 2;
      try {
        const props = (doc as any).getImageProperties?.(profile.stempel_custom_image_url);
        if (props && props.width && props.height) {
          const asp = props.width / props.height;
          if (asp > 1) {
            renderH = (radius * 2) / asp;
          } else if (asp < 1) {
            renderW = (radius * 2) * asp;
          }
        }
      } catch {}

      doc.addImage(
        profile.stempel_custom_image_url,
        "PNG",
        x - renderW / 2,
        y - renderH / 2,
        renderW,
        renderH
      );
      return;
    } catch (e) {
      console.warn("Gagal render custom stempel image, fallback ke stempel vektor:", e);
    }
  }

  // 2. Render Stempel Vektor Otomatis dengan Warna & Teks Custom Profil Biro
  const [r, g, b] = hexToRgb(profile.stempel_warna || "#2563eb");
  const outerR = radius;
  const innerR = radius * 0.875;

  // Lingkaran stempel luar
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.75);
  doc.circle(x, y, outerR);

  // Lingkaran stempel dalam
  doc.setLineWidth(0.3);
  doc.circle(x, y, innerR);

  // Teks stempel atas (nama biro / teks kustom)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(radius * 0.43);
  doc.setTextColor(r, g, b);
  const teksAtas = (profile.stempel_teks_atas || profile.nama_biro || "BIRO WISATA")
    .substring(0, 22)
    .toUpperCase();
  doc.text(teksAtas, x, y - radius * 0.44, { align: "center" });

  // Bintang dekorasi kiri & kanan
  doc.setFontSize(radius * 0.32);
  doc.text("★", x - radius * 0.65, y + 0.5, { align: "center" });
  doc.text("★", x + radius * 0.65, y + 0.5, { align: "center" });

  // Banner status tengah (e.g. LUNAS / VERIFIED / kustom)
  const bannerW = radius * 1.62;
  const bannerH = radius * 0.38;
  doc.setFillColor(r, g, b);
  doc.rect(x - bannerW / 2, y - bannerH / 2, bannerW, bannerH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(radius * 0.46);
  const teksTengah = (profile.stempel_teks_tengah || status || "LUNAS").toUpperCase();
  doc.text(teksTengah, x, y + radius * 0.08, { align: "center" });

  // Teks stempel bawah
  doc.setTextColor(r, g, b);
  doc.setFontSize(radius * 0.35);
  const teksBawah = (profile.stempel_teks_bawah || "OFFICIAL VERIFIED")
    .substring(0, 24)
    .toUpperCase();
  doc.text(teksBawah, x, y + radius * 0.52, { align: "center" });
}

/**
 * Menggambar Blok Tanda Tangan & Stempel Lengkap (Dual Layer Authentic)
 */
export function drawSignatureWithStamp(
  doc: jsPDF,
  signX: number,
  signY: number,
  profile: BiroProfile,
  options?: {
    status?: string;
    jabatan?: string;
    showKotaDate?: boolean;
    tanggalDoc?: string;
    radiusStamp?: number;
  }
): void {
  const kotaDoc =
    profile.kota_tanda_tangan ||
    (profile.alamat?.includes("Demak") ? "Demak" : "Indonesia");
  const tglDoc =
    options?.tanggalDoc ||
    new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  let curY = signY;

  if (options?.showKotaDate !== false) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`${kotaDoc}, ${tglDoc}`, signX, curY, { align: "center" });
    curY += 4.5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.nama_biro || "Catat Biro Wisata", signX, curY, {
    align: "center",
  });

  // Tanda Tangan Coretan Gambar (Jika diunggah) - tepat di atas nama, agak ke kanan
  if (profile.tanda_tangan_url) {
    try {
      doc.addImage(profile.tanda_tangan_url, "PNG", signX - 8, curY + 6, 26, 14);
    } catch (e) {
      console.warn("Gagal render ttd image:", e);
    }
  }

  // Stempel Resmi (Menimpa separuh kiri tanda tangan, sejajar vertikal)
  const radius = options?.radiusStamp || 11;
  drawDigitalStamp(
    doc,
    signX - 7,
    curY + 13,
    profile,
    options?.status || "LUNAS",
    radius
  );

  // Garis & Nama Terang Pimpinan
  const bottomSignY = curY + 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.pimpinan || "H. Anjar Abidin, S.E.", signX, bottomSignY, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    options?.jabatan ||
      profile.jabatan_penandatangan ||
      "Pimpinan / Manajemen Keuangan",
    signX,
    bottomSignY + 3.5,
    { align: "center" }
  );
}
