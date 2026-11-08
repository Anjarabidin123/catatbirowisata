import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Target,
  TrendingUp,
  Award,
  Bus,
  Wallet,
  Calendar,
  ArrowLeft,
  ChevronRight,
  Plus,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Flame,
  Sparkles,
  Zap,
  DollarSign,
  PieChart,
  RefreshCw,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { toast } from "sonner";

interface GoalSetting {
  targetOmset: number;
  targetTrips: number;
}

const STORAGE_KEY_GOALS = "catatbiro_monthly_goals_v1";

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

export const GoalTargetBiro: React.FC = () => {
  const navigate = useNavigate();
  const currentMonthStr = format(new Date(), "yyyy-MM");

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [loading, setLoading] = useState<boolean>(true);
  const [keuanganList, setKeuanganList] = useState<any[]>([]);
  const [tripsList, setTripsList] = useState<any[]>([]);

  // Target Settings
  const [targetOmset, setTargetOmset] = useState<number>(50000000);
  const [targetTrips, setTargetTrips] = useState<number>(8);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [inputOmset, setInputOmset] = useState<string>("50.000.000");
  const [inputTrips, setInputTrips] = useState<string>("8");

  // Load Goals from Storage for the selected month
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GOALS);
      if (stored) {
        const parsed: Record<string, GoalSetting> = JSON.parse(stored);
        if (parsed[selectedMonth]) {
          setTargetOmset(parsed[selectedMonth].targetOmset);
          setTargetTrips(parsed[selectedMonth].targetTrips);
          setInputOmset(parsed[selectedMonth].targetOmset.toLocaleString("id-ID"));
          setInputTrips(parsed[selectedMonth].targetTrips.toString());
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load goals from localStorage", e);
    }
    // Default fallback
    setTargetOmset(50000000);
    setTargetTrips(8);
    setInputOmset((50000000).toLocaleString("id-ID"));
    setInputTrips("8");
  }, [selectedMonth]);

  // Load Keuangan & Trips data
  const fetchData = async () => {
    setLoading(true);
    try {
      const user = await getActiveUser();
      if (!user) {
        // Cek offline cache
        const cachedTrips = localStorage.getItem("catatbiro_cached_trips");
        if (cachedTrips) setTripsList(JSON.parse(cachedTrips));
        setLoading(false);
        return;
      }

      const [keuRes, tripRes] = await Promise.all([
        supabase
          .from("keuangan")
          .select("*")
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false }),
        supabase
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false }),
      ]);

      if (keuRes.data) setKeuanganList(keuRes.data);
      if (tripRes.data) {
        setTripsList(tripRes.data);
        try {
          localStorage.setItem("catatbiro_cached_trips", JSON.stringify(tripRes.data));
        } catch {}
      }
    } catch (err: any) {
      console.error("Error fetching goal data:", err);
      toast.error("Gagal memuat data keuangan terbaru");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter data by selected month
  const monthData = useMemo(() => {
    const pemasukanList = keuanganList.filter((k) => {
      const isPemasukan = k.jenis === "pemasukan";
      const rawDate = k.tanggal || k.created_at || "";
      const matchesMonth = rawDate.startsWith(selectedMonth);
      return isPemasukan && matchesMonth;
    });

    const totalRealitasOmset = pemasukanList.reduce(
      (acc, curr) => acc + (Number(curr.jumlah) || 0),
      0
    );

    const tripBulanIni = tripsList.filter((t) => {
      return t.tanggal && t.tanggal.startsWith(selectedMonth);
    });

    const realisasiTrips = tripBulanIni.length;

    // Progress calculations
    const pctOmset = targetOmset > 0 ? Math.min(Math.round((totalRealitasOmset / targetOmset) * 100), 999) : 0;
    const pctTrips = targetTrips > 0 ? Math.min(Math.round((realisasiTrips / targetTrips) * 100), 999) : 0;

    const sisaOmset = targetOmset - totalRealitasOmset;
    const sisaTrips = targetTrips - realisasiTrips;

    return {
      pemasukanList,
      totalRealitasOmset,
      tripBulanIni,
      realisasiTrips,
      pctOmset,
      pctTrips,
      sisaOmset,
      sisaTrips,
    };
  }, [keuanganList, tripsList, selectedMonth, targetOmset, targetTrips]);

  const handleSaveGoals = () => {
    const numOmset = Math.max(0, parseInt(inputOmset.replace(/\D/g, "") || "0", 10));
    const numTrips = Math.max(0, parseInt(inputTrips.replace(/\D/g, "") || "0", 10));

    if (numOmset <= 0 || numTrips <= 0) {
      toast.error("Target omset dan armada harus lebih besar dari 0");
      return;
    }

    setTargetOmset(numOmset);
    setTargetTrips(numTrips);

    try {
      const stored = localStorage.getItem(STORAGE_KEY_GOALS);
      const parsed: Record<string, GoalSetting> = stored ? JSON.parse(stored) : {};
      parsed[selectedMonth] = { targetOmset: numOmset, targetTrips: numTrips };
      localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(parsed));
      toast.success("Target bulanan berhasil disimpan!");
      setIsEditModalOpen(false);
    } catch (e) {
      console.warn("Failed to write to localStorage", e);
      toast.error("Gagal menyimpan target ke browser");
    }
  };

  // Milestone Badges logic
  const milestone = useMemo(() => {
    const pct = monthData.pctOmset;
    if (pct >= 100) {
      return {
        badge: "Super Biro 100%+ (Target Tercapai)",
        color: "bg-emerald-500 text-white shadow-emerald-500/20",
        icon: Trophy,
        description: "Luar biasa! Target omset bulan ini telah terlampaui. Pertahankan performa armada Anda!",
      };
    }
    if (pct >= 75) {
      return {
        badge: "Hampir Finish (>75%)",
        color: "bg-blue-600 text-white shadow-blue-500/20",
        icon: Flame,
        description: "Sedikit lagi tembus! Lakukan penawaran paket akhir pekan atau push sisa kuota bus.",
      };
    }
    if (pct >= 50) {
      return {
        badge: "On Track (>50%)",
        color: "bg-amber-500 text-slate-950 shadow-amber-500/20",
        icon: Zap,
        description: "Setengah perjalanan terlampaui! Pantau pelunasan DP dari panitia rombongan.",
      };
    }
    if (pct >= 25) {
      return {
        badge: "Akselerasi Dimulai (>25%)",
        color: "bg-indigo-500 text-white shadow-indigo-500/20",
        icon: TrendingUp,
        description: "Awal yang menjanjikan. Jadwalkan promosi brosur ke sekolah dan instansi.",
      };
    }
    return {
      badge: "Pemanasan Awal (<25%)",
      color: "bg-slate-600 text-white",
      icon: Target,
      description: "Bulan baru, semangat baru! Input target trip dan catat semua pemasukan DP.",
    };
  }, [monthData.pctOmset]);

  const monthLabel = useMemo(() => {
    try {
      const [year, m] = selectedMonth.split("-");
      const date = new Date(parseInt(year, 10), parseInt(m, 10) - 1, 1);
      return format(date, "MMMM yyyy", { locale: localeId });
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-12 safe-top lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
                title="Kembali"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight truncate">
                    Target & Goal Omset Biro
                  </h1>
                  <Badge
                    variant="secondary"
                    className="hidden sm:inline-flex bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-bold"
                  >
                    KPI Performa
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Evaluasi realisasi omset vs target armada bus secara real-time
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
                className="h-9 text-xs font-bold rounded-xl"
                title="Segarkan Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9 shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                <span>Atur Target</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Period Selector Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Periode Target
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white capitalize">
                  {monthLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMonth(currentMonthStr)}
                className="h-9 text-xs font-bold"
              >
                Bulan Ini
              </Button>
            </div>
          </div>

          {/* Hero Milestone Status Card */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 text-white shadow-xl border border-blue-800/40">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold">
                  <milestone.icon className="w-4 h-4 text-amber-400" />
                  <span>{milestone.badge}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  Progres Omset: {monthData.pctOmset}% Tercapai
                </h2>
                <p className="text-xs sm:text-sm text-blue-200 leading-relaxed">
                  {milestone.description}
                </p>
              </div>

              {/* Quick Summary Pill */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 w-full lg:w-auto min-w-[260px] space-y-2">
                <div className="flex items-center justify-between text-xs text-blue-100">
                  <span>Realisasi Omset:</span>
                  <span className="font-bold text-white">{formatRupiah(monthData.totalRealitasOmset)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-blue-100">
                  <span>Target Bulanan:</span>
                  <span className="font-bold text-white">{formatRupiah(targetOmset)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/15">
                  <span className="font-semibold">
                    {monthData.sisaOmset <= 0 ? "Surplus Target:" : "Sisa Kejar Target:"}
                  </span>
                  <span
                    className={`font-black ${
                      monthData.sisaOmset <= 0 ? "text-emerald-400" : "text-amber-300"
                    }`}
                  >
                    {monthData.sisaOmset <= 0
                      ? `+${formatRupiah(Math.abs(monthData.sisaOmset))}`
                      : formatRupiah(monthData.sisaOmset)}
                  </span>
                </div>
              </div>
            </div>

            {/* Background Glow */}
            <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* 4 Main KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Omset Realisasi */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Realisasi Omset
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {formatRupiah(monthData.totalRealitasOmset)}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dari {monthData.pemasukanList.length} transaksi pemasukan
                </p>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500">Target: {formatRupiah(targetOmset)}</span>
                  <span className="text-emerald-600">{monthData.pctOmset}%</span>
                </div>
                <Progress value={Math.min(monthData.pctOmset, 100)} className="h-2" />
              </div>
            </div>

            {/* Card 2: Armada Bus & Trip */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Target Bus & Trip
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Bus className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {monthData.realisasiTrips} <span className="text-sm font-semibold text-slate-400">/ {targetTrips} Trip</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {monthData.sisaTrips <= 0
                    ? "Target armada terpenuhi!"
                    : `Sisa ${monthData.sisaTrips} trip keberangkatan lagi`}
                </p>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500">Target Armada</span>
                  <span className="text-blue-600">{monthData.pctTrips}%</span>
                </div>
                <Progress value={Math.min(monthData.pctTrips, 100)} className="h-2" />
              </div>
            </div>

            {/* Card 3: Defisit / Surplus Target */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Selisih Target
                </span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    monthData.sisaOmset <= 0
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3
                  className={`text-xl sm:text-2xl font-black ${
                    monthData.sisaOmset <= 0 ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {monthData.sisaOmset <= 0
                    ? `+${formatRupiah(Math.abs(monthData.sisaOmset))}`
                    : `-${formatRupiah(monthData.sisaOmset)}`}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {monthData.sisaOmset <= 0
                    ? "Surplus keuntungan di atas target"
                    : "Nominal yang perlu dikejar bulan ini"}
                </p>
              </div>
              <div className="pt-2">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                    monthData.sisaOmset <= 0
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                  }`}
                >
                  {monthData.sisaOmset <= 0 ? "🎉 Target Lolos" : "⚡ Kejar Prospek"}
                </span>
              </div>
            </div>

            {/* Card 4: Rata-rata Omset per Bus */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Rata-rata per Trip
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <PieChart className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {monthData.realisasiTrips > 0
                    ? formatRupiah(Math.round(monthData.totalRealitasOmset / monthData.realisasiTrips))
                    : "Rp 0"}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Produktivitas omset per armada jalan
                </p>
              </div>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/keuangan")}
                  className="w-full h-8 text-[11px] font-bold"
                >
                  Buku Kas & Laba
                </Button>
              </div>
            </div>
          </div>

          {/* Breakdown Section: Trips & Pemasukan Contributing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Left: Trip List Bulan Ini */}
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bus className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Trip Berjalan Bulan Ini ({monthData.tripBulanIni.length})
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate("/trips/new")}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Tambah Trip
                </Button>
              </div>

              {monthData.tripBulanIni.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                  <Bus className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Belum ada jadwal trip yang didaftarkan untuk bulan ini.</p>
                  <Button
                    size="sm"
                    onClick={() => navigate("/trips/new")}
                    className="text-xs font-bold"
                  >
                    Buat Jadwal Trip Baru
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {monthData.tripBulanIni.map((trip: any) => (
                    <div
                      key={trip.id}
                      onClick={() => navigate(`/trips/${trip.id}`)}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between hover:border-blue-400 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {trip.nama_trip}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {trip.tanggal} • {trip.tujuan || "Tujuan Wisata"}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Pemasukan Terkini Bulan Ini */}
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Pemasukan Paket Wisata ({monthData.pemasukanList.length})
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate("/keuangan/new")}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Catat Pemasukan
                </Button>
              </div>

              {monthData.pemasukanList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                  <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Belum ada catatan pemasukan untuk bulan ini.</p>
                  <Button
                    size="sm"
                    onClick={() => navigate("/keuangan/new")}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    + Catat Pemasukan DP/Pelunasan
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {monthData.pemasukanList.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/60 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {item.keterangan || "Pemasukan Paket"}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {item.tanggal} • {item.kategori || "Paket Wisata"}
                        </p>
                      </div>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        +{formatRupiah(Number(item.jumlah) || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Atur Target */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span>Atur Target Bulan {monthLabel}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Tentukan target omset dan kuota trip armada bus biro Anda untuk periode ini.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Omset Bulanan (Rupiah)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <Input
                    type="text"
                    value={inputOmset}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setInputOmset(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    className="pl-10 h-11 text-sm font-black rounded-xl"
                    placeholder="50.000.000"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Pratinjau: {formatRupiah(parseInt(inputOmset.replace(/\D/g, "") || "0", 10))}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Jumlah Trip / Keberangkatan Bus
                </label>
                <div className="relative">
                  <Bus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={inputTrips}
                    onChange={(e) => setInputTrips(e.target.value)}
                    className="pl-10 h-11 text-sm font-black rounded-xl"
                    placeholder="8"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSaveGoals}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold px-5"
                >
                  Simpan Target
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile Navigation */}
        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default GoalTargetBiro;
