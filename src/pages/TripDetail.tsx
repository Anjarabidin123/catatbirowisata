import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CashbackTrackerWidget } from "@/components/CashbackTrackerWidget";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import NoteDialog from "@/components/NoteDialog";
import { TripPriceNoteDialog } from "@/components/TripPriceNoteDialog";
import { TripDestinationsCard } from "@/components/TripDestinationsCard";

// Lazy load tab components
const RundownAcara = lazy(() => import("@/components/RundownAcara").then(m => ({ default: m.RundownAcara })));
const TripFinancialTab = lazy(() => import("@/components/TripFinancialTab").then(m => ({ default: m.TripFinancialTab })));
const TripDocumentationTab = lazy(() => import("@/components/TripDocumentationTab").then(m => ({ default: m.TripDocumentationTab })));
const VehicleTab = lazy(() => import("@/components/VehicleTab").then(m => ({ default: m.VehicleTab })));
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Plus,
  StickyNote,
  Bus,
  Users,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  MessageSquare,
  Receipt,
  CheckSquare,
  Wallet,
  ShieldCheck,
  Menu,
  Pencil,
  Check,
  Clock,
  Camera,
  Compass,
  Layers,
  Download,
  FileText,
} from "lucide-react";
import { exportTripRundownPDF } from "@/utils/rundownExport";
import { generateReportPDF } from "@/utils/reportPdfGenerator";
import { savePdf } from "@/utils/pdfSaver";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatRupiah } from "@/lib/utils";
import { BusSeatManifestModal } from "@/components/BusSeatManifestModal";
import { WhatsAppBroadcastModal } from "@/components/WhatsAppBroadcastModal";
import { TripChecklistCard } from "@/components/TripChecklistCard";
import { TripCrewAssignmentCard } from "@/components/TripCrewAssignmentCard";
import { PettyCashTracker } from "@/components/PettyCashTracker";
import { KwitansiInvoiceDialog } from "@/components/KwitansiInvoiceDialog";
import { EditTripDialog } from "@/components/EditTripDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/contexts/RoleContext";

interface Trip {
  id: string;
  nama_trip: string;
  tanggal: string;
  tanggal_selesai: string | null;
  tujuan: string;
  catatan: string | null;
  nama_kendaraan: string | null;
  jumlah_penumpang: number | null;
  nomor_polisi: string | null;
  nama_driver: string | null;
  budget_estimasi: number | null;
}

interface Note {
  id: string;
  judul: string;
  konten: string;
  created_at: string;
}

interface PriceNote {
  id: string;
  keterangan: string;
  jumlah: number;
  catatan?: string;
}

const TripDetail = () => {
  const { id: tripId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedTab = (location.state as { activeTab?: string } | null)?.activeTab;
  const validTabs = ["acuan", "operasional", "kendaraan", "keuangan", "rundown", "catatan", "dokumentasi"];
  const initialTab =
    requestedTab && validTabs.includes(requestedTab) ? requestedTab : undefined;
  const { role, isPemilik, isKru, roleName, hasPermission } = useRole();
  const canSeeFinancials = hasPermission("rule_buku_kas_laba");
  const canPrintKwitansi = hasPermission("rule_kwitansi_invoice");
  const canEditNotes = hasPermission("rule_rundown_catatan");
  const [activeTab, setActiveTab] = useState<string>(() => initialTab || (isKru ? "operasional" : "acuan"));
  const [trip, setTrip] = useState<Trip | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [priceNotes, setPriceNotes] = useState<PriceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [priceNoteDialogOpen, setPriceNoteDialogOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [editingPriceNote, setEditingPriceNote] = useState<PriceNote | undefined>();
  const [priceNotesExpanded, setPriceNotesExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [kwitansiModalOpen, setKwitansiModalOpen] = useState(false);
  const [editTripDialogOpen, setEditTripDialogOpen] = useState(false);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  const handleDownloadRundownPDF = async () => {
    if (!tripId) return;
    try {
      toast.loading("Menyiapkan PDF Rundown Acara...", { id: "gen-rundown" });
      await exportTripRundownPDF(tripId);
      toast.dismiss("gen-rundown");
      toast.success("PDF Rundown Acara berhasil diunduh!");
    } catch (err: any) {
      toast.dismiss("gen-rundown");
      toast.error(err?.message || "Gagal membuat PDF Rundown. Pastikan ada data rundown acara.");
    }
  };

  const handleDownloadLaporanTripPDF = async () => {
    if (!trip || !tripId) return;
    try {
      toast.loading("Menyiapkan PDF Laporan Trip...", { id: "gen-lap-trip" });
      const { data: finances } = await supabase
        .from("keuangan")
        .select("*")
        .eq("trip_id", tripId);

      const doc = await generateReportPDF({
        trips: [trip as any],
        keuangan: finances || [],
        filterTripId: tripId,
        periodeText: `Trip ${trip.nama_trip} - ${trip.tujuan}`,
      });

      const cleanTitle = (trip.nama_trip || "Trip").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `Laporan_Trip_${cleanTitle}_${format(new Date(), "yyyyMMdd")}.pdf`;
      await savePdf(doc, fileName);

      toast.dismiss("gen-lap-trip");
      toast.success("PDF Laporan Trip berhasil diunduh!");
    } catch (err: any) {
      toast.dismiss("gen-lap-trip");
      toast.error(err?.message || "Gagal membuat PDF Laporan.");
    }
  };

  const tabsConfig = [
    {
      id: "acuan",
      label: "Perencanaan",
      shortLabel: "Perencanaan",
      desc: "Destinasi wisata & rincian harga paket",
      icon: Compass,
      badge: null,
      badgeColor: "",
      show: true,
    },
    {
      id: "keuangan",
      label: "Buku Kas Biro",
      shortLabel: "Buku Kas",
      desc: "Pemasukan, laba & riwayat pembukuan kas",
      icon: Wallet,
      badge: "Owner",
      badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300",
      show: canSeeFinancials,
    },
    {
      id: "operasional",
      label: "Operasional & Kas Lapangan",
      shortLabel: "Operasional",
      desc: "Petty cash kru & checklist 14 poin",
      icon: CheckSquare,
      badge: isKru ? "Kru Utama" : null,
      badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300",
      show: true,
    },
    {
      id: "kendaraan",
      label: "Kendaraan",
      shortLabel: "Kendaraan",
      desc: "Armada bus, nomor polisi & pengemudi",
      icon: Bus,
      badge: null,
      badgeColor: "",
      show: true,
    },
    {
      id: "rundown",
      label: "Rundown Acara",
      shortLabel: "Rundown",
      desc: "Jadwal detail & timeline agenda perjalanan",
      icon: Clock,
      badge: null,
      badgeColor: "",
      show: true,
    },
    {
      id: "catatan",
      label: "Catatan",
      shortLabel: "Catatan",
      desc: "Briefing, notulensi & catatan kegiatan",
      icon: StickyNote,
      badge: null,
      badgeColor: "",
      show: true,
    },
    {
      id: "dokumentasi",
      label: "Dokumentasi",
      shortLabel: "Dokumentasi",
      desc: "Galeri foto & dokumentasi kegiatan",
      icon: Camera,
      badge: null,
      badgeColor: "",
      show: true,
    },
  ];

  const visibleTabs = tabsConfig.filter((t) => t.show);
  const activeTabConfig = visibleTabs.find((t) => t.id === activeTab) || visibleTabs[0] || tabsConfig[0];
  const ActiveTabIcon = activeTabConfig.icon;

  const toggleNote = (id: string) => {
    setOpenNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (requestedTab && validTabs.includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (tripId) {
      loadTripData();

      const channel = supabase
        .channel(`trip-${tripId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notes", filter: `trip_id=eq.${tripId}` },
          () => loadNotes()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trip_price_notes", filter: `trip_id=eq.${tripId}` },
          () => loadPriceNotes()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tripId]);

  const loadTripData = async () => {
    try {
      const user = await getActiveUser();
      if (!user || !tripId) return;

      let tripData = null;
      const { data: directTrip, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .maybeSingle();

      if (directTrip) {
        tripData = directTrip;
      } else {
        const { data: userTrip } = await supabase
          .from("trips")
          .select("*")
          .eq("id", tripId)
          .eq("user_id", user.id)
          .maybeSingle();
        tripData = userTrip;
      }

      if (!tripData) throw tripError || new Error("Trip tidak ditemukan");
      setTrip(tripData);

      await Promise.all([loadNotes(user.id), loadPriceNotes(user.id)]);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal memuat data trip");
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async (userIdParam?: string) => {
    try {
      const userId = userIdParam || (await getActiveUser())?.id;
      if (!userId || !tripId) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("trip_id", tripId)
        .not("judul", "ilike", "[%]")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error("Error loading notes:", error);
    }
  };

  const loadPriceNotes = async (userIdParam?: string) => {
    try {
      const userId = userIdParam || (await getActiveUser())?.id;
      if (!userId || !tripId) return;

      const { data, error } = await supabase
        .from("trip_price_notes")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPriceNotes(data || []);
    } catch (error: any) {
      console.error("Error loading price notes:", error);
    }
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

  if (!trip) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <p>Trip tidak ditemukan</p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 safe-top lg:pl-64">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Top Bar: Navigasi & Pencarian Cepat */}
          <div className="flex items-center gap-3 mb-5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/dashboard"))}
              className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-2xs hover:bg-slate-100"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5 text-slate-800 dark:text-slate-100" />
            </Button>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari catatan, destinasi, pos keuangan trip..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-2xs"
              />
            </div>
          </div>

          {/* Trip Header Card Ringkas & Hemat Tempat */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/90 dark:border-slate-700 shadow-xs mb-5 space-y-3">
            {/* Baris Judul & Dropdown Menu di Pojok Atas */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug capitalize break-normal hyphens-none">
                  {trip.nama_trip}
                </h1>
              </div>

              {/* Action Buttons di Pojok Kanan Atas: Unduh PDF & Aksi Cepat */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Tombol Utama: Unduh PDF Trip */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span className="hidden sm:inline">Unduh PDF</span>
                      <span className="sm:hidden">PDF</span>
                      <ChevronDown className="w-3 h-3 text-white/80" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 p-1.5 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-50">
                    <DropdownMenuLabel className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                      Unduh Dokumen PDF Trip
                    </DropdownMenuLabel>
                    
                    <DropdownMenuItem
                      onClick={handleDownloadRundownPDF}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div>
                        <div className="font-bold">PDF Rundown Acara Resmi</div>
                        <div className="text-[10px] text-slate-400 font-normal">Jadwal kegiatan bertanda tangan</div>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setManifestModalOpen(true)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-700 transition-colors"
                    >
                      <Bus className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <div className="font-bold">PDF Manifest Kursi Bus</div>
                        <div className="text-[10px] text-slate-400 font-normal">Denah kursi & nama penumpang</div>
                      </div>
                    </DropdownMenuItem>

                    {canPrintKwitansi && (
                      <DropdownMenuItem
                        onClick={() => setKwitansiModalOpen(true)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 transition-colors"
                      >
                        <Receipt className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <div>
                          <div className="font-bold">PDF Kwitansi / Invoice</div>
                          <div className="text-[10px] text-slate-400 font-normal">Kwitansi resmi dengan cap biro</div>
                        </div>
                      </DropdownMenuItem>
                    )}

                    {canSeeFinancials && (
                      <DropdownMenuItem
                        onClick={handleDownloadLaporanTripPDF}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-700 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <div>
                          <div className="font-bold">PDF Laporan Keuangan Trip</div>
                          <div className="text-[10px] text-slate-400 font-normal">Rekap kas masuk, keluar & laba</div>
                        </div>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Dropdown Menu Aksi Trip */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs gap-1 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      title="Aksi Cepat Trip"
                    >
                      <span>Aksi</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-50">
                    <DropdownMenuLabel className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                      Aksi & Operasional Trip
                    </DropdownMenuLabel>
                    
                    <DropdownMenuItem
                      onClick={() => setManifestModalOpen(true)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-700 transition-colors"
                    >
                      <Bus className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span>Manifest Kursi Bus</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setBroadcastModalOpen(true)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Broadcast WhatsApp</span>
                    </DropdownMenuItem>

                    {canPrintKwitansi && (
                      <DropdownMenuItem
                        onClick={() => setKwitansiModalOpen(true)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 transition-colors"
                      >
                        <Receipt className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span>Cetak Kwitansi / Inv</span>
                      </DropdownMenuItem>
                    )}

                    {canSeeFinancials && (
                      <DropdownMenuItem
                        onClick={() => setActiveTab("keuangan")}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-700 transition-colors"
                      >
                        <Wallet className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>Buka Buku Kas Biro</span>
                      </DropdownMenuItem>
                    )}

                    {canEditNotes && (
                      <>
                        <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                        <DropdownMenuItem
                          onClick={() => setEditTripDialogOpen(true)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-700 transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Edit Informasi Trip</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Meta Badges Ringkas & Jelas */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold text-xs border border-blue-200 dark:border-blue-800">
                <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>
                  {format(new Date(trip.tanggal), "dd MMMM yyyy", { locale: id })}
                  {trip.tanggal_selesai && (
                    <> - {format(new Date(trip.tanggal_selesai), "dd MMMM yyyy", { locale: id })}</>
                  )}
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-bold text-xs border border-rose-200 dark:border-rose-800 capitalize">
                <MapPin className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                <span>{trip.tujuan}</span>
              </div>

              {trip.nama_kendaraan && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold text-xs border border-amber-200 dark:border-amber-800">
                  <Bus className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>
                    {trip.nama_kendaraan}
                    {trip.nomor_polisi ? ` (${trip.nomor_polisi})` : ""}
                  </span>
                </div>
              )}

              {trip.nama_driver && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                  <Users className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Kru: {trip.nama_driver}</span>
                </div>
              )}

              {trip.jumlah_penumpang && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold text-xs border border-purple-200 dark:border-purple-800">
                  <Users className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                  <span>{trip.jumlah_penumpang} Penumpang</span>
                </div>
              )}

              {canSeeFinancials && trip.budget_estimasi && (
                <button type="button" onClick={() => setActiveTab("keuangan")} title="Klik untuk membuka Buku Kas Biro" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-bold text-xs border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors cursor-pointer">
                  <Wallet className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span>Budget: {formatRupiah(Number(trip.budget_estimasi))} (Buka Kas →)</span>
                </button>
              )}
            </div>

            {trip.catatan && (
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                Catatan Acuan: {trip.catatan}
              </div>
            )}
          </div>


          {/* Role-Adaptive Navbar Tabs (Pills Swipeable Native Style - Halus & Rapi) */}
          <Tabs key={role} value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Navigasi Tab Swipeable Halus Tanpa Scrollbar Kasar */}
            <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1 mb-4">
              {visibleTabs.map((tab) => {
                const isCurrent = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-white" : "text-blue-600"}`} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                          isCurrent ? "bg-white/20 text-white" : tab.badgeColor
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Acuan / Catatan Sebelum Keberangkatan */}
            <TabsContent value="acuan" className="space-y-4">
              <TripDestinationsCard tripId={tripId!} tripName={trip.nama_trip} />
              
              <Card className="overflow-hidden border border-slate-300 dark:border-slate-800 shadow-xs">
                <Collapsible open={priceNotesExpanded} onOpenChange={setPriceNotesExpanded}>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">Catatan Harga Paket & Perjanjian</h2>
                      <div className="flex gap-2">
                        {canEditNotes && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPriceNote(undefined);
                              setPriceNoteDialogOpen(true);
                            }}
                            className="h-8 text-xs font-bold border-slate-300"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Tambah
                          </Button>
                        )}
                        <CollapsibleTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            {priceNotesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {priceNotes.length > 0 ? (
                          <div className="space-y-2">
                            {priceNotes.map((note) => (
                              <div key={note.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-start gap-3">
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">{note.keterangan}</p>
                                  <p className="text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">
                                    {formatRupiah(Number(note.jumlah))}
                                    {note.catatan && <span className="text-slate-500 font-normal text-xs ml-2">({note.catatan})</span>}
                                  </p>
                                </div>
                                {canEditNotes && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingPriceNote(note);
                                      setPriceNoteDialogOpen(true);
                                    }}
                                    className="h-7 px-2.5 text-xs font-semibold"
                                  >
                                    Edit
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {trip.catatan ? (
                              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                    <span>📋 Catatan Acuan dari Pembuatan Trip:</span>
                                  </span>
                                  <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded-full font-bold">
                                    Tersimpan
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200/60 leading-relaxed">
                                  "{trip.catatan}"
                                </p>
                                {canEditNotes && (
                                  <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => {
                                      setEditingPriceNote({
                                        id: "",
                                        keterangan: "Paket Rombongan (Acuan Trip)",
                                        jumlah: Number(trip.budget_estimasi || 0),
                                        catatan: trip.catatan || "",
                                      });
                                      setPriceNoteDialogOpen(true);
                                    }}
                                    className="w-full h-auto min-h-[36px] py-2 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-1.5 shadow-2xs whitespace-normal text-center leading-snug cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Masukkan Catatan Ini ke Rincian Harga Resmi</span>
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <p className="text-slate-400 text-xs text-center py-4">Belum ada catatan harga tersimpan</p>
                            )}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </Card>

              {/* Shortcut Cepat Buka Kas & Laba untuk Owner */}
              {canSeeFinancials && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Pembukuan Kas Masuk & Keluar</span>
                    </p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      Lihat rincian DP/pelunasan paket dan seluruh pengeluaran operasional trip ini.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => setActiveTab("keuangan")}
                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex-shrink-0 shadow-2xs gap-1"
                  >
                    <span>Buka Kas</span>
                    <span>→</span>
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Tab: Operasional Lapangan (Checklist 14 Poin & Petty Cash TL) */}
            <TabsContent value="operasional" className="space-y-4">
              <TripCrewAssignmentCard tripId={tripId!} tripName={trip.nama_trip} />
              <TripChecklistCard tripId={tripId!} tripName={trip.nama_trip} />
              <PettyCashTracker tripId={tripId!} tripName={trip.nama_trip} />
            </TabsContent>

            {/* Tab 2: Kendaraan */}
            <TabsContent value="kendaraan">
              <Suspense fallback={<div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
                <VehicleTab tripId={tripId!} />
              </Suspense>
            </TabsContent>

            {/* Tab 3: Keuangan (Khusus Pemilik Biro) */}
            {canSeeFinancials && (
              <TabsContent value="keuangan" className="space-y-4">
                <Suspense fallback={<div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
                  <TripFinancialTab tripId={tripId!} />
                  <CashbackTrackerWidget tripId={tripId} tripName={trip.nama_trip} />
                </Suspense>
              </TabsContent>
            )}

            {/* Tab 4: Rundown */}
            <TabsContent value="rundown">
              <Suspense fallback={<div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
                <RundownAcara
                  tripId={tripId!}
                  tripName={trip?.nama_trip}
                  tripDestination={trip?.tujuan}
                  tripDate={trip?.tanggal ? format(new Date(trip.tanggal), "dd MMM yyyy", { locale: id }) : undefined}
                />
              </Suspense>
            </TabsContent>

            {/* Tab 5: Catatan Kegiatan */}
            <TabsContent value="catatan" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Catatan Kegiatan & Briefing</h2>
                {canEditNotes && (
                  <Button
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-8 px-3 rounded-xl"
                    onClick={() => setNoteDialogOpen(true)}
                    size="sm"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Tambah Catatan
                  </Button>
                )}
              </div>

              {notes.length === 0 ? (
                <Card className="p-8 text-center border border-slate-200 dark:border-slate-800">
                  <StickyNote className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-semibold text-xs mb-3">Belum ada catatan kegiatan</p>
                  {canEditNotes && (
                    <Button
                      onClick={() => setNoteDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-4 rounded-xl"
                    >
                      + Tambah Catatan Pertama
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => {
                    const isOpen = !!openNotes[note.id];
                    return (
                      <Card key={note.id} className="p-4 border border-slate-300/90 dark:border-slate-700 shadow-2xs transition-all hover:shadow-xs">
                        <div 
                          className="flex justify-between items-start gap-2 cursor-pointer select-none"
                          onClick={() => toggleNote(note.id)}
                        >
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex-1 hover:text-blue-600 transition-colors text-sm">
                            {note.judul}
                          </h3>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className={`h-7 w-7 rounded-full transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-blue-600 bg-blue-50 dark:bg-blue-950" : "text-slate-400"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNote(note.id);
                            }}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>

                        {!isOpen ? (
                          <div 
                            className="mt-1 cursor-pointer group"
                            onClick={() => toggleNote(note.id)}
                          >
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 whitespace-pre-line leading-relaxed">
                              {note.konten}
                            </p>
                            <div className="flex items-center justify-between mt-2 pt-1.5 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                              <span>{format(new Date(note.created_at), "dd MMM yyyy, HH:mm", { locale: id })}</span>
                              <span className="text-xs text-blue-600 font-bold flex items-center gap-1 group-hover:underline">
                                Buka Rincian <ChevronDown className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <div className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 font-medium select-text break-words">
                              {note.konten}
                            </div>
                            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                              <span>Dibuat: {format(new Date(note.created_at), "dd MMM yyyy, HH:mm", { locale: id })}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-slate-500 hover:text-slate-900 gap-1 font-semibold"
                                onClick={() => toggleNote(note.id)}
                              >
                                <span>Tutup</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Tab 6: Dokumentasi */}
            <TabsContent value="dokumentasi">
              <Suspense fallback={<div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
                <TripDocumentationTab tripId={tripId!} tripName={trip?.nama_trip} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <NoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          tripId={tripId}
          onSuccess={loadNotes}
        />

        <TripPriceNoteDialog
          open={priceNoteDialogOpen}
          onOpenChange={setPriceNoteDialogOpen}
          tripId={tripId!}
          note={editingPriceNote}
          onSuccess={loadPriceNotes}
        />

        <BusSeatManifestModal
          open={manifestModalOpen}
          onOpenChange={setManifestModalOpen}
          tripId={tripId!}
          tripInfo={{
            nama_trip: trip.nama_trip,
            tujuan: trip.tujuan,
            nama_kendaraan: trip.nama_kendaraan,
            nomor_polisi: trip.nomor_polisi,
            nama_driver: trip.nama_driver,
          }}
        />

        <WhatsAppBroadcastModal
          open={broadcastModalOpen}
          onOpenChange={setBroadcastModalOpen}
          tripInfo={{
            nama_trip: trip.nama_trip,
            tujuan: trip.tujuan,
            nama_driver: trip.nama_driver,
            nomor_polisi: trip.nomor_polisi,
            nama_kendaraan: trip.nama_kendaraan,
          }}
        />

        <KwitansiInvoiceDialog
          open={kwitansiModalOpen}
          onOpenChange={setKwitansiModalOpen}
          defaultTripId={tripId}
        />

        {trip && (
          <EditTripDialog
            open={editTripDialogOpen}
            onOpenChange={setEditTripDialogOpen}
            trip={trip}
            onSuccess={loadTripData}
          />
        )}

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default TripDetail;
