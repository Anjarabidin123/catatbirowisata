import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import GreetingHeader from "@/components/GreetingHeader";
import BottomNav from "@/components/BottomNav";
import { AnimatedHeader } from "@/components/AnimatedHeader";
import { ReminderDialog } from "@/components/ReminderDialog";
import { NotificationPermission } from "@/components/NotificationPermission";
import { RundownAcara } from "@/components/RundownAcara";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LogOut, 
  Bell, 
  Plus, 
  DollarSign, 
  FileDown, 
  Share2, 
  RefreshCw, 
  MapPin, 
  Calendar, 
  Bus, 
  Wallet, 
  FileText,
  Compass,
  ArrowRight,
  TrendingUp,
  Map,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { RupiahInput } from "@/components/RupiahInput";
import { generateRundownPDF } from "@/utils/pdfGenerator";
import { Capacitor } from "@capacitor/core";
import { scheduleTripNotifications, setupNotificationListeners } from "@/utils/tripNotifications";
import { findDestinationPhoto, getInstantDestinationPhoto, DestinationPhoto } from "@/utils/destinationPhotoFinder";
import { AsistenWisataModal } from "@/components/AsistenWisataModal";

interface Trip {
  id: string;
  nama_trip: string;
  tanggal: string;
  tanggal_selesai: string | null;
  tujuan: string;
}

interface Reminder {
  id: string;
  is_done: boolean;
}

interface RundownItem {
  hari_ke: number;
  jam_mulai: string;
  jam_selesai: string;
  judul_acara: string;
  keterangan: string | null;
}

// Rekomendasi Rute Wisata Nusantara Populer
const POPULAR_DESTINATIONS = [
  {
    nama: "Paket Bromo Sunrise & Kawah",
    tujuan: "Bromo, Jawa Timur",
    durasi: "2 Hari 1 Malam",
    image: "/hero-bromo.jpg",
    kategori: "Wisata Alam",
  },
  {
    nama: "Heritage Tour Candi Borobudur",
    tujuan: "Magelang & Yogyakarta",
    durasi: "1 Hari Penuh",
    image: "/borobudur.jpg",
    kategori: "Wisata Budaya",
  },
  {
    nama: "Eksotisme Pantai & Budaya Bali",
    tujuan: "Denpasar & Ubud, Bali",
    durasi: "3 Hari 2 Malam",
    image: "/bali-beach.jpg",
    kategori: "Pariwisata Bahari",
  },
  {
    nama: "Agrowisata Puncak & Kebun Teh",
    tujuan: "Puncak, Jawa Barat",
    durasi: "1 Hari Penuh",
    image: "/tea-plantation.jpg",
    kategori: "Agrowisata",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [rundownData, setRundownData] = useState<RundownItem[]>([]);
  const [rundownKey, setRundownKey] = useState(0);
  const [newTripData, setNewTripData] = useState({
    nama_trip: "",
    tanggal: "",
    tanggal_selesai: "",
    tujuan: "",
  });
  const [quickExpenseData, setQuickExpenseData] = useState({
    keterangan: "",
    jumlah: "",
    jenis: "pengeluaran",
  });
  const [showReminder, setShowReminder] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<DestinationPhoto | null>(null);
  const [isSearchingPhoto, setIsSearchingPhoto] = useState(false);
  const [pendingRundown, setPendingRundown] = useState<any[] | null>(null);

  // Auto-detect & search destination photo in real time as user types
  useEffect(() => {
    if (!newTripData.tujuan || newTripData.tujuan.trim().length < 2) {
      setPreviewPhoto(null);
      setIsSearchingPhoto(false);
      return;
    }

    setIsSearchingPhoto(true);
    const timer = setTimeout(async () => {
      const photo = await findDestinationPhoto(newTripData.tujuan);
      setPreviewPhoto(photo);
      setIsSearchingPhoto(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [newTripData.tujuan]);

  useEffect(() => {
    loadData();
    setupNotificationListeners();

    const remindersChannel = supabase
      .channel("dashboard-reminders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminders" },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(remindersChannel);
    };
  }, []);

  useEffect(() => {
    if (currentTrip) {
      loadRundownData();
      
      const channel = supabase
        .channel(`rundown-${currentTrip.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rundown_acara", filter: `trip_id=eq.${currentTrip.id}` },
          () => {
            loadRundownData();
            setRundownKey(prev => prev + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentTrip]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/auth");
      setUser(user);

      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .order("tanggal", { ascending: false });

      if (tripsError) throw tripsError;
      setTrips(tripsData || []);

      if (tripsData && tripsData.length > 0) {
        setCurrentTrip(tripsData[0]);
      } else {
        setCurrentTrip(null);
      }

      const { data: remindersData, error: remindersError } = await supabase
        .from("reminders")
        .select("id, is_done")
        .eq("is_done", false);

      if (remindersError) throw remindersError;
      setReminders(remindersData || []);

      if (Capacitor.isNativePlatform() && tripsData && tripsData.length > 0) {
        scheduleTripNotifications(tripsData);
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat data");
    }
  };

  const loadRundownData = async () => {
    if (!currentTrip) return;
    
    try {
      const { data, error } = await supabase
        .from("rundown_acara")
        .select("*")
        .eq("trip_id", currentTrip.id)
        .order("hari_ke", { ascending: true })
        .order("jam_mulai", { ascending: true });

      if (error) throw error;
      setRundownData(data || []);
    } catch (error: any) {
      console.error("Error loading rundown:", error);
    }
  };

  const handleAddTrip = async () => {
    if (!newTripData.nama_trip || !newTripData.tanggal || !newTripData.tujuan) {
      toast.error("Mohon lengkapi data trip");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          nama_trip: newTripData.nama_trip,
          tanggal: newTripData.tanggal,
          tanggal_selesai: newTripData.tanggal_selesai || null,
          tujuan: newTripData.tujuan,
        })
        .select()
        .single();

      if (error) throw error;

      // Jika ada rundown yang disusun oleh konsultan AI, otomatis masukkan ke rundown_acara
      if (pendingRundown && pendingRundown.length > 0) {
        const rundownInserts = pendingRundown.map((item) => ({
          trip_id: data.id,
          user_id: user.id,
          hari_ke: 1,
          jam_mulai: item.jamMulai,
          jam_selesai: item.jamSelesai,
          judul_acara: item.kegiatan,
          keterangan: `${item.lokasi} - ${item.keterangan}`,
        }));
        await supabase.from("rundown_acara").insert(rundownInserts);
        setPendingRundown(null);
      }

      toast.success("Jadwal trip & rundown berhasil dibuat!");
      setShowAddTrip(false);
      setNewTripData({
        nama_trip: "",
        tanggal: "",
        tanggal_selesai: "",
        tujuan: "",
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan trip");
    }
  };

  const selectPredefinedTrip = (dest: typeof POPULAR_DESTINATIONS[0]) => {
    const today = new Date().toISOString().split("T")[0];
    setNewTripData({
      nama_trip: dest.nama,
      tanggal: today,
      tanggal_selesai: today,
      tujuan: dest.tujuan,
    });
    setShowAddTrip(true);
  };

  const handleSelectAIRoute = (route: { nama: string; tujuan: string; rundown?: any[] }) => {
    const today = new Date().toISOString().split("T")[0];
    setNewTripData({
      nama_trip: route.nama,
      tanggal: today,
      tanggal_selesai: today,
      tujuan: route.tujuan,
    });
    if (route.rundown) {
      setPendingRundown(route.rundown);
    }
    setShowAddTrip(true);
  };

  const handleQuickExpense = async () => {
    if (!currentTrip) {
      toast.error("Pilih trip terlebih dahulu");
      return;
    }

    if (!quickExpenseData.keterangan || !quickExpenseData.jumlah) {
      toast.error("Mohon lengkapi data transaksi");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("keuangan").insert({
        trip_id: currentTrip.id,
        user_id: user.id,
        keterangan: quickExpenseData.keterangan,
        jumlah: parseFloat(quickExpenseData.jumlah),
        jenis: quickExpenseData.jenis,
      });

      if (error) throw error;

      toast.success("Catatan keuangan tersimpan!");
      setShowQuickExpense(false);
      setQuickExpenseData({
        keterangan: "",
        jumlah: "",
        jenis: "pengeluaran",
      });
    } catch (error: any) {
      toast.error(error.message || "Gagal mencatat transaksi");
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Berhasil keluar dari akun");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Gagal logout");
    }
  };

  const handleExportRundownPDF = async () => {
    if (!currentTrip) {
      toast.error("Trip tidak ditemukan");
      return;
    }

    if (rundownData.length === 0) {
      toast.error("Belum ada data rundown acara");
      return;
    }

    try {
      toast.loading("Membuat dokumen rundown...");
      
      const { data: destinationsData } = await supabase
        .from("trip_destinations")
        .select("*")
        .eq("trip_id", currentTrip.id)
        .order("urutan", { ascending: true });

      await generateRundownPDF({
        tripName: currentTrip.nama_trip,
        tanggal: currentTrip.tanggal,
        tanggalSelesai: currentTrip.tanggal_selesai || undefined,
        tujuan: currentTrip.tujuan,
        destinations: (destinationsData || []).map(d => ({
          nama: d.nama_destinasi,
          lokasi: d.lokasi || undefined,
          catatan: d.catatan || undefined,
        })),
        rundown: rundownData.map(r => ({
          hariKe: r.hari_ke,
          jamMulai: r.jam_mulai,
          jamSelesai: r.jam_selesai,
          judulAcara: r.judul_acara,
          keterangan: r.keterangan || undefined,
        })),
      });

      toast.dismiss();
      toast.success("PDF rundown siap dibagikan!");
    } catch (error) {
      toast.dismiss();
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF");
    }
  };

  const handleShareRundownPDF = () => {
    if (!currentTrip) {
      toast.error("Trip tidak ditemukan");
      return;
    }

    if (rundownData.length === 0) {
      toast.error("Belum ada data rundown acara");
      return;
    }

    try {
      const shareText = `*Rundown Operasional: ${currentTrip.nama_trip}*\n\n📅 Tanggal: ${format(new Date(currentTrip.tanggal), "dd MMMM yyyy", { locale: id })}${currentTrip.tanggal_selesai ? ` s/d ${format(new Date(currentTrip.tanggal_selesai), "dd MMMM yyyy", { locale: id })}` : ""}\n📍 Tujuan: ${currentTrip.tujuan}\n\nJadwal operasional siap dilaksanakan. Salam pariwisata!`;
      
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
        toast.success("Membuka WhatsApp...");
      }
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      toast.error("Gagal membuka WhatsApp");
    }
  };

  const activeRemindersCount = reminders.length;

  return (
    <AuthGuard>
      <NotificationPermission />
      <div className="min-h-screen bg-slate-50 pb-24 safe-top font-sans text-slate-900">
        <div className="max-w-md mx-auto p-4 sm:p-5">
          
          {/* Top Bar Header */}
          <div className="flex items-center justify-between mb-4">
            <AnimatedHeader />
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={loadData}
                className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm text-slate-600 dark:text-slate-300 hover:text-blue-600"
                title="Segarkan Data"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReminder(true)}
                className="relative w-9 h-9 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm text-slate-600 dark:text-slate-300 hover:text-blue-600"
                title="Pengingat Jadwal"
              >
                <Bell className="w-4 h-4" />
                {activeRemindersCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0.5 text-[10px] bg-red-500 text-white rounded-full animate-pulse">
                    {activeRemindersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
          
          {/* Greeting Hero Card with Authentic Indonesian Destination */}
          <GreetingHeader userEmail={user?.email} currentDestination={currentTrip?.tujuan} />

          {/* Tour Consultant Wizard Banner */}
          <div 
            onClick={() => setShowAIModal(true)}
            className="mb-5 p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between cursor-pointer hover:border-blue-500 transition-all group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Compass className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>Konsultan Rute & Rundown Lapangan</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-extrabold uppercase">Rekomendasi</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Pilih segmen (TK, SD, SMP, SMA, Kantor, Ziarah) & susun jadwal akurat
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Quick Operations Strip (Menu Operasional Utama) */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setShowAddTrip(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-blue-400 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 mb-1.5">
                <Bus className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Trip Baru</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/keuangan/new")}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-emerald-400 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 mb-1.5">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Kas Masuk</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/destinations")}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-amber-400 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 mb-1.5">
                <Map className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Destinasi</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/notesnew")}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-indigo-400 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 mb-1.5">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Catatan</span>
            </button>
          </div>

          {/* Active Trip vs Destination Route Inspiration */}
          {currentTrip ? (() => {
            const tripPhoto = getInstantDestinationPhoto(currentTrip.tujuan);
            return (
              <div className="mb-6 space-y-4">
                <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-sky-950/5 group">
                  
                  {/* Real Destination Photo Header Banner */}
                  <div className="relative h-32 w-full overflow-hidden bg-slate-800">
                    <img
                      src={tripPhoto.url}
                      alt={currentTrip.tujuan}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/borobudur.jpg";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/20" />
                    
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        AGENDA TRIP BERJALAN
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <div className="flex items-center gap-1.5 text-xs text-amber-300 font-extrabold uppercase tracking-wide drop-shadow mb-0.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>Destinasi Tujuan: {currentTrip.tujuan}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md truncate capitalize">
                        {currentTrip.tujuan}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-200 font-medium drop-shadow mt-1">
                        <span className="bg-white/20 border border-white/30 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px] font-bold text-white shadow-sm">
                          Rombongan: {currentTrip.nama_trip}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-300" />
                          {format(new Date(currentTrip.tanggal), "dd MMM yyyy", { locale: id })}
                          {currentTrip.tanggal_selesai ? ` - ${format(new Date(currentTrip.tanggal_selesai), "dd MMM yyyy", { locale: id })}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      size="sm"
                      onClick={() => setShowQuickExpense(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-8 px-3 shadow-sm font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      + Biaya
                    </Button>

                    <div className="flex gap-1.5 flex-1 justify-end">
                      <Button
                        onClick={handleExportRundownPDF}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-xl border-slate-200 dark:border-slate-700 font-medium"
                        disabled={rundownData.length === 0}
                      >
                        <FileDown className="w-3.5 h-3.5 mr-1 text-blue-600" />
                        PDF
                      </Button>
                      <Button
                        onClick={handleShareRundownPDF}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-xl border-slate-200 dark:border-slate-700 font-medium text-emerald-700 hover:text-emerald-800"
                        disabled={rundownData.length === 0}
                      >
                        <Share2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        WA
                      </Button>
                      <Button
                        onClick={() => navigate(`/trips/${currentTrip.id}`)}
                        size="sm"
                        className="h-8 text-xs rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold px-3"
                      >
                        Detail
                      </Button>
                    </div>
                  </div>

                </div>
                
                <RundownAcara key={rundownKey} tripId={currentTrip.id} />
              </div>
            );
          })() : (
            /* Inspiring Route Catalog (Pesona Indonesia Real Experience) */
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Inspirasi Rute Pesona Nusantara
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Klik rute untuk langsung membuat jadwal trip otomatis
                  </p>
                </div>
                <Button
                  onClick={() => setShowAddTrip(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-7 px-2.5"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Kustom
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {POPULAR_DESTINATIONS.map((dest, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectPredefinedTrip(dest)}
                    className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="h-24 w-full relative overflow-hidden">
                      <img 
                        src={dest.image} 
                        alt={dest.nama} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/90 text-slate-900 backdrop-blur-sm">
                        {dest.durasi}
                      </span>
                    </div>

                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {dest.nama}
                        </h4>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />
                          <span className="truncate">{dest.tujuan}</span>
                        </p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-semibold text-blue-600">
                        <span>Pilih Rute</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Expense Dialog */}
          <Dialog open={showQuickExpense} onOpenChange={setShowQuickExpense}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Catat Transaksi Operasional
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="keterangan" className="text-xs font-medium">Keterangan</Label>
                  <Input
                    id="keterangan"
                    value={quickExpenseData.keterangan}
                    onChange={(e) =>
                      setQuickExpenseData({ ...quickExpenseData, keterangan: e.target.value })
                    }
                    placeholder="Contoh: Solar Bus, Uang Parkir, Tiket HTM"
                    required
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="jenis" className="text-xs font-medium">Arus Kas</Label>
                  <Select
                    value={quickExpenseData.jenis}
                    onValueChange={(value) =>
                      setQuickExpenseData({ ...quickExpenseData, jenis: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pengeluaran">Pengeluaran (Biaya)</SelectItem>
                      <SelectItem value="pemasukan">Pemasukan (Uang Masuk / DP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <RupiahInput
                    label="Nominal (Rp)"
                    value={quickExpenseData.jumlah}
                    onChange={(value) =>
                      setQuickExpenseData({ ...quickExpenseData, jumlah: value })
                    }
                  />
                </div>
                <Button 
                  onClick={handleQuickExpense} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 rounded-xl shadow-md shadow-blue-500/20"
                >
                  Simpan Transaksi
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Trip Dialog */}
          <Dialog open={showAddTrip} onOpenChange={setShowAddTrip}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bus className="w-5 h-5 text-blue-600" />
                  Jadwalkan Agenda Trip Baru
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="nama_trip" className="text-xs font-medium">Nama Paket / Rombongan</Label>
                  <Input
                    id="nama_trip"
                    value={newTripData.nama_trip}
                    onChange={(e) =>
                      setNewTripData({ ...newTripData, nama_trip: e.target.value })
                    }
                    placeholder="Contoh: Rombongan Study Tour SMAN 1"
                    className="rounded-xl mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tanggal" className="text-xs font-medium">Tgl Berangkat</Label>
                    <Input
                      type="date"
                      id="tanggal"
                      value={newTripData.tanggal}
                      onChange={(e) =>
                        setNewTripData({ ...newTripData, tanggal: e.target.value })
                      }
                      className="rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tanggal_selesai" className="text-xs font-medium">Tgl Pulang</Label>
                    <Input
                      type="date"
                      id="tanggal_selesai"
                      value={newTripData.tanggal_selesai}
                      onChange={(e) =>
                        setNewTripData({ ...newTripData, tanggal_selesai: e.target.value })
                      }
                      className="rounded-xl mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="tujuan" className="text-xs font-medium">Destinasi / Kota Tujuan</Label>
                  <Input
                    id="tujuan"
                    value={newTripData.tujuan}
                    onChange={(e) =>
                      setNewTripData({ ...newTripData, tujuan: e.target.value })
                    }
                    placeholder="Contoh: Semarang, Bromo, atau Yogyakarta"
                    className="rounded-xl mt-1"
                  />

                  {/* Deteksi Foto Landmark / Destinasi Otomatis Saat Mengetik */}
                  {newTripData.tujuan.trim().length >= 2 && (
                    <div className="mt-2.5 rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2 transition-all">
                      {isSearchingPhoto ? (
                        <div className="flex items-center gap-2 p-2.5 text-xs text-slate-500">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          <span>Mendeteksi foto landmark {newTripData.tujuan}...</span>
                        </div>
                      ) : previewPhoto ? (
                        <div className="relative h-28 w-full rounded-xl overflow-hidden shadow-sm group">
                          <img
                            src={previewPhoto.url}
                            alt={previewPhoto.nama}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/borobudur.jpg";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-blue-700 shadow-sm backdrop-blur-sm">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Foto Terdeteksi Otomatis</span>
                          </div>
                          <div className="absolute bottom-2 left-2.5 right-2.5 text-white drop-shadow">
                            <p className="text-xs font-bold truncate">{previewPhoto.nama}</p>
                            <p className="text-[10px] text-slate-200 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5 text-rose-400" />
                              <span>{previewPhoto.lokasi}</span>
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleAddTrip} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 rounded-xl shadow-md shadow-blue-500/20"
                >
                  Simpan Jadwal Trip
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Clean User Account Card & Logout */}
          <div className="mt-8 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">
                {user?.email ? user.email.slice(0, 2) : "AG"}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                  {user?.email || "Agen Biro"}
                </p>
                <p className="text-[10px] text-slate-400">Akun Pribadi Operasional</p>
              </div>
            </div>

            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Keluar
            </Button>
          </div>

        </div>

        <BottomNav />
      </div>
      <ReminderDialog open={showReminder} onOpenChange={setShowReminder} />
      <AsistenWisataModal
        open={showAIModal}
        onOpenChange={setShowAIModal}
        onSelectTripRoute={handleSelectAIRoute}
      />
    </AuthGuard>
  );
};

export default Dashboard;
