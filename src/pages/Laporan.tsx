import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { generateReportPDF } from "@/utils/reportPdfGenerator";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { KwitansiInvoiceDialog } from "@/components/KwitansiInvoiceDialog";
import { useRole } from "@/contexts/RoleContext";
import RBACOwnerGuard from "@/components/RBACOwnerGuard";

interface ReportData {
  trips: any[];
  keuangan: any[];
  media: any[];
}

const Laporan = () => {
  const { isPemilik, roleName } = useRole();
  const [data, setData] = useState<ReportData>({ trips: [], keuangan: [], media: [] });
  const [loading, setLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("current");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showKwitansiDialog, setShowKwitansiDialog] = useState(false);

  useEffect(() => {
    loadReportData();
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

      setData({
        trips: tripsRes.data || [],
        keuangan: keuanganRes.data || [],
        media: mediaRes.data || [],
      });
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
      keuangan: data.keuangan.filter((k) => isMatchDate(k.tanggal)),
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
      toast.success("Laporan PDF resmi berhasil diunduh!");
    } catch (error) {
      console.error("Gagal cetak PDF:", error);
      toast.error("Gagal membuat PDF");
    }
  };

  const handleSharePDF = () => {
    try {
      const shareText = `*Rekapitulasi Operasional & Keuangan Biro*\n\nPeriode: ${
        filterMonth === "current" ? "Bulan Ini" : filterMonth === "last" ? "Bulan Lalu" : "Semua Periode"
      }\nTotal Trip: ${tripReports.length}\nTotal Omset: ${formatRupiah(totals.totalPemasukan)}\nTotal Beban: ${formatRupiah(
        totals.totalPengeluaran
      )}\n*Laba Bersih: ${formatRupiah(totals.labaBersih)}* (Margin ${totals.marginTotal}%)\n\nData resmi diproses via CatatBiro Wisata.`;

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
            {/* Header Laporan */}
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
                  Rekapitulasi performa keuntungan per trip, pembukuan omset, dan cetak dokumen resmi biro.
                </p>
              </div>

              {/* Action Buttons: Tertata Responsif Tanpa Meluber ke Luar Layar */}
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                {isPemilik && (
                  <Button
                    type="button"
                    onClick={() => setShowKwitansiDialog(true)}
                    variant="outline"
                    className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-1.5"
                    size="sm"
                  >
                    <Receipt className="w-3.5 h-3.5 text-blue-600" />
                    <span>Kwitansi / Invoice</span>
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
                  <span>Kirim WhatsApp</span>
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

            {/* Toolbar Filter Bersih, Nyaman di Ponsel */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* Cari Nama Trip */}
                <div className="sm:col-span-5 relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Cari trip atau kota tujuan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                  />
                </div>

                {/* Filter Periode */}
                <div className="sm:col-span-3">
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Pilih Periode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current" className="text-xs">Bulan Ini</SelectItem>
                      <SelectItem value="last" className="text-xs">Bulan Lalu</SelectItem>
                      <SelectItem value="year" className="text-xs">Tahun Ini</SelectItem>
                      <SelectItem value="all" className="text-xs">Semua Periode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Pilihan Trip Spesifik */}
                <div className="sm:col-span-2">
                  <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Semua Trip" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="all" className="text-xs">Semua Trip</SelectItem>
                      {data.trips.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.nama_trip}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Status Profit/Defisit */}
                <div className="sm:col-span-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Status Hasil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Semua Hasil</SelectItem>
                      <SelectItem value="profit" className="text-xs">Hanya Untung</SelectItem>
                      <SelectItem value="loss" className="text-xs">Hanya Defisit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 4 Kartu Ringkasan Finansial: Padat, Jelas & Hemat Tempat di Ponsel */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Total Trip */}
              <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Trip Tercatat
                </span>
                <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {tripReports.length} <span className="text-xs font-normal text-slate-500">Jadwal</span>
                </p>
                <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
                  Periode {filterMonth === "current" ? "Bulan Ini" : filterMonth === "last" ? "Bulan Lalu" : "Aktif"}
                </span>
              </div>

              {/* Total Pemasukan / Omset */}
              <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
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

              {/* Total Pengeluaran / Beban */}
              <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
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
              <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
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

            {/* Daftar Laporan Per Trip (Responsif & Rapi di Mobile) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rincian Laporan Hasil Per Trip ({tripReports.length})</span>
                </h2>
              </div>

              {tripReports.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tidak ditemukan trip dengan kriteria filter yang dipilih.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Coba ubah filter periode atau kosongkan kata kunci pencarian.
                  </p>
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
                        {/* Baris Atas: Nama Trip & Tanggal */}
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

                          <Link
                            to={`/trips/${t.id}`}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 shrink-0"
                          >
                            <span>Buka Trip</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dialog Cetak Kwitansi & Invoice */}
          <KwitansiInvoiceDialog
            open={showKwitansiDialog}
            onOpenChange={setShowKwitansiDialog}
          />

          <BottomNav />
        </div>
      </RBACOwnerGuard>
    </AuthGuard>
  );
};

export default Laporan;
