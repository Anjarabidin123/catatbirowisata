import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Bus,
  MapPin,
  Clock,
  Users,
  FileText,
  CalendarDays,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertCircle,
  Flag,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  parseISO,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useRole } from "@/contexts/RoleContext";
import { getCurrentEntitlements } from "@/utils/licenseEntitlement";
import {
  evaluateRedDate,
  getHolidaysInMonth,
  toDateKey,
  HolidayInfo,
} from "@/data/indonesianHolidays";
import { toast } from "sonner";

interface Trip {
  id: string;
  nama_trip: string;
  tanggal: string;
  tanggal_selesai: string | null;
  tujuan: string;
  catatan: string | null;
  nama_kendaraan?: string | null;
  nomor_polisi?: string | null;
  nama_driver?: string | null;
  jumlah_penumpang?: number | null;
}

const Trips = () => {
  const navigate = useNavigate();
  const { isPemilik, activeCrew, hasPermission, isTripAllowedForActiveCrew } = useRole();
  const canManageTrips = hasPermission("rule_hapus_buat_trip");

  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const cached = localStorage.getItem("catatbiro_cached_trips");
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(trips.length === 0);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const loadTrips = async () => {
    try {
      const user = await getActiveUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false });

      if (error) throw error;
      const list = data || [];
      const visibleList = isPemilik
        ? list
        : list.filter((t) => isTripAllowedForActiveCrew(t));
      setTrips(visibleList);
      try {
        localStorage.setItem("catatbiro_cached_trips", JSON.stringify(list));
      } catch {}
    } catch (error: any) {
      console.error("Error loading trips:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();

    const tripsChannel = supabase
      .channel("trips-calendar-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => loadTrips()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tripsChannel);
    };
  }, [isPemilik, activeCrew?.crewId]);

  // Filter trips sesuai pencarian
  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return trips;
    const q = searchQuery.toLowerCase();
    return trips.filter(
      (t) =>
        t.nama_trip.toLowerCase().includes(q) ||
        t.tujuan.toLowerCase().includes(q) ||
        (t.nama_kendaraan || "").toLowerCase().includes(q) ||
        (t.nama_driver || "").toLowerCase().includes(q) ||
        (t.nomor_polisi || "").toLowerCase().includes(q)
    );
  }, [trips, searchQuery]);

  // Cek apakah suatu trip jatuh pada tanggal tertentu
  const isTripOnDay = (trip: Trip, day: Date): boolean => {
    try {
      const start = parseISO(trip.tanggal);
      const end = trip.tanggal_selesai ? parseISO(trip.tanggal_selesai) : start;
      const targetTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
      const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      return targetTime >= startTime && targetTime <= endTime;
    } catch {
      return false;
    }
  };

  // Status trip relatif terhadap hari ini
  const getTripStatus = (t: Trip) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = parseISO(t.tanggal);
    const end = t.tanggal_selesai ? parseISO(t.tanggal_selesai) : start;
    if (end < today) return "selesai";
    if (start <= today && end >= today) return "berlangsung";
    return "mendatang";
  };

  // Trips yang aktif pada tanggal yang dipilih
  const tripsOnSelectedDate = useMemo(() => {
    return filteredTrips.filter((t) => isTripOnDay(t, selectedDate));
  }, [filteredTrips, selectedDate]);

  // Daftar hari libur pada bulan yang sedang aktif
  const currentMonthHolidays = useMemo(() => {
    return getHolidaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  }, [currentMonth]);

  // Evaluasi status tanggal merah untuk tanggal terpilih
  const selectedDateEval = useMemo(() => {
    return evaluateRedDate(selectedDate);
  }, [selectedDate]);

  // Buat array tanggal untuk grid kalender (termasuk padding awal/akhir minggu)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Senin
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Minggu

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(now);
  };

  const openTripDetail = (tripId: string) => {
    localStorage.setItem("active_trip_id", tripId);
    navigate(`/trips/${tripId}`, { state: { activeTab: "rundown" } });
  };

  const createTripOnDate = (date: Date) => {
    const ent = getCurrentEntitlements();
    if (trips.length >= ent.maxActiveTrips) {
      toast.error(`Batas kuota trip aktif (${ent.maxActiveTrips} trip) telah tercapai. Hubungi Founder untuk menambah kuota!`);
      return;
    }
    navigate("/trips/new", { state: { defaultDate: toDateKey(date) } });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 lg:pb-12 lg:pl-64 font-sans text-slate-900 dark:text-slate-100">
        <div className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 space-y-4">
          
          {/* Header Kalender Eksklusif & Tegas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-blue-600" />
                  <span>Kalender & Jadwal Keberangkatan</span>
                </h1>
                <Badge variant="outline" className="text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200">
                  {filteredTrips.length} Total Trip
                </Badge>
                {(() => {
                  const ent = getCurrentEntitlements();
                  const full = trips.length >= ent.maxActiveTrips;
                  return (
                    <Badge variant="outline" className={`text-xs font-mono font-bold ${full ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300" : "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200"}`}>
                      Kuota: {trips.length} / {ent.maxActiveTrips >= 9000 ? "∞ Unlimited" : `${ent.maxActiveTrips} Max`}
                    </Badge>
                  );
                })()}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
                Jadwal armada bus, panduan tanggal merah (Minggu & Libur Nasional), dan kalender operasional biro wisata.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <div className="inline-flex rounded-xl bg-slate-200/90 dark:bg-slate-800 p-1 border border-slate-300/60 dark:border-slate-700 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    viewMode === "calendar"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Kalender
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    viewMode === "list"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Daftar
                </button>
              </div>

              {canManageTrips && (
                <Button
                  size="sm"
                  onClick={() => createTripOnDate(selectedDate)}
                  className="h-9 px-3.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Trip</span>
                </Button>
              )}
            </div>
          </div>

          {/* Navigasi Bulan, Hari Ini, dan Kolom Pencarian */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevMonth}
                  className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-700"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextMonth}
                  className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-700"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                </Button>
              </div>

              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white capitalize px-2 tracking-tight">
                {format(currentMonth, "MMMM yyyy", { locale: localeId })}
              </h2>

              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="h-8 px-3 rounded-xl text-xs font-black text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                Hari Ini
              </Button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari trip, armada, kru, atau rute..."
                className="pl-9 h-9 text-xs rounded-xl border-slate-300 dark:border-slate-700 font-medium"
              />
            </div>
          </div>

          {/* BANNER KETERANGAN HARI LIBUR NASIONAL BULAN INI (TANGGAL MERAH RESMI) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50/90 via-red-50/50 to-amber-50/70 dark:from-rose-950/40 dark:via-red-950/30 dark:to-amber-950/30 border border-rose-200 dark:border-rose-900/60 shadow-2xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse flex-shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-rose-600" />
                Tanggal Merah & Hari Libur Nasional ({format(currentMonth, "MMMM yyyy", { locale: localeId })})
              </span>
            </div>

            {currentMonthHolidays.length === 0 ? (
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Tidak ada hari libur nasional resmi di hari kerja pada bulan ini (selain Hari Minggu). Periode ideal untuk paket rombongan kedinasan, study tour, dan sewa bus reguler.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {currentMonthHolidays.map((h) => {
                  const dayNum = parseInt(h.date.split("-")[2], 10);
                  const isCurrentSelected = toDateKey(selectedDate) === h.date;
                  return (
                    <button
                      key={h.date}
                      type="button"
                      onClick={() => setSelectedDate(parseISO(h.date))}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        isCurrentSelected
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm scale-105"
                          : "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950"
                      }`}
                      title={h.description || h.name}
                    >
                      <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200 flex items-center justify-center text-[11px] font-black">
                        {dayNum}
                      </span>
                      <span className="truncate max-w-[220px]">{h.name}</span>
                      {h.type === "cuti_bersama" && (
                        <span className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-extrabold">
                          Cuti
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {viewMode === "calendar" ? (
            /* =========================================================
                TAMPILAN 1: GRID KALENDER BULANAN + INSPECTOR HARI
            ========================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Kalender Grid (7 Kolom: Sen s/d Min) */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-3 sm:p-5 shadow-xs space-y-3">
                
                {/* Header Hari (Sen - Min) dengan Penekanan Kuat pada Minggu (Merah) */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-2 border-b-2 border-slate-200 dark:border-slate-800">
                  {[
                    { label: "Sen", isSun: false, isSat: false },
                    { label: "Sel", isSun: false, isSat: false },
                    { label: "Rab", isSun: false, isSat: false },
                    { label: "Kam", isSun: false, isSat: false },
                    { label: "Jum", isSun: false, isSat: false },
                    { label: "Sab", isSun: false, isSat: true },
                    { label: "Min", isSun: true, isSat: false },
                  ].map((d) => (
                    <div
                      key={d.label}
                      className={`py-1.5 rounded-xl text-xs uppercase tracking-wider ${
                        d.isSun
                          ? "text-rose-600 dark:text-rose-400 font-black bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900"
                          : d.isSat
                          ? "text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/50 dark:bg-blue-950/30"
                          : "text-slate-600 dark:text-slate-400 font-bold"
                      }`}
                    >
                      {d.label}
                    </div>
                  ))}
                </div>

                {/* Sel-Sel Tanggal Kalender */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarDays.map((day, idx) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const isCurMonth = isSameMonth(day, currentMonth);
                    const dayTrips = filteredTrips.filter((t) => isTripOnDay(t, day));
                    const hasTrips = dayTrips.length > 0;

                    // Evaluasi Tanggal Merah (Minggu & Libur Nasional)
                    const redEval = evaluateRedDate(day);
                    const { isRedDate, isSunday, holiday } = redEval;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(day)}
                        className={`min-h-20 sm:min-h-24 p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/50 ring-2 ring-blue-500/30 shadow-md"
                            : isToday
                            ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30 ring-1 ring-emerald-400/40"
                            : isRedDate && isCurMonth
                            ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-300"
                            : isCurMonth
                            ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400"
                            : "border-transparent bg-slate-50/50 dark:bg-slate-950/40 opacity-40"
                        }`}
                      >
                        {/* Header Sel: Angka Tanggal + Badge Bus */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs sm:text-sm font-black w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-colors ${
                              isToday
                                ? "bg-emerald-600 text-white shadow-xs"
                                : isSelected
                                ? "bg-blue-600 text-white shadow-xs"
                                : isRedDate
                                ? "text-rose-600 dark:text-rose-400 font-black bg-rose-100/60 dark:bg-rose-950"
                                : isCurMonth
                                ? "text-slate-900 dark:text-slate-100"
                                : "text-slate-400"
                            }`}
                          >
                            {format(day, "d")}
                          </span>

                          {hasTrips && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                              {dayTrips.length} Bus
                            </span>
                          )}
                        </div>

                        {/* Indikator Hari Libur / Tanggal Merah */}
                        {holiday && isCurMonth && (
                          <div
                            className="mt-1 px-1 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[8px] sm:text-[9px] font-black truncate border border-rose-300 dark:border-rose-800"
                            title={holiday.name}
                          >
                            🔴 {holiday.name}
                          </div>
                        )}

                        {/* Indikator Rute / Trip yang Berlangsung */}
                        <div className="space-y-1 mt-1 overflow-hidden">
                          {dayTrips.slice(0, 2).map((t) => {
                            const st = getTripStatus(t);
                            return (
                              <div
                                key={t.id}
                                className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded truncate ${
                                  st === "berlangsung"
                                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                    : st === "mendatang"
                                    ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                                title={`${t.nama_trip} (${t.tujuan})`}
                              >
                                {t.tujuan || t.nama_trip}
                              </div>
                            );
                          })}
                          {dayTrips.length > 2 && (
                            <div className="text-[8px] font-black text-blue-600 dark:text-blue-400 pl-0.5">
                              +{dayTrips.length - 2} trip lagi
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend Penjelasan Warna Kalender */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    <span>Tanggal Merah (Minggu & Libur Nasional)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span>Trip Berlangsung</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>Trip Mendatang</span>
                  </div>
                </div>
              </div>

              {/* Inspector Jadwal Hari Terpilih (Sisi Kanan) */}
              <div className="lg:col-span-4 space-y-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-xs space-y-3.5">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">
                      Rincian Keberangkatan & Operasional
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white capitalize mt-0.5">
                      {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: localeId })}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      {tripsOnSelectedDate.length} trip keberangkatan tercatat pada tanggal ini
                    </p>
                  </div>

                  {/* KARTU SPESIAL TANGGAL MERAH / HARI LIBUR NASIONAL */}
                  {selectedDateEval.holiday && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/60 dark:to-amber-950/40 border-2 border-rose-300 dark:border-rose-800 shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white tracking-wider uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          {selectedDateEval.holiday.type === "cuti_bersama" ? "Cuti Bersama Resmi" : "Tanggal Merah Nasional"}
                        </span>
                        {selectedDateEval.holiday.isPeakSeason && (
                          <Badge className="bg-amber-500 text-white text-[9px] font-black gap-1">
                            <Flame className="w-3 h-3" />
                            Peak Season
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                        {selectedDateEval.holiday.name}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedDateEval.holiday.description || "Periode liburan nasional dengan lonjakan pemesanan bus pariwisata. Pastikan ketersediaan armada bus & DP destinasi."}
                      </p>
                    </div>
                  )}

                  {/* KARTU HARI MINGGU (Jika bukan libur nasional khusus) */}
                  {selectedDateEval.isSunday && !selectedDateEval.holiday && (
                    <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 space-y-1 text-xs">
                      <div className="font-black flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                        <span>Tanggal Merah: Hari Minggu</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                        Puncak akhir pekan untuk paket One Day Tour (ODT), wisata keluarga, dan ziarah religi.
                      </p>
                    </div>
                  )}

                  {/* DAFTAR TRIP PADA TANGGAL INI */}
                  {tripsOnSelectedDate.length === 0 ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <Bus className="w-6 h-6 text-slate-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Belum ada jadwal trip pada tanggal ini.
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {selectedDateEval.isRedDate
                            ? "Tanggal merah ini memiliki peluang besar untuk dibuatkan paket open trip!"
                            : "Klik tombol di bawah untuk membuat jadwal keberangkatan baru."}
                        </p>
                      </div>
                      {canManageTrips && (
                        <Button
                          size="sm"
                          onClick={() => createTripOnDate(selectedDate)}
                          className="h-9 px-4 text-xs font-black rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          Jadwalkan Trip di Tanggal Ini
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {tripsOnSelectedDate.map((trip) => {
                        const st = getTripStatus(trip);
                        return (
                          <div
                            key={trip.id}
                            className="p-3.5 rounded-xl border border-slate-300/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3 hover:border-blue-500 transition-all shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                                  {trip.nama_trip}
                                </h4>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                                  <span className="truncate">{trip.tujuan}</span>
                                </p>
                              </div>

                              <span
                                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${
                                  st === "berlangsung"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
                                    : st === "mendatang"
                                    ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200"
                                    : "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200"
                                }`}
                              >
                                {st === "berlangsung" ? "Berlangsung" : st === "mendatang" ? "Akan Datang" : "Selesai"}
                              </span>
                            </div>

                            {/* Info Armada, Nopol & Kru Lapangan */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <div>
                                <span className="text-slate-500 block font-bold text-[10px]">Armada & Nopol</span>
                                <span className="font-black text-slate-900 dark:text-slate-100 truncate block">
                                  {trip.nama_kendaraan || "Big Bus"}
                                  {trip.nomor_polisi ? ` (${trip.nomor_polisi})` : ""}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block font-bold text-[10px]">Driver / TL</span>
                                <span className="font-black text-slate-900 dark:text-slate-100 truncate block">
                                  {trip.nama_driver || "Tim Kru"}
                                </span>
                              </div>
                            </div>

                            {/* Tombol Aksi Buka Rundown */}
                            <Button
                              size="sm"
                              onClick={() => openTripDetail(trip.id)}
                              className="w-full h-9 text-xs font-black rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white gap-1.5 shadow-sm"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Buka Rundown Acara</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================
                TAMPILAN 2: DAFTAR KRONOLOGIS TIMELINE JADWAL
            ========================================================= */
            <div className="space-y-3">
              {filteredTrips.length === 0 ? (
                <div className="p-12 text-center text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-2xs">
                  Tidak ada data trip yang cocok dengan pencarian Anda.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredTrips.map((trip) => {
                    const st = getTripStatus(trip);
                    const tripDate = parseISO(trip.tanggal);
                    const tripRedEval = evaluateRedDate(tripDate);

                    return (
                      <div
                        key={trip.id}
                        className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-3.5 shadow-xs hover:border-blue-500 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                              {trip.nama_trip}
                            </h3>
                            <span
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${
                                st === "berlangsung"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
                                  : st === "mendatang"
                                  ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200"
                                  : "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {st === "berlangsung" ? "Berlangsung" : st === "mendatang" ? "Akan Datang" : "Selesai"}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                            <span className="truncate">{trip.tujuan}</span>
                          </p>

                          {tripRedEval.holiday && (
                            <div className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[11px] font-black border border-rose-200 dark:border-rose-900 truncate">
                              🔴 {tripRedEval.holiday.name}
                            </div>
                          )}

                          <div className="text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 font-medium">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-bold">Tanggal:</span>
                              <span className={`font-black ${tripRedEval.isRedDate ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>
                                {format(tripDate, "EEEE, dd MMM yyyy", { locale: localeId })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-bold">Armada:</span>
                              <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                {trip.nama_kendaraan || "Big Bus"}
                                {trip.nomor_polisi ? ` (${trip.nomor_polisi})` : ""}
                              </span>
                            </div>
                            {trip.nama_driver && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-bold">Sopir / TL:</span>
                                <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                  {trip.nama_driver}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => openTripDetail(trip.id)}
                          className="w-full h-9 text-xs font-black rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white gap-1.5 shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Buka Rundown Acara</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </AuthGuard>
  );
};

export default Trips;
