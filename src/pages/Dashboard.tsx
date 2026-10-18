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
import { LogOut, Bell, Plus, DollarSign, FileDown, Share2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { RupiahInput } from "@/components/RupiahInput";
import { generateRundownPDF } from "@/utils/pdfGenerator";
import { Capacitor } from "@capacitor/core";
import { scheduleTripNotifications, requestNotificationPermission, setupNotificationListeners } from "@/utils/tripNotifications";

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
            loadRundownData(); // Reload data when changes occur
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

      // Load ALL trips to check if any trips exist
      const { data: allTripsData, error: allTripsError } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false });

      if (allTripsError) throw allTripsError;

      const allTrips = allTripsData || [];
      setTrips(allTrips);
      
      // Find upcoming or ongoing trips
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcomingTrips = allTrips.filter((trip) => {
        const start = new Date(trip.tanggal);
        const end = trip.tanggal_selesai ? new Date(trip.tanggal_selesai) : start;
        return end >= today;
      }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

      // Find ongoing or upcoming trip
      const ongoing = upcomingTrips.find((trip) => {
        const start = new Date(trip.tanggal);
        const end = trip.tanggal_selesai ? new Date(trip.tanggal_selesai) : start;
        return today >= start && today <= end;
      });

      if (ongoing) {
        setCurrentTrip(ongoing);
      } else if (upcomingTrips.length > 0) {
        setCurrentTrip(upcomingTrips[0]);
      } else if (allTrips.length > 0) {
        // If no upcoming trips, show the most recent past trip
        setCurrentTrip(allTrips[0]);
      }

      const { data: remindersData } = await supabase
        .from("reminders")
        .select("id, is_done")
        .eq("user_id", user.id)
        .eq("is_done", false);

      setReminders(remindersData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data");
    }
  };

  const loadRundownData = async () => {
    if (!currentTrip || !user) return;

    try {
      const { data, error } = await supabase
        .from("rundown_acara")
        .select("*")
        .eq("trip_id", currentTrip.id)
        .eq("user_id", user.id)
        .order("hari_ke", { ascending: true })
        .order("jam_mulai", { ascending: true });

      if (error) throw error;
      setRundownData(data || []);
    } catch (error) {
      console.error("Error loading rundown:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Gagal keluar");
    }
  };

  const handleAddTrip = async () => {
    if (!newTripData.nama_trip || !newTripData.tanggal || !newTripData.tujuan) {
      toast.error("Mohon isi semua field yang wajib");
      return;
    }
    console.log("Adding trip from dashboard:", newTripData);
    try {
      const { data: tripData, error } = await supabase.from("trips").insert({
        user_id: user.id,
        ...newTripData,
      }).select().single();

      if (error) throw error;

      // Schedule notifications for the new trip
      if (tripData) {
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          await scheduleTripNotifications({
            id: tripData.id,
            nama_trip: tripData.nama_trip,
            tanggal: tripData.tanggal,
            tujuan: tripData.tujuan,
          });
          toast.success("Trip berhasil ditambahkan! Notifikasi pengingat telah diatur.");
        } else {
          toast.success("Trip berhasil ditambahkan!");
        }
      }

      setNewTripData({ nama_trip: "", tanggal: "", tanggal_selesai: "", tujuan: "" });
      setShowAddTrip(false);
      loadData();
    } catch (error: any) {
      console.error("Error adding trip:", error);
      toast.error("Gagal menambahkan trip");
    }
  };

  const handleQuickExpense = async () => {
    if (!currentTrip || !user) return;
    if (!quickExpenseData.keterangan || !quickExpenseData.jumlah) {
      toast.error("Mohon isi keterangan dan jumlah");
      return;
    }

    console.log("Adding quick expense:", quickExpenseData);

    try {
      const jumlahNumber = Number(quickExpenseData.jumlah.replace(/\./g, "").replace(/,/g, ".")) || 0;

      const { error } = await supabase.from("keuangan").insert({
        trip_id: currentTrip.id,
        user_id: user.id,
        keterangan: quickExpenseData.keterangan,
        jenis: quickExpenseData.jenis,
        jumlah: jumlahNumber,
        tanggal: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Pengeluaran berhasil ditambahkan!");
      setQuickExpenseData({ keterangan: "", jumlah: "", jenis: "pengeluaran" });
      setShowQuickExpense(false);
    } catch (error: any) {
      console.error("Error adding expense:", error);
      toast.error("Gagal menambahkan pengeluaran");
    }
  };

  const handleExportRundownPDF = async () => {
    if (!currentTrip || rundownData.length === 0) {
      toast.error("Tidak ada rundown untuk diekspor");
      return;
    }

    try {
      const doc = generateRundownPDF(
        {
          nama_trip: currentTrip.nama_trip,
          tanggal: format(new Date(currentTrip.tanggal), "dd MMM yyyy", { locale: id }),
          tanggal_selesai: currentTrip.tanggal_selesai 
            ? format(new Date(currentTrip.tanggal_selesai), "dd MMM yyyy", { locale: id })
            : null,
          tujuan: currentTrip.tujuan,
        },
        rundownData
      );

      const fileName = `Rundown_${currentTrip.nama_trip.replace(/\s+/g, "_")}.pdf`;
      doc.save(fileName);
      toast.success("PDF berhasil diunduh!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF");
    }
  };

  const handleShareRundownPDF = async () => {
    if (!currentTrip || rundownData.length === 0) {
      toast.error("Tidak ada rundown untuk dibagikan");
      return;
    }

    try {
      const shareText = `*Rundown Acara ${currentTrip.nama_trip}*\n\nTanggal: ${format(new Date(currentTrip.tanggal), "dd MMM yyyy", { locale: id })}${currentTrip.tanggal_selesai ? ` - ${format(new Date(currentTrip.tanggal_selesai), "dd MMM yyyy", { locale: id })}` : ""}\nTujuan: ${currentTrip.tujuan}\n\nLihat detail rundown di attachment.`;
      
      const encodedText = encodeURIComponent(shareText);
      const whatsappUrl = `whatsapp://send?text=${encodedText}`;
      const whatsappWebUrl = `https://wa.me/?text=${encodedText}`;
      
      if (Capacitor.isNativePlatform()) {
        // Native: Open WhatsApp directly
        try {
          window.location.href = whatsappUrl;
          toast.success("Membuka WhatsApp...");
        } catch {
          window.open(whatsappWebUrl, '_blank');
        }
      } else {
        // Web: Open WhatsApp Web
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
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <AnimatedHeader />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={loadData}
                className="rounded-2xl hover:bg-accent transition-all hover:scale-105"
                title="Refresh"
              >
                <RefreshCw className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReminder(true)}
                className="relative rounded-2xl hover:bg-accent transition-all hover:scale-105"
                title="Pengingat"
              >
                <Bell className="w-6 h-6" />
                {activeRemindersCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full animate-pulse">
                    {activeRemindersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
          
          <GreetingHeader />

          {currentTrip ? (
            <div className="mb-6">
              <div className="ios-card p-4 mb-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Trip Saat Ini</h2>
                    <h3 className="font-semibold">{currentTrip.nama_trip}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(currentTrip.tanggal), "dd MMM", { locale: id })}
                      {currentTrip.tanggal_selesai && (
                        <> - {format(new Date(currentTrip.tanggal_selesai), "dd MMM yyyy", { locale: id })}</>
                      )}
                      {" • "}{currentTrip.tujuan}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowQuickExpense(true)}
                    className="gradient-primary text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Pengeluaran
                  </Button>
                </div>
              </div>
              
              <div className="mb-4 flex gap-2">
                <Button
                  onClick={handleExportRundownPDF}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={rundownData.length === 0}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  onClick={handleShareRundownPDF}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={rundownData.length === 0}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Bagikan
                </Button>
              </div>
              
              <RundownAcara key={rundownKey} tripId={currentTrip.id} />
            </div>
          ) : (
            <div className="ios-card p-8 mb-6 text-center">
              <div className="text-6xl mb-4">🗓️</div>
              <h2 className="text-lg font-semibold mb-2">Belum Ada Trip</h2>
              <p className="text-muted-foreground mb-6">Mulai rencanakan perjalanan impianmu sekarang!</p>
              <Button
                onClick={() => setShowAddTrip(true)}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Buat Trip Pertama
              </Button>
            </div>
          )}

          <Dialog open={showQuickExpense} onOpenChange={setShowQuickExpense}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Tambah Pengeluaran Cepat
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="keterangan">Keterangan</Label>
                  <Input
                    id="keterangan"
                    value={quickExpenseData.keterangan}
                    onChange={(e) =>
                      setQuickExpenseData({ ...quickExpenseData, keterangan: e.target.value })
                    }
                    placeholder="Contoh: Parkir, Makan Sopir"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="jenis">Jenis</Label>
                  <Select
                    value={quickExpenseData.jenis}
                    onValueChange={(value) =>
                      setQuickExpenseData({ ...quickExpenseData, jenis: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                      <SelectItem value="pemasukan">Pemasukan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <RupiahInput
                    label="Jumlah"
                    value={quickExpenseData.jumlah}
                    onChange={(value) =>
                      setQuickExpenseData({ ...quickExpenseData, jumlah: value })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Waktu: {format(new Date(), "dd MMM yyyy, HH:mm", { locale: id })}
                </p>
                <Button onClick={handleQuickExpense} className="w-full gradient-primary text-white">
                  Simpan
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddTrip} onOpenChange={setShowAddTrip}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Trip Cepat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nama_trip">Nama Trip</Label>
                  <Input
                    id="nama_trip"
                    value={newTripData.nama_trip}
                    onChange={(e) =>
                      setNewTripData({ ...newTripData, nama_trip: e.target.value })
                    }
                    placeholder="Contoh: Liburan ke Bali"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tanggal">Tanggal Mulai</Label>
                    <Input
                      type="date"
                      id="tanggal"
                      value={newTripData.tanggal}
                      onChange={(e) =>
                        setNewTripData({ ...newTripData, tanggal: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="tanggal_selesai">Tanggal Selesai</Label>
                    <Input
                      type="date"
                      id="tanggal_selesai"
                      value={newTripData.tanggal_selesai}
                      onChange={(e) =>
                        setNewTripData({ ...newTripData, tanggal_selesai: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="tujuan">Tujuan</Label>
                  <Input
                    id="tujuan"
                    value={newTripData.tujuan}
                    onChange={(e) =>
                      setNewTripData({ ...newTripData, tujuan: e.target.value })
                    }
                    placeholder="Contoh: Bali"
                  />
                </div>
                <Button onClick={handleAddTrip} className="w-full gradient-primary text-white">
                  Tambah Trip
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleSignOut}
            variant="destructive"
            className="w-full mt-6"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Keluar
          </Button>
        </div>

        <BottomNav />
      </div>
      <ReminderDialog open={showReminder} onOpenChange={setShowReminder} />
    </AuthGuard>
  );
};

export default Dashboard;
