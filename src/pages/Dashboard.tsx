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
  Briefcase, 
  Wallet, 
  FileText,
  Compass,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { RupiahInput } from "@/components/RupiahInput";
import { generateRundownPDF } from "@/utils/pdfGenerator";
import { Capacitor } from "@capacitor/core";
import { scheduleTripNotifications, setupNotificationListeners } from "@/utils/tripNotifications";

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

  useEffect(() => {
    loadData();
    setupNotificationListeners();

    // Realtime subscription for reminders to update badge count
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

      // Load trips
      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .order("tanggal", { ascending: false });

      if (tripsError) throw tripsError;
      setTrips(tripsData || []);

      // Set current trip to the most recent one or the first one
      if (tripsData && tripsData.length > 0) {
        setCurrentTrip(tripsData[0]);
      } else {
        setCurrentTrip(null);
      }

      // Load active reminders count
      const { data: remindersData, error: remindersError } = await supabase
        .from("reminders")
        .select("id, is_done")
        .eq("is_done", false);

      if (remindersError) throw remindersError;
      setReminders(remindersData || []);

      // Schedule notifications for upcoming trips (native only)
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

      toast.success("Trip berhasil ditambahkan!");
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

  const handleQuickExpense = async () => {
    if (!currentTrip) {
      toast.error("Pilih trip terlebih dahulu");
      return;
    }

    if (!quickExpenseData.keterangan || !quickExpenseData.jumlah) {
      toast.error("Mohon lengkapi data pengeluaran");
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

      toast.success("Transaksi berhasil dicatat!");
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
      toast.loading("Membuat PDF rundown...");
      
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
      toast.success("PDF rundown berhasil diunduh!");
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
      const shareText = `*Rundown Acara ${currentTrip.nama_trip}*\n\nTanggal: ${format(new Date(currentTrip.tanggal), "dd MMM yyyy", { locale: id })}${currentTrip.tanggal_selesai ? ` - ${format(new Date(currentTrip.tanggal_selesai), "dd MMM yyyy", { locale: id })}` : ""}\nTujuan: ${currentTrip.tujuan}\n\nJadwal Rundown Operasional siap dijalankan.`;
      
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

  const activeRemindersCount = reminders.length;

  return (
    <AuthGuard>
      <NotificationPermission />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 safe-top">
        <div className="max-w-lg mx-auto p-4 sm:p-5">
          
          {/* Top Bar Header */}
          <div className="flex items-center justify-between mb-5">
            <AnimatedHeader />
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={loadData}
                className="w-9 h-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Refresh Data"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReminder(true)}
                className="relative w-9 h-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Pengingat Operasional"
              >
                <Bell className="w-4 h-4" />
                {activeRemindersCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0.5 text-[10px] bg-red-600 text-white rounded-full animate-pulse border-2 border-white dark:border-slate-950">
                    {activeRemindersCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="w-9 h-9 rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 text-slate-400"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Greeting Hero Card */}
          <GreetingHeader userEmail={user?.email} />

          {/* Quick Metrics Pills */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div 
              onClick={() => navigate("/trips")}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:border-blue-400 transition-all flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Total Agenda Trip</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{trips.length} Trip</p>
              </div>
            </div>

            <div 
              onClick={() => setShowReminder(true)}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:border-indigo-400 transition-all flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Pengingat Jadwal</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{activeRemindersCount} Aktif</p>
              </div>
            </div>
          </div>

          {/* Main Trip Section */}
          {currentTrip ? (
            <div className="mb-6 space-y-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/50 mb-1.5">
                      Trip Aktif
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{currentTrip.nama_trip}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(currentTrip.tanggal), "dd MMM yyyy", { locale: id })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        {currentTrip.tujuan}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => setShowQuickExpense(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-8 px-3 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Pengeluaran
                  </Button>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    onClick={handleExportRundownPDF}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs rounded-xl border-slate-200 dark:border-slate-700"
                    disabled={rundownData.length === 0}
                  >
                    <FileDown className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Unduh PDF
                  </Button>
                  <Button
                    onClick={handleShareRundownPDF}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs rounded-xl border-slate-200 dark:border-slate-700"
                    disabled={rundownData.length === 0}
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Kirim WA
                  </Button>
                  <Button
                    onClick={() => navigate(`/trips/${currentTrip.id}`)}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Detail <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
              
              <RundownAcara key={rundownKey} tripId={currentTrip.id} />
            </div>
          ) : (
            /* Modern Empty State Card */
            <div className="p-8 mb-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
                <Compass className="w-8 h-8" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                Belum Ada Agenda Trip
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto mb-6">
                Mulai catat jadwal perjalanan, rute wisata, dan operasional bus biro Anda.
              </p>
              <Button
                onClick={() => setShowAddTrip(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 h-10 rounded-xl shadow-md shadow-blue-500/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Buat Trip Pertama
              </Button>
            </div>
          )}

          {/* Quick Shortcuts Grid */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
              Menu Cepat
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddTrip(true)}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-left hover:border-blue-400 transition-all flex flex-col items-center text-center group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 mb-2 group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Trip Baru</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/keuangan/new")}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-left hover:border-emerald-400 transition-all flex flex-col items-center text-center group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 mb-2 group-hover:scale-105 transition-transform">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Keuangan</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/notesnew")}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-left hover:border-amber-400 transition-all flex flex-col items-center text-center group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 mb-2 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Catatan</span>
              </button>
            </div>
          </div>

          {/* Quick Expense Dialog */}
          <Dialog open={showQuickExpense} onOpenChange={setShowQuickExpense}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Tambah Transaksi Cepat
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
                    placeholder="Contoh: Parkir, BBM, Makan Sopir"
                    required
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="jenis" className="text-xs font-medium">Jenis Transaksi</Label>
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
                      <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                      <SelectItem value="pemasukan">Pemasukan (Uang Masuk)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <RupiahInput
                    label="Jumlah (Rp)"
                    value={quickExpenseData.jumlah}
                    onChange={(value) =>
                      setQuickExpenseData({ ...quickExpenseData, jumlah: value })
                    }
                  />
                </div>
                <Button 
                  onClick={handleQuickExpense} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 rounded-xl"
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
                  <Compass className="w-5 h-5 text-blue-600" />
                  Tambah Jadwal Trip Cepat
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="nama_trip" className="text-xs font-medium">Nama Trip</Label>
                  <Input
                    id="nama_trip"
                    value={newTripData.nama_trip}
                    onChange={(e) =>
                      setNewTripData({ ...newTripData, nama_trip: e.target.value })
                    }
                    placeholder="Contoh: Tour Rombongan Jogja"
                    className="rounded-xl mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tanggal" className="text-xs font-medium">Tanggal Mulai</Label>
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
                    <Label htmlFor="tanggal_selesai" className="text-xs font-medium">Tanggal Selesai</Label>
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
                  <Label htmlFor="tujuan" className="text-xs font-medium">Kota / Destinasi Tujuan</Label>
                  <Input
                    id="tujuan"
                    value={newTripData.tujuan}
                    onChange={(e) =>
                      setNewTripData({ ...newTripData, tujuan: e.target.value })
                    }
                    placeholder="Contoh: Yogyakarta / Bali"
                    className="rounded-xl mt-1"
                  />
                </div>
                <Button 
                  onClick={handleAddTrip} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 rounded-xl"
                >
                  Tambah Jadwal Trip
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Sleek Logout Button at bottom */}
          <div className="mt-8 pt-4 border-t border-slate-200/60 dark:border-slate-800 text-center">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-xl h-10 text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Keluar dari Sistem
            </Button>
          </div>

        </div>

        <BottomNav />
      </div>
      <ReminderDialog open={showReminder} onOpenChange={setShowReminder} />
    </AuthGuard>
  );
};

export default Dashboard;
