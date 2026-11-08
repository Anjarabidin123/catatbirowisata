/**
 * Pelacak & Penyimpan Riwayat Arsip Dokumen PDF yang Pernah Diunduh
 * Menyimpan data riwayat Kwitansi, Invoice, Laporan Keuangan, dan Manifest Bus
 * sehingga pengguna biro wisata bisa melihat kembali dokumen yang sudah terbit,
 * mengunduh ulang (re-download), atau membagikannya ke WhatsApp kapan saja.
 */

export type DocType = "kwitansi" | "invoice" | "laporan" | "manifest";

export interface DownloadedDocRecord {
  id: string;
  docType: DocType;
  nomorDokumen: string;
  judul: string;
  namaKlienOrTrip: string;
  nominal?: number;
  statusPembayaran?: string;
  fileName: string;
  downloadedAt: string; // ISO timestamp
  metadata?: Record<string, any>;
}

const STORAGE_KEY = "catatbiro_downloaded_docs_archive_v1";

/**
 * Mengambil seluruh riwayat arsip dokumen PDF (diurutkan dari yang terbaru)
 */
export const getDownloadedDocs = (): DownloadedDocRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return list.sort(
        (a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
      );
    }
    return [];
  } catch (err) {
    console.error("Gagal membaca arsip riwayat dokumen PDF:", err);
    return [];
  }
};

/**
 * Mencatat dokumen PDF baru yang berhasil diunduh ke arsip lokal
 */
export const recordDownloadedDoc = (
  entry: Omit<DownloadedDocRecord, "id" | "downloadedAt"> & { downloadedAt?: string }
): DownloadedDocRecord => {
  try {
    const current = getDownloadedDocs();
    const newRecord: DownloadedDocRecord = {
      ...entry,
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      downloadedAt: entry.downloadedAt || new Date().toISOString(),
    };

    // Cegah duplikasi identik dalam rentang 5 detik jika tertekan 2 kali
    const isDuplicate = current.some(
      (c) =>
        c.nomorDokumen === newRecord.nomorDokumen &&
        c.docType === newRecord.docType &&
        Math.abs(new Date(c.downloadedAt).getTime() - new Date(newRecord.downloadedAt).getTime()) <
          5000
    );

    let updated: DownloadedDocRecord[];
    if (isDuplicate) {
      updated = current.map((c) =>
        c.nomorDokumen === newRecord.nomorDokumen && c.docType === newRecord.docType
          ? newRecord
          : c
      );
    } else {
      // Simpan maksimal 150 arsip terakhir agar hemat memori
      updated = [newRecord, ...current].slice(0, 150);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Notifikasi sistem agar UI langsung ter-update secara reaktif
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("catatbiro-doc-downloaded", { detail: newRecord })
      );
    }

    return newRecord;
  } catch (err) {
    console.error("Gagal menyimpan riwayat arsip dokumen:", err);
    return {
      ...entry,
      id: `doc_${Date.now()}`,
      downloadedAt: new Date().toISOString(),
    };
  }
};

/**
 * Menghapus 1 rekaman arsip dokumen berdasarkan ID
 */
export const deleteDownloadedDoc = (id: string): void => {
  try {
    const current = getDownloadedDocs();
    const filtered = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("catatbiro-doc-deleted", { detail: { id } })
      );
    }
  } catch (err) {
    console.error("Gagal menghapus arsip dokumen:", err);
  }
};

/**
 * Menghapus seluruh riwayat arsip dokumen
 */
export const clearDownloadedDocs = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("catatbiro-docs-cleared"));
    }
  } catch (err) {
    console.error("Gagal mengosongkan arsip dokumen:", err);
  }
};
