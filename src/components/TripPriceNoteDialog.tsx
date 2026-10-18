import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RupiahInput } from "./RupiahInput";

interface PriceNote {
  id: string;
  keterangan: string;
  jumlah: number;
  catatan?: string;
}

interface TripPriceNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  note?: PriceNote;
  onSuccess?: () => void;
}

export const TripPriceNoteDialog = ({ open, onOpenChange, tripId, note, onSuccess }: TripPriceNoteDialogProps) => {
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (note && open) {
      setKeterangan(note.keterangan);
      setJumlah(String(note.jumlah));
      setCatatan(note.catatan || "");
    } else if (!note) {
      setKeterangan("");
      setJumlah("");
      setCatatan("/ ");
    }
  }, [note, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Parse rupiah format
      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };

      const jumlahNumber = unformatRupiah(jumlah);
      if (isNaN(jumlahNumber)) {
        toast.error("Jumlah harus berupa angka");
        return;
      }

      if (note?.id) {
        const { error } = await supabase
          .from("trip_price_notes")
          .update({
            keterangan,
            jumlah: jumlahNumber,
            catatan,
          })
          .eq("id", note.id);

        if (error) throw error;
        toast.success("Catatan harga berhasil diperbarui");
      } else {
        const { error } = await supabase.from("trip_price_notes").insert({
          trip_id: tripId,
          user_id: user.id,
          keterangan,
          jumlah: jumlahNumber,
          catatan,
        });

        if (error) throw error;
        toast.success("Catatan harga berhasil ditambahkan");
      }
      setKeterangan("");
      setJumlah("");
      setCatatan("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menambahkan catatan harga");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{note?.id ? "Edit" : "Tambah"} Catatan Harga</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              id="keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Kasih uang ke kepala sekolah"
              required
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="jumlah">Jumlah (Rp)</Label>
            <RupiahInput
              label=""
              value={jumlah}
              onChange={setJumlah}
            />
          </div>

          <div>
            <Label htmlFor="catatan">Catatan (opsional)</Label>
            <Input
              id="catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: / orang"
            />
          </div>

          <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
