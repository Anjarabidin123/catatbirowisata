import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
      <div className="min-h-screen bg-background pb-20 safe-top lg:pl-64">
        <div className="max-w-lg lg:max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/trips")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <Input
                placeholder="Cari catatan, destinasi, keuangan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Trip Header */}
          <div className="ios-card p-5 mb-6">
            <Collapsible open={detailsExpanded} onOpenChange={setDetailsExpanded}>
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl font-bold flex-1">{trip.nama_trip}</h1>
                <CollapsibleTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    {detailsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </Button>
                </CollapsibleTrigger>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(new Date(trip.tanggal), "dd MMMM yyyy", { locale: id })}
                  {trip.tanggal_selesai && (
                    <> - {format(new Date(trip.tanggal_selesai), "dd MMMM yyyy", { locale: id })}</>
                  )}
                </div>

                <div className="flex items-center text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-2" />
                  {trip.tujuan}
                </div>
              </div>

              <CollapsibleContent>
                <div className="space-y-2 mt-2 pt-2 border-t">
                  {trip.nama_kendaraan && (
                    <div className="flex items-center text-muted-foreground">
                      <Bus className="w-4 h-4 mr-2" />
                      {trip.nama_kendaraan}
                      {trip.nomor_polisi && ` - ${trip.nomor_polisi}`}
                      {trip.nama_driver && ` (Kru: ${trip.nama_driver})`}
                    </div>
                  )}

                  {trip.jumlah_penumpang && (
                    <div className="flex items-center text-muted-foreground">
                      <Users className="w-4 h-4 mr-2" />
                      {trip.jumlah_penumpang} penumpang
                    </div>
                  )}

                  {canSeeFinancials && trip.budget_estimasi && (
                    <div className="flex items-center text-muted-foreground">
                      <span className="mr-2">💰</span>
                      Budget: {formatRupiah(Number(trip.budget_estimasi))}
                    </div>
                  )}

                  {trip.catatan && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">{trip.catatan}</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Quick Operations Strip for Field & Biro */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManifestModalOpen(true)}
              className="h-9 text-xs rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs font-semibold gap-1.5 hover:border-blue-400"
            >
              <Bus className="w-3.5 h-3.5 text-blue-600" />
              <span>Manifest Bus</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBroadcastModalOpen(true)}
              className="h-9 text-xs rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs font-semibold gap-1.5 hover:border-emerald-400"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Broadcast WA</span>
            </Button>

            {canPrintKwitansi ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setKwitansiModalOpen(true)}
                className="h-9 text-xs rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs font-semibold gap-1.5 hover:border-indigo-400"
              >
                <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kwitansi / Inv</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const el = document.querySelector('[data-radix-collection-item][value="operasional"]') as HTMLElement;
                  if (el) el.click();
                }}
                className="h-9 text-xs rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs font-semibold gap-1.5 hover:border-emerald-400"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Checklist & Kas</span>
              </Button>
            )}
          </div>

          {/* Role-Adaptive Navbar Tabs - Horizontal scroll */}
          <Tabs key={role} defaultValue={isKru ? "operasional" : "acuan"} className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto mb-4 gap-1">
                <TabsTrigger value="acuan" className="text-xs whitespace-nowrap">Perencanaan</TabsTrigger>
                <TabsTrigger value="operasional" className="text-xs whitespace-nowrap">
                  Operasional & Kas TL
                  {isKru && <span className="ml-1 px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">Utama</span>}
                </TabsTrigger>
                <TabsTrigger value="kendaraan" className="text-xs whitespace-nowrap">Kendaraan</TabsTrigger>
                {canSeeFinancials && (
                  <TabsTrigger value="keuangan" className="text-xs whitespace-nowrap">
                    Buku Kas Biro
                    <span className="ml-1 px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">Owner</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="rundown" className="text-xs whitespace-nowrap">Rundown</TabsTrigger>
                <TabsTrigger value="catatan" className="text-xs whitespace-nowrap">Catatan</TabsTrigger>
                <TabsTrigger value="dokumentasi" className="text-xs whitespace-nowrap">Dokumentasi</TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1: Acuan / Catatan Sebelum Keberangkatan */}
            <TabsContent value="acuan" className="space-y-4">
              <TripDestinationsCard tripId={tripId!} tripName={trip.nama_trip} />
              
              <Card className="overflow-hidden">
                <Collapsible open={priceNotesExpanded} onOpenChange={setPriceNotesExpanded}>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Catatan Harga</h2>
                      <div className="flex gap-2">
                        {canEditNotes && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPriceNote(undefined);
                              setPriceNoteDialogOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
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
                      <div className="mt-3">
                        {priceNotes.length > 0 ? (
                          <div className="space-y-2">
                            {priceNotes.map((note) => (
                              <div key={note.id} className="p-3 bg-muted/30 rounded flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-sm mb-1">{note.keterangan}</p>
                                  <p className="text-primary font-semibold">
                                    {formatRupiah(Number(note.jumlah))}
                                    {note.catatan && <span className="text-muted-foreground font-normal ml-1">{note.catatan}</span>}
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
                                    className="h-7 px-2 text-xs"
                                  >
                                    Edit
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm text-center py-4">Belum ada catatan harga</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </Card>
            </TabsContent>

            {/* Tab: Operasional Lapangan (Checklist 14 Poin & Petty Cash TL) */}
            <TabsContent value="operasional" className="space-y-4">
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
                <h2 className="text-lg font-semibold">Catatan Kegiatan</h2>
                {canEditNotes && (
                  <Button
                    className="gradient-primary text-white"
                    onClick={() => setNoteDialogOpen(true)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah
                  </Button>
                )}
              </div>

              {notes.length === 0 ? (
                <Card className="p-8 text-center">
                  <StickyNote className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Belum ada catatan kegiatan</p>
                  {canEditNotes && (
                    <Button
                      onClick={() => setNoteDialogOpen(true)}
                      className="gradient-primary text-white"
                    >
                      Tambah Catatan
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => {
                    const isOpen = !!openNotes[note.id];
                    return (
                      <Card key={note.id} className="p-4 border border-slate-200/80 dark:border-slate-800 transition-all hover:shadow-sm">
                        <div 
                          className="flex justify-between items-start gap-2 cursor-pointer select-none"
                          onClick={() => toggleNote(note.id)}
                        >
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex-1 hover:text-primary transition-colors">
                            {note.judul}
                          </h3>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className={`h-7 w-7 rounded-full transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-primary bg-primary/10" : "text-muted-foreground"}`}
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
                            <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-line leading-relaxed">
                              {note.konten}
                            </p>
                            <div className="flex items-center justify-between mt-2 pt-1 text-xs text-muted-foreground border-t border-slate-100 dark:border-slate-800/60">
                              <span>{format(new Date(note.created_at), "dd MMM yyyy, HH:mm", { locale: id })}</span>
                              <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:underline">
                                Lihat selengkapnya <ChevronDown className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <div className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 font-normal select-text break-words">
                              {note.konten}
                            </div>
                            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                              <span>Dibuat: {format(new Date(note.created_at), "dd MMM yyyy, HH:mm", { locale: id })}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
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
                <TripDocumentationTab tripId={tripId!} />
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
