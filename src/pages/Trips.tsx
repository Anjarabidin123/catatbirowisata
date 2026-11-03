import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { TripExpandableCard } from "@/components/TripExpandableCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ShieldCheck, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useRole } from "@/contexts/RoleContext";

interface Trip {
  id: string;
  nama_trip: string;
  tanggal: string;
  tujuan: string;
  catatan: string | null;
  nama_kendaraan?: string;
  jumlah_penumpang?: number;
}


const Trips = () => {
  const navigate = useNavigate();
  const { isPemilik, isKru, activeCrew, roleName, hasPermission, isTripAllowedForActiveCrew } = useRole();
  const canManageTrips = hasPermission("rule_hapus_buat_trip");
  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const cached = localStorage.getItem("catatbiro_cached_trips");
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem("catatbiro_cached_trips");
      if (cached && JSON.parse(cached).length > 0) return false;
    } catch {}
    return true;
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadTrips();

    const tripsChannel = supabase
      .channel("trips-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => loadTrips()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tripsChannel);
    };
  }, []);

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
  }, [isPemilik, activeCrew?.crewId]);


  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTrips = trips.filter((trip) => new Date(trip.tanggal) >= today);
  const pastTrips = trips.filter((trip) => new Date(trip.tanggal) < today);

  const filteredTrips = upcomingTrips.filter((trip) => {
    const query = searchQuery.toLowerCase();
    const matchName = trip.nama_trip.toLowerCase().includes(query);
    const matchTujuan = trip.tujuan.toLowerCase().includes(query);
    const matchDate = format(new Date(trip.tanggal), "dd MMMM yyyy", { locale: id })
      .toLowerCase()
      .includes(query);
    return matchName || matchTujuan || matchDate;
  });

  const filteredPastTrips = pastTrips.filter((trip) => {
    const query = searchQuery.toLowerCase();
    const matchName = trip.nama_trip.toLowerCase().includes(query);
    const matchTujuan = trip.tujuan.toLowerCase().includes(query);
    const matchDate = format(new Date(trip.tanggal), "dd MMMM yyyy", { locale: id })
      .toLowerCase()
      .includes(query);
    return matchName || matchTujuan || matchDate;
  });

  // Group upcoming trips by month and year (oldest first)
  const groupedTrips = filteredTrips
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
    .reduce((acc, trip) => {
      const monthYear = format(new Date(trip.tanggal), "MMMM yyyy", { locale: id });
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(trip);
      return acc;
    }, {} as Record<string, Trip[]>);

  // Group past trips by month and year (newest first for reports)
  const groupedPastTrips = filteredPastTrips
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
    .reduce((acc, trip) => {
      const monthYear = format(new Date(trip.tanggal), "MMMM yyyy", { locale: id });
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(trip);
      return acc;
    }, {} as Record<string, Trip[]>);


  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top lg:pl-64">
        <div className="max-w-lg lg:max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span>{isPemilik ? "Manajemen Trip & Armada" : "Jadwal Tugas Trip Lapangan"}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    isPemilik ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {roleName}
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPemilik
                  ? "Kelola seluruh jadwal keberangkatan, alokasi armada bus, dan riwayat trip biro"
                  : "Daftar penugasan keberangkatan rombongan, rundown, dan kesiapan operasional lapangan"}
              </p>
            </div>
          </div>

          {isKru && (
            <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
              <span className="text-blue-800 dark:text-blue-200 font-medium">
                Mode Kru: Menampilkan {trips.length} trip yang secara spesifik ditugaskan kepada <strong>{activeCrew.nama} ({activeCrew.jabatan})</strong>.
              </span>
            </div>
          )}

          <Tabs defaultValue="trips" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="trips">
                {isPemilik ? "Daftar Trip Aktif" : "Tugas Keberangkatan"}
              </TabsTrigger>
              <TabsTrigger value="reports">
                {isPemilik ? "Arsip & Selesai" : "Riwayat Tugas"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trips" className="mt-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Trip Mendatang</h2>
                {canManageTrips && (
                  <Button
                    onClick={() => navigate("/trips/new")}
                    className="gradient-primary text-white"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Trip
                  </Button>
                )}
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  inputMode="search"
                  placeholder="Cari nama trip, tujuan, atau tanggal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
                </div>
              ) : filteredTrips.length === 0 && searchQuery ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Tidak ada trip yang cocok dengan pencarian</p>
                </div>
              ) : trips.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Belum ada trip</p>
                  {canManageTrips && (
                    <Button
                      onClick={() => navigate("/trips/new")}
                      className="gradient-primary text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Trip
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTrips).map(([monthYear, monthTrips]) => (
                    <div key={monthYear}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">
                        {monthYear}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {monthTrips.map((trip) => (
                          <TripExpandableCard
                            key={trip.id}
                            trip={trip}
                            onClick={() => navigate(`/trips/${trip.id}`)}
                            onTripUpdated={loadTrips}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reports" className="mt-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Trip Selesai</h2>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  inputMode="search"
                  placeholder="Cari nama trip, tujuan, atau tanggal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
                </div>
              ) : filteredPastTrips.length === 0 && searchQuery ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Tidak ada trip yang cocok dengan pencarian</p>
                </div>
              ) : pastTrips.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Belum ada trip yang selesai</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedPastTrips).map(([monthYear, monthTrips]) => (
                    <div key={monthYear}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">
                        {monthYear}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {monthTrips.map((trip) => (
                          <TripExpandableCard
                            key={trip.id}
                            trip={trip}
                            onClick={() => navigate(`/trips/${trip.id}`)}
                            onTripUpdated={loadTrips}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default Trips;
