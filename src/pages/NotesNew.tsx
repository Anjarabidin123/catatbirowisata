import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HTMNoteDialog } from "@/components/HTMNoteDialog";
import { CateringNoteDialog } from "@/components/CateringNoteDialog";
import { formatRupiah } from "@/lib/utils";

interface GeneralNote {
  id: string;
  judul: string;
  konten: string;
  created_at: string;
}

interface HTMNote {
  id: string;
  destination_name: string;
  harga_per_orang: number;
  cashback_guru: boolean;
  catatan: string | null;
}

interface CateringNote {
  id: string;
  nama_catering: string;
  harga_per_snack: number;
  catatan: string | null;
}

const NotesNew = () => {
  const [generalNotes, setGeneralNotes] = useState<GeneralNote[]>([]);
  const [htmNotes, setHTMNotes] = useState<HTMNote[]>([]);
  const [cateringNotes, setCateringNotes] = useState<CateringNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchGeneral, setSearchGeneral] = useState("");
  const [searchHTM, setSearchHTM] = useState("");

  // Dialog states
  const [generalDialogOpen, setGeneralDialogOpen] = useState(false);
  const [htmDialogOpen, setHTMDialogOpen] = useState(false);
  const [cateringDialogOpen, setCateringDialogOpen] = useState(false);

  // Selected items for editing
  const [selectedHTM, setSelectedHTM] = useState<HTMNote | undefined>();
  const [selectedCatering, setSelectedCatering] = useState<CateringNote | undefined>();

  // General note form state
  const [generalFormData, setGeneralFormData] = useState({ judul: "", konten: "" });
  const [editingGeneralId, setEditingGeneralId] = useState<string | null>(null);

  useEffect(() => {
    loadAllNotes();

    const channel = supabase
      .channel("notes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => {
        loadAllNotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAllNotes = async () => {
    await Promise.all([loadGeneralNotes(), loadHTMNotes(), loadCateringNotes()]);
    setLoading(false);
  };

  const loadGeneralNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .not("judul", "ilike", "[HTM]%")
        .not("judul", "ilike", "[CATERING]%")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGeneralNotes(data || []);
    } catch (error: any) {
      console.error("Error loading general notes:", error);
    }
  };

  const loadHTMNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .ilike("judul", "[HTM]%")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map((row: any) => {
        let payload: any = {};
        try { payload = JSON.parse(row.konten || "{}"); } catch {}
        return {
          id: row.id,
          destination_name: String(row.judul || "").replace(/^\[HTM\]\s*/, ""),
          harga_per_orang: Number(payload.harga_per_orang) || 0,
          cashback_guru: Boolean(payload.cashback_guru),
          catatan: payload.catatan || null,
        } as HTMNote;
      });
      setHTMNotes(mapped);
    } catch (error: any) {
      console.error("Error loading HTM notes:", error);
    }
  };

  const loadCateringNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .ilike("judul", "[CATERING]%")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map((row: any) => {
        let payload: any = {};
        try { payload = JSON.parse(row.konten || "{}"); } catch {}
        return {
          id: row.id,
          nama_catering: String(row.judul || "").replace(/^\[CATERING\]\s*/, ""),
          harga_per_snack: Number(payload.harga_per_snack) || 0,
          catatan: payload.catatan || null,
        } as CateringNote;
      });
      setCateringNotes(mapped);
    } catch (error: any) {
      console.error("Error loading catering notes:", error);
    }
  };

  const handleSubmitGeneral = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (editingGeneralId) {
        const { error } = await supabase
          .from("notes")
          .update({ judul: generalFormData.judul, konten: generalFormData.konten })
          .eq("id", editingGeneralId);
        if (error) throw error;
        toast.success("Catatan berhasil diperbarui");
      } else {
        const { error } = await supabase.from("notes").insert({
          user_id: user.id,
          judul: generalFormData.judul,
          konten: generalFormData.konten,
        });
        if (error) throw error;
        toast.success("Catatan berhasil ditambahkan");
      }

      setGeneralDialogOpen(false);
      setGeneralFormData({ judul: "", konten: "" });
      setEditingGeneralId(null);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menyimpan catatan");
    }
  };

  const handleDeleteGeneral = async (id: string) => {
    if (!confirm("Hapus catatan ini?")) return;

    try {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Catatan berhasil dihapus");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus catatan");
    }
  };

  const handleDeleteHTM = async (id: string) => {
    if (!confirm("Hapus catatan HTM ini?")) return;

    try {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Catatan HTM berhasil dihapus");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus catatan HTM");
    }
  };

  const handleDeleteCatering = async (id: string) => {
    if (!confirm("Hapus catatan catering ini?")) return;

    try {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Catatan catering berhasil dihapus");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus catatan catering");
    }
  };

  const openEditGeneral = (note: GeneralNote) => {
    setGeneralFormData({ judul: note.judul, konten: note.konten });
    setEditingGeneralId(note.id);
    setGeneralDialogOpen(true);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-lg mx-auto p-4">
          <h1 className="text-2xl font-bold mb-6">Catatan</h1>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="general">Catatan Umum</TabsTrigger>
              <TabsTrigger value="htm">Catatan HTM</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Catatan Umum</h2>
                <Button
                  onClick={() => {
                    setGeneralFormData({ judul: "", konten: "" });
                    setEditingGeneralId(null);
                    setGeneralDialogOpen(true);
                  }}
                  className="gradient-primary text-white"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                </div>
              ) : (
                <>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari catatan..."
                      value={searchGeneral}
                      onChange={(e) => setSearchGeneral(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {generalNotes.filter(note => 
                    note.judul.toLowerCase().includes(searchGeneral.toLowerCase()) ||
                    note.konten.toLowerCase().includes(searchGeneral.toLowerCase())
                  ).length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">Tidak ada catatan yang cocok</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {generalNotes.filter(note =>
                        note.judul.toLowerCase().includes(searchGeneral.toLowerCase()) ||
                        note.konten.toLowerCase().includes(searchGeneral.toLowerCase())
                      ).map((note) => (
                        <Card key={note.id} className="p-4">
                          <Collapsible>
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold flex-1">{note.judul}</h3>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditGeneral(note)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteGeneral(note.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <CollapsibleTrigger asChild>
                                  <Button size="icon" variant="ghost">
                                    <ChevronDown className="w-4 h-4" />
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                            </div>
                            <CollapsibleContent>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2 mb-2">
                                {note.konten}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(note.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                              </p>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="htm" className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Catatan HTM & Catering</h2>

              {/* Search for HTM */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari HTM atau Catering..."
                  value={searchHTM}
                  onChange={(e) => setSearchHTM(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* HTM Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Harga Tiket Masuk</h3>
                  <Button
                    onClick={() => {
                      setSelectedHTM(undefined);
                      setHTMDialogOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Tambah
                  </Button>
                </div>

                {htmNotes.filter(note =>
                  note.destination_name.toLowerCase().includes(searchHTM.toLowerCase())
                ).length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">Belum ada catatan HTM</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {htmNotes.filter(note =>
                      note.destination_name.toLowerCase().includes(searchHTM.toLowerCase())
                    ).map((note) => (
                      <Card key={note.id} className="p-3">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1">
                            <p className="font-medium">{note.destination_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatRupiah(note.harga_per_orang)}/orang
                            </p>
                            {note.cashback_guru && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 inline-block mt-1">
                                💰 Cashback Guru
                              </span>
                            )}
                            {note.catatan && (
                              <p className="text-xs text-muted-foreground mt-1">{note.catatan}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedHTM(note);
                                setHTMDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteHTM(note.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Catering Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Harga Snack Catering</h3>
                  <Button
                    onClick={() => {
                      setSelectedCatering(undefined);
                      setCateringDialogOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Tambah
                  </Button>
                </div>

                {cateringNotes.filter(note =>
                  note.nama_catering.toLowerCase().includes(searchHTM.toLowerCase())
                ).length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">Belum ada catatan catering</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {cateringNotes.filter(note =>
                      note.nama_catering.toLowerCase().includes(searchHTM.toLowerCase())
                    ).map((note) => (
                      <Card key={note.id} className="p-3">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1">
                            <p className="font-medium">{note.nama_catering}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatRupiah(note.harga_per_snack)}/snack
                            </p>
                            {note.catatan && (
                              <p className="text-xs text-muted-foreground mt-1">{note.catatan}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedCatering(note);
                                setCateringDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteCatering(note.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* General Note Dialog */}
        <Dialog open={generalDialogOpen} onOpenChange={setGeneralDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGeneralId ? "Edit" : "Tambah"} Catatan Umum
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitGeneral} className="space-y-4">
              <div>
                <Label>Judul</Label>
                <Input
                  value={generalFormData.judul}
                  onChange={(e) =>
                    setGeneralFormData({ ...generalFormData, judul: e.target.value })
                  }
                  placeholder="Judul catatan"
                  required
                />
              </div>
              <div>
                <Label>Konten</Label>
                <Textarea
                  value={generalFormData.konten}
                  onChange={(e) =>
                    setGeneralFormData({ ...generalFormData, konten: e.target.value })
                  }
                  placeholder="Isi catatan..."
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" className="w-full gradient-primary text-white">
                Simpan
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <HTMNoteDialog
          open={htmDialogOpen}
          onOpenChange={setHTMDialogOpen}
          note={selectedHTM}
          onSuccess={loadHTMNotes}
        />

        <CateringNoteDialog
          open={cateringDialogOpen}
          onOpenChange={setCateringDialogOpen}
          note={selectedCatering}
          onSuccess={loadCateringNotes}
        />

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default NotesNew;
