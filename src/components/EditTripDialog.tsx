import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RupiahInput } from "@/components/RupiahInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Trip {
  id: string;
  nama_trip: string;
  tanggal: string;
  tujuan: string;
  nama_kendaraan?: string;
  nomor_polisi?: string;
  nama_driver?: string;
  tanggal_selesai?: string;
  jumlah_penumpang?: number;
  budget_estimasi?: number;
  catatan?: string;
}

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  onSuccess: () => void;
}

export const EditTripDialog = ({ open, onOpenChange, trip, onSuccess }: EditTripDialogProps) => {
  const [formData, setFormData] = useState({
    nama_trip: "",
    tanggal: "",
    tujuan: "",
    nama_kendaraan: "",
    nomor_polisi: "",
    nama_driver: "",
    tanggal_selesai: "",
    jumlah_penumpang: "",
    budget_estimasi: "",
    catatan: "",
  });
  const [budgetFormatted, setBudgetFormatted] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (trip && open) {
      setFormData({
        nama_trip: trip.nama_trip || "",
        tanggal: trip.tanggal || "",
        tujuan: trip.tujuan || "",
        nama_kendaraan: trip.nama_kendaraan || "",
        nomor_polisi: trip.nomor_polisi || "",
        nama_driver: trip.nama_driver || "",
        tanggal_selesai: trip.tanggal_selesai || "",
        jumlah_penumpang: trip.jumlah_penumpang?.toString() || "",
        budget_estimasi: trip.budget_estimasi?.toString() || "",
        catatan: trip.catatan || "",
      });
      setBudgetFormatted(trip.budget_estimasi?.toString() || "");
    }
  }, [trip, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const budgetNumber = budgetFormatted ? Number(budgetFormatted.replace(/\./g, "").replace(/,/g, ".")) : null;
      
      const { error } = await supabase
        .from("trips")
        .update({
          nama_trip: formData.nama_trip,
          tanggal: formData.tanggal,
          tujuan: formData.tujuan,
          nama_kendaraan: formData.nama_kendaraan || null,
          nomor_polisi: formData.nomor_polisi?.toUpperCase() || null,
          nama_driver: formData.nama_driver || null,
          tanggal_selesai: formData.tanggal_selesai || null,
          jumlah_penumpang: formData.jumlah_penumpang ? parseInt(formData.jumlah_penumpang) : null,
          budget_estimasi: budgetNumber,
          catatan: formData.catatan || null,
        })
        .eq("id", trip.id);

      if (error) throw error;

      toast.success("Trip berhasil diperbarui");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal memperbarui trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nama_trip">Nama Trip</Label>
            <Input
              id="nama_trip"
              value={formData.nama_trip}
              onChange={(e) => setFormData({ ...formData, nama_trip: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="tanggal">Tanggal Mulai</Label>
            <Input
              id="tanggal"
              type="date"
              value={formData.tanggal}
              onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="tujuan">Tujuan</Label>
            <Input
              id="tujuan"
              value={formData.tujuan}
              onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="nama_kendaraan">Nama Kendaraan (Opsional)</Label>
            <Input
              id="nama_kendaraan"
              value={formData.nama_kendaraan}
              onChange={(e) => setFormData({ ...formData, nama_kendaraan: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="nomor_polisi">Nomor Polisi (Opsional)</Label>
            <Input
              id="nomor_polisi"
              value={formData.nomor_polisi}
              onChange={(e) => setFormData({ ...formData, nomor_polisi: e.target.value.toUpperCase() })}
              placeholder="B 1234 ABC"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div>
            <Label htmlFor="nama_driver">Nama Driver (Opsional)</Label>
            <Input
              id="nama_driver"
              value={formData.nama_driver}
              onChange={(e) => setFormData({ ...formData, nama_driver: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="tanggal_selesai">Tanggal Selesai (Opsional)</Label>
            <Input
              id="tanggal_selesai"
              type="date"
              value={formData.tanggal_selesai}
              onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="jumlah_penumpang">Jumlah Penumpang (Opsional)</Label>
            <Input
              id="jumlah_penumpang"
              type="number"
              value={formData.jumlah_penumpang}
              onChange={(e) => setFormData({ ...formData, jumlah_penumpang: e.target.value })}
            />
          </div>

          <div>
            <RupiahInput
              label="Budget Estimasi (Opsional)"
              value={budgetFormatted}
              onChange={setBudgetFormatted}
              placeholder="0"
              id="budget_estimasi"
            />
          </div>

          <div>
            <Label htmlFor="catatan">Catatan (Opsional)</Label>
            <Textarea
              id="catatan"
              value={formData.catatan}
              onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
