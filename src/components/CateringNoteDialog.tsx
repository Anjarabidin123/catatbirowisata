import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { toast } from "sonner";
import { RupiahInput } from "./RupiahInput";
import { useRole } from "@/contexts/RoleContext";
import { logCrewActivity } from "@/utils/rbacAuditLogger";

interface CateringNote {
  id?: string;
  nama_catering: string;
  harga_per_snack: number;
  catatan?: string;
}

interface CateringNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: CateringNote;
  onSuccess: () => void;
}

export const CateringNoteDialog = ({ open, onOpenChange, note, onSuccess }: CateringNoteDialogProps) => {
  const { hasPermission } = useRole();
  const [formData, setFormData] = useState({
    nama_catering: "",
    harga_per_snack: "",
    catatan: "",
  });

  useEffect(() => {
    if (note) {
      setFormData({
        nama_catering: note.nama_catering,
        harga_per_snack: note.harga_per_snack.toString(),
        catatan: note.catatan || "",
      });
    } else {
      setFormData({
        nama_catering: "",
        harga_per_snack: "",
        catatan: "",
      });
    }
  }, [note, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission("rule_rundown_catatan")) {
      toast.error("Akses tambah/edit catatan catering dinonaktifkan oleh Pemilik Biro");
      return;
    }

    try {
      const user = await getActiveUser();
      if (!user) throw new Error("User not authenticated");

      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };

      const hargaNum = unformatRupiah(formData.harga_per_snack);
      const judul = `[CATERING] ${formData.nama_catering}`;
      const konten = JSON.stringify({
        harga_per_snack: hargaNum,
        catatan: formData.catatan || null,
      });

      if (note?.id) {
        const { error } = await supabase
          .from("notes")
          .update({ judul, konten })
          .eq("id", note.id);
        if (error) throw error;
        logCrewActivity({
          kategori: "catatan_htm",
          aksi: "Memperbarui Catatan Catering",
          detail: `Mengubah catering '${formData.nama_catering}' (Rp ${hargaNum.toLocaleString("id-ID")}/snack)`,
        });
      } else {
        const { error } = await supabase.from("notes").insert({
          user_id: user.id,
          judul,
          konten,
        });
        if (error) throw error;
        logCrewActivity({
          kategori: "catatan_htm",
          aksi: "Menambahkan Catatan Catering",
          detail: `Menambahkan catering '${formData.nama_catering}' (Rp ${hargaNum.toLocaleString("id-ID")}/snack)`,
        });
      }

      toast.success(note?.id ? "Catatan catering berhasil diperbarui" : "Catatan catering berhasil ditambahkan");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menyimpan catatan catering");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{note?.id ? "Edit" : "Tambah"} Catatan Catering</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nama Catering</Label>
            <Input
              value={formData.nama_catering}
              onChange={(e) =>
                setFormData({ ...formData, nama_catering: e.target.value })
              }
              placeholder="Contoh: Catering A"
              required
            />
          </div>

          <RupiahInput
            label="Harga per Snack"
            value={formData.harga_per_snack}
            onChange={(value) => setFormData({ ...formData, harga_per_snack: value })}
            required
          />

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
