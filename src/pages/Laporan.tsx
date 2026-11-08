import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { savePdf } from "@/utils/pdfSaver";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download,
  Share2,
  Receipt,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  Bus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Archive,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  Clock,
  Layers,
  HelpCircle,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { generateReportPDF } from "@/utils/reportPdfGenerator";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { KwitansiInvoiceDialog } from "@/components/KwitansiInvoiceDialog";
import { DownloadedDocArchiveDialog } from "@/components/DownloadedDocArchiveDialog";
import {
  recordDownloadedDoc,
  getDownloadedDocs,
  deleteDownloadedDoc,
  clearDownloadedDocs,
  DownloadedDocRecord,
  DocType,
} from "@/utils/downloadedDocTracker";
import { generateInvoiceOrKwitansiPDF } from "@/utils/invoicePdfGenerator";
import { useRole } from "@/contexts/RoleContext";
import RBACOwnerGuard from "@/components/RBACOwnerGuard";

interface ReportData {
  trips: any[];
  keuangan: any[];
  media: any[];
}

const Laporan = () => {
  const { isPemilik, roleName } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab utama: "laporan" (rekap keuangan), "invoice" (kwitansi & invoice pelanggan), "arsip" (riwayat download)
  const initialTab = (searchParams.get("tab") as "laporan" | "invoice" | "arsip") || "laporan";
  const [activeTab, setActiveTab] = useState<"laporan" | "invoice" | "arsip">(initialTab);

  const [data, setData] = useState<ReportData>({ trips: [], keuangan: [], media: [] });
  const [loading, setLoading] = useState(true);

  // Filter Halaman Laporan Keuangan
  const [selectedTripId, setSelectedTripId] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("current");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [showKwitansiDialog, setShowKwitansiDialog] = useState(false);
  const [defaultDocType, setDefaultDocType] = useState<"kwitansi" | "invoice">("invoice");
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Arsip Dokumen Lokal (Kwitansi, Invoice, Laporan, Manifest)
  const [archivedDocs, setArchivedDocs] = useState<DownloadedDocRecord[]>([]);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoiceFilterType, setInvoiceFilterType] = useState<"all" | "invoice" | "kwitansi">("all");
  const [reGeneratingId, setReGeneratingId] = useState<string | null>(null);

  // Sync tab dengan URL param
  const handleTabChange = (newTab: "laporan" | "invoice" | "arsip") => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", newTab);
      return next;
    });
  };

  const loadArchivedDocs = () => {
    setArchivedDocs(getDownloadedDocs());
  };

  useEffect(() => {
    loadReportData();
    loadArchivedDocs();

    const handleDocUpdate = () => loadArchivedDocs();
    window.addEventListener("catatbiro-doc-downloaded", handleDocUpdate);
    window.addEventListener("catatbiro-doc-deleted", handleDocUpdate);
    window.addEventListener("catatbiro-docs-cleared", handleDocUpdate);

    return () => {
      window.removeEventListener("catatbiro-doc-downloaded", handleDocUpdate);
      window.removeEventListener("catatbiro-doc-deleted", handleDocUpdate);
      window.removeEventListener("catatbiro-docs-cleared", handleDocUpdate);
    };
  }, []);

  const loadReportData = async () => {
    try {
      const user = await getActiveUser();
      if (!user) return;

      const [tripsRes, keuanganRes, mediaRes] = await Promise.all([
        supabase
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false }),
        supabase
          .from("keuangan")
          .select(`*, trips (nama_trip)`)
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false }),
        supabase
          .from("media")
          .select(`*, trips (nama_trip)`)
          .eq("user_id", user.id)
          .eq("file_type", "image"),
      ]);

      const loadedTrips = tripsRes.data || [];
      const loadedKeuangan = keuanganRes.data || [];
      const loadedMedia = mediaRes.data || [];

      setData({
        trips: loadedTrips,
        keuangan: loadedKeuangan,
        media: loadedMedia,
      });

      // UX Guard: Jika di bulan ini belum ada trip sama sekali tapi di database ada trip,
      // otomatis beralih ke "all" (Semua Periode) agar pengguna tidak bingung melihat halaman kosong
      const today = new Date();
      const hasCurrentMonthTrips = loadedTrips.some((t: any) => {
        if (!t.tanggal) return false;
        const d = new Date(t.tanggal);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      });

      if (!hasCurrentMonthTrips && loadedTrips.length > 0) {
        setFilterMonth("all");
      }
    } catch (error: any) {
      console.error("Gagal memuat data laporan:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter Berdasarkan Periode Waktu
  const filteredByDate = useMemo(() => {
    const today = new Date();
    const curMonth = today.getMonth();
    const curYear = today.getFullYear();

    const isMatchDate = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (filterMonth === "current") {
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      }
      if (filterMonth === "last") {
        const lastMonth = curMonth === 0 ? 11 : curMonth - 1;
        const lastYear = curMonth === 0 ? curYear - 1 : curYear;
        return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
      }
      if (filterMonth === "year") {
        return d.getFullYear() === curYear;
      }
      return true; // "all"
    };

    return {
      trips: data.trips.filter((t) => isMatchDate(t.tanggal)),
      keuangan: data.keuangan.filter((k) => isMatchDate(k.tanggal || k.created_at)),
    };
  }, [data.trips, data.keuangan, filterMonth]);

  // Kalkulasi Keuangan Per Trip
  const tripReports = useMemo(() => {
    return filteredByDate.trips
      .filter((t) => {
        if (selectedTripId !== "all" && t.id !== selectedTripId) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = t.nama_trip?.toLowerCase().includes(q);
          const matchDest = t.tujuan?.toLowerCase().includes(q);
          if (!matchName && !matchDest) return false;
        }
        return true;
      })
      .map((trip) => {
        const tripKeu = filteredByDate.keuangan.filter((k) => k.trip_id === trip.id);
        const pemasukan = tripKeu
          .filter((k) => k.jenis === "pemasukan")
          .reduce((acc, k) => acc + Number(k.jumlah || 0), 0);
        const pengeluaran = tripKeu
          .filter((k) => k.jenis === "pengeluaran")
          .reduce((acc, k) => acc + Number(k.jumlah || 0), 0);
        const saldo = pemasukan - pengeluaran;
        const margin = pemasukan > 0 ? Math.round((saldo / pemasukan) * 100) : 0;

        return {
          ...trip,
          pemasukan,
          pengeluaran,
          saldo,
          margin,
          trxCount: tripKeu.length,
        };
      })
      .filter((trip) => {
        if (filterStatus === "profit") return trip.saldo > 0;
        if (filterStatus === "loss") return trip.saldo < 0;
        return true;
      });
  }, [filteredByDate, selectedTripId, searchQuery, filterStatus]);

  // Total Finansial Akumulatif
  const totals = useMemo(() => {
    const totalPemasukan = tripReports.reduce((acc, t) => acc + t.pemasukan, 0);
    const totalPengeluaran = tripReports.reduce((acc, t) => acc + t.pengeluaran, 0);
    const labaBersih = totalPemasukan - totalPengeluaran;
    const marginTotal = totalPemasukan > 0 ? Math.round((labaBersih / totalPemasukan) * 100) : 0;

    return { totalPemasukan, totalPengeluaran, labaBersih, marginTotal };
  }, [tripReports]);

  // Status Filter Aktif
  const isFilterActive =
    filterMonth !== "all" ||
    selectedTripId !== "all" ||
    filterStatus !== "all" ||
    searchQuery.trim() !== "";

  const resetAllFilters = () => {
    setFilterMonth("all");
    setSelectedTripId("all");
    setFilterStatus("all");
    setSearchQuery("");
    toast.info("Filter direset ke semua periode.");
  };

  const handleGeneratePDF = async () => {
    try {
      const doc = await generateReportPDF({
        trips: tripReports,
        keuangan: filteredByDate.keuangan,
        media: data.media,
        filterTripId: selectedTripId,
      });

      const fileName = `Laporan_Keuangan_Biro_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
      void savePdf(doc, fileName);

      try {
        recordDownloadedDoc({
          docType: "laporan",
          nomorDokumen: `LAP-${format(new Date(), "yyyyMMdd-HHmm")}`,
          judul: `Laporan Keuangan Biro (${
            filterMonth === "current"
              ? "Bulan Ini"
              : filterMonth === "last"
              ? "Bulan Lalu"
              : filterMonth === "year"
              ? "Tahun Ini"
              : "Semua Periode"
          })`,
          namaKlienOrTrip:
            selectedTripId === "all"
              ? "Seluruh Trip Biro"
              : tripReports.find((t) => t.id === selectedTripId)?.nama_trip || "Trip Tertentu",
          nominal: totals.labaBersih,
          statusPembayaran: "Resmi",
          fileName,
        });
      } catch (e) {
        console.warn("Gagal arsipkan download laporan:", e);
      }

      toast.success("Laporan PDF resmi berhasil diunduh!");
    } catch (error) {
      console.error("Gagal cetak PDF:", error);
      toast.error("Gagal membuat PDF");
    }
  };

  const handleSharePDF = () => {
    try {
      const shareText = `*Rekapitulasi Operasional & Keuangan Biro*\n\nPeriode: ${
        filterMonth === "current"
          ? "Bulan Ini"
          : filterMonth === "last"
          ? "Bulan Lalu"
          : filterMonth === "year"
          ? "Tahun Ini"
          : "Semua Periode"
      }\nTotal Trip: ${tripReports.length}\nTotal Omset: ${formatRupiah(
        totals.totalPemasukan
      )}\nTotal Beban: ${formatRupiah(totals.totalPengeluaran)}\n*Laba Bersih: ${formatRupiah(
        totals.labaBersih
      )}* (Margin ${totals.marginTotal}%)\n\nData resmi diproses via CatatBiro Wisata.`;

      const encodedText = encodeURIComponent(shareText);
      const whatsappUrl = `https://wa.me/?text=${encodedText}`;

      if (Capacitor.isNativePlatform()) {
        window.location.href = `whatsapp://send?text=${encodedText}`;
      } else {
        window.open(whatsappUrl, "_blank");
      }
      toast.success("Membuka WhatsApp untuk membagikan laporan...");
    } catch (error) {
      toast.error("Gagal membuka WhatsApp");
    }
  };

  // Filter Kwitansi & Invoice Terbit
  const filteredInvoiceDocs = useMemo(() => {
    return archivedDocs.filter((doc) => {
      if (invoiceFilterType === "invoice" && doc.docType !== "invoice") return false;
      if (invoiceFilterType === "kwitansi" && doc.docType !== "kwitansi") return false;
      if (
        invoiceFilterType === "all" &&
        doc.docType !== "invoice" &&
        doc.docType !== "kwitansi"
      )
        return false;

      if (invoiceSearchQuery.trim()) {
        const q = invoiceSearchQuery.toLowerCase();
        const matchNo = doc.nomorDokumen.toLowerCase().includes(q);
        const matchClient = doc.namaKlienOrTrip.toLowerCase().includes(q);
        const matchJudul = doc.judul.toLowerCase().includes(q);
        if (!matchNo && !matchClient && !matchJudul) return false;
      }
      return true;
    });
  }, [archivedDocs, invoiceFilterType, invoiceSearchQuery]);

  const handleReDownloadDoc = async (item: DownloadedDocRecord) => {
    if (item.metadata && (item.docType === "kwitansi" || item.docType === "invoice")) {
      try {
        setReGeneratingId(item.id);
        toast.loading("Membuat ulang PDF resmi...", { id: "regen-doc" });
        await generateInvoiceOrKwitansiPDF({
          ...item.metadata,
          autoDownload: true,
        });
        toast.dismiss("regen-doc");
        toast.success(`PDF ${item.nomorDokumen} berhasil diunduh ulang!`);
      } catch (err: any) {
        toast.dismiss("regen-doc");
        toast.error(`Gagal mengunduh ulang: ${err.message || "Kesalahan"}`);
      } finally {
        setReGeneratingId(null);
      }
    } else {
      toast.info(`Dokumen tercatat sebagai: ${item.fileName}`);
    }
  };

  const handleShareDocWA = (item: DownloadedDocRecord) => {
    const isInv = item.docType === "invoice";
    const typeLabel = isInv ? "INVOICE TAGIHAN RESMI" : "KWITANSI PEMBAYARAN RESMI";
    let msg = `*${typeLabel} - CATATBIRO*\n\n`;
    msg += `📄 *${item.judul}*\n`;
    msg += `No. Dokumen: *${item.nomorDokumen}*\n`;
    msg += `Klien / Kegiatan: ${item.namaKlienOrTrip}\n`;
    if (item.nominal) {
      msg += `Nominal: *${formatRupiah(item.nominal)}* (${item.statusPembayaran || "Resmi"})\n`;
    }
    msg += `Waktu Terbit: ${new Date(item.downloadedAt).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}\n`;
    msg += `\n_Dokumen PDF resmi telah terbit dan tersimpan di sistem operasional biro._`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handleDeleteDoc = (id: string, no: string) => {
    if (confirm(`Hapus catatan arsip dokumen #${no} dari riwayat?`)) {
      deleteDownloadedDoc(id);
      loadArchivedDocs();
      toast.success("Catatan dokumen dihapus dari riwayat.");
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <RBACOwnerGuard
        ruleId="rule_buku_kas_laba"
        pageTitle="Laporan Laba/Rugi & Invoice Resmi Biro"
        reason="Rekapitulasi laba bersih biro, omset per trip, dan penerbitan kwitansi/invoice resmi dikhususkan bagi Pemilik Biro."
      >
        <div className="min-h-screen bg-background pb-24 safe-top lg:pl-64 overflow-x-hidden font-sans">
          <div className="max-w-7xl mx-auto p-3.5 sm:p-5 lg:p-8 space-y-4">
            {/* Header Laporan & Penjelasan Singkat */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>Laporan & Dokumen Keuangan</span>
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                    {roleName}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pusat pembukuan laba rugi biro, penerbitan Kwitansi & Invoice pelanggan, serta arsip dokumen resmi.
                </p>
              </div>

              {/* Action Buttons Header */}
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  onClick={() => setShowArchiveDialog(true)}
                  variant="outline"
                  className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-1.5"
                  size="sm"
                  title="Buka Riwayat & Arsip Dokumen PDF yang Pernah Diunduh"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-500" />
                  <span>Arsip PDF</span>
                </Button>
                {isPemilik && (
                  <Button
                    type="button"
                    onClick={() => {
                      setDefaultDocType("invoice");
                      setShowKwitansiDialog(true);
                    }}
                    variant="outline"
                    className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-1.5 text-blue-600 dark:text-blue-400"
                    size="sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Buat Invoice / KWT</span>
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSharePDF}
                  variant="outline"
                  className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-1.5"
                  size="sm"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kirim WA</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleGeneratePDF}
                  className="col-span-2 sm:col-span-1 h-9 px-4 text-xs font-bold rounded-xl gradient-primary text-white gap-1.5 shadow-xs"
                  size="sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PDF Resmi</span>
                </Button>
              </div>
            </div>

            {/* Segmented Navigation Tab: Memisahkan Laporan Finansial vs Dokumen Invoice Pelanggan */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl gap-1 border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => handleTabChange("laporan")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "laporan"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>1. Rekap Laba/Rugi Biro</span>
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  {tripReports.length} Trip
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("invoice")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "invoice"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>2. Kwitansi & Invoice Klien</span>
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  {filteredInvoiceDocs.length} Dokumen
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("arsip")}
                className={`hidden sm:flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "arsip"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>3. Riwayat Arsip PDF</span>
              </button>
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: REKAPITULASI LABA/RUGI & OMSET BIRO                               */}
            {/* ========================================================================= */}
            {activeTab === "laporan" && (
              <div className="space-y-4">
                {/* Toolbar Filter Cerdas & Mudah Dipahami */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Filter Jadwal Keberangkatan & Keuangan Trip
                      </span>
                      {isFilterActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                          Filter Aktif
                        </span>
                      )}
                    </div>

                    {isFilterActive && (
                      <Button
                        type="button"
                        onClick={resetAllFilters}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 gap-1 self-start sm:self-auto"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Semua Filter</span>
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* 1. Cari Nama Trip */}
                    <div className="sm:col-span-5 relative">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        placeholder="Cari trip atau kota tujuan (misal: Bali, Jogja)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    {/* 2. Filter Periode Tanggal */}
                    <div className="sm:col-span-3">
                      <Select value={filterMonth} onValueChange={setFilterMonth}>
                        <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-1.5 truncate">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <SelectValue placeholder="Pilih Periode" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current" className="text-xs">
                            Bulan Ini ({format(new Date(), "MMMM yyyy", { locale: id })})
                          </SelectItem>
                          <SelectItem value="last" className="text-xs">Bulan Lalu</SelectItem>
                          <SelectItem value="year" className="text-xs">Tahun Ini ({new Date().getFullYear()})</SelectItem>
                          <SelectItem value="all" className="text-xs font-bold text-blue-600">
                            Semua Periode (Seluruh Trip)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 3. Filter Pilihan Trip Spesifik */}
                    <div className="sm:col-span-2">
                      <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                        <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Semua Trip" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          <SelectItem value="all" className="text-xs">Semua Trip ({data.trips.length})</SelectItem>
                          {data.trips.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.nama_trip}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 4. Filter Status Profit / Defisit */}
                    <div className="sm:col-span-2">
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Status Hasil" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">Semua Hasil</SelectItem>
                          <SelectItem value="profit" className="text-xs text-emerald-600 font-semibold">
                            Hanya Untung (Profit)
                          </SelectItem>
                          <SelectItem value="loss" className="text-xs text-rose-600 font-semibold">
                            Hanya Defisit (Rugi)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tombol Cepat Pilihan Periode (Bulan Ini / Semua) */}
                  <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-[11px]">
                    <span className="text-slate-400 shrink-0">Pintas Periode:</span>
                    <button
                      type="button"
                      onClick={() => setFilterMonth("all")}
                      className={`px-2.5 py-1 rounded-lg font-bold border transition-all shrink-0 ${
                        filterMonth === "all"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      }`}
                    >
                      Semua Periode ({data.trips.length} Trip)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMonth("current")}
                      className={`px-2.5 py-1 rounded-lg font-semibold border transition-all shrink-0 ${
                        filterMonth === "current"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      }`}
                    >
                      Bulan Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMonth("last")}
                      className={`px-2.5 py-1 rounded-lg font-semibold border transition-all shrink-0 ${
                        filterMonth === "last"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      }`}
                    >
                      Bulan Lalu
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMonth("year")}
                      className={`px-2.5 py-1 rounded-lg font-semibold border transition-all shrink-0 ${
                        filterMonth === "year"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      }`}
                    >
                      Tahun {new Date().getFullYear()}
                    </button>
                  </div>
                </div>

                {/* 4 Kartu Ringkasan Finansial */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Total Trip */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Trip Tercatat
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                      {tripReports.length} <span className="text-xs font-normal text-slate-500">Jadwal</span>
                    </p>
                    <span className="text-[10px] text-blue-600 font-semibold block mt-0.5 truncate">
                      Periode: {filterMonth === "current" ? "Bulan Ini" : filterMonth === "last" ? "Bulan Lalu" : filterMonth === "year" ? "Tahun Ini" : "Semua Periode"}
                    </span>
                  </div>

                  {/* Total Omset */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                      Total Omset
                    </span>
                    <p className="text-sm sm:text-xl font-black text-emerald-600 truncate mt-0.5">
                      {formatRupiah(totals.totalPemasukan)}
                    </p>
                    <span className="text-[10px] text-emerald-600/80 font-medium block mt-0.5">
                      Penerimaan Pelanggan
                    </span>
                  </div>

                  {/* Total Beban */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                      Total Beban
                    </span>
                    <p className="text-sm sm:text-xl font-black text-rose-600 truncate mt-0.5">
                      {formatRupiah(totals.totalPengeluaran)}
                    </p>
                    <span className="text-[10px] text-rose-600/80 font-medium block mt-0.5">
                      Biaya Operasional
                    </span>
                  </div>

                  {/* Estimasi Laba Bersih */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Laba Bersih
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                          totals.labaBersih >= 0
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {totals.marginTotal}%
                      </span>
                    </div>
                    <p
                      className={`text-sm sm:text-xl font-black truncate mt-0.5 ${
                        totals.labaBersih >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {formatRupiah(totals.labaBersih)}
                    </p>
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                      {totals.labaBersih >= 0 ? "Surplus Untung" : "Defisit Operasional"}
                    </span>
                  </div>
                </div>

                {/* Daftar Laporan Per Trip */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Bus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Rincian Laporan Hasil Per Trip ({tripReports.length})</span>
                    </h2>
                  </div>

                  {tripReports.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Tidak ditemukan trip dengan kriteria filter ini.
                        </p>
                        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                          Jadwal trip Anda mungkin berada di luar periode yang dipilih (misal bulan lalu atau tahun lalu).
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={resetAllFilters}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-bold rounded-xl border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Tampilkan Semua Periode ({data.trips.length} Trip)
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tripReports.map((t) => {
                        const isProfit = t.saldo >= 0;
                        return (
                          <div
                            key={t.id}
                            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2.5"
                          >
                            {/* Baris Atas */}
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {t.nama_trip}
                                  </h3>
                                  <Badge
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                      isProfit
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
                                        : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200"
                                    }`}
                                  >
                                    {isProfit ? `+ Untung (${t.margin}%)` : `- Defisit (${t.margin}%)`}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                  <span>Tujuan: <strong>{t.tujuan || "-"}</strong></span>
                                  <span>•</span>
                                  <span>
                                    {t.tanggal
                                      ? format(new Date(t.tanggal), "dd MMMM yyyy", { locale: id })
                                      : "-"}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-slate-400 block">Laba Bersih</span>
                                <span
                                  className={`text-xs sm:text-sm font-black ${
                                    isProfit ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                >
                                  {formatRupiah(t.saldo)}
                                </span>
                              </div>
                            </div>

                            {/* Baris Bawah: Breakdown Omset vs Beban & Tombol Detail */}
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-3 sm:gap-6 min-w-0 text-[11px]">
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase">Omset</span>
                                  <span className="font-bold text-emerald-600 truncate block">
                                    {formatRupiah(t.pemasukan)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase">Beban</span>
                                  <span className="font-bold text-rose-600 truncate block">
                                    {formatRupiah(t.pengeluaran)}
                                  </span>
                                </div>
                                <div className="hidden sm:block">
                                  <span className="text-slate-400 block text-[9px] uppercase">Transaksi</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t.trxCount} data
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTripId(t.id);
                                    setDefaultDocType("invoice");
                                    setShowKwitansiDialog(true);
                                  }}
                                  className="h-7 px-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg gap-1"
                                >
                                  <Receipt className="w-3 h-3" />
                                  <span>Tagih / KWT</span>
                                </Button>
                                <Link
                                  to={`/trips/${t.id}`}
                                  className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1"
                                >
                                  <span>Buka Trip</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: KWITANSI & INVOICE PELANGGAN                                       */}
            {/* ========================================================================= */}
            {activeTab === "invoice" && (
              <div className="space-y-4">
                {/* Panduan Konsep Kwitansi vs Invoice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Card Invoice */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/40 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Invoice Tagihan (Sebelum Bayar / DP)
                          </h3>
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                            Format Tagihan Penagihan Resmi
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Kirimkan kepada instansi, sekolah, atau klien pemesan <strong>sebelum keberangkatan</strong>. Memuat rincian paket wisata, nominal uang muka (DP), sisa tagihan, jatuh tempo, serta nomor rekening resmi biro Anda.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setDefaultDocType("invoice");
                        setShowKwitansiDialog(true);
                      }}
                      className="w-full h-9 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Terbitkan Invoice Tagihan Baru</span>
                    </Button>
                  </div>

                  {/* Card Kwitansi */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Kwitansi Pembayaran (Setelah Bayar / Lunas)
                          </h3>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Bukti Sah Tanda Terima Uang
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Kirimkan kepada pelanggan <strong>setelah uang tunai/transfer diterima</strong>. Memuat kalimat resmi <em>"Telah diterima dari..."</em>, ejaan rupiah terbilang otomatis, status lunas, dan stempel digital biro.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setDefaultDocType("kwitansi");
                        setShowKwitansiDialog(true);
                      }}
                      className="w-full h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Terbitkan Kwitansi Tanda Terima</span>
                    </Button>
                  </div>
                </div>

                {/* Toolbar Pencarian & Filter Dokumen Terbit */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-amber-500" />
                        <span>Daftar Kwitansi & Invoice yang Pernah Diterbitkan ({filteredInvoiceDocs.length})</span>
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Setiap dokumen yang berhasil diunduh otomatis tercatat di sini dan bisa diunduh ulang atau dikirim ke WhatsApp klien.
                      </p>
                    </div>

                    {/* Filter Jenis Dokumen */}
                    <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => setInvoiceFilterType("all")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          invoiceFilterType === "all"
                            ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvoiceFilterType("invoice")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          invoiceFilterType === "invoice"
                            ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Invoice Saja
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvoiceFilterType("kwitansi")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          invoiceFilterType === "kwitansi"
                            ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Kwitansi Saja
                      </button>
                    </div>
                  </div>

                  {/* Input Search Dokumen */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      placeholder="Cari nomor dokumen, nama pemesan / rombongan..."
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                {/* List Dokumen Terbit */}
                {filteredInvoiceDocs.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Belum ada Kwitansi atau Invoice yang diterbitkan.
                      </p>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        Klik tombol di atas untuk menerbitkan Invoice tagihan DP atau Kwitansi pelunasan resmi pertama biro Anda.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Button
                        type="button"
                        onClick={() => {
                          setDefaultDocType("invoice");
                          setShowKwitansiDialog(true);
                        }}
                        size="sm"
                        className="h-8 text-xs font-bold rounded-xl bg-blue-600 text-white"
                      >
                        + Buat Invoice Tagihan
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setDefaultDocType("kwitansi");
                          setShowKwitansiDialog(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-bold rounded-xl text-emerald-600 border-emerald-300"
                      >
                        + Buat Kwitansi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredInvoiceDocs.map((item) => {
                      const isInv = item.docType === "invoice";
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isInv
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}
                            >
                              {isInv ? <FileText className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                  #{item.nomorDokumen}
                                </span>
                                <Badge
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    isInv
                                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200"
                                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
                                  }`}
                                >
                                  {isInv ? "Invoice Tagihan" : "Kwitansi Sah"}
                                </Badge>
                                {item.statusPembayaran && (
                                  <Badge variant="outline" className="text-[9px]">
                                    {item.statusPembayaran}
                                  </Badge>
                                )}
                              </div>

                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {item.namaKlienOrTrip}
                              </p>

                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>
                                  Diterbitkan: {new Date(item.downloadedAt).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Nominal & Tombol Aksi */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                            {item.nominal !== undefined && (
                              <div className="text-left sm:text-right">
                                <span className="text-[9px] text-slate-400 block uppercase">Nominal</span>
                                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                  {formatRupiah(item.nominal)}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                onClick={() => handleReDownloadDoc(item)}
                                disabled={reGeneratingId === item.id}
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 gap-1"
                              >
                                <Download className="w-3.5 h-3.5 text-blue-600" />
                                <span className="hidden sm:inline">Unduh Ulang</span>
                              </Button>

                              <Button
                                type="button"
                                onClick={() => handleShareDocWA(item)}
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 text-emerald-600 hover:text-emerald-700 gap-1"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </Button>

                              <Button
                                type="button"
                                onClick={() => handleDeleteDoc(item.id, item.nomorDokumen)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-xl"
                                title="Hapus dari arsip"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: RIWAYAT SELURUH ARSIP DOKUMEN PDF (LAPORAN, KWITANSI, MANIFEST)   */}
            {/* ========================================================================= */}
            {activeTab === "arsip" && (
              <div className="space-y-3">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Archive className="w-4 h-4 text-amber-500" />
                      <span>Semua Berkas PDF yang Pernah Diunduh ({archivedDocs.length})</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Kwitansi, invoice tagihan, laporan keuangan, dan manifest denah bus yang tersimpan otomatis di sistem.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowArchiveDialog(true)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold rounded-xl border-slate-300"
                  >
                    Buka Dialog Arsip Penuh
                  </Button>
                </div>

                {archivedDocs.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Belum ada arsip berkas PDF yang tercatat.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Setiap kali Anda menekan tombol "Unduh PDF" pada Kwitansi, Invoice, Laporan, atau Denah Bus, dokumen otomatis tersimpan di sini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {archivedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              #{doc.nomorDokumen}
                            </span>
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {doc.docType}
                            </Badge>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 truncate mt-0.5 font-medium">
                            {doc.judul} ({doc.namaKlienOrTrip})
                          </p>
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(doc.downloadedAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            onClick={() => handleReDownloadDoc(doc)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-bold rounded-xl"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600 mr-1" />
                            Unduh
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleShareDocWA(doc)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-bold rounded-xl text-emerald-600"
                          >
                            <Share2 className="w-3.5 h-3.5 mr-1" />
                            WA
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dialog Cetak Kwitansi & Invoice */}
          <KwitansiInvoiceDialog
            open={showKwitansiDialog}
            onOpenChange={setShowKwitansiDialog}
            defaultDocType={defaultDocType}
            defaultTripId={selectedTripId !== "all" ? selectedTripId : undefined}
          />

          {/* Dialog Arsip Riwayat Dokumen PDF */}
          <DownloadedDocArchiveDialog
            open={showArchiveDialog}
            onOpenChange={setShowArchiveDialog}
          />

          <BottomNav />
        </div>
      </RBACOwnerGuard>
    </AuthGuard>
  );
};

export default Laporan;