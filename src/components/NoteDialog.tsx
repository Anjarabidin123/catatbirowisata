import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Note {
  id?: string;
  judul: string;
  konten: string;
  trip_id: string | null;
}

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note;
  tripId?: string;
  onSuccess: () => void;
}

const NoteDialog = ({ open, onOpenChange, note, tripId, onSuccess }: NoteDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [formData, setFormData] = useState<Note>({
    judul: "",
    konten: "",
    trip_id: null,
  });

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (note) {
      setFormData(note);
    } else {
      setFormData({
        judul: "",
        konten: "",
        trip_id: tripId || null,
      });
    }
  }, [note, tripId, open]);

  const loadTrips = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trips")
        .select("id, nama_trip")
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error: any) {
      console.error("Error loading trips:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (note?.id) {
        const { error } = await supabase
          .from("notes")
          .update(formData)
          .eq("id", note.id);

        if (error) throw error;
        toast.success("Catatan berhasil diupdate");
      } else {
        const { error } = await supabase
          .from("notes")
          .insert({ ...formData, user_id: user.id });

        if (error) throw error;
        toast.success("Catatan berhasil ditambahkan");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menyimpan catatan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{note ? "Edit Catatan" : "Tambah Catatan"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="judul">Judul</Label>
            <Input
              id="judul"
              value={formData.judul}
              onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
              placeholder="Judul catatan..."
              required
            />
          </div>

          <div>
            <Label htmlFor="trip">Link ke Trip (Opsional)</Label>
            <Select
              value={formData.trip_id || "none"}
              onValueChange={(value) => 
                setFormData({ ...formData, trip_id: value === "none" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih trip atau biarkan kosong" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Catatan Umum</SelectItem>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.nama_trip}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="konten">Konten</Label>
            <Textarea
              id="konten"
              value={formData.konten}
              onChange={(e) => setFormData({ ...formData, konten: e.target.value })}
              placeholder="Tulis catatan Anda di sini..."
              rows={6}
              required
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-primary text-white"
              disabled={loading}
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NoteDialog;