import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import NoteDialog from "@/components/NoteDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Pencil, Trash2, Search, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Note {
  id: string;
  judul: string;
  konten: string;
  trip_id: string | null;
  created_at: string;
  trips?: { nama_trip: string };
}

const Notes = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | undefined>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadNotes();

    // Setup realtime subscription
    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        () => {
          loadNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterNotes();
  }, [notes, search, filter]);

  const loadNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;

      // Manual join with trips
      const notesWithTrips = await Promise.all(
        (notesData || []).map(async (note) => {
          if (note.trip_id) {
            const { data: tripData } = await supabase
              .from("trips")
              .select("nama_trip")
              .eq("id", note.trip_id)
              .single();
            
            return { ...note, trips: tripData };
          }
          return note;
        })
      );

      setNotes(notesWithTrips);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal memuat catatan");
    } finally {
      setLoading(false);
    }
  };

  const filterNotes = () => {
    let filtered = notes;

    if (filter === "trip") {
      filtered = filtered.filter(note => note.trip_id !== null);
    } else if (filter === "general") {
      filtered = filtered.filter(note => note.trip_id === null);
    }

    if (search) {
      filtered = filtered.filter(note =>
        note.judul.toLowerCase().includes(search.toLowerCase()) ||
        note.konten.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredNotes(filtered);
  };

  const handleEdit = (note: Note) => {
    setSelectedNote(note);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedNote(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan ini?")) return;

    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Catatan berhasil dihapus");
      loadNotes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus catatan");
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold">Catatan</h1>
            </div>
            <Button
              className="gradient-primary text-white"
              onClick={handleAdd}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari catatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs value={filter} onValueChange={setFilter} className="mb-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Semua</TabsTrigger>
              <TabsTrigger value="trip">Per Trip</TabsTrigger>
              <TabsTrigger value="general">Umum</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredNotes.length === 0 ? (
            <Card className="p-8 text-center">
              <StickyNote className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {search ? "Tidak ada catatan yang cocok" : "Belum ada catatan"}
              </p>
              {!search && (
                <Button onClick={handleAdd} className="gradient-primary text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Catatan
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <Card key={note.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg flex-1">{note.judul}</h3>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(note)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(note.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {note.konten}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {format(new Date(note.created_at), "dd MMM yyyy", { locale: idLocale })}
                    </span>
                    {note.trips && (
                      <span className="text-primary">
                        📍 {note.trips.nama_trip}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <NoteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          note={selectedNote}
          onSuccess={loadNotes}
        />

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default Notes;