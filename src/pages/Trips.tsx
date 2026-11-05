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
  ListFilter,
  CheckCircle2,
  AlertCircle,
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-12 lg:pl-64 font-sans text-slate-900 dark:text-slate-100">
        <div className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 space-y-4">
          {/* Header Kalender */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  <span>Kalender & Jadwal Keberangkatan</span>
                </h1>
                <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200">
                  {filteredTrips.length} Total Trip
                </Badge>
                {(() => {
                  const ent = getCurrentEntitlements();
                  const full = trips.length >= ent.maxActiveTrips;
                  return (
                    <Badge variant="outline" className={`text-[11px] font-mono ${full ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 font-bold" : "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200"}`}>
                      Kuota: {trips.length} / {ent.maxActiveTrips >= 9000 ? "∞ Unlimited" : `${ent.maxActiveTrips} Max`}
                    </Badge>
                  );
                })()}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Pantau ketersediaan tanggal, jadwal keberangkatan armada bus, dan rute perjalanan.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "calendar"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Kalender
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "list"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Daftar
                </button>
              </div>

              {canManageTrips && (
                <Button
                  size="sm"
                  onClick={() => {
                    const ent = getCurrentEntitlements();
                    if (trips.length >= ent.maxActiveTrips) {
                      toast.error(`Batas kuota trip aktif (${ent.maxActiveTrips} trip) telah tercapai. Hubungi Super Admin / Founder untuk menambah kuota!`);
                      return;
                    }
                    navigate("/trips/new");
                  }}
                  className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Trip</span>
                </Button>
              )}
            </div>
          </div>

          {/* Navigasi Bulan & Kolom Pencarian */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevMonth}
                  className="h-8 w-8 rounded-xl"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextMonth}
                  className="h-8 w-8 rounded-xl"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white capitalize min-w-36">
                {format(currentMonth, "MMMM yyyy", { locale: localeId })}
              </h2>

              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="h-8 px-2.5 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                Hari Ini
              </Button>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari trip, armada, atau tujuan..."
                className="pl-8 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          {viewMode === "calendar" ? (
            /* =========================================================
                TAMPILAN 1: GRID KALENDER BULANAN + INSPECTOR HARI
            ========================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Kalender Grid (7 Kolom) */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xs">
                {/* Header Hari (Sen - Min) */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] sm:text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                  {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Sel Tanggal */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-2">
                  {calendarDays.map((day, idx) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const isCurMonth = isSameMonth(day, currentMonth);
                    const dayTrips = filteredTrips.filter((t) => isTripOnDay(t, day));
                    const hasTrips = dayTrips.length > 0;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(day)}
                        className={`min-h-16 sm:min-h-20 p-1 sm:p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs"
                            : isToday
                            ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/20"
                            : isCurMonth
                            ? "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                            : "border-transparent bg-slate-50/50 dark:bg-slate-950/40 opacity-40"
                        }`}
                      >
                        {/* Angka Tanggal */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                              isToday
                                ? "bg-emerald-600 text-white"
                                : isSelected
                                ? "bg-blue-600 text-white"
                                : isCurMonth
                                ? "text-slate-800 dark:text-slate-200"
                                : "text-slate-400"
                            }`}
                          >
                            {format(day, "d")}
                          </span>

                          {hasTrips && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {dayTrips.length} Bus
                            </span>
                          )}
                        </div>

                        {/* Indikator Rute / Trip */}
                        <div className="space-y-0.5 mt-1 overflow-hidden">
                          {dayTrips.slice(0, 2).map((t) => {
                            const st = getTripStatus(t);
                            return (
                              <div
                                key={t.id}
                                className={`text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded truncate ${
                                  st === "berlangsung"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : st === "mendatang"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                                title={`${t.nama_trip} (${t.tujuan})`}
                              >
                                {t.tujuan || t.nama_trip}
                              </div>
                            );
                          })}
                          {dayTrips.length > 2 && (
                            <div className="text-[8px] font-bold text-blue-600 dark:text-blue-400 pl-0.5">
                              +{dayTrips.length - 2} lagi
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inspector Jadwal Hari Terpilih (Sisi Kanan di Desktop) */}
              <div className="lg:col-span-4 space-y-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                      Rincian Keberangkatan
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white capitalize">
                      {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: localeId })}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tripsOnSelectedDate.length} trip keberangkatan tercatat pada tanggal ini
                    </p>
                  </div>

                  {tripsOnSelectedDate.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <Bus className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        Tidak ada jadwal trip pada tanggal ini.
                      </p>
                      {canManageTrips && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate("/trips/new")}
                          className="h-8 text-xs font-semibold rounded-xl"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
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
                            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5 hover:border-blue-400 transition-all shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                                  {trip.nama_trip}
                                </h4>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span className="truncate">{trip.tujuan}</span>
                                </p>
                              </div>

                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${
                                  st === "berlangsung"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : st === "mendatang"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {st === "berlangsung" ? "Berlangsung" : st === "mendatang" ? "Akan Datang" : "Selesai"}
                              </span>
                            </div>

                            {/* Info Armada & Penumpang */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                              <div>
                                <span className="text-slate-400 block font-medium">Armada Bus</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                  {trip.nama_kendaraan || "Big Bus"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-medium">Sopir / Kru</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                  {trip.nama_driver || "Tim Kru"}
                                </span>
                              </div>
                            </div>

                            {/* Tombol Aksi Buka Rundown */}
                            <Button
                              size="sm"
                              onClick={() => openTripDetail(trip.id)}
                              className="w-full h-8 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white gap-1.5 shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
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
                <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  Tidak ada data trip yang cocok dengan pencarian.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredTrips.map((trip) => {
                    const st = getTripStatus(trip);
                    return (
                      <div
                        key={trip.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-2xs hover:border-blue-400 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                              {trip.nama_trip}
                            </h3>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${
                                st === "berlangsung"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : st === "mendatang"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {st === "berlangsung" ? "Berlangsung" : st === "mendatang" ? "Akan Datang" : "Selesai"}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{trip.tujuan}</span>
                          </p>

                          <div className="text-[11px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-medium">Tanggal:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {format(parseISO(trip.tanggal), "dd MMM yyyy", { locale: localeId })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-medium">Armada:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {trip.nama_kendaraan || "Big Bus"}
                              </span>
                            </div>
                            {trip.nama_driver && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-medium">Sopir:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {trip.nama_driver}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => openTripDetail(trip.id)}
                          className="w-full h-8 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
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
