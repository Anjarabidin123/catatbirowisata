import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import AuthGuard from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RupiahInput } from "@/components/RupiahInput";
import { ArrowLeft, Tag, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { logCrewActivity } from "@/utils/rbacAuditLogger";
import { getBiroCmsData } from "@/utils/biroCmsStore";

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
  const [selectedKategori, setSelectedKategori] = useState<string>("");
  const [formData, setFormData] = useState({
    trip_id: "",
    jenis: canSeeFinancials ? "" : "pengeluaran",
    jumlah: "",
    keterangan: "",
    hasCashback: false,
    cashback: "",
  });

  const availableCategories = useMemo(() => {
    const cms = getBiroCmsData();
    const currentJenis = formData.jenis || (canSeeFinancials ? "pengeluaran" : "pengeluaran");
    return cms.kategoriKeuangan.filter((k) => k.jenis === currentJenis);
  }, [formData.jenis, canSeeFinancials]);

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (!canSeeFinancials && formData.jenis !== "pengeluaran") {
      setFormData((prev) => ({ ...prev, jenis: "pengeluaran", hasCashback: false, cashback: "" }));
    }
  }, [canSeeFinancials, formData.jenis]);

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

      setFormData((prev) => ({ ...prev, jumlah: formatRupiah(total) }));
    }
  }, [hargaSatuan, jumlahItem, useCalculator]);

  const handleSelectKategori = (katName: string) => {
    setSelectedKategori(katName);
    setFormData((prev) => {
      if (!prev.keterangan.trim()) {
        return { ...prev, keterangan: `[${katName}] ` };
      }
      const regex = /^\[.*?\]\s*/;
      if (regex.test(prev.keterangan)) {
        return { ...prev, keterangan: prev.keterangan.replace(regex, `[${katName}] `) };
      }
      return { ...prev, keterangan: `[${katName}] ${prev.keterangan}` };
    });
  };

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

      // Convert formatted rupiah to number
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
        keterangan: formData.keterangan || (selectedKategori ? `[${selectedKategori}]` : null),
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
        detail: `${formData.keterangan || selectedKategori || "Transaksi"} sebesar Rp ${finalJumlah.toLocaleString("id-ID")}`,
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
      <div className="min-h-screen bg-background pb-20 safe-top lg:pl-64">
        <div className="max-w-lg lg:max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/keuangan")}
            className="mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <h1 className="text-2xl font-bold mb-6">
            {canSeeFinancials ? "Tambah Transaksi Kas Biro" : "Catat Pengeluaran Operasional Lapangan"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="ios-card p-5">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="trip_id">Trip</Label>
                  <Select
                    value={formData.trip_id}
                    onValueChange={(value) => setFormData({ ...formData, trip_id: value })}
                    required
                  >
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
                  <Label htmlFor="jenis">Jenis Arus Kas</Label>
                  {canSeeFinancials ? (
                    <Select
                      value={formData.jenis}
                      onValueChange={(value) => {
                        setFormData({ ...formData, jenis: value });
                        setSelectedKategori("");
                      }}
                      required
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih jenis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pemasukan">Pemasukan (Omset / DP Klien)</SelectItem>
                        <SelectItem value="pengeluaran">Pengeluaran (Biaya Operasional)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                      Pengeluaran Operasional Lapangan (Terkunci RBAC Kru)
                    </div>
                  )}
                </div>

                {/* Pos Kategori Dinamis dari CMS Biro */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        Pilihan Pos Kategori CMS (
                        {formData.jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran"})
                      </span>
                    </Label>
                    <Link
                      to="/pengaturan-biro"
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      title="Kelola pos kategori di CMS Biro"
                    >
                      <span>Atur di CMS</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  <Select
                    value={selectedKategori}
                    onValueChange={(val) => handleSelectKategori(val)}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="-- Pilih Pos Kategori CMS --" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((kat) => (
                        <SelectItem key={kat.id} value={kat.nama} className="text-xs">
                          {kat.nama} {kat.deskripsi ? `(${kat.deskripsi})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Tombol Chip Cepat 1-Klik */}
                  {availableCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {availableCategories.map((kat) => {
                        const isSelected = selectedKategori === kat.nama;
                        return (
                          <button
                            key={kat.id}
                            type="button"
                            onClick={() => handleSelectKategori(kat.nama)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-xs"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                            }`}
                          >
                            {kat.nama}
                          </button>
                        );
                      })}
                    </div>
                  )}
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
                      <p className="text-lg font-bold text-primary">
                        {formData.jumlah ? `Rp ${formData.jumlah}` : "Rp 0"}
                      </p>
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
                  <Label htmlFor="keterangan">Keterangan / Rincian Transaksi</Label>
                  <Textarea
                    id="keterangan"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    placeholder="Tambahkan keterangan transaksi..."
                    rows={3}
                    className="mt-1 text-xs"
                  />
                </div>

                {canSeeFinancials && (
                  <>
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
                  </>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-white font-semibold"
              disabled={loading || (!canInputPettyCash && !canSeeFinancials)}
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
