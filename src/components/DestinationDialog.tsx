import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RupiahInput } from "@/components/RupiahInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Destination {
  id?: string;
  nama_destinasi: string;
  deskripsi: string;
  kategori: string;
  lokasi: string;
  durasi_standar: number;
  estimasi_biaya: number;
}

interface DestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination?: Destination;
  onSuccess: () => void;
}

const DestinationDialog = ({ open, onOpenChange, destination, onSuccess }: DestinationDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Destination>({
    nama_destinasi: "",
    deskripsi: "",
    kategori: "wisata",
    lokasi: "",
    durasi_standar: 60,
    estimasi_biaya: 0,
  });
  const [estimasiBiayaFormatted, setEstimasiBiayaFormatted] = useState("");

  useEffect(() => {
    if (destination) {
      setFormData(destination);
      setEstimasiBiayaFormatted(destination.estimasi_biaya?.toString() || "0");
    } else {
      setFormData({
        nama_destinasi: "",
        deskripsi: "",
        kategori: "wisata",
        lokasi: "",
        durasi_standar: 60,
        estimasi_biaya: 0,
      });
      setEstimasiBiayaFormatted("0");
    }
  }, [destination, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const biayaNumber = Number(estimasiBiayaFormatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      const dataToSave = { ...formData, estimasi_biaya: biayaNumber };

      if (destination?.id) {
        const { error } = await supabase
          .from("destinations")
          .update(dataToSave)
          .eq("id", destination.id);

        if (error) throw error;
        toast.success("Destinasi berhasil diupdate");
      } else {
        const { error } = await supabase
          .from("destinations")
          .insert({ ...dataToSave, user_id: user.id });

        if (error) throw error;
        toast.success("Destinasi berhasil ditambahkan");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menyimpan destinasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{destination ? "Edit Destinasi" : "Tambah Destinasi"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-sm font-semibold text-primary mb-2">Informasi Utama</h3>
          
          <div>
            <Label htmlFor="nama_destinasi">
              Nama Destinasi <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nama_destinasi"
              value={formData.nama_destinasi}
              onChange={(e) => setFormData({ ...formData, nama_destinasi: e.target.value })}
              placeholder="Contoh: Tangkuban Perahu"
              required
              className="border-2"
            />
          </div>

          <div>
            <Label htmlFor="kategori">
              Kategori <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.kategori}
              onValueChange={(value) => setFormData({ ...formData, kategori: value })}
            >
              <SelectTrigger className="border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wisata">Wisata Alam</SelectItem>
                <SelectItem value="kuliner">Kuliner</SelectItem>
                <SelectItem value="belanja">Belanja</SelectItem>
                <SelectItem value="sejarah">Sejarah</SelectItem>
                <SelectItem value="hiburan">Hiburan</SelectItem>
                <SelectItem value="religi">Religi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="lokasi">
              Lokasi <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lokasi"
              value={formData.lokasi}
              onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
              placeholder="Contoh: Lembang, Bandung"
              required
              className="border-2"
            />
          </div>

          <h3 className="text-sm font-semibold text-primary mb-2 mt-4">Detail Tambahan</h3>

          <div>
            <Label htmlFor="durasi">
              Durasi Standar (menit) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="durasi"
              type="number"
              value={formData.durasi_standar}
              onChange={(e) => setFormData({ ...formData, durasi_standar: parseInt(e.target.value) })}
              min="0"
              required
              className="border-2"
            />
            <p className="text-xs text-muted-foreground mt-1">💡 Perkiraan lama kunjungan (untuk jadwal trip)</p>
          </div>

          <div>
            <RupiahInput
              label="Estimasi Biaya"
              value={estimasiBiayaFormatted}
              onChange={setEstimasiBiayaFormatted}
              placeholder="0"
              required
              id="biaya"
            />
            <p className="text-xs text-muted-foreground mt-1">💡 Tiket masuk atau biaya rata-rata per orang</p>
          </div>

          <div>
            <Label htmlFor="deskripsi">
              Deskripsi <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Opsional</span>
            </Label>
            <Textarea
              id="deskripsi"
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              placeholder="Deskripsi singkat tentang destinasi..."
              rows={3}
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

export default DestinationDialog;