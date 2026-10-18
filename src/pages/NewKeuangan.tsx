import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RupiahInput } from "@/components/RupiahInput";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Trip {
  id: string;
  nama_trip: string;
}

const NewKeuangan = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [useCalculator, setUseCalculator] = useState(false);
  const [hargaSatuan, setHargaSatuan] = useState("");
  const [jumlahItem, setJumlahItem] = useState("");
  const [formData, setFormData] = useState({
    trip_id: "",
    jenis: "",
    jumlah: "",
    keterangan: "",
    hasCashback: false,
    cashback: "",
  });

  useEffect(() => {
    loadTrips();
  }, []);

  // Auto-calculate when calculator fields change
  useEffect(() => {
    if (useCalculator && hargaSatuan && jumlahItem) {
      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };
      const satuan = unformatRupiah(hargaSatuan);
      const qty = Number(jumlahItem) || 0;
      const total = satuan * qty;
      
      const formatRupiah = (angka: number) => {
        return angka.toLocaleString("id-ID");
      };
      
      setFormData({ ...formData, jumlah: formatRupiah(total) });
    }
  }, [hargaSatuan, jumlahItem, useCalculator]);

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
    if (loading) return;
    setLoading(true);

    console.log("Submitting keuangan:", formData);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Convert formatted rupiah to number
      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };

      const { error } = await supabase.from("keuangan").insert({
        trip_id: formData.trip_id,
        user_id: user.id,
        jenis: formData.jenis,
        jumlah: unformatRupiah(formData.jumlah),
        keterangan: formData.keterangan || null,
        cashback: formData.hasCashback ? unformatRupiah(formData.cashback) : null,
        harga_satuan: useCalculator && hargaSatuan ? unformatRupiah(hargaSatuan) : null,
        jumlah_item: useCalculator && jumlahItem ? Number(jumlahItem) : null,
      });

      if (error) throw error;

      toast.success("Transaksi berhasil ditambahkan!");
      navigate("/keuangan");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menambahkan transaksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-lg mx-auto p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/keuangan")}
            className="mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <h1 className="text-2xl font-bold mb-6">Tambah Transaksi</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="ios-card p-5">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="trip_id">Trip</Label>
                  <Select value={formData.trip_id} onValueChange={(value) => setFormData({ ...formData, trip_id: value })} required>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih trip" />
                    </SelectTrigger>
                    <SelectContent>
                      {trips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id}>
                          {trip.nama_trip}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="jenis">Jenis</Label>
                  <Select value={formData.jenis} onValueChange={(value) => setFormData({ ...formData, jenis: value })} required>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pemasukan">Pemasukan</SelectItem>
                      <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useCalculator"
                    checked={useCalculator}
                    onChange={(e) => setUseCalculator(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="useCalculator">Gunakan Kalkulator (contoh: 60 tiket @ Rp50.000)</Label>
                </div>

                {useCalculator ? (
                  <div className="space-y-3">
                    <RupiahInput 
                      label="Harga Satuan" 
                      value={hargaSatuan} 
                      onChange={setHargaSatuan} 
                      placeholder="Contoh: 50000"
                      required 
                    />
                    <div>
                      <Label>Jumlah Item/Orang</Label>
                      <input
                        type="number"
                        value={jumlahItem}
                        onChange={(e) => setJumlahItem(e.target.value)}
                        placeholder="Contoh: 60"
                        required
                        className="w-full px-3 py-2 border rounded-md mt-1"
                      />
                    </div>
                    <div className="p-3 bg-muted rounded-md">
                      <Label className="text-sm text-muted-foreground">Total Otomatis:</Label>
                      <p className="text-lg font-bold text-primary">{formData.jumlah ? `Rp ${formData.jumlah}` : "Rp 0"}</p>
                    </div>
                  </div>
                ) : (
                  <RupiahInput
                    id="jumlah"
                    label="Jumlah"
                    value={formData.jumlah}
                    onChange={(value) => setFormData({ ...formData, jumlah: value })}
                    placeholder="0"
                    required
                  />
                )}

                <div>
                  <Label htmlFor="keterangan">Keterangan (Opsional)</Label>
                  <Textarea
                    id="keterangan"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    placeholder="Tambahkan keterangan..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hasCashback"
                    checked={formData.hasCashback}
                    onChange={(e) => setFormData({ ...formData, hasCashback: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="hasCashback">Ada Cashback?</Label>
                </div>

                {formData.hasCashback && (
                  <RupiahInput
                    label="Cashback"
                    value={formData.cashback}
                    onChange={(value) => setFormData({ ...formData, cashback: value })}
                    placeholder="0"
                  />
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-white font-semibold"
              disabled={loading}
            >
              {loading ? "Menyimpan..." : "Simpan Transaksi"}
            </Button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
};

export default NewKeuangan;
