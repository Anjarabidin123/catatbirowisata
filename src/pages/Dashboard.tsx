import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import {
  Bell,
  Bus,
  Calendar,
  ChevronRight,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
  ArrowRightLeft,
  Settings,
  Pencil,
  Clock,
  Wallet,
  TrendingUp,
  FileText,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser, clearAuthCache } from "@/utils/authHelper";
import { clearBiroProfileCache, getLocalBiroProfile, fetchBiroProfile, BiroProfile } from "@/utils/biroProfile";
import { getBiroCmsData, BiroCmsData } from "@/utils/biroCmsStore";
import { scheduleTripNotifications, setupNotificationListeners } from "@/utils/tripNotifications";
import { useRole } from "@/contexts/RoleContext";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { ReminderDialog } from "@/components/ReminderDialog";
import { NotificationPermission } from "@/components/NotificationPermission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SystemBroadcastBanner } from "@/components/SystemBroadcastBanner";

interface Trip {
  id: string;
  nama_trip: string;
  tanggal: string;
  tanggal_selesai: string | null;
  tujuan: string;
  nama_kendaraan?: string | null;
  nomor_polisi?: string | null;
  nama_driver?: string | null;
  jumlah_penumpang?: number | null;
  budget_estimasi?: number | null;
  catatan?: string | null;
}

type TripStatus = "berlangsung" | "mendatang" | "selesai";
type FilterKey = "semua" | TripStatus;

const todayString = () => format(new Date(), "yyyy-MM-dd");

const getTripStatus = (t: Trip, today = todayString()): TripStatus => {
  const end = t.tanggal_selesai || t.tanggal;
  if (t.tanggal <= today && end >= today) return "berlangsung";
  if (t.tanggal > today) return "mendatang";
  return "selesai";
};

export const determineActiveTrip = (trips: Trip[], preferredTripId?: string): Trip | null => {
  if (!trips || trips.length === 0) return null;

  if (preferredTripId) {
    const matched = trips.find((t) => t.id === preferredTripId);
    if (matched) return matched;
  }

  const today = todayString();
  const ongoing = trips.filter((t) => getTripStatus(t, today) === "berlangsung");
  if (ongoing.length > 0) {
    return [...ongoing].sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0];
  }

  const upcoming = trips
    .filter((t) => getTripStatus(t, today) === "mendatang")
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  if (upcoming.length > 0) return upcoming[0];

  const past = trips
    .filter((t) => getTripStatus(t, today) === "selesai")
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  return past[0] || trips[0];
};

const STATUS_STYLE: Record<TripStatus, { label: string; className: string }> = {
  berlangsung: {
    label: "Berlangsung",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-extrabold",
  },
  mendatang: {
    label: "Mendatang",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700 font-extrabold",
  },
  selesai: {
    label: "Selesai",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-extrabold",
  },
};

const SECTION_TITLE: Record<TripStatus, string> = {
  berlangsung: "Sedang Berlangsung",
  mendatang: "Akan Datang",
  selesai: "Sudah Lewat",
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "berlangsung", label: "Berlangsung" },
  { key: "mendatang", label: "Mendatang" },
  { key: "selesai", label: "Selesai" },
];

const formatRange = (t: Trip) => {
  const start = format(new Date(t.tanggal), "dd MMM yyyy", { locale: localeId });
  if (t.tanggal_selesai && t.tanggal_selesai !== t.tanggal) {
    return `${start} - ${format(new Date(t.tanggal_selesai), "dd MMM yyyy", { locale: localeId })}`;
  }
  return start;
};

const rupiah = (n: number) => `Rp ${Math.floor(n).toLocaleString("id-ID")}`;

const getDaysDifference = (targetDateStr: string) => {
  try {
    const target = new Date(targetDateStr);
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - now.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { isPemilik, isKru, toggleRole, hasPermission, isTripAllowedForActiveCrew, activeCrew, crewList } = useRole();
  const canSeeFinancials = hasPermission("rule_buku_kas_laba");
  const canManageTrips = hasPermission("rule_hapus_buat_trip");

  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const cached = localStorage.getItem("catatbiro_cached_trips");
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(trips.length === 0);
  const [reminderCount, setReminderCount] = useState(0);
  const [showReminder, setShowReminder] = useState(false);
  const [stats, setStats] = useState(() => {
    try {
      const cached = localStorage.getItem("catatbiro_cached_stats");
      if (cached) return JSON.parse(cached) as { pemasukan: number; pengeluaran: number; laba: number };
    } catch {}
    return { pemasukan: 0, pengeluaran: 0, laba: 0 };
  });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("semua");
  const [profile, setProfile] = useState<BiroProfile>(() => getLocalBiroProfile());
  const [cmsData, setCmsData] = useState<BiroCmsData>(() => getBiroCmsData());

  const loadData = async () => {
    try {
      const activeUser = await getActiveUser();
      if (!activeUser) {
        navigate("/auth");
        return;
      }

      const [tripsRes, remindersRes, keuanganRes] = await Promise.all([
        supabase.from("trips").select("*").order("tanggal", { ascending: false }),
        supabase.from("reminders").select("id, is_done").eq("is_done", false),
        supabase.from("keuangan").select("jumlah, jenis"),
      ]);

      if (tripsRes.error) {
        const msg = tripsRes.error.message || "";
        if (tripsRes.error.code === "PGRST301" || msg.includes("JWT expired")) {
          try {
            localStorage.removeItem("sb-xirxglkwojgbzjyhhdhm-auth-token");
          } catch {}
          toast.error("Sesi Anda telah kedaluwarsa. Silakan masuk kembali.");
          navigate("/auth");
          return;
        }
        throw new Error(msg || "Gagal mengambil data trip");
      }

      const all = (tripsRes.data || []) as Trip[];
      try {
        localStorage.setItem("catatbiro_cached_trips", JSON.stringify(all));
      } catch {}
      setTrips(all);

      if (!remindersRes.error && remindersRes.data) {
        setReminderCount(remindersRes.data.length);
      }

      if (!keuanganRes.error && keuanganRes.data) {
        let pemasukan = 0;
        let pengeluaran = 0;
        keuanganRes.data.forEach((row: any) => {
          if (row.jenis === "pemasukan") pemasukan += Number(row.jumlah || 0);
          else if (row.jenis === "pengeluaran") pengeluaran += Number(row.jumlah || 0);
        });
        const next = { pemasukan, pengeluaran, laba: pemasukan - pengeluaran };
        setStats(next);
        try {
          localStorage.setItem("catatbiro_cached_stats", JSON.stringify(next));
        } catch {}
      }

      if (Capacitor.isNativePlatform() && all.length > 0) {
        all.forEach((t) => scheduleTripNotifications(t as any));
      }
    } catch (error: any) {
      console.error("[Dashboard] loadData error:", error);
      toast.error(`Gagal memuat data: ${error?.message || "Terjadi kesalahan"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setupNotificationListeners();

    fetchBiroProfile().then(setProfile);

    const channel = supabase
      .channel("dashboard-reminders")
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, () => loadData())
      .subscribe();

    const onProfileUpdate = (e: any) => {
      if (e.detail) setProfile(e.detail);
    };
    const onCmsUpdate = (e: any) => {
      if (e.detail) setCmsData(e.detail);
    };

    window.addEventListener("biro-profile-updated", onProfileUpdate);
    window.addEventListener("biro-cms-updated", onCmsUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("biro-profile-updated", onProfileUpdate);
      window.removeEventListener("biro-cms-updated", onCmsUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPemilik, activeCrew?.crewId]);

  // RBAC: pemilik melihat semua trip, kru hanya trip yang ditugaskan
  const visibleTrips = useMemo(
    () => (isPemilik ? trips : trips.filter((t) => isTripAllowedForActiveCrew(t))),
    [trips, isPemilik, isTripAllowedForActiveCrew]
  );

  // Breakdown status counts
  const { ongoingCount, upcomingCount, pastCount } = useMemo(() => {
    const today = todayString();
    let ongoing = 0;
    let upcoming = 0;
    let past = 0;
    visibleTrips.forEach((t) => {
      const st = getTripStatus(t, today);
      if (st === "berlangsung") ongoing++;
      else if (st === "mendatang") upcoming++;
      else past++;
    });
    return { ongoingCount: ongoing, upcomingCount: upcoming, pastCount: past };
  }, [visibleTrips]);

  // Trips happening today (live operations)
  const todayTrips = useMemo(() => {
    const today = todayString();
    return visibleTrips.filter((t) => {
      const end = t.tanggal_selesai || t.tanggal;
      return t.tanggal <= today && end >= today;
    });
  }, [visibleTrips]);

  // Trips scheduled in current month
  const thisMonthTrips = useMemo(() => {
    const currentMonthStr = format(new Date(), "yyyy-MM");
    return visibleTrips.filter((t) => {
      return (
        t.tanggal.startsWith(currentMonthStr) ||
        (t.tanggal_selesai && t.tanggal_selesai.startsWith(currentMonthStr))
      );
    });
  }, [visibleTrips]);

  // Total passengers across visible trips
  const totalPassengers = useMemo(() => {
    return visibleTrips.reduce((acc, t) => acc + (t.jumlah_penumpang || 0), 0);
  }, [visibleTrips]);

  // Unique buses and drivers
  const uniqueBusesCount = useMemo(() => {
    const set = new Set<string>();
    visibleTrips.forEach((t) => {
      if (t.nama_kendaraan?.trim()) set.add(t.nama_kendaraan.trim().toLowerCase());
    });
    return set.size;
  }, [visibleTrips]);

  const uniqueDriversCount = useMemo(() => {
    const set = new Set<string>();
    visibleTrips.forEach((t) => {
      if (t.nama_driver?.trim()) set.add(t.nama_driver.trim().toLowerCase());
    });
    return set.size;
  }, [visibleTrips]);

  // Profit margin percentage
  const profitMargin = useMemo(() => {
    if (!stats.pemasukan || stats.pemasukan === 0) return "0";
    return ((stats.laba / stats.pemasukan) * 100).toFixed(1);
  }, [stats.laba, stats.pemasukan]);

  // Imminent departures (next 4 upcoming trips)
  const upcomingDepartures = useMemo(() => {
    const today = todayString();
    return visibleTrips
      .filter((t) => {
        const st = getTripStatus(t, today);
        return st === "mendatang" || st === "berlangsung";
      })
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      .slice(0, 4);
  }, [visibleTrips]);

  // Filtered trips for grid search and status filter
  const filteredTrips = useMemo(() => {
    const today = todayString();
    const q = query.trim().toLowerCase();
    return visibleTrips.filter((t) => {
      if (filter !== "semua" && getTripStatus(t, today) !== filter) return false;
      if (!q) return true;
      return (
        t.nama_trip.toLowerCase().includes(q) ||
        t.tujuan.toLowerCase().includes(q) ||
        (t.nama_kendaraan || "").toLowerCase().includes(q) ||
        (t.nomor_polisi || "").toLowerCase().includes(q) ||
        (t.nama_driver || "").toLowerCase().includes(q)
      );
    });
  }, [visibleTrips, query, filter]);

  // Mobile grouped sections
  const sections = useMemo(() => {
    const today = todayString();
    const matches = filteredTrips;

    const berlangsung = matches
      .filter((t) => getTripStatus(t, today) === "berlangsung")
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const mendatang = matches
      .filter((t) => getTripStatus(t, today) === "mendatang")
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const selesai = matches
      .filter((t) => getTripStatus(t, today) === "selesai")
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    return [
      { status: "berlangsung" as TripStatus, items: berlangsung },
      { status: "mendatang" as TripStatus, items: mendatang },
      { status: "selesai" as TripStatus, items: selesai },
    ].filter((s) => s.items.length > 0);
  }, [filteredTrips]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
    } finally {
      clearAuthCache();
      clearBiroProfileCache();
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("sb-") || key.includes("supabase") || key === "active_trip_id")) {
            keys.push(key);
          }
        }
        keys.forEach((k) => localStorage.removeItem(k));
      } catch {}
      toast.success("Berhasil keluar dari akun");
      navigate("/auth");
    }
  };

  const openTrip = (tripId: string, tab = "rundown") => {
    localStorage.setItem("active_trip_id", tripId);
    navigate(`/trips/${tripId}`, { state: { activeTab: tab } });
  };

  return (
    <AuthGuard>
      <NotificationPermission />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-12 safe-top lg:pl-64">
        {/* Global System Broadcast & Maintenance Banner */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3">
          <SystemBroadcastBanner />
        </div>

        {/* ========================================================
            TAMPILAN MOBILE (< lg) - Cepat, Ringkas, Ramah Lapangan
            ======================================================== */}
        <div className="lg:hidden max-w-md mx-auto px-3 pt-3 space-y-3">
          {/* Header ringkas mobile */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate(isPemilik ? "/pengaturan-biro" : "/dashboard")}
              className="min-w-0 text-left group cursor-pointer focus:outline-hidden"
              title={isPemilik ? "Klik untuk mengedit Profil & Rekening Biro" : undefined}
            >
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white truncate leading-tight group-hover:text-blue-600 transition-colors">
                  {profile.nama_biro}
                </h1>
                {isPemilik && (
                  <Pencil className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {isPemilik ? "Pemilik Biro • Edit Profil" : `${activeCrew.nama} • ${activeCrew.jabatan}`}
              </p>
            </button>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isPemilik && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/pengaturan-biro")}
                  className="h-8 w-8 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit Profil & Rekening Biro"
                >
                  <Settings className="w-4 h-4 text-blue-600" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={loadData}
                className="h-8 w-8 rounded-xl"
                title="Segarkan"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReminder(true)}
                className="relative h-8 w-8 rounded-xl"
                title="Pengingat"
              >
                <Bell className="w-4 h-4" />
                {reminderCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0.5 text-[10px] bg-red-500 text-white rounded-full">
                    {reminderCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRole}
                className="h-8 w-8 rounded-xl"
                title={isKru ? "Pindah ke mode Pemilik" : "Pindah ke mode Kru"}
              >
                <ArrowRightLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-8 w-8 rounded-xl text-red-600"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Ringkasan keuangan 1 baris mobile */}
          {canSeeFinancials && (
            <button
              type="button"
              onClick={() => navigate("/keuangan")}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px]"
            >
              <span className="text-slate-500">
                Omset <b className="text-slate-900 dark:text-white">{rupiah(stats.pemasukan)}</b>
              </span>
              <span className="text-slate-500">
                Beban <b className="text-slate-900 dark:text-white">{rupiah(stats.pengeluaran)}</b>
              </span>
              <span className={stats.laba >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                Laba <b>{rupiah(stats.laba)}</b>
              </span>
            </button>
          )}

          {/* Cari + trip baru mobile */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari trip, tujuan, atau kru..."
                className="pl-8 h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>
            {canManageTrips && (
              <Button
                onClick={() => navigate("/trips/new")}
                size="sm"
                className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1 px-3 flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Trip
              </Button>
            )}
          </div>

          {/* Filter pills mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-3 px-3">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`px-3 h-7 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-colors ${
                    active
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Daftar trip mobile */}
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-200/60 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : sections.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Bus className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {visibleTrips.length === 0
                  ? isKru
                    ? "Belum ada trip yang ditugaskan"
                    : "Belum ada trip"
                  : "Tidak ada trip yang cocok"}
              </p>
              {visibleTrips.length === 0 && isPemilik && canManageTrips && (
                <Button
                  onClick={() => navigate("/trips/new")}
                  size="sm"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Buat Trip Pertama
                </Button>
              )}
            </div>
          ) : (
            sections.map((section) => (
              <section key={section.status} className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {SECTION_TITLE[section.status]}
                  </h2>
                  <span className="text-[11px] text-slate-400">{section.items.length}</span>
                </div>

                {section.items.map((t) => {
                  const st = getTripStatus(t);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openTrip(t.id)}
                      className={`w-full text-left p-3 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs active:scale-[0.99] transition-all flex items-center gap-3 ${
                        st === "berlangsung"
                          ? "border-emerald-300 dark:border-emerald-800"
                          : "border-slate-200/80 dark:border-slate-800"
                      } ${st === "selesai" ? "opacity-80" : ""}`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_STYLE[st].className}`}
                          >
                            {STATUS_STYLE[st].label}
                          </span>
                          {t.jumlah_penumpang ? (
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                              <Users className="w-3 h-3" />
                              {t.jumlah_penumpang}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                          {t.nama_trip}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 flex-shrink-0 text-rose-500" />
                            <span className="truncate capitalize">{t.tujuan}</span>
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Calendar className="w-3 h-3 text-blue-500" />
                            {formatRange(t)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    </button>
                  );
                })}
              </section>
            ))
          )}
        </div>

        {/* ========================================================
            TAMPILAN DESKTOP (lg:block) - Eksekutif, Luas, Informatif
            ======================================================== */}
        <div className="hidden lg:block max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* Top Bar Header Eksekutif Desktop */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              {profile.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.nama_biro}
                  className="w-12 h-12 rounded-2xl object-cover shadow-xs border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                  {profile.nama_biro.charAt(0) || "B"}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    {profile.nama_biro}
                  </h1>
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 py-0.5 px-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Sistem Aktif
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{format(new Date(), "EEEE, dd MMMM yyyy", { locale: localeId })}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {isPemilik ? "Mode Pemilik (Akses Penuh)" : `Kru: ${activeCrew.nama} (${activeCrew.jabatan})`}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRole}
                className="h-9 rounded-xl text-xs font-semibold gap-1.5"
                title="Ganti Mode Akses"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                <span>{isPemilik ? "Pindah ke Kru" : "Pindah ke Pemilik"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReminder(true)}
                className="h-9 rounded-xl text-xs font-semibold gap-1.5 relative"
                title="Buka Pengingat & Tugas"
              >
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <span>Pengingat</span>
                {reminderCount > 0 && (
                  <Badge className="h-4 min-w-4 flex items-center justify-center p-0.5 text-[10px] bg-red-500 text-white rounded-full">
                    {reminderCount}
                  </Badge>
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={loadData}
                className="h-9 w-9 rounded-xl"
                title="Segarkan Data"
              >
                <RefreshCw className="w-4 h-4 text-slate-600" />
              </Button>

              {isPemilik && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/pengaturan-biro")}
                  className="h-9 rounded-xl text-xs font-semibold gap-1.5"
                  title="Pusat Kontrol CMS & Profil Biro"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-600" />
                  <span>CMS Biro</span>
                </Button>
              )}

              {canManageTrips && (
                <Button
                  onClick={() => navigate("/trips/new")}
                  size="sm"
                  className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 px-4 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Buat Trip Baru</span>
                </Button>
              )}
            </div>
          </div>

          {/* 4 Bento Metric Cards Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Bento Card 1: Keuangan & Profitabilitas */}
            <div
              onClick={() => canSeeFinancials && navigate("/keuangan")}
              className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 transition-all ${
                canSeeFinancials ? "hover:border-blue-400 hover:shadow-sm cursor-pointer" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Arus Kas & Laba
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                {canSeeFinancials ? (
                  <>
                    <div className={`text-xl font-black ${stats.laba >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {rupiah(stats.laba)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>Laba Bersih</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                          stats.laba >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        Margin {profitMargin}%
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-base font-bold text-slate-400">Akses Terbatas</div>
                    <p className="text-xs text-slate-400 mt-0.5">Khusus Pengelola Keuangan</p>
                  </>
                )}
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>Omset: <b className="text-slate-800 dark:text-slate-200">{canSeeFinancials ? rupiah(stats.pemasukan) : "Rp ***"}</b></span>
                <span>Beban: <b className="text-slate-800 dark:text-slate-200">{canSeeFinancials ? rupiah(stats.pengeluaran) : "Rp ***"}</b></span>
              </div>
            </div>

            {/* Bento Card 2: Aktivitas Operasional Bulan Ini */}
            <div
              onClick={() => navigate("/trips")}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Operasional Bulan Ini
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {thisMonthTrips.length} <span className="text-sm font-semibold text-slate-400">Trip</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total <b className="text-slate-800 dark:text-slate-200">{totalPassengers}</b> Pax Penumpang Terlayani
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-emerald-600 font-bold">{ongoingCount} Berjalan</span>
                <span className="text-blue-600 font-bold">{upcomingCount} Mendatang</span>
                <span className="text-slate-400 font-bold">{pastCount} Selesai</span>
              </div>
            </div>

            {/* Bento Card 3: Armada Bus & Keberangkatan Hari Ini */}
            <div
              onClick={() => navigate("/trips")}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Armada & Hari Ini
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <Bus className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  {todayTrips.length} <span className="text-sm font-semibold text-slate-400">Trip Hari Ini</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {todayTrips.length > 0 ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Armada aktif bergerak di jalan
                    </span>
                  ) : (
                    <span>Standby untuk jadwal trip berikutnya</span>
                  )}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>{uniqueBusesCount} Unit Bus Terdata</span>
                <span>{uniqueDriversCount} Driver Siap</span>
              </div>
            </div>

            {/* Bento Card 4: Personel Kru & CMS Rekanan */}
            <div
              onClick={() => navigate("/pengaturan-biro")}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-400 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Kru & Jaringan Biro
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {crewList.length} <span className="text-sm font-semibold text-slate-400">Personel Kru</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {cmsData.rekananBus.length} PO Bus • {cmsData.rekananResto.length} Resto Terdaftar
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-teal-600 font-bold">
                <span>Pusat CMS Rekanan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* 2-Column Main Workspace Desktop */}
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Left Column (8 of 12 cols): Operations Hub & Trip Cards */}
            <div className="col-span-8 space-y-5">
              {/* Live Spotlight Banner jika ada trip hari ini */}
              {todayTrips.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-sm flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                        Operasional Hari Ini
                      </span>
                      <span className="text-xs text-emerald-100">
                        {todayTrips.length} trip aktif bergerak
                      </span>
                    </div>
                    <h3 className="text-base font-black tracking-tight">
                      {todayTrips[0].nama_trip}
                    </h3>
                    <p className="text-xs text-emerald-100 flex items-center gap-3">
                      <span>📍 {todayTrips[0].tujuan}</span>
                      {todayTrips[0].nama_kendaraan && <span>🚌 {todayTrips[0].nama_kendaraan}</span>}
                      {todayTrips[0].nama_driver && <span>👤 Kru: {todayTrips[0].nama_driver}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => openTrip(todayTrips[0].id, "operasional")}
                      className="rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold shadow-xs h-9 px-3"
                    >
                      Pantau Kas & Rundown
                    </Button>
                  </div>
                </div>
              )}

              {/* Filter & Search Toolbar Desktop */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Pusat Operasional Jadwal Trip
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pantau pergerakan rombongan, akses rundown cepat, dan kelola arus kas masing-masing trip
                    </p>
                  </div>
                  {canManageTrips && (
                    <Button
                      onClick={() => navigate("/trips/new")}
                      size="sm"
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 px-3 h-8 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Trip
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Cari berdasarkan nama acara, destinasi, armada bus, atau driver..."
                      className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                    />
                    {query && (
                      <button
                        onClick={() => setQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Pills dengan Counter Asli */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex-shrink-0">
                    {FILTERS.map((f) => {
                      const active = filter === f.key;
                      const count =
                        f.key === "semua"
                          ? visibleTrips.length
                          : visibleTrips.filter((t) => getTripStatus(t) === f.key).length;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setFilter(f.key)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            active
                              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <span>{f.label}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              active
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Grid Kartu Trip Desktop (2 Kolom) */}
              {loading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-44 rounded-2xl bg-slate-200/60 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Bus className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {visibleTrips.length === 0 ? "Belum Ada Data Trip" : "Tidak Ada Trip yang Cocok"}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {visibleTrips.length === 0
                        ? "Mulai jadwalkan perjalanan wisata Anda dengan membuat trip baru sekarang."
                        : "Coba ubah kata kunci pencarian atau ganti filter status di atas."}
                    </p>
                  </div>
                  {canManageTrips && (
                    <Button
                      onClick={() => navigate("/trips/new")}
                      size="sm"
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Buat Trip Baru
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
                  {filteredTrips.map((t) => {
                    const st = getTripStatus(t);
                    return (
                      <div
                        key={t.id}
                        className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all hover:shadow-md flex flex-col justify-between group ${
                          st === "berlangsung"
                            ? "border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20"
                            : "border-slate-300/90 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500"
                        } shadow-xs`}
                      >
                        <div className="space-y-3">
                          {/* Card Header: Status & Pax */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${STATUS_STYLE[st].className}`}>
                              {STATUS_STYLE[st].label}
                            </span>
                            {t.jumlah_penumpang && (
                              <span className="flex items-center gap-1.5 text-xs font-extrabold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full">
                                <Users className="w-3.5 h-3.5 text-blue-600" />
                                {t.jumlah_penumpang} Pax
                              </span>
                            )}
                          </div>

                          {/* Title & Destinasi */}
                          <div>
                            <h3
                              onClick={() => openTrip(t.id)}
                              className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-1 leading-snug tracking-tight"
                              title={t.nama_trip}
                            >
                              {t.nama_trip}
                            </h3>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                              <span className="capitalize truncate">
                                {t.tujuan}
                              </span>
                            </p>
                          </div>

                          {/* Meta: Tanggal, Armada, Driver */}
                          <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRange(t)}</span>
                            </div>
                            {t.nama_kendaraan && (
                              <div className="flex items-center gap-2">
                                <Bus className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                <span className="truncate text-slate-800 dark:text-slate-200">
                                  {t.nama_kendaraan} {t.nomor_polisi ? `(${t.nomor_polisi})` : ""}
                                </span>
                              </div>
                            )}
                            {t.nama_driver && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <span className="truncate text-slate-800 dark:text-slate-200">Kru: {t.nama_driver}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tombol Aksi Cepat pada Kartu */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openTrip(t.id, "acuan")}
                            className="flex-1 h-9 text-xs font-bold rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 shadow-2xs"
                          >
                            Rundown
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openTrip(t.id, "operasional")}
                            className="flex-1 h-9 text-xs font-bold rounded-xl text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 shadow-2xs"
                          >
                            Kas & TL
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openTrip(t.id)}
                            className="h-9 w-9 p-0 rounded-xl bg-slate-900 hover:bg-blue-600 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-blue-600 dark:hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                            title="Detail Trip"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column (4 of 12 cols): Widget Jadwal Terdekat, Arus Kas & Pintasan */}
            <div className="col-span-4 space-y-5">
              {/* Widget 1: Jadwal Keberangkatan Terdekat */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Jadwal Terdekat
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate("/trips")}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Kalender →
                  </button>
                </div>

                {upcomingDepartures.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Tidak ada jadwal trip mendatang dalam waktu dekat.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcomingDepartures.map((t) => {
                      const diffDays = getDaysDifference(t.tanggal);
                      const isTodayTrip = diffDays === 0;
                      const isTomorrow = diffDays === 1;

                      return (
                        <div
                          key={t.id}
                          onClick={() => openTrip(t.id)}
                          className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {t.nama_trip}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                isTodayTrip
                                  ? "bg-emerald-100 text-emerald-700 animate-pulse"
                                  : isTomorrow
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {isTodayTrip ? "Hari Ini" : isTomorrow ? "Besok (H-1)" : `H-${diffDays}`}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-between">
                            <span>📍 {t.tujuan}</span>
                            <span>{format(new Date(t.tanggal), "dd MMM yyyy", { locale: localeId })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Widget 2: Kesehatan Arus Kas Mini Bar (jika berhak) */}
              {canSeeFinancials && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Kesehatan Kas Biro
                      </h3>
                    </div>
                    <button
                      onClick={() => navigate("/keuangan")}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Buku Kas →
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Rasio Beban terhadap Omset</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {stats.pemasukan > 0
                          ? Math.min(100, Math.round((stats.pengeluaran / stats.pemasukan) * 100))
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{
                          width: `${
                            stats.pemasukan > 0
                              ? Math.max(0, 100 - Math.round((stats.pengeluaran / stats.pemasukan) * 100))
                              : 0
                          }%`,
                        }}
                      />
                      <div
                        className="bg-rose-500 h-full transition-all duration-500"
                        style={{
                          width: `${
                            stats.pemasukan > 0
                              ? Math.min(100, Math.round((stats.pengeluaran / stats.pemasukan) * 100))
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Laba Bersih
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Beban Biaya
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Widget 3: Pintasan Cepat Eksekutif */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Pusat Navigasi & Kontrol
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    onClick={() => navigate("/trips")}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 text-left transition-all"
                  >
                    <Calendar className="w-4 h-4 text-blue-600 mb-1" />
                    <span>Kalender Bus</span>
                  </button>

                  <button
                    onClick={() => navigate("/pengaturan-biro")}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-slate-800 text-left transition-all"
                  >
                    <Settings className="w-4 h-4 text-indigo-600 mb-1" />
                    <span>CMS Biro</span>
                  </button>

                  <button
                    onClick={() => navigate("/manajemen-kru")}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-slate-800 text-left transition-all"
                  >
                    <Users className="w-4 h-4 text-teal-600 mb-1" />
                    <span>Kru & RBAC</span>
                  </button>

                  <button
                    onClick={() => navigate("/laporan")}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-slate-800 text-left transition-all"
                  >
                    <FileText className="w-4 h-4 text-rose-600 mb-1" />
                    <span>Cetak PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
      <ReminderDialog open={showReminder} onOpenChange={setShowReminder} />
    </AuthGuard>
  );
};

export default Dashboard;
