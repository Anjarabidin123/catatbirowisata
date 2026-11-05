import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import AuthGuard from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RupiahInput } from "@/components/RupiahInput";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { logCrewActivity } from "@/utils/rbacAuditLogger";

interface Trip {
  id: string;
  nama_trip: string;
}

const NewKeuangan = () => {
  const navigate = useNavigate();
  const { hasPermission } = useRole();
  const canSeeFinancials = hasPermission("rule_buku_kas_laba");
  const canInputPettyCash = hasPermission("rule_petty_cash");
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [useCalculator, setUseCalculator] = useState(false);
  const [hargaSatuan, setHargaSatuan] = useState("");
  const [jumlahItem, setJumlahItem] = useState("");
  const [formData, setFormData] = useState({
    trip_id: "",
    jenis: canSeeFinancials ? "" : "pengeluaran",
    jumlah: "",
    keterangan: "",
    hasCashback: false,
    cashback: "",
  });

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (!canSeeFinancials && formData.jenis !== "pengeluaran") {
      setFormData((prev) => ({ ...prev, jenis: "pengeluaran", hasCashback: false, cashback: "" }));
    }
  }, [canSeeFinancials, formData.jenis]);

  // Auto-calculate saat kolom kalkulator berubah
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

      setFormData((prev) => ({ ...prev, jumlah: formatRupiah(total) }));
    }
  }, [hargaSatuan, jumlahItem, useCalculator]);

  const loadTrips = async () => {
    try {
      const user = await getActiveUser();
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
    if (!canInputPettyCash && !canSeeFinancials) {
      toast.error("Akses Dibatasi: Anda tidak memiliki izin mencatat transaksi keuangan.");
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      const user = await getActiveUser();
      if (!user) throw new Error("User not authenticated");

      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };

      const finalJenis = canSeeFinancials ? formData.jenis || "pengeluaran" : "pengeluaran";
      const finalJumlah = unformatRupiah(formData.jumlah);

      const { error } = await supabase.from("keuangan").insert({
        trip_id: formData.trip_id,
        user_id: user.id,
        jenis: finalJenis,
        jumlah: finalJumlah,
        keterangan: formData.keterangan.trim() || null,
        cashback: canSeeFinancials && formData.hasCashback ? unformatRupiah(formData.cashback) : null,
        harga_satuan: useCalculator && hargaSatuan ? unformatRupiah(hargaSatuan) : null,
        jumlah_item: useCalculator && jumlahItem ? Number(jumlahItem) : null,
      });

      if (error) throw error;

      const selectedTripName = trips.find((t) => t.id === formData.trip_id)?.nama_trip;
      logCrewActivity({
        kategori: "keuangan_lapangan",
        aksi:
          finalJenis === "pemasukan"
            ? "Mencatat Pemasukan Kas Biro"
            : "Mencatat Pengeluaran Operasional",
        detail: `${formData.keterangan || "Transaksi"} sebesar Rp ${finalJumlah.toLocaleString("id-ID")}`,
        tripName: selectedTripName,
      });

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
      <div className="min-h-screen bg-background pb-20 safe-top lg:pl-64 font-sans">
        <div className="max-w-lg lg:max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/keuangan")}
              className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {canSeeFinancials ? "Catat Transaksi Kas Biro" : "Catat Biaya Lapangan"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Ketik langsung rincian pemasukan atau pengeluaran secara cepat.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Kontainer Form Stabil Tanpa Efek Geser/Bouncing */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div>
                <Label htmlFor="trip_id" className="text-xs font-semibold">Pilih Trip Terkait *</Label>
                <Select
                  value={formData.trip_id}
                  onValueChange={(value) => setFormData({ ...formData, trip_id: value })}
                  required
                >
                  <SelectTrigger className="mt-1 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="-- Pilih Jadwal Trip --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {trips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id} className="text-xs">
                        {trip.nama_trip}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="jenis" className="text-xs font-semibold">Jenis Arus Kas *</Label>
                {canSeeFinancials ? (
                  <Select
                    value={formData.jenis}
                    onValueChange={(value) => setFormData({ ...formData, jenis: value })}
                    required
                  >
                    <SelectTrigger className="mt-1 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="-- Pilih Jenis Kas --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pemasukan" className="text-xs">
                        💰 Pemasukan (Omset / Pembayaran DP / Pelunasan)
                      </SelectItem>
                      <SelectItem value="pengeluaran" className="text-xs">
                        💸 Pengeluaran (Beban Operasional / BBM / Tol / Resto)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                    Pengeluaran Operasional Lapangan (Petty Cash)
                  </div>
                )}
              </div>

              {/* Rincian Keterangan Manual Langsung Ketik */}
              <div>
                <Label htmlFor="keterangan" className="text-xs font-semibold">
                  Keterangan / Rincian Pengeluaran *
                </Label>
                <Textarea
                  id="keterangan"
                  required
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Contoh: Solar SPBU Brebes / DP Booking Bus Pariwisata / Tiket Masuk Bromo 45 pax"
                  rows={3}
                  className="mt-1 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="useCalculator"
                  checked={useCalculator}
                  onChange={(e) => setUseCalculator(e.target.checked)}
                  className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <Label htmlFor="useCalculator" className="text-xs cursor-pointer text-slate-700 dark:text-slate-300">
                  Hitung Otomatis (Qty x Harga Satuan)
                </Label>
              </div>

              {useCalculator ? (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <RupiahInput
                    label="Harga Satuan (Rp)"
                    value={hargaSatuan}
                    onChange={setHargaSatuan}
                    placeholder="Contoh: 50000"
                    required
                  />
                  <div>
                    <Label className="text-xs font-semibold">Jumlah Qty / Pax</Label>
                    <input
                      type="number"
                      value={jumlahItem}
                      onChange={(e) => setJumlahItem(e.target.value)}
                      placeholder="Contoh: 45"
                      required
                      className="w-full px-3 py-2 text-xs border rounded-xl mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">Total Otomatis:</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {formData.jumlah ? `Rp ${formData.jumlah}` : "Rp 0"}
                    </span>
                  </div>
                </div>
              ) : (
                <RupiahInput
                  id="jumlah"
                  label="Nominal Jumlah (Rp) *"
                  value={formData.jumlah}
                  onChange={(value) => setFormData({ ...formData, jumlah: value })}
                  placeholder="0"
                  required
                />
              )}

              {canSeeFinancials && (
                <>
                  <div className="flex items-center space-x-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <input
                      type="checkbox"
                      id="hasCashback"
                      checked={formData.hasCashback}
                      onChange={(e) => setFormData({ ...formData, hasCashback: e.target.checked })}
                      className="rounded border-slate-300 w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <Label htmlFor="hasCashback" className="text-xs cursor-pointer text-slate-700 dark:text-slate-300">
                      Ada Komisi / Cashback Resto/Oleh-oleh?
                    </Label>
                  </div>

                  {formData.hasCashback && (
                    <RupiahInput
                      label="Nominal Cashback (Rp)"
                      value={formData.cashback}
                      onChange={(value) => setFormData({ ...formData, cashback: value })}
                      placeholder="0"
                    />
                  )}
                </>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-xs sm:text-sm rounded-xl font-bold gradient-primary text-white shadow-sm"
              disabled={loading || (!canInputPettyCash && !canSeeFinancials)}
            >
              {loading ? "Menyimpan Transaksi..." : "Simpan Transaksi"}
            </Button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
};

export default NewKeuangan;
