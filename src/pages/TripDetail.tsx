import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { ArrowLeft, Calendar, MapPin, Plus, StickyNote, Bus, Users, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatRupiah } from "@/lib/utils";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tripId) return;

      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .eq("user_id", user.id)
        .single();

      if (tripError) throw tripError;
      setTrip(tripData);

      await Promise.all([loadNotes(), loadPriceNotes()]);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal memuat data trip");
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tripId) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error("Error loading notes:", error);
    }
  };

  const loadPriceNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tripId) return;

      const { data, error } = await supabase
        .from("trip_price_notes")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
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
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-lg mx-auto p-4">
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
                      {trip.nama_driver && ` (Driver: ${trip.nama_driver})`}
                    </div>
                  )}

                  {trip.jumlah_penumpang && (
                    <div className="flex items-center text-muted-foreground">
                      <Users className="w-4 h-4 mr-2" />
                      {trip.jumlah_penumpang} penumpang
                    </div>
                  )}

                  {trip.budget_estimasi && (
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

          {/* 6 Navbar Tabs - Horizontal scroll */}
        <Tabs defaultValue="acuan" className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto mb-4 gap-1">
                <TabsTrigger value="acuan" className="text-xs whitespace-nowrap">Perencanaan</TabsTrigger>
                <TabsTrigger value="kendaraan" className="text-xs whitespace-nowrap">Kendaraan</TabsTrigger>
                <TabsTrigger value="keuangan" className="text-xs whitespace-nowrap">Keuangan</TabsTrigger>
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

            {/* Tab 2: Kendaraan */}
            <TabsContent value="kendaraan">
              <Suspense fallback={<div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
                <VehicleTab tripId={tripId!} />
              </Suspense>
            </TabsContent>

            {/* Tab 3: Keuangan */}
            <TabsContent value="keuangan">
              <Suspense fallback={<div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
                <TripFinancialTab tripId={tripId!} />
              </Suspense>
            </TabsContent>

            {/* Tab 4: Rundown */}
            <TabsContent value="rundown">
              <Suspense fallback={<div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
                <RundownAcara tripId={tripId!} />
              </Suspense>
            </TabsContent>

            {/* Tab 5: Catatan Kegiatan */}
            <TabsContent value="catatan" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Catatan Kegiatan</h2>
                <Button
                  className="gradient-primary text-white"
                  onClick={() => setNoteDialogOpen(true)}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>

              {notes.length === 0 ? (
                <Card className="p-8 text-center">
                  <StickyNote className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Belum ada catatan kegiatan</p>
                  <Button
                    onClick={() => setNoteDialogOpen(true)}
                    className="gradient-primary text-white"
                  >
                    Tambah Catatan
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <Card key={note.id} className="p-4">
                      <h3 className="font-semibold mb-2">{note.judul}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                        {note.konten}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                      </p>
                    </Card>
                  ))}
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

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default TripDetail;
