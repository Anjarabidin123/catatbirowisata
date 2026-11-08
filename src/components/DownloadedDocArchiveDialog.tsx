import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Receipt,
  Bus,
  Wallet,
  Download,
  Share2,
  Trash2,
  Search,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  Archive,
  RefreshCw,
} from "lucide-react";
import {
  DownloadedDocRecord,
  getDownloadedDocs,
  deleteDownloadedDoc,
  clearDownloadedDocs,
  DocType,
} from "@/utils/downloadedDocTracker";
import { generateInvoiceOrKwitansiPDF } from "@/utils/invoicePdfGenerator";
import { toast } from "sonner";

interface DownloadedDocArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DownloadedDocArchiveDialog: React.FC<DownloadedDocArchiveDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [docs, setDocs] = useState<DownloadedDocRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | DocType>("all");
  const [reGeneratingId, setReGeneratingId] = useState<string | null>(null);

  const loadData = () => {
    setDocs(getDownloadedDocs());
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // Listener event reaktif jika dokumen baru diunduh di tab lain
  useEffect(() => {
    const handleUpdate = () => loadData();
    window.addEventListener("catatbiro-doc-downloaded", handleUpdate);
    window.addEventListener("catatbiro-doc-deleted", handleUpdate);
    window.addEventListener("catatbiro-docs-cleared", handleUpdate);
    return () => {
      window.removeEventListener("catatbiro-doc-downloaded", handleUpdate);
      window.removeEventListener("catatbiro-doc-deleted", handleUpdate);
      window.removeEventListener("catatbiro-docs-cleared", handleUpdate);
    };
  }, []);

  const filteredDocs = useMemo(() => {
    return docs.filter((item) => {
      if (filterType !== "all" && item.docType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.judul.toLowerCase().includes(q);
        const matchNo = item.nomorDokumen.toLowerCase().includes(q);
        const matchClient = item.namaKlienOrTrip.toLowerCase().includes(q);
        const matchFile = item.fileName.toLowerCase().includes(q);
        if (!matchTitle && !matchNo && !matchClient && !matchFile) return false;
      }
      return true;
    });
  }, [docs, filterType, searchQuery]);

  const formatTanggal = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const formatRupiah = (val?: number) => {
    if (!val && val !== 0) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Unduh ulang dokumen secara instan
  const handleReDownload = async (item: DownloadedDocRecord) => {
    if (item.metadata && (item.docType === "kwitansi" || item.docType === "invoice")) {
      try {
        setReGeneratingId(item.id);
        toast.loading("Membuat ulang PDF resmi...", { id: "regen-pdf" });
        await generateInvoiceOrKwitansiPDF({
          ...item.metadata,
          autoDownload: true,
        });
        toast.dismiss("regen-pdf");
        toast.success(`PDF ${item.nomorDokumen} berhasil diunduh ulang!`);
      } catch (err: any) {
        toast.dismiss("regen-pdf");
        toast.error(`Gagal mengunduh ulang: ${err.message || "Kesalahan"}`);
      } finally {
        setReGeneratingId(null);
      }
    } else {
      toast.info(
        `File tersimpan sebagai: ${item.fileName}. Anda dapat mencetaknya langsung dari menu ${
          item.docType === "manifest" ? "Denah Bus" : "Laporan Keuangan"
        }.`
      );
    }
  };

  // Bagikan ringkasan via WhatsApp
  const handleShareWhatsApp = (item: DownloadedDocRecord) => {
    let msg = `*ARSIP DOKUMEN RESMI - CATATBIRO*\n\n`;
    msg += `📄 *${item.judul}*\n`;
    msg += `No. Dokumen: *${item.nomorDokumen}*\n`;
    msg += `Klien / Kegiatan: ${item.namaKlienOrTrip}\n`;
    if (item.nominal) {
      msg += `Nominal: *${formatRupiah(item.nominal)}* (${item.statusPembayaran || "Resmi"})\n`;
    }
    msg += `Waktu Terbit: ${formatTanggal(item.downloadedAt)}\n`;
    msg += `\n_Dokumen PDF resmi telah terbit dan tersimpan di sistem operasional biro._`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handleDelete = (id: string, no: string) => {
    if (confirm(`Hapus catatan arsip dokumen #${no} dari riwayat?`)) {
      deleteDownloadedDoc(id);
      loadData();
      toast.success("Catatan dokumen dihapus dari riwayat.");
    }
  };

  const handleClearAll = () => {
    if (confirm("Kosongkan seluruh riwayat unduhan PDF? Tindakan ini tidak dapat dibatalkan.")) {
      clearDownloadedDocs();
      loadData();
      toast.success("Seluruh riwayat arsip dokumen telah dibersihkan.");
    }
  };

  const getDocBadge = (type: DocType) => {
    switch (type) {
      case "kwitansi":
        return {
          icon: Receipt,
          label: "Kwitansi",
          cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200",
        };
      case "invoice":
        return {
          icon: FileText,
          label: "Invoice",
          cls: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200",
        };
      case "laporan":
        return {
          icon: Wallet,
          label: "Laporan",
          cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200",
        };
      case "manifest":
        return {
          icon: Bus,
          label: "Manifest Bus",
          cls: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200",
        };
      default:
        return {
          icon: FileText,
          label: "Dokumen",
          cls: "bg-slate-100 text-slate-800",
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-7">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Riwayat & Arsip Dokumen PDF
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Daftar seluruh Kwitansi, Invoice, Laporan Keuangan, dan Manifest Bus yang pernah diunduh
                </DialogDescription>
              </div>
            </div>

            {docs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 font-bold gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Arsip</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Filter & Pencarian */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Cari nomor surat, nama klien, atau nama trip..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { key: "all", label: "Semua" },
                  { key: "kwitansi", label: "Kwitansi" },
                  { key: "invoice", label: "Invoice" },
                  { key: "laporan", label: "Laporan" },
                  { key: "manifest", label: "Manifest Bus" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterType(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    filterType === tab.key
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List Dokumen */}
        <div className="pt-2 space-y-2.5">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                  {docs.length === 0
                    ? "Belum ada dokumen yang diunduh"
                    : "Tidak ada dokumen yang sesuai pencarian"}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {docs.length === 0
                    ? "Setiap kali Anda mencetak Kwitansi, Invoice, Laporan, atau Manifest Bus, riwayatnya otomatis tersimpan di sini."
                    : "Coba ubah kata kunci pencarian atau ganti filter kategori dokumen."}
                </p>
              </div>
            </div>
          ) : (
            filteredDocs.map((item) => {
              const badge = getDocBadge(item.docType);
              const BadgeIcon = badge.icon;
              const isReGenerating = reGeneratingId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 shrink-0">
                        <BadgeIcon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-black border ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                            #{item.nomorDokumen}
                          </span>
                          {item.statusPembayaran && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {item.statusPembayaran}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {item.judul}
                        </h4>

                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          Klien / Kegiatan: <strong className="text-slate-800 dark:text-slate-100">{item.namaKlienOrTrip}</strong>
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Diunduh: {formatTanggal(item.downloadedAt)}</span>
                          </div>
                          {item.nominal !== undefined && item.nominal > 0 && (
                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                              • {formatRupiah(item.nominal)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 pt-2 sm:pt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReDownload(item)}
                        disabled={isReGenerating}
                        className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                        title="Unduh Ulang File PDF Ini"
                      >
                        {isReGenerating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Unduh Ulang</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShareWhatsApp(item)}
                        className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                        title="Kirim Ringkasan Dokumen ke WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(item.id, item.nomorDokumen)}
                        className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Hapus dari Riwayat Arsip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
