import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser, clearAuthCache } from "@/utils/authHelper";
import { clearBiroProfileCache } from "@/utils/biroProfile";
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
  TrendingDown,
  Map,
  Sparkles,
  Receipt,
  MessageSquare,
  CheckSquare,
  ShieldCheck,
  UserCheck,
  ArrowRightLeft,
  Coins,
  Users,
  Smartphone,
  Activity,
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
import { ImportWordRundownDialog } from "@/components/ImportWordRundownDialog";
import { useRole } from "@/contexts/RoleContext";
import {
  getCrewMembers,
  getDeviceSessions,
  getActivityLogs,
  logCrewActivity,
} from "@/utils/rbacAuditLogger";
import { KwitansiInvoiceDialog } from "@/components/KwitansiInvoiceDialog";
import { BusSeatManifestModal } from "@/components/BusSeatManifestModal";
import { WhatsAppBroadcastModal } from "@/components/WhatsAppBroadcastModal";
import { TripChecklistCard } from "@/components/TripChecklistCard";
import { PettyCashTracker } from "@/components/PettyCashTracker";
import { CashbackTrackerWidget } from "@/components/CashbackTrackerWidget";

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

/**
 * Logika Pemilihan Trip Aktif di Dashboard:
 * 1. Jika preferredTripId valid (dipilih manual oleh pengguna), utamakan trip tersebut.
 * 2. Prioritas 1: Trip Sedang Berjalan / Hari Ini (tanggal <= today <= tanggal_selesai).
 * 3. Prioritas 2: Trip Mendatang Terdekat (tanggal > today, ASCENDING agar tanggal terdekat di depan).
 * 4. Prioritas 3: Trip Riwayat Terakhir (tanggal < today, DESCENDING).
 */
export const determineActiveTrip = (trips: Trip[], preferredTripId?: string): Trip | null => {
  if (!trips || trips.length === 0) return null;

  if (preferredTripId) {
    const matched = trips.find(t => t.id === preferredTripId);
    if (matched) return matched;
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // 1. Hari Ini / Sedang Berjalan
  const ongoing = trips.filter(t => {
    const start = t.tanggal;
    const end = t.tanggal_selesai || t.tanggal;
    return start <= todayStr && end >= todayStr;
  });
  if (ongoing.length > 0) {
    ongoing.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return ongoing[0];
  }

  // 2. Mendatang Terdekat (ASCENDING)
  const upcoming = trips
    .filter(t => t.tanggal > todayStr)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  if (upcoming.length > 0) {
    return upcoming[0];
  }

  // 3. Riwayat Terakhir (DESCENDING)
  const past = trips
    .filter(t => t.tanggal < todayStr)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  if (past.length > 0) {
    return past[0];
  }

  return trips[0];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { role, isPemilik, isKru, roleName, toggleRole, activeCrew, switchActiveCrew, crewList, currentDevice, hasPermission, isTripAllowedForActiveCrew } = useRole();
  const canSeeFinancials = hasPermission("rule_buku_kas_laba");
  const canPrintKwitansi = hasPermission("rule_kwitansi_invoice");
  const canManageKru = hasPermission("rule_manajemen_kru");
  const canManageTrips = hasPermission("rule_hapus_buat_trip");
  const canInputPettyCash = hasPermission("rule_petty_cash");
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const cached = localStorage.getItem("catatbiro_cached_trips");
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(() => {
    try {
      const cached = localStorage.getItem("catatbiro_cached_trips");
      if (cached) {
        const parsed = JSON.parse(cached);
        const selId = localStorage.getItem("active_trip_id") || undefined;
        return determineActiveTrip(parsed, selId);
      }
    } catch {}
    return null;
  });
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(() => {
    return localStorage.getItem("active_trip_id") || undefined;
  });
  const [financialStats, setFinancialStats] = useState(() => {
    try {
      const cached = localStorage.getItem("catatbiro_cached_stats");
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      pemasukan: 0,
      pengeluaran: 0,
      laba: 0,
    };
  });
  const [showKwitansiDialog, setShowKwitansiDialog] = useState(false);
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
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
  const [showWordImportModal, setShowWordImportModal] = useState(false);
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
    loadData();
  }, [role, activeCrew?.crewId]);

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
      const activeUser = await getActiveUser();
      if (!activeUser) {
        console.warn("[Dashboard] Sesi pengguna belum aktif, mengarahkan ke /auth");
        return navigate("/auth");
      }
      setUser(activeUser);

      // Jalankan query secara paralel agar instan dan satset
      const [tripsRes, remindersRes, keuanganRes] = await Promise.all([
        supabase
          .from("trips")
          .select("*")
          .order("tanggal", { ascending: false }),
        supabase
          .from("reminders")
          .select("id, is_done")
          .eq("is_done", false),
        supabase
          .from("keuangan")
          .select("jumlah, jenis"),
      ]);

      if (tripsRes.error) {
        console.error("[Dashboard] tripsError:", tripsRes.error);
        const errMsg = tripsRes.error.message || "";
        if (tripsRes.error.code === "PGRST301" || errMsg.includes("JWT expired")) {
          console.warn("[Dashboard] Token JWT kedaluwarsa...");
          try {
            localStorage.removeItem("sb-xirxglkwojgbzjyhhdhm-auth-token");
          } catch (e) {}
          toast.error("Sesi Anda telah kedaluwarsa. Silakan masuk kembali.");
          return navigate("/auth");
        }
        throw new Error(errMsg || "Gagal mengambil data trips");
      }

      const tripsData = tripsRes.data || [];
      try {
        localStorage.setItem("catatbiro_cached_trips", JSON.stringify(tripsData));
      } catch {}

      // RBAC Trip-Level: Pemilik melihat seluruh trip; Kru HANYA melihat trip yang secara spesifik ditugaskan
      const visibleTrips = isPemilik
        ? tripsData
        : tripsData.filter((t) => isTripAllowedForActiveCrew(t));

      setTrips(visibleTrips);

      if (visibleTrips.length > 0) {
        const activeTrip = determineActiveTrip(visibleTrips, selectedTripId || currentTrip?.id);
        setCurrentTrip(activeTrip);
      } else {
        setCurrentTrip(null);
      }

      if (!remindersRes.error && remindersRes.data) {
        setReminders(remindersRes.data);
      }

      if (!keuanganRes.error && keuanganRes.data) {
        let pemasukan = 0;
        let pengeluaran = 0;
        keuanganRes.data.forEach((row: any) => {
          if (row.jenis === "pemasukan") pemasukan += Number(row.jumlah || 0);
          else if (row.jenis === "pengeluaran") pengeluaran += Number(row.jumlah || 0);
        });
        const stats = {
          pemasukan,
          pengeluaran,
          laba: pemasukan - pengeluaran,
        };
        setFinancialStats(stats);
        try {
          localStorage.setItem("catatbiro_cached_stats", JSON.stringify(stats));
        } catch {}
      }

      if (Capacitor.isNativePlatform() && tripsData && tripsData.length > 0) {
        tripsData.forEach((t: any) => scheduleTripNotifications(t));
      }
    } catch (error: any) {
      console.error("[Dashboard] Detail loadData error:", error);
      const msg = error?.message || (typeof error === "string" ? error : JSON.stringify(error)) || "Gagal memuat data";
      toast.error(`Gagal memuat data: ${msg}`);
    }
  };

  const handleSelectActiveTrip = (tripId: string) => {
    const selected = trips.find(t => t.id === tripId);
    if (selected) {
      setSelectedTripId(selected.id);
      setCurrentTrip(selected);
      localStorage.setItem("active_trip_id", selected.id);
      toast.info(`Beralih ke trip: ${selected.nama_trip}`);
    }
  };

  const handleApplyRundownToCurrentTrip = async (rundownItems: any[]) => {
    if (!currentTrip) {
      toast.error("Pilih trip aktif terlebih dahulu");
      return;
    }
    const user = await getActiveUser();
    if (!user) {
      toast.error("Sesi pengguna berakhir");
      return;
    }

    try {
      const inserts = rundownItems.map((item) => ({
        trip_id: currentTrip.id,
        user_id: user.id,
        hari_ke: item.hariKe || 1,
        jam_mulai: item.jamMulai,
        jam_selesai: item.jamSelesai,
        judul_acara: item.kegiatan,
        keterangan: item.keterangan && item.keterangan !== item.lokasi
          ? `${item.lokasi} • ${item.keterangan}`
          : item.lokasi || item.keterangan || null,
      }));

      const { error } = await supabase.from("rundown_acara").insert(inserts);
      if (error) throw error;

      toast.success(`${rundownItems.length} jadwal rundown berhasil disimpan ke trip "${currentTrip.nama_trip}"!`);
      await loadRundownData();
      setRundownKey(prev => prev + 1);
    } catch (err: any) {
      console.error("Gagal menyimpan rundown:", err);
      toast.error("Gagal menyimpan rundown: " + (err.message || "Terjadi kesalahan"));
      throw err;
    }
  };

  const loadRundownData = async (): Promise<RundownItem[]> => {
    if (!currentTrip) return [];
    
    try {
      const { data, error } = await supabase
        .from("rundown_acara")
        .select("*")
        .eq("trip_id", currentTrip.id)
        .order("hari_ke", { ascending: true })
        .order("jam_mulai", { ascending: true });

      if (error) throw error;
      const items = (data || []) as RundownItem[];
      setRundownData(items);
      return items;
    } catch (error: any) {
      console.error("Error loading rundown:", error);
      return [];
    }
  };

  const handleAddTrip = async () => {
    if (!canManageTrips) {
      toast.error("Akses Dibatasi: Anda tidak memiliki izin membuat jadwal trip baru.");
      return;
    }
    if (!newTripData.nama_trip || !newTripData.tanggal || !newTripData.tujuan) {
      toast.error("Mohon lengkapi data trip");
      return;
    }

    try {
      const user = await getActiveUser();
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
          keterangan: item.keterangan && item.keterangan !== item.lokasi
            ? `${item.lokasi} • ${item.keterangan}`
            : item.lokasi,
        }));
        await supabase.from("rundown_acara").insert(rundownInserts);
        setPendingRundown(null);
      }

      logCrewActivity({
        kategori: "operasional_trip",
        aksi: `Membuat Jadwal Trip Baru: ${newTripData.nama_trip}`,
        detail: `Tujuan: ${newTripData.tujuan} • Tanggal: ${newTripData.tanggal}`,
        tripName: newTripData.nama_trip,
      });

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

  const handleOpenWordImport = () => {
    setShowWordImportModal(true);
  };

  const handleQuickExpense = async () => {
    if (!canInputPettyCash && !canSeeFinancials) {
      toast.error("Akses Dibatasi: Anda tidak memiliki izin mencatat pengeluaran lapangan.");
      return;
    }
    if (!currentTrip) {
      toast.error("Pilih trip terlebih dahulu");
      return;
    }

    if (!quickExpenseData.keterangan || !quickExpenseData.jumlah) {
      toast.error("Mohon lengkapi data transaksi");
      return;
    }

    try {
      const user = await getActiveUser();
      if (!user) return;

      const finalJenis = canSeeFinancials ? quickExpenseData.jenis : "pengeluaran";
      const numVal = parseFloat(quickExpenseData.jumlah);

      const { error } = await supabase.from("keuangan").insert({
        trip_id: currentTrip.id,
        user_id: user.id,
        keterangan: quickExpenseData.keterangan,
        jumlah: numVal,
        jenis: finalJenis,
      });

      if (error) throw error;

      logCrewActivity({
        kategori: "keuangan_lapangan",
        aksi: `Catat ${finalJenis === "pemasukan" ? "Pemasukan" : "Biaya Lapangan"}: ${quickExpenseData.keterangan}`,
        detail: `Trip: ${currentTrip.nama_trip} • Nominal: Rp ${Math.floor(numVal).toLocaleString("id-ID")}`,
        tripName: currentTrip.nama_trip,
      });

      toast.success("Catatan keuangan tersimpan!");
      setShowQuickExpense(false);
      setQuickExpenseData({
        keterangan: "",
        jumlah: "",
        jenis: "pengeluaran",
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Gagal mencatat transaksi");
    }
  };

  const handleSignOut = async () => {
    try {
      // Panggil signOut tanpa memblokir proses jika server mengembalikan error
      await supabase.auth.signOut().catch((err) => {
        console.warn("[Dashboard] signOut server warning (diabaikan):", err);
      });
    } catch (error: any) {
      console.warn("[Dashboard] signOut error:", error);
    } finally {
      clearAuthCache();
      clearBiroProfileCache();
      // Pastikan seluruh storage sesi lokal selalu bersih
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("sb-") || key.includes("supabase") || key === "active_trip_id")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {}

      setUser(null);
      toast.success("Berhasil keluar dari akun");
      navigate("/auth");
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
        trip: currentTrip,
        tripName: currentTrip.nama_trip,
        tanggal: currentTrip.tanggal,
        tanggalSelesai: currentTrip.tanggal_selesai || undefined,
        tujuan: currentTrip.tujuan,
        nama_kendaraan: currentTrip.nama_kendaraan,
        nomor_polisi: currentTrip.nomor_polisi,
        nama_driver: currentTrip.nama_driver,
        jumlah_penumpang: currentTrip.jumlah_penumpang,
        catatan: currentTrip.catatan,
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
        autoDownload: true,
      });

      toast.dismiss();
      toast.success("PDF rundown resmi dengan kop surat berhasil diunduh!");
    } catch (error) {
      toast.dismiss();
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF");
    }
  };

  const handleShareRundownPDF = async () => {
    if (!currentTrip) {
      toast.error("Trip tidak ditemukan");
      return;
    }

    try {
      // Ambil data terbaru agar item rundown yang baru ditambahkan ikut terbawa.
      const latestRundown = await loadRundownData();
      if (latestRundown.length === 0) {
        toast.error("Belum ada data rundown acara");
        return;
      }

      const groupedRundown = latestRundown.reduce<Record<number, RundownItem[]>>((groups, item) => {
        (groups[item.hari_ke] ||= []).push(item);
        return groups;
      }, {});

      const rundownText = Object.entries(groupedRundown)
        .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
        .map(([day, items]) => [
          `*Hari ${day}*`,
          ...items.map((item) => {
            const details = item.keterangan ? `\n   ${item.keterangan}` : "";
            return `• ${item.jam_mulai} - ${item.jam_selesai} — ${item.judul_acara}${details}`;
          }),
        ].join("\n"))
        .join("\n\n");

      const shareText = `*Rundown Operasional: ${currentTrip.nama_trip}*\n\n📅 Tanggal: ${format(new Date(currentTrip.tanggal), "dd MMMM yyyy", { locale: id })}${currentTrip.tanggal_selesai ? ` s/d ${format(new Date(currentTrip.tanggal_selesai), "dd MMMM yyyy", { locale: id })}` : ""}\n📍 Tujuan: ${currentTrip.tujuan}\n\n${rundownText}\n\nJadwal operasional siap dilaksanakan.\nSalam pariwisata!`;
      const encodedText = encodeURIComponent(shareText);
      const whatsappUrl = `whatsapp://send?text=${encodedText}`;
      const whatsappWebUrl = `https://wa.me/?text=${encodedText}`;

      if (Capacitor.isNativePlatform()) {
        window.location.assign(whatsappUrl);
      } else {
        window.open(whatsappWebUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      toast.error("Gagal membuka WhatsApp");
    }
  };

  const activeRemindersCount = reminders.length;
  const userRole = user?.user_metadata?.role || "owner";
  const roleLabel = userRole === "employee" ? "Karyawan" : userRole === "tl" ? "Team Leader" : "Pemilik";
  const canManageFinance = userRole === "owner" || userRole === "tl";
  const canManageTeam = userRole === "owner";

  return (
    <AuthGuard>
      <NotificationPermission />
      <div className="min-h-screen bg-slate-50 pb-24 safe-top font-sans text-slate-900 lg:pl-64">
        <div className="max-w-md lg:max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
          
          {/* Top Bar Header */}
          <div className="flex items-center justify-between">
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

          {/* RBAC Role Indicator & Switcher Strip */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isPemilik
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                }`}>
                  {isPemilik ? <ShieldCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      Mode {roleName}
                    </span>
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 uppercase font-bold ${
                      isPemilik
                        ? "border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300"
                        : "border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
                    }`}>
                      {role}
                    </Badge>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <Smartphone className="w-3 h-3 text-blue-500" />
                      {currentDevice.deviceName}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                    {isPemilik
                      ? "Hak Akses Penuh: Buku kas laba/rugi, monitor kru & perangkat login, kwitansi & pengaturan biro"
                      : `Bertugas sebagai ${activeCrew.nama} (${activeCrew.jabatan}) • Hanya menu operasional lapangan & kas saku`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {canManageKru && (
                  <Button
                    size="sm"
                    onClick={() => navigate("/manajemen-kru")}
                    className="hidden sm:inline-flex h-8 text-xs font-bold rounded-xl gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Monitor Kru & Device</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleRole}
                  className="h-8 text-xs font-semibold rounded-xl gap-1.5 flex-shrink-0 border-slate-200 dark:border-slate-700 hover:bg-slate-50 shadow-none"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ganti Mode</span>
                </Button>
              </div>
            </div>

            {/* Kru Active Identity Selector Bar */}
            {isKru && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Identitas Kru Aktif:
                  </span>
                  <select
                    value={activeCrew.crewId}
                    onChange={(e) => {
                      switchActiveCrew(e.target.value);
                      const picked = crewList.find((c) => c.id === e.target.value);
                      if (picked) {
                        toast.success(`Identitas Kru diganti ke: ${picked.nama} (${picked.jabatan})`);
                      }
                    }}
                    className="h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 focus:outline-none"
                  >
                    {crewList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama} — {c.jabatan} ({c.kodeKru})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-blue-500" />
                  Perangkat tercatat: <strong className="text-slate-600 dark:text-slate-300">{currentDevice.deviceName} • {currentDevice.os}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Greeting Hero Card with Authentic Indonesian Destination */}
          <GreetingHeader userEmail={user?.email} currentDestination={currentTrip?.tujuan} />

          {/* Pemilik Mode: Financial Metrics Cards */}
          {canSeeFinancials && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Total Omset</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-slate-100">
                  Rp {Math.floor(financialStats.pemasukan).toLocaleString("id-ID")}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold">Total Pemasukan Kas</span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Total Beban</span>
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-slate-100">
                  Rp {Math.floor(financialStats.pengeluaran).toLocaleString("id-ID")}
                </p>
                <span className="text-[10px] text-rose-600 font-semibold">Operasional & Armada</span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Laba Bersih</span>
                  <Coins className="w-4 h-4 text-amber-500" />
                </div>
                <p className={`text-base sm:text-lg lg:text-xl font-black ${financialStats.laba >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  Rp {Math.floor(financialStats.laba).toLocaleString("id-ID")}
                </p>
                <span className="text-[10px] text-slate-500 font-semibold">Net Profit Biro</span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Margin Laba</span>
                  <Sparkles className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-base sm:text-lg lg:text-xl font-black text-blue-600 dark:text-blue-400">
                  {financialStats.pemasukan > 0 ? Math.round((financialStats.laba / financialStats.pemasukan) * 100) : 0}%
                </p>
                <span className="text-[10px] text-slate-500 font-semibold">Efisiensi Usaha</span>
              </div>
            </div>
          )}

          {/* Quick Operations Strip - Role Adaptive */}
          {isPemilik ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => setShowAddTrip(true)}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-blue-400 transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 mb-1">
                  <Bus className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Trip Baru</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/keuangan/new")}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-emerald-400 transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 mb-1">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Kas Masuk</span>
              </button>

              <button
                type="button"
                onClick={() => setShowKwitansiDialog(true)}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-indigo-400 transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 mb-1">
                  <Receipt className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Kwitansi / Inv</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/manajemen-kru")}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 shadow-sm hover:border-indigo-500 transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 mb-1">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">Monitor Kru</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/laporan")}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-purple-400 transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 mb-1">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Laporan</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/destinations")}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-amber-400 transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 mb-1">
                  <Map className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Destinasi</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setShowManifestModal(true)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-blue-400 transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 mb-1">
                  <Bus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Manifest Bus</span>
                <span className="text-[9px] text-slate-400">Denah & Kursi</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-emerald-400 transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 mb-1">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Broadcast WA</span>
                <span className="text-[9px] text-slate-400">Pengumuman Rombongan</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQuickExpense(true)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-rose-400 transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 mb-1">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">+ Biaya Lapangan</span>
                <span className="text-[9px] text-slate-400">Solar, Tol, Tips</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/notesnew")}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm hover:border-amber-400 transition-all active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 mb-1">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Catatan Lapangan</span>
                <span className="text-[9px] text-slate-400">Agenda & Notula</span>
              </button>
            </div>
          )}

          {/* Desktop Responsive 12-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Main Area: Column 1-8 */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Trip Switcher Bar (Jika user memiliki lebih dari 1 trip) */}
              {trips.length > 1 && currentTrip && (
                <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 pl-1 min-w-0">
                    <Bus className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      Pilih Trip Aktif:
                    </span>
                  </div>
                  <Select
                    value={currentTrip.id}
                    onValueChange={handleSelectActiveTrip}
                  >
                    <SelectTrigger className="h-8 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl max-w-[240px] shadow-none">
                      <SelectValue placeholder="Pilih Trip" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[300px]">
                      {trips.map((t) => {
                        const todayStr = format(new Date(), "yyyy-MM-dd");
                        const isTOnGoing = t.tanggal <= todayStr && (!t.tanggal_selesai || t.tanggal_selesai >= todayStr);
                        const isTUpcoming = t.tanggal > todayStr;
                        return (
                          <SelectItem key={t.id} value={t.id} className="text-xs py-1.5">
                            <div className="flex flex-col text-left">
                              <div className="flex items-center gap-1 font-bold">
                                <span className="truncate max-w-[150px]">{t.nama_trip}</span>
                                {isTOnGoing && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-700 font-extrabold uppercase">
                                    Hari Ini
                                  </span>
                                )}
                                {isTUpcoming && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 text-blue-700 font-bold">
                                    Mendatang
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 capitalize truncate max-w-[180px]">
                                {t.tujuan} • {format(new Date(t.tanggal), "dd MMM yyyy", { locale: id })}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Active Trip Card */}
              {currentTrip ? (() => {
                const tripPhoto = getInstantDestinationPhoto(currentTrip.tujuan);
                const todayStr = format(new Date(), "yyyy-MM-dd");
                const isTOnGoing = currentTrip.tanggal <= todayStr && (!currentTrip.tanggal_selesai || currentTrip.tanggal_selesai >= todayStr);
                const isTUpcoming = currentTrip.tanggal > todayStr;

                return (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-sky-950/5 group">
                      
                      {/* Destination Photo Header Banner */}
                      <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-slate-800">
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
                          {isTOnGoing ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              AGENDA TRIP HARI INI
                            </div>
                          ) : isTUpcoming ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-md">
                              <Calendar className="w-3 h-3 text-white" />
                              TRIP MENDATANG
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-700 text-slate-200 shadow-md">
                              RIWAYAT TRIP
                            </div>
                          )}
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

                          {(() => {
                            const assignedCrewForTrip = crewList.filter((c) => {
                              if (c.assignedTripIds && c.assignedTripIds.includes(currentTrip.id)) return true;
                              if (
                                c.assignedTrip &&
                                c.assignedTrip !== "Belum Ditugaskan" &&
                                c.assignedTrip !== "Standby Operasional" &&
                                (currentTrip.nama_trip.toLowerCase().includes(c.assignedTrip.toLowerCase()) ||
                                  c.assignedTrip.toLowerCase().includes(currentTrip.nama_trip.toLowerCase()))
                              ) return true;
                              return false;
                            });

                            return (
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/40 text-white backdrop-blur-xs border border-white/20">
                                  <Users className="w-3 h-3 text-blue-300" />
                                  Kru Bertugas: {assignedCrewForTrip.map((c) => c.nama).join(", ") || "Belum Ditugaskan"}
                                </span>
                                {isPemilik && (
                                  <button
                                    type="button"
                                    onClick={() => navigate("/manajemen-kru?tab=penugasan")}
                                    className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline"
                                  >
                                    Atur Hak Akses TL
                                  </button>
                                )}
                              </div>
                            );
                          })()}
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
                            onClick={() => setShowManifestModal(true)}
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs rounded-xl border-slate-200 dark:border-slate-700 font-medium"
                          >
                            <Bus className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            Kursi Bus
                          </Button>
                          <Button
                            onClick={() => setShowBroadcastModal(true)}
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs rounded-xl border-slate-200 dark:border-slate-700 font-medium text-emerald-700 hover:text-emerald-800"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            Broadcast
                          </Button>
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
                            onClick={() => navigate(`/trips/${currentTrip.id}`)}
                            size="sm"
                            className="h-8 text-xs rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold px-3"
                          >
                            Detail
                          </Button>
                        </div>
                      </div>

                    </div>

                    {/* Mode Kru: Tampilkan Checklist Lapangan 14 Poin */}
                    {isKru && (
                      <TripChecklistCard
                        tripId={currentTrip.id}
                        tripName={currentTrip.nama_trip}
                      />
                    )}
                    
                    {/* Rundown Acara */}
                    <RundownAcara
                      key={`${rundownKey}-${currentTrip.id}`}
                      tripId={currentTrip.id}
                      tripName={currentTrip.nama_trip}
                      tripDestination={currentTrip.tujuan}
                      tripDate={format(new Date(currentTrip.tanggal), "dd MMM yyyy", { locale: id })}
                    />
                  </div>
                );
              })() : null}

              {/* Tampilan Khusus Mode Kru jika belum ada trip yang ditugaskan */}
              {isKru && trips.length === 0 && (
                <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-sm my-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                    <Compass className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Belum Ada Penugasan Trip untuk {activeCrew.nama}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      Anda bertugas sebagai <strong>{activeCrew.jabatan}</strong>. Pemilik Biro belum memasukkan akun Anda ke dalam daftar kru yang berhak mengakses jadwal trip aktif saat ini. Silakan hubungi Pemilik Biro untuk mendapatkan penugasan tour.
                    </p>
                  </div>
                </div>
              )}

              {/* Inspiring Route Catalog (Pesona Indonesia) - Pemilik / Authorized Only */}
              {canManageTrips && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
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

                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

            </div>

            {/* Sidebar Column: Column 9-12 (Pusat Keuangan & Komisi / Kas Lapangan) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Pemilik: Ringkasan Monitor Kru, Perangkat Login & Audit Aktivitas */}
              {canManageKru && (() => {
                const allCrews = getCrewMembers();
                const allDevices = getDeviceSessions();
                const recentLogs = getActivityLogs().slice(0, 3);
                const onlineCount = allCrews.filter((c) => c.status === "online" || c.status === "bertugas").length;
                const activeDevCount = allDevices.filter((d) => d.isActive).length;

                return (
                  <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Monitor Kru & Perangkat
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            Status personel, device login & log aktivitas
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full">
                        {onlineCount}/{allCrews.length} Aktif
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 font-semibold block">Device Terhubung</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                          {activeDevCount} Perangkat
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 font-semibold block">Audit Aktivitas</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                          <Activity className="w-3.5 h-3.5 text-amber-600" />
                          {getActivityLogs().length} Aksi
                        </span>
                      </div>
                    </div>

                    {recentLogs.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Aktivitas Kru Terbaru:
                        </p>
                        {recentLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px]"
                          >
                            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                              <span className="truncate">{log.crewName}</span>
                              <span className="text-[9px] text-slate-400 font-medium flex-shrink-0 ml-1">
                                {log.deviceUsed.split("•")[0]}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {log.aksi}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      size="sm"
                      onClick={() => navigate("/manajemen-kru")}
                      className="w-full h-8 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Buka Menu Khusus Monitor Kru & RBAC</span>
                    </Button>
                  </div>
                );
              })()}

              {/* Import Rundown Dokumen Word */}
              <div 
                onClick={() => setShowWordImportModal(true)}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-all group shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shadow-2xs flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>Import Rundown Dokumen Word</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold">.docx</span>
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Upload Word / tempel itinerary, AI rangkum ke jadwal trip
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>

              {/* Pemilik: Kartu Penerbitan Kwitansi / Invoice Resmi */}
              {canPrintKwitansi && (
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Kwitansi & Invoice Resmi
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Kop surat, stempel digital & terbilang rupiah otomatis
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Terbitkan tanda terima pembayaran resmi dan invoice tagihan untuk instansi atau pemesan rombongan.
                  </p>

                  <Button
                    size="sm"
                    onClick={() => setShowKwitansiDialog(true)}
                    className="w-full h-8 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Terbitkan Dokumen PDF</span>
                  </Button>
                </div>
              )}

              {/* Kru: Petty Cash Tracker TL */}
              {isKru && currentTrip && (
                <PettyCashTracker
                  tripId={currentTrip.id}
                  tripName={currentTrip.nama_trip}
                />
              )}

              {/* Analitik Cashback / Komisi Mitra */}
              <CashbackTrackerWidget
                tripId={currentTrip?.id}
                tripName={currentTrip?.nama_trip}
              />
            </div>

          </div>

          {/* Quick Expense Dialog */}
          <Dialog open={showQuickExpense} onOpenChange={setShowQuickExpense}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  {!canSeeFinancials ? "Catat Pengeluaran Operasional Lapangan" : "Catat Transaksi Operasional"}
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
                {canSeeFinancials ? (
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
                ) : (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 text-xs text-rose-700 font-semibold">
                    Jenis Transaksi: Pengeluaran Biaya Lapangan (Oleh {activeCrew.nama})
                  </div>
                )}
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
      <ImportWordRundownDialog
        open={showWordImportModal}
        onOpenChange={setShowWordImportModal}
        defaultTripId={currentTrip?.id}
        defaultTripName={currentTrip?.nama_trip}
        onSuccess={loadData}
      />
      <KwitansiInvoiceDialog
        open={showKwitansiDialog}
        onOpenChange={setShowKwitansiDialog}
        defaultTripId={currentTrip?.id}
      />
      <BusSeatManifestModal
        open={showManifestModal}
        onOpenChange={setShowManifestModal}
        tripId={currentTrip?.id || (trips[0]?.id || "")}
        tripInfo={{
          nama_trip: currentTrip?.nama_trip,
          tujuan: currentTrip?.tujuan,
          nama_kendaraan: currentTrip?.nama_kendaraan,
          nomor_polisi: currentTrip?.nomor_polisi,
          nama_driver: currentTrip?.nama_driver,
        }}
      />
      <WhatsAppBroadcastModal
        open={showBroadcastModal}
        onOpenChange={setShowBroadcastModal}
        tripInfo={{
          nama_trip: currentTrip?.nama_trip,
          tujuan: currentTrip?.tujuan,
          nama_driver: currentTrip?.nama_driver,
          nomor_polisi: currentTrip?.nomor_polisi,
          nama_kendaraan: currentTrip?.nama_kendaraan,
        }}
      />
    </AuthGuard>
  );
};

export default Dashboard;
