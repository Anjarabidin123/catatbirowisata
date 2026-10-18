import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RupiahInput } from "./RupiahInput";

interface HTMNote {
  id?: string;
  destination_name: string;
  harga_per_orang: number;
  cashback_guru: boolean;
  catatan?: string;
}

interface HTMNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: HTMNote;
  onSuccess: () => void;
}

export const HTMNoteDialog = ({ open, onOpenChange, note, onSuccess }: HTMNoteDialogProps) => {
  const [formData, setFormData] = useState({
    destination_name: "",
    harga_per_orang: "",
    cashback_guru: false,
    catatan: "",
  });

  useEffect(() => {
    if (note) {
      setFormData({
        destination_name: note.destination_name,
        harga_per_orang: note.harga_per_orang.toString(),
        cashback_guru: note.cashback_guru,
        catatan: note.catatan || "",
      });
    } else {
      setFormData({
        destination_name: "",
        harga_per_orang: "",
        cashback_guru: false,
        catatan: "",
      });
    }
  }, [note, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };

      const judul = `[HTM] ${formData.destination_name}`;
      const konten = JSON.stringify({
        harga_per_orang: unformatRupiah(formData.harga_per_orang),
        cashback_guru: formData.cashback_guru,
        catatan: formData.catatan || null,
      });

      if (note?.id) {
        const { error } = await supabase
          .from("notes")
          .update({ judul, konten })
          .eq("id", note.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notes").insert({
          user_id: user.id,
          judul,
          konten,
        });
        if (error) throw error;
      }

      toast.success(note?.id ? "Catatan HTM berhasil diperbarui" : "Catatan HTM berhasil ditambahkan");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menyimpan catatan HTM");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{note?.id ? "Edit" : "Tambah"} Catatan HTM</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nama Destinasi</Label>
            <Input
              value={formData.destination_name}
              onChange={(e) =>
                setFormData({ ...formData, destination_name: e.target.value })
              }
              placeholder="Contoh: Lawang Sewu"
              required
            />
          </div>

          <RupiahInput
            label="Harga per Orang"
            value={formData.harga_per_orang}
            onChange={(value) => setFormData({ ...formData, harga_per_orang: value })}
            required
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="cashback_guru"
              checked={formData.cashback_guru}
              onChange={(e) =>
                setFormData({ ...formData, cashback_guru: e.target.checked })
              }
              className="rounded"
            />
            <Label htmlFor="cashback_guru">Guru dapat cashback?</Label>
          </div>

          <div>
            <Label>Catatan (Opsional)</Label>
            <Textarea
              value={formData.catatan}
              onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
              placeholder="Catatan tambahan..."
            />
          </div>

          <Button type="submit" className="w-full gradient-primary text-white">
            Simpan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
