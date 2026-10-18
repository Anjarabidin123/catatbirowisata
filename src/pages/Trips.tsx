import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { TripExpandableCard } from "@/components/TripExpandableCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error: any) {
      console.error("Error loading trips:", error);
    } finally {
      setLoading(false);
    }
  };


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
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-lg mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Trip & Destinasi</h1>

          <Tabs defaultValue="trips" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="trips">Daftar Trip</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="trips" className="mt-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Trip Mendatang</h2>
                <Button
                  onClick={() => navigate("/trips/new")}
                  className="gradient-primary text-white"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
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
                  <Button
                    onClick={() => navigate("/trips/new")}
                    className="gradient-primary text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Trip
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTrips).map(([monthYear, monthTrips]) => (
                    <div key={monthYear}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">
                        {monthYear}
                      </h3>
                      <div className="space-y-3">
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
                      <div className="space-y-3">
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
