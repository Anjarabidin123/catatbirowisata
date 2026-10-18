import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Calendar, TrendingUp, TrendingDown, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatRupiah } from "@/lib/utils";

interface Keuangan {
  id: string;
  trip_id: string;
  jenis: string;
  jumlah: number;
  keterangan: string | null;
  tanggal: string;
  trips: {
    nama_trip: string;
  };
}

const Keuangan = () => {
  const navigate = useNavigate();
  const [keuangan, setKeuangan] = useState<Keuangan[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<string>("current");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());

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
      const { data: { user } } = await supabase.auth.getUser();
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
          .order("tanggal", { ascending: false })
      ]);

      if (keuanganRes.error) throw keuanganRes.error;
      if (tripsRes.error) throw tripsRes.error;
      
      setKeuangan(keuanganRes.data || []);
      setTrips(tripsRes.data || []);
    } catch (error: any) {
      console.error("Error loading keuangan:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data by month
  const filteredKeuangan = keuangan.filter((k) => {
    const kDate = new Date(k.tanggal);
    const today = new Date();
    
    if (filterMonth === "current") {
      return kDate.getMonth() === today.getMonth() && kDate.getFullYear() === today.getFullYear();
    } else if (filterMonth === "last") {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return kDate.getMonth() === lastMonth.getMonth() && kDate.getFullYear() === lastMonth.getFullYear();
    }
    return true; // all
  });

  // Calculate completed vs upcoming trips
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const completedTrips = trips.filter(t => new Date(t.tanggal) < today);
  const upcomingTrips = trips.filter(t => new Date(t.tanggal) >= today);

  // Calculate profit/loss per trip (only for filtered month)
  const tripSummaries = Object.entries(
    filteredKeuangan.reduce((acc, item) => {
      if (!acc[item.trip_id]) {
        const trip = trips.find(t => t.id === item.trip_id);
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
  ).map(([_, summary]) => summary)
   .filter((summary) => 
     searchQuery === "" || 
     summary.trip_name.toLowerCase().includes(searchQuery.toLowerCase())
   )
   .sort((a, b) => new Date(b.trip_date).getTime() - new Date(a.trip_date).getTime());

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
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Keuangan</h1>
            <Button
              onClick={() => navigate("/keuangan/new")}
              className="gradient-primary text-white h-9"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Tambah
            </Button>
          </div>

          {/* Compact Filters */}
          <div className="flex gap-2 mb-3">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Bulan Ini</SelectItem>
                <SelectItem value="last">Bulan Lalu</SelectItem>
                <SelectItem value="all">Semua</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari trip..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* Compact Stats Cards */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="ios-card p-3 bg-green-50">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <p className="text-xs text-muted-foreground">Selesai</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{completedTrips.length}</p>
            </div>

            <div className="ios-card p-3 bg-blue-50">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                <p className="text-xs text-muted-foreground">Mendatang</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{upcomingTrips.length}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
            </div>
          ) : tripSummaries.length === 0 ? (
            <div className="text-center py-12 ios-card">
              <p className="text-muted-foreground mb-4">
                {filterMonth === "all" 
                  ? "Belum ada data keuangan" 
                  : "Belum ada data keuangan untuk periode ini"}
              </p>
              <Button
                onClick={() => navigate("/keuangan/new")}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Transaksi
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="text-base font-semibold mb-2">Ringkasan Per Trip</h2>
              <div className="space-y-2">
                {tripSummaries.map((summary) => (
                  <Collapsible key={summary.trip_id}>
                    <div className="ios-card p-3">
                      <CollapsibleTrigger 
                        className="w-full flex justify-between items-center"
                        onClick={() => toggleTrip(summary.trip_id)}
                      >
                        <div className="flex-1 text-left">
                          <h3 className="font-semibold text-sm">{summary.trip_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(summary.trip_date), "dd MMM", { locale: id })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {summary.saldo >= 0 ? (
                            <div className="text-right">
                              <p className="text-base font-bold text-green-600">{formatRupiah(summary.saldo)}</p>
                              <span className="text-[10px] text-green-600">Untung</span>
                            </div>
                          ) : (
                            <div className="text-right">
                              <p className="text-base font-bold text-red-600">{formatRupiah(Math.abs(summary.saldo))}</p>
                              <span className="text-[10px] text-red-600">Rugi</span>
                            </div>
                          )}
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedTrips.has(summary.trip_id) ? 'rotate-180' : ''}`} />
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                          <div>
                            <span className="text-muted-foreground">Pemasukan</span>
                            <p className="font-semibold text-green-600">{formatRupiah(summary.pemasukan)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pengeluaran</span>
                            <p className="font-semibold text-red-600">{formatRupiah(summary.pengeluaran)}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs"
                          onClick={() => navigate(`/trips/${summary.trip_id}`)}
                        >
                          Lihat Detail
                        </Button>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default Keuangan;
