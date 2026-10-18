import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, TrendingUp, TrendingDown, Download, Share2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { generateReportPDF } from "@/utils/reportPdfGenerator";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

interface ReportData {
  trips: any[];
  keuangan: any[];
  media: any[];
}

const Laporan = () => {
  const [data, setData] = useState<ReportData>({ trips: [], keuangan: [], media: [] });
  const [loading, setLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("current");

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      const doc = generateReportPDF({
        trips: filteredTrips,
        keuangan: filteredKeuangan,
        media: filteredMedia,
        filterTripId: selectedTripId,
      });

      const fileName = `Laporan_Malika_Tour_${format(new Date(), "yyyyMMdd")}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handleSharePDF = async () => {
    try {
      const shareText = `*Laporan Malika Tour*\n\nTotal Trip: ${filteredTrips.length}\nPemasukan: Rp ${totalPemasukan.toLocaleString("id-ID")}\nPengeluaran: Rp ${totalPengeluaran.toLocaleString("id-ID")}\nSaldo: Rp ${(totalPemasukan - totalPengeluaran).toLocaleString("id-ID")}\n\nLaporan lengkap tersedia untuk diunduh.`;
      
      const encodedText = encodeURIComponent(shareText);
      const whatsappUrl = `whatsapp://send?text=${encodedText}`;
      const whatsappWebUrl = `https://wa.me/?text=${encodedText}`;
      
      if (Capacitor.isNativePlatform()) {
        try {
          window.location.href = whatsappUrl;
          toast.success("Membuka WhatsApp...");
        } catch {
          window.open(whatsappWebUrl, '_blank');
        }
      } else {
        window.open(whatsappWebUrl, '_blank');
        toast.success("Membuka WhatsApp Web...");
      }
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      toast.error("Gagal membuka WhatsApp");
    }
  };

  // Filter by month
  const filterDataByMonth = (data: any[], dateField: string) => {
    const today = new Date();
    
    return data.filter((item) => {
      const itemDate = new Date(item[dateField]);
      
      if (filterMonth === "current") {
        return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
      } else if (filterMonth === "last") {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear();
      }
      return true; // all
    });
  };

  // Filter data based on selected trip and month
  let filteredTrips = selectedTripId === "all" ? data.trips : data.trips.filter(t => t.id === selectedTripId);
  let filteredKeuangan = selectedTripId === "all" ? data.keuangan : data.keuangan.filter(k => k.trip_id === selectedTripId);
  const filteredMedia = selectedTripId === "all" ? data.media : data.media.filter(m => m.trip_id === selectedTripId);

  // Apply month filter
  filteredTrips = filterDataByMonth(filteredTrips, 'tanggal');
  filteredKeuangan = filterDataByMonth(filteredKeuangan, 'tanggal');

  // Only show completed trips
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  filteredTrips = filteredTrips.filter(t => new Date(t.tanggal) < today);

  const totalPemasukan = filteredKeuangan
    .filter((k) => k.jenis === "pemasukan")
    .reduce((sum, k) => sum + Number(k.jumlah), 0);

  const totalPengeluaran = filteredKeuangan
    .filter((k) => k.jenis === "pengeluaran")
    .reduce((sum, k) => sum + Number(k.jumlah), 0);
  
  const netResult = totalPemasukan - totalPengeluaran;

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from("trip-media").getPublicUrl(filePath);
    return data.publicUrl;
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
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex flex-col gap-3 mb-4 print:hidden">
            <h1 className="text-xl font-bold">Laporan</h1>
            <div className="flex gap-2">
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
              <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                <SelectTrigger className="flex-1 h-9">
                  <SelectValue placeholder="Semua Trip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Trip</SelectItem>
                  {data.trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {trip.nama_trip}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGeneratePDF} className="gradient-primary text-white flex-1 h-9" size="sm">
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button onClick={handleSharePDF} variant="outline" className="flex-1 h-9" size="sm">
                <Share2 className="w-4 h-4 mr-1" />
                Bagikan
              </Button>
            </div>
          </div>

          {/* Summary Cards - Simple */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="ios-card p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">Trip</p>
              <p className="text-xl font-bold text-primary">{filteredTrips.length}</p>
            </div>

            <div className={`ios-card p-2.5 ${netResult >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                {netResult >= 0 ? "Untung" : "Rugi"}
              </p>
              <p className={`text-lg font-bold ${netResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                Rp {Math.abs(netResult / 1000).toFixed(0)}k
              </p>
            </div>
          </div>

          {/* Trips List - Compact */}
          <section className="mb-3">
            <h2 className="text-sm font-bold mb-2">Daftar Trip</h2>
            {filteredTrips.length === 0 ? (
              <div className="ios-card p-4 text-center text-xs text-muted-foreground">Tidak ada trip</div>
            ) : (
              <div className="ios-card p-2.5 space-y-2">
                {filteredTrips.map((trip) => {
                  const tripKeuangan = filteredKeuangan.filter(k => k.trip_id === trip.id);
                  const pemasukan = tripKeuangan
                    .filter(k => k.jenis === "pemasukan")
                    .reduce((sum, k) => sum + Number(k.jumlah), 0);
                  const pengeluaran = tripKeuangan
                    .filter(k => k.jenis === "pengeluaran")
                    .reduce((sum, k) => sum + Number(k.jumlah), 0);
                  const saldo = pemasukan - pengeluaran;

                  return (
                    <div key={trip.id} className="flex justify-between items-center text-xs border-b last:border-0 pb-2 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm">{trip.nama_trip}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(trip.tanggal), "dd MMM", { locale: id })}
                        </p>
                      </div>
                      <div className={`text-right font-bold text-sm ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {saldo >= 0 ? "+" : "-"}Rp {Math.abs(saldo / 1000).toFixed(0)}k
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Gallery - Compact */}
          {filteredMedia.length > 0 && (
            <section>
              <h2 className="text-sm font-bold mb-2">Galeri</h2>
              <div className="grid grid-cols-4 gap-1.5">
                {filteredMedia.slice(0, 12).map((m) => (
                  <div key={m.id} className="aspect-square rounded overflow-hidden">
                    <img
                      src={getMediaUrl(m.file_path)}
                      alt={m.file_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default Laporan;
