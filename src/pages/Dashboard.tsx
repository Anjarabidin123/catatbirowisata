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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser, clearAuthCache } from "@/utils/authHelper";
import { clearBiroProfileCache, getLocalBiroProfile } from "@/utils/biroProfile";
import { scheduleTripNotifications, setupNotificationListeners } from "@/utils/tripNotifications";
import { useRole } from "@/contexts/RoleContext";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { ReminderDialog } from "@/components/ReminderDialog";
import { NotificationPermission } from "@/components/NotificationPermission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

/**
 * Trip aktif utama (dipakai modul lain): berlangsung -> mendatang terdekat -> riwayat terakhir.
 */
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
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  mendatang: {
    label: "Mendatang",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  selesai: {
    label: "Selesai",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { isPemilik, isKru, toggleRole, hasPermission, isTripAllowedForActiveCrew, activeCrew } = useRole();
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
  const [profileName] = useState(() => getLocalBiroProfile().nama_biro);

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

    const channel = supabase
      .channel("dashboard-reminders")
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  const sections = useMemo(() => {
    const today = todayString();
    const q = query.trim().toLowerCase();
    const matches = visibleTrips.filter((t) => {
      if (filter !== "semua" && getTripStatus(t, today) !== filter) return false;
      if (!q) return true;
      return (
        t.nama_trip.toLowerCase().includes(q) ||
        t.tujuan.toLowerCase().includes(q) ||
        (t.nama_driver || "").toLowerCase().includes(q)
      );
    });

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
  }, [visibleTrips, query, filter]);

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

  const openTrip = (tripId: string) => {
    localStorage.setItem("active_trip_id", tripId);
    navigate(`/trips/${tripId}`, { state: { activeTab: "rundown" } });
  };

  return (
    <AuthGuard>
      <NotificationPermission />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 safe-top lg:pl-64">
        <div className="max-w-md lg:max-w-3xl mx-auto px-3 pt-3 space-y-3">
          {/* Header ringkas */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                {profileName}
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                {isPemilik ? "Pemilik Biro" : `${activeCrew.nama} • ${activeCrew.jabatan}`}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
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

          {/* Ringkasan keuangan 1 baris (khusus yang berhak) */}
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
              <span className={stats.laba >= 0 ? "text-emerald-600" : "text-rose-600"}>
                Laba <b>{rupiah(stats.laba)}</b>
              </span>
            </button>
          )}

          {/* Cari + trip baru */}
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

          {/* Filter */}
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

          {/* Daftar trip */}
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

        <BottomNav />
      </div>
      <ReminderDialog open={showReminder} onOpenChange={setShowReminder} />
    </AuthGuard>
  );
};

export default Dashboard;
