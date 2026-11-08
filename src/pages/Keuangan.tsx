import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  Search,
  ChevronDown,
  Receipt,
  ShieldCheck,
  UserCheck,
  Lock,
  Wallet,
  PieChart,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatRupiah } from "@/lib/utils";
import { KwitansiInvoiceDialog } from "@/components/KwitansiInvoiceDialog";
import { PettyCashTracker } from "@/components/PettyCashTracker";
import { useRole } from "@/contexts/RoleContext";

interface Keuangan {
  id: string;
  trip_id: string;
  jenis: string;
  jumlah: number;
  keterangan: string | null;
  tanggal: string;
  cashback?: number | null;
  trips: {
    nama_trip: string;
  };
}

const Keuangan = () => {
  const navigate = useNavigate();
  const { isPemilik, isKru, roleName, activeCrew, hasPermission } = useRole();
  const canSeeFinancials = hasPermission("rule_buku_kas_laba");
  const canPrintKwitansi = hasPermission("rule_kwitansi_invoice");
  const canInputPettyCash = hasPermission("rule_petty_cash");
  const [keuangan, setKeuangan] = useState<Keuangan[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedKruTripId, setSelectedKruTripId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<string>("current");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [showKwitansiDialog, setShowKwitansiDialog] = useState(false);

  useEffect(() => {
    loadKeuangan();

    const channel = supabase
      .channel("keuangan-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "keuangan" },
        () => loadKeuangan()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadKeuangan = async () => {
    try {
      const user = await getActiveUser();
      if (!user) return;

      const [keuanganRes, tripsRes] = await Promise.all([
        supabase
          .from("keuangan")
          .select(`*, trips (nama_trip)`)
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false }),
        supabase
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false }),
      ]);

      if (keuanganRes.error) throw keuanganRes.error;
      if (tripsRes.error) throw tripsRes.error;

      const loadedTrips = tripsRes.data || [];
      setKeuangan(keuanganRes.data || []);
      setTrips(loadedTrips);
      if (loadedTrips.length > 0 && !selectedKruTripId) {
        const activeId = localStorage.getItem("active_trip_id") || loadedTrips[0].id;
        setSelectedKruTripId(activeId);
      }
    } catch (error: any) {
      console.error("Error loading keuangan:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data by month
  const filteredKeuangan = useMemo(() => {
    return keuangan.filter((k) => {
      const kDate = new Date(k.tanggal || (k as any).created_at || Date.now());
      const todayDate = new Date();

      if (filterMonth === "current") {
        return (
          kDate.getMonth() === todayDate.getMonth() &&
          kDate.getFullYear() === todayDate.getFullYear()
        );
      } else if (filterMonth === "last") {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return (
          kDate.getMonth() === lastMonth.getMonth() &&
          kDate.getFullYear() === lastMonth.getFullYear()
        );
      }
      return true;
    });
  }, [keuangan, filterMonth]);

  // Executive KPI summary metrics (Omset, Beban, Laba, Margin, Rasio)
  const {
    totalOmset,
    totalBeban,
    totalLaba,
    marginLaba,
    rasioBeban,
    pemasukanCount,
    pengeluaranCount,
    totalCashback,
  } = useMemo(() => {
    let omset = 0;
    let beban = 0;
    let inCount = 0;
    let outCount = 0;
    let cashback = 0;

    filteredKeuangan.forEach((item) => {
      const amt = Number(item.jumlah) || 0;
      if (item.jenis === "pemasukan") {
        omset += amt;
        inCount++;
      } else {
        beban += amt;
        outCount++;
      }
      if (item.cashback) {
        cashback += Number(item.cashback) || 0;
      }
    });

    const laba = omset - beban;
    const margin = omset > 0 ? ((laba / omset) * 100).toFixed(1) : "0";
    const rasio = omset > 0 ? Math.min(100, Math.round((beban / omset) * 100)) : 0;

    return {
      totalOmset: omset,
      totalBeban: beban,
      totalLaba: laba,
      marginLaba: margin,
      rasioBeban: rasio,
      pemasukanCount: inCount,
      pengeluaranCount: outCount,
      totalCashback: cashback,
    };
  }, [filteredKeuangan]);

  // Breakdown 4 pos pengeluaran terbesar
  const categoryExpenses = useMemo(() => {
    const map: Record<string, number> = {};
    filteredKeuangan
      .filter((k) => k.jenis === "pengeluaran")
      .forEach((k) => {
        let cat = "Biaya Operasional Umum";
        const match = k.keterangan?.match(/^\[(.*?)\]/);
        if (match && match[1]) {
          cat = match[1];
        }
        map[cat] = (map[cat] || 0) + Number(k.jumlah || 0);
      });

    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [filteredKeuangan]);

  // Calculate summary per trip
  const tripSummaries = useMemo(() => {
    return Object.entries(
      filteredKeuangan.reduce((acc, item) => {
        if (!acc[item.trip_id]) {
          const trip = trips.find((t) => t.id === item.trip_id);
          acc[item.trip_id] = {
            trip_id: item.trip_id,
            trip_name: item.trips?.nama_trip || "Trip tidak ditemukan",
            trip_date: trip?.tanggal || "",
            pemasukan: 0,
            pengeluaran: 0,
            saldo: 0,
          };
        }
        if (item.jenis === "pemasukan") {
          acc[item.trip_id].pemasukan += Number(item.jumlah);
        } else {
          acc[item.trip_id].pengeluaran += Number(item.jumlah);
        }
        acc[item.trip_id].saldo = acc[item.trip_id].pemasukan - acc[item.trip_id].pengeluaran;
        return acc;
      }, {} as Record<string, { trip_id: string; trip_name: string; trip_date: string; pemasukan: number; pengeluaran: number; saldo: number }>)
    )
      .map(([_, summary]) => summary)
      .filter(
        (summary) =>
          searchQuery === "" ||
          summary.trip_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.trip_date).getTime() - new Date(a.trip_date).getTime());
  }, [filteredKeuangan, trips, searchQuery]);

  const toggleTrip = (tripId: string) => {
    const newExpanded = new Set(expandedTrips);
    if (newExpanded.has(tripId)) {
      newExpanded.delete(tripId);
    } else {
      newExpanded.add(tripId);
    }
    setExpandedTrips(newExpanded);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top lg:pl-64">
        <div className="max-w-2xl lg:max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
          {/* Header Berbeda Tegas Antara Pemilik Biro & Kru Lapangan */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black flex items-center gap-2">
                <span>
                  {canSeeFinancials ? "Buku Kas Besar & Laba Biro" : "Kas Saku & Biaya Lapangan (Petty Cash)"}
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1 ${
                    isPemilik
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {isPemilik ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                  {roleName}
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {canSeeFinancials
                  ? "Akses penuh Buku Kas Biro: rekapitulasi omset klien, pengeluaran armada, laba bersih & kwitansi resmi"
                  : `Petugas: ${activeCrew.nama} • Khusus pencatatan uang saku operasional lapangan (Tol, Parkir, Resto/Konsumsi, Tiket)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canPrintKwitansi && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKwitansiDialog(true)}
                  className="h-9 text-xs rounded-xl font-semibold gap-1.5 border-slate-200 dark:border-slate-800"
                >
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Kwitansi &</span> Invoice
                </Button>
              )}
              {(canInputPettyCash || canSeeFinancials) && (
                <Button
                  onClick={() => navigate("/keuangan/new")}
                  className={`${
                    canSeeFinancials ? "gradient-primary" : "bg-emerald-600 hover:bg-emerald-700"
                  } text-white h-9 rounded-xl font-bold`}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {canSeeFinancials ? "Tambah Kas" : "+ Biaya Lapangan"}
                </Button>
              )}
            </div>
          </div>

          {/* Mode Kru: Tampilkan Banner Proteksi RBAC & PettyCashTracker Langsung */}
          {isKru && (
            <div className="space-y-4">
              {!canSeeFinancials && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-emerald-950 dark:text-emerald-200">
                    <p className="font-extrabold">
                      Pemisahan RBAC Aktif: Fokus Kas Saku Operasional Kru
                    </p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Sebagai <strong>{activeCrew.jabatan}</strong>, Anda hanya melihat dan mencatat pengeluaran operasional lapangan. Data omset pembayaran klien dan margin keuntungan/kerugian biro dikelola terpisah oleh Pemilik Biro.
                    </p>
                  </div>
                </div>
              )}

              {trips.length > 0 && (
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <h2 className="text-sm font-extrabold">
                        Posko Kas Lapangan (Petty Cash Per Trip)
                      </h2>
                    </div>
                    <Select value={selectedKruTripId} onValueChange={setSelectedKruTripId}>
                      <SelectTrigger className="w-full sm:w-64 h-8 text-xs font-bold rounded-xl">
                        <SelectValue placeholder="Pilih Trip" />
                      </SelectTrigger>
                      <SelectContent>
                        {trips.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.nama_trip} ({t.tujuan})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedKruTripId && (
                    <PettyCashTracker
                      tripId={selectedKruTripId}
                      tripName={trips.find((t) => t.id === selectedKruTripId)?.nama_trip}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              RINGKASAN EKSEKUTIF KEUANGAN (OMSET, BEBAN, LABA BERSIH)
              ========================================================= */}
          {canSeeFinancials && (
            <div className="space-y-3">
              {/* Filter Periode & Pencarian */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="w-36 h-9 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current" className="text-xs">Bulan Ini</SelectItem>
                      <SelectItem value="last" className="text-xs">Bulan Lalu</SelectItem>
                      <SelectItem value="all" className="text-xs">Semua Periode</SelectItem>
                    </SelectContent>
                  </Select>

                  <span className="text-xs text-slate-500 hidden sm:inline">
                    Periode: <strong>{filterMonth === "current" ? "Bulan Ini" : filterMonth === "last" ? "Bulan Lalu" : "Semua Periode"}</strong>
                  </span>
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Cari trip atau transaksi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Ringkasan Finansial Mobile: Super Ringkas & Hemat Ruang (~80px) */}
              <div className="md:hidden p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="grid grid-cols-3 gap-1 divide-x divide-slate-100 dark:divide-slate-800 text-center">
                  <div className="px-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">Omset</span>
                    <span className="text-xs font-black text-emerald-600 truncate block mt-0.5">{formatRupiah(totalOmset)}</span>
                    <span className="text-[9px] text-slate-400 block">{pemasukanCount} trx</span>
                  </div>
                  <div className="px-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">Beban</span>
                    <span className="text-xs font-black text-rose-600 truncate block mt-0.5">{formatRupiah(totalBeban)}</span>
                    <span className="text-[9px] text-slate-400 block">{pengeluaranCount} trx</span>
                  </div>
                  <div className="px-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">Laba</span>
                    <span className={`text-xs font-black truncate block mt-0.5 ${totalLaba >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatRupiah(totalLaba)}
                    </span>
                    <span className={`text-[9px] font-bold px-1 rounded inline-block ${totalLaba >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>
                      {marginLaba}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${totalOmset > 0 ? Math.max(0, 100 - rasioBeban) : 0}%` }} />
                  <div className="bg-rose-500 h-full" style={{ width: `${totalOmset > 0 ? rasioBeban : 0}%` }} />
                </div>
              </div>

              {/* 3 Kartu Metrik Utama Bento: Omset, Beban, Laba (Desktop Only) */}
              <div className="hidden md:grid md:grid-cols-3 gap-3">
                {/* 1. Total Omset (Pemasukan) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Omset (Pemasukan)
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {formatRupiah(totalOmset)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>{pemasukanCount} transaksi pembayaran klien tercatat</span>
                    </p>
                  </div>
                </div>

                {/* 2. Total Beban Operasional */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Beban Biaya Operasional
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {formatRupiah(totalBeban)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                      <span>
                        Rasio Biaya: <strong>{rasioBeban}%</strong> dari total omset ({pengeluaranCount} transaksi)
                      </span>
                    </p>
                  </div>
                </div>

                {/* 3. Laba Bersih Biro */}
                <div
                  className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-2xs space-y-2 ${
                    totalLaba >= 0
                      ? "border-emerald-200/80 dark:border-emerald-900/60 ring-1 ring-emerald-500/10"
                      : "border-rose-200/80 dark:border-rose-900/60 ring-1 ring-rose-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Laba Bersih Operasional
                    </span>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        totalLaba >= 0
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600"
                          : "bg-rose-50 dark:bg-rose-950/50 text-rose-600"
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div
                      className={`text-xl sm:text-2xl font-black tracking-tight ${
                        totalLaba >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {formatRupiah(totalLaba)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                          totalLaba >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        Margin {marginLaba}%
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {totalLaba >= 0 ? "Surplus / Menguntungkan" : "Defisit Operasional"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar Visualisasi Proporsi Cashflow & Distribusi Pos Biaya Terbesar (Desktop Only) */}
              <div className="hidden md:block p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Kesehatan Arus Kas (
                      {filterMonth === "current"
                        ? "Bulan Ini"
                        : filterMonth === "last"
                        ? "Bulan Lalu"
                        : "Semua Periode"}
                      )
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Laba Bersih:{" "}
                      <strong>{Math.max(0, 100 - rasioBeban)}%</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> Beban Biaya:{" "}
                      <strong>{rasioBeban}%</strong>
                    </span>
                    {totalCashback > 0 && (
                      <span className="flex items-center gap-1 text-blue-600 font-semibold">
                        • Cashback: {formatRupiah(totalCashback)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${totalOmset > 0 ? Math.max(0, 100 - rasioBeban) : 0}%` }}
                    title={`Laba: ${formatRupiah(totalLaba)}`}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${totalOmset > 0 ? rasioBeban : 0}%` }}
                    title={`Beban: ${formatRupiah(totalBeban)}`}
                  />
                </div>

                {/* Pos Pengeluaran Terbesar (jika ada data) */}
                {categoryExpenses.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-400" />
                      Pos Pengeluaran Dominan:
                    </span>
                    {categoryExpenses.map((c) => (
                      <span
                        key={c.name}
                        className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {c.name}: <b className="text-slate-900 dark:text-white">{formatRupiah(c.total)}</b>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              DAFTAR REKAPITULASI PEMBUKUAN PER TRIP
              ========================================================= */}
          {loading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Memuat data keuangan...</p>
            </div>
          ) : tripSummaries.length === 0 ? (
            <div className="text-center py-12 ios-card space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {filterMonth === "all"
                    ? "Belum ada catatan transaksi di sistem"
                    : "Belum ada catatan transaksi untuk periode ini"}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {filterMonth !== "all"
                    ? "Ganti filter periode ke 'Semua Periode' untuk melihat transaksi sebelumnya, atau catat transaksi baru."
                    : "Mulai catat transaksi pembayaran paket wisata atau pengeluaran operasional trip."}
                </p>
              </div>
              {(canInputPettyCash || canSeeFinancials) && (
                <Button
                  onClick={() => navigate("/keuangan/new")}
                  className="gradient-primary text-white text-xs font-bold rounded-xl"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  {canSeeFinancials ? "Tambah Transaksi Baru" : "Catat Biaya Lapangan"}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {canSeeFinancials
                    ? `Rekapitulasi Keuangan Per Trip (${tripSummaries.length})`
                    : `Rekap Pengeluaran Lapangan (${tripSummaries.length})`}
                </h2>
                <span className="text-xs text-slate-400">
                  {filterMonth === "current" ? "Bulan Ini" : filterMonth === "last" ? "Bulan Lalu" : "Semua Trip"}
                </span>
              </div>

              <div className="space-y-2.5">
                {tripSummaries.map((summary) => (
                  <Collapsible key={summary.trip_id}>
                    <div className="ios-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                      <CollapsibleTrigger
                        className="w-full flex justify-between items-center gap-3"
                        onClick={() => toggleTrip(summary.trip_id)}
                      >
                        <div className="flex-1 text-left min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {summary.trip_name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            <span>
                              {summary.trip_date
                                ? format(new Date(summary.trip_date), "dd MMM yyyy", { locale: id })
                                : "-"}
                            </span>
                          </p>
                        </div>

                        {/* RBAC: Pemilik melihat Untung/Rugi, Kru HANYA melihat Total Pengeluaran Lapangan */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {canSeeFinancials ? (
                            summary.saldo >= 0 ? (
                              <div className="text-right">
                                <p className="text-sm sm:text-base font-black text-emerald-600">
                                  {formatRupiah(summary.saldo)}
                                </p>
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                                  Surplus / Untung
                                </span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <p className="text-sm sm:text-base font-black text-rose-600">
                                  {formatRupiah(Math.abs(summary.saldo))}
                                </p>
                                <span className="text-[10px] text-rose-700 font-bold bg-rose-50 dark:bg-rose-950 px-1.5 py-0.2 rounded">
                                  Defisit / Rugi
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="text-right">
                              <p className="text-sm sm:text-base font-black text-rose-600">
                                {formatRupiah(summary.pengeluaran)}
                              </p>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                Biaya Lapangan
                              </span>
                            </div>
                          )}
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform ${
                              expandedTrips.has(summary.trip_id) ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {canSeeFinancials ? (
                          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Omset (Pemasukan)</span>
                              <p className="font-bold text-emerald-600 text-sm">
                                {formatRupiah(summary.pemasukan)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px]">Beban Biaya</span>
                              <p className="font-bold text-rose-600 text-sm">
                                {formatRupiah(summary.pengeluaran)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl">
                            <span className="text-muted-foreground">
                              Total Pengeluaran Lapangan Terverifikasi:
                            </span>
                            <span className="font-bold text-rose-600">
                              {formatRupiah(summary.pengeluaran)}
                            </span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs font-semibold rounded-xl"
                          onClick={() => navigate(`/trips/${summary.trip_id}`, { state: { activeTab: "keuangan" } })}
                        >
                          {canSeeFinancials ? "Buka Buku Kas Trip & Kwitansi →" : "Buka Posko Operasional Trip →"}
                        </Button>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </div>
          )}
        </div>

        {canPrintKwitansi && (
          <KwitansiInvoiceDialog
            open={showKwitansiDialog}
            onOpenChange={setShowKwitansiDialog}
          />
        )}

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default Keuangan;
