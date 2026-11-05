import type jsPDF from "jspdf";
import { Capacitor } from "@capacitor/core";

/**
 * Simpan PDF dengan cara yang benar sesuai platform:
 * - Android/iOS (Capacitor): tulis ke cache lalu buka lembar Bagikan/Simpan bawaan HP
 *   (doc.save() tidak memicu unduhan di WebView).
 * - Web / PWA: unduh lewat Blob + tautan <a download>.
 */
export const savePdf = async (doc: jsPDF, fileName: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const dataUri = doc.output("datauristring");
    const base64 = dataUri.substring(dataUri.indexOf(",") + 1);

    const written = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({
      title: fileName,
      text: fileName,
      url: written.uri,
      dialogTitle: "Simpan / Bagikan PDF",
    });
    return;
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
