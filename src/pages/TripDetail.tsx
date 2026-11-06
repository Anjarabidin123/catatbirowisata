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
  Search,
  MessageSquare,
  Receipt,
  CheckSquare,
  Wallet,
  ShieldCheck,
} from "lucide-react";
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
  const [trip, setTrip] = useState<Trip | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [priceNotes, setPriceNotes] = useState<PriceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [priceNoteDialogOpen, setPriceNoteDialogOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [editingPriceNote, setEditingPriceNote] = useState<PriceNote | undefined>();
  const [priceNotesExpanded, setPriceNotesExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [kwitansiModalOpen, setKwitansiModalOpen] = useState(false);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  const toggleNote = (id: string) => {
    setOpenNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .eq("user_id", user.id)
        .single();

      if (tripError) throw tripError;
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
        .eq("user_id", userId)
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
        .eq("user_id", userId)
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 safe-top lg:pl-64">
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

          {/* Trip Header Eksekutif Desktop */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/90 dark:border-slate-700 shadow-xs mb-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {trip.nama_trip}
                  </h1>
                </div>

                {/* Meta Badges Tebal & Berwarna Tegas */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold text-xs border border-blue-200 dark:border-blue-800">
                    <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>
                      {format(new Date(trip.tanggal), "dd MMMM yyyy", { locale: id })}
                      {trip.tanggal_selesai && (
                        <> - {format(new Date(trip.tanggal_selesai), "dd MMMM yyyy", { locale: id })}</>
                      )}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-bold text-xs border border-rose-200 dark:border-rose-800 capitalize">
                    <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{trip.tujuan}</span>
                  </div>

                  {trip.nama_kendaraan && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold text-xs border border-amber-200 dark:border-amber-800">
                      <Bus className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>
                        {trip.nama_kendaraan}
                        {trip.nomor_polisi ? ` (${trip.nomor_polisi})` : ""}
                      </span>
                    </div>
                  )}

                  {trip.nama_driver && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                      <Users className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Kru: {trip.nama_driver}</span>
                    </div>
                  )}

                  {trip.jumlah_penumpang && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold text-xs border border-purple-200 dark:border-purple-800">
                      <Users className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span>{trip.jumlah_penumpang} Penumpang</span>
                    </div>
                  )}

                  {canSeeFinancials && trip.budget_estimasi && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-bold text-xs border border-teal-200 dark:border-teal-800">
                      <Wallet className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span>Budget: {formatRupiah(Number(trip.budget_estimasi))}</span>
                    </div>
                  )}
                </div>

                {trip.catatan && (
                  <div className="pt-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    Catatan Acuan: {trip.catatan}
                  </div>
                )}
              </div>

              {/* Strip Tombol Operasional Terintegrasi di Kanan Desktop */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0 pt-2 lg:pt-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManifestModalOpen(true)}
                  className="h-10 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-2xs gap-2 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-800 dark:text-slate-200"
                >
                  <Bus className="w-4 h-4 text-blue-600" />
                  <span>Manifest Bus</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBroadcastModalOpen(true)}
                  className="h-10 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-2xs gap-2 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-800 dark:text-slate-200"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Broadcast WA</span>
                </Button>

                {canPrintKwitansi && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setKwitansiModalOpen(true)}
                    className="h-10 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-2xs gap-2 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-800 dark:text-slate-200"
                  >
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <span>Kwitansi / Inv</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Role-Adaptive Navbar Tabs */}
          <Tabs key={role} defaultValue={initialTab || (isKru ? "operasional" : "acuan")} className="w-full">
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex w-auto mb-5 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <TabsTrigger value="acuan" className="text-xs font-bold px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs transition-all whitespace-nowrap">
                  Perencanaan
                </TabsTrigger>
                <TabsTrigger value="operasional" className="text-xs font-bold px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs transition-all whitespace-nowrap">
                  Operasional & Kas Lapangan
                  {isKru && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">Utama</span>}
                </TabsTrigger>
                <TabsTrigger value="kendaraan" className="text-xs font-bold px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs transition-all whitespace-nowrap">
                  Kendaraan
                </TabsTrigger>
                {canSeeFinancials && (
                  <TabsTrigger value="keuangan" className="text-xs font-bold px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs transition-all whitespace-nowrap">
                    Buku Kas Biro
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold">Owner</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="rundown" className="text-xs font-bold px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs transition-all whitespace-nowrap">
                  Rundown
                </TabsTrigger>
                <TabsTrigger value="catatan" className="text-xs font-bold px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs transition-all whitespace-nowrap">
                  Catatan
                </TabsTrigger>
                <TabsTrigger value="dokumentasi" className="text-xs font-bold px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs transition-all whitespace-nowrap">
                  Dokumentasi
                </TabsTrigger>
              </TabsList>
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
                          <p className="text-slate-400 text-xs text-center py-4">Belum ada catatan harga tersimpan</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </Card>
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

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default TripDetail;
