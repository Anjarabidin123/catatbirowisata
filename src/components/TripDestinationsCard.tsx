import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, MapPin, Sparkles, Trash2, Utensils, ShoppingBag, Hotel, Coffee, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { logCrewActivity } from "@/utils/rbacAuditLogger";

interface DestinationNote {
  destinasi_1: string;
  destinasi_2?: string;
  destinasi_3?: string;
  destinasi_4?: string;
  destinasi_5?: string;
  destinasi_6?: string;
}

interface TripDestinationsCardProps {
  tripId: string;
  tripName: string;
}

// Rekomendasi Destinasi & Titik Kunjungan Populer untuk Dropdown
const POPULAR_DESTINATIONS = [
  {
    kategori: "🌟 Destinasi Wisata Populer",
    items: [
      "Candi Borobudur (Magelang)",
      "Candi Prambanan (Yogyakarta)",
      "Jalan Malioboro & Keraton (Yogyakarta)",
      "Tebing Breksi & HeHa Sky View (Yogya)",
      "Pantai Parangtritis (Bantul)",
      "Pantai Indrayanti & Drini (Gunungkidul)",
      "Kawah Putih & Situ Patenggang (Ciwidey Bandung)",
      "Tangkuban Perahu & Orchid Forest (Lembang Bandung)",
      "Floating Market & Farmhouse (Lembang)",
      "Sunrise Penanjakan & Kawah Bromo (Gunung Bromo)",
      "Jatim Park 1 / 2 / 3 (Batu Malang)",
      "Museum Angkut & Flora San Terra (Batu)",
      "Lawang Sewu & Kota Lama (Semarang)",
      "Dusun Semilir & Saloka Theme Park (Bawen)",
      "Kompleks Candi Dieng & Telaga Warna (Wonosobo)",
      "Bukit Sikunir Sunrise (Dieng)",
      "Makam Sunan Kalijaga & Masjid Agung (Demak)",
      "Menara Kudus & Makam Sunan Kudus (Kudus)",
      "Grojogan Sewu & Candi Cetho (Karanganyar)",
      "Pantai Kuta & Legian (Bali)",
      "Tanah Lot Sunset (Bali)",
      "Danau Beratan Bedugul (Bali)",
      "Desa Adat Penglipuran & Kintamani (Bali)",
      "Pantai Pandawa & Pantai Melasti (Bali)",
      "Garuda Wisnu Kencana (GWK Bali)",
      "Kawah Ijen & Blue Fire (Banyuwangi)",
    ],
  },
  {
    kategori: "🍽️ Restoran & Makan Bersama",
    items: [
      "Sarapan Pagi / Breakfast Rombongan",
      "Makan Siang / Resto Prasmanan Rombongan",
      "Makan Malam / Resto Kuliner Rombongan",
      "Coffee Break & Snack Box Bus",
    ],
  },
  {
    kategori: "🛍️ Pusat Oleh-Oleh & Belanja",
    items: [
      "Pusat Oleh-Oleh Khas & Bakpia",
      "Pusat Kerajinan, Batik & Souvenir",
      "Pasar Wisata Tradisional",
    ],
  },
  {
    kategori: "🏨 Operasional, Hotel & Transit",
    items: [
      "Titik Kumpul Keberangkatan Awal",
      "Rest Area Tol (Istirahat & Sholat)",
      "Hotel / Penginapan (Check-in & Istirahat)",
      "Hotel / Penginapan (Check-out)",
      "Titik Kepulangan / Drop Off Rombongan",
    ],
  },
];

export const TripDestinationsCard = ({ tripId, tripName }: TripDestinationsCardProps) => {
  const { hasPermission } = useRole();
  const canEditDestinations = hasPermission("rule_rundown_catatan");
  const [note, setNote] = useState<DestinationNote>({ destinasi_1: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userSavedDestinations, setUserSavedDestinations] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState<DestinationNote>({ destinasi_1: "" });

  useEffect(() => {
    loadNote();
    loadSavedDestinations();

    // Realtime subscription for trip destination notes
    const channel = supabase
      .channel(`trip-destination-notes-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_destination_notes", filter: `trip_id=eq.${tripId}` },
        () => loadNote()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const loadSavedDestinations = async () => {
    try {
      const user = await getActiveUser();
      if (!user) return;

      const { data } = await supabase
        .from("destinations")
        .select("nama_destinasi")
        .eq("user_id", user.id)
        .order("nama_destinasi");

      if (data && data.length > 0) {
        setUserSavedDestinations(data.map((d) => d.nama_destinasi));
      }
    } catch (err) {
      console.warn("Gagal memuat destinasi database:", err);
    }
  };

  const loadNote = async () => {
    setLoading(true);
    try {
      const user = await getActiveUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trip_destination_notes")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        const loaded = {
          destinasi_1: data.destinasi_1 || "",
          destinasi_2: data.destinasi_2 || "",
          destinasi_3: data.destinasi_3 || "",
          destinasi_4: data.destinasi_4 || "",
          destinasi_5: data.destinasi_5 || "",
          destinasi_6: data.destinasi_6 || "",
        };
        setNote(loaded);
        setFormData(loaded);
      }
    } catch (error: any) {
      console.error("Error loading note:", error);
    } finally {
      setLoading(false);
    }
  };

  // Quick preset helper
  const handleAddQuickPreset = (presetText: string) => {
    for (let i = 1; i <= 6; i++) {
      const key = `destinasi_${i}` as keyof DestinationNote;
      if (!formData[key]) {
        setFormData((prev) => ({ ...prev, [key]: presetText }));
        toast.info(`Ditambahkan ke Destinasi ${i}`);
        return;
      }
    }
    toast.warning("Semua 6 slot destinasi sudah terisi");
  };

  const handleSelectDropdown = (num: number, value: string) => {
    if (!value) return;
    const key = `destinasi_${num}` as keyof DestinationNote;
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearSlot = (num: number) => {
    const key = `destinasi_${num}` as keyof DestinationNote;
    setFormData((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditDestinations) {
      toast.error("Akses Dibatasi: Anda tidak memiliki izin mengubah catatan destinasi.");
      return;
    }

    if (!formData.destinasi_1?.trim()) {
      toast.error("Destinasi 1 wajib diisi!");
      return;
    }

    try {
      const user = await getActiveUser();
      if (!user) throw new Error("User not authenticated");

      const { data: existing } = await supabase
        .from("trip_destination_notes")
        .select("id")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("trip_destination_notes")
          .update({
            destinasi_1: formData.destinasi_1.trim(),
            destinasi_2: formData.destinasi_2?.trim() || null,
            destinasi_3: formData.destinasi_3?.trim() || null,
            destinasi_4: formData.destinasi_4?.trim() || null,
            destinasi_5: formData.destinasi_5?.trim() || null,
            destinasi_6: formData.destinasi_6?.trim() || null,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("trip_destination_notes").insert({
          trip_id: tripId,
          user_id: user.id,
          destinasi_1: formData.destinasi_1.trim(),
          destinasi_2: formData.destinasi_2?.trim() || null,
          destinasi_3: formData.destinasi_3?.trim() || null,
          destinasi_4: formData.destinasi_4?.trim() || null,
          destinasi_5: formData.destinasi_5?.trim() || null,
          destinasi_6: formData.destinasi_6?.trim() || null,
        });

        if (error) throw error;
      }

      const filledList = [
        formData.destinasi_1,
        formData.destinasi_2,
        formData.destinasi_3,
        formData.destinasi_4,
        formData.destinasi_5,
        formData.destinasi_6,
      ]
        .filter((d) => d && d.trim())
        .join(", ");

      logCrewActivity({
        actionType: "rundown",
        actionTitle: "Memperbarui Catatan Destinasi Trip",
        actionDetail: `Menyimpan daftar destinasi trip ${tripName}: ${filledList}`,
        tripName,
      });

      toast.success("Catatan destinasi berhasil disimpan");
      setDialogOpen(false);
      loadNote();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menyimpan catatan destinasi");
    }
  };

  const destinasiArray = [
    note.destinasi_1,
    note.destinasi_2,
    note.destinasi_3,
    note.destinasi_4,
    note.destinasi_5,
    note.destinasi_6,
  ].filter(Boolean);

  return (
    <Card className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              Catatan Destinasi
            </h3>
            <p className="text-xs text-muted-foreground">
              {destinasiArray.length > 0
                ? `${destinasiArray.length} titik destinasi tercatat`
                : "Belum ada catatan destinasi"}
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          {canEditDestinations && (
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl font-medium border-slate-200 dark:border-slate-700">
                <Edit2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
                Edit Destinasi
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-3xl p-5 sm:p-6">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  Edit Catatan Destinasi
                </DialogTitle>
              </div>
              <p className="text-xs text-slate-500">
                Pilih destinasi dari dropdown atau ketik kustom untuk agenda trip {tripName}.
              </p>
            </DialogHeader>

            {/* Quick Preset Buttons (1-Tap Addition) */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Tambah Cepat ke Slot Kosong:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddQuickPreset("Makan Siang / Resto Prasmanan Rombongan")}
                  className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <Utensils className="w-2.5 h-2.5" />
                  + Makan Siang
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickPreset("Pusat Oleh-Oleh Khas & Bakpia")}
                  className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 hover:bg-purple-100 transition-colors"
                >
                  <ShoppingBag className="w-2.5 h-2.5" />
                  + Pusat Oleh-Oleh
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickPreset("Hotel / Penginapan (Check-in & Istirahat)")}
                  className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <Hotel className="w-2.5 h-2.5" />
                  + Check-in Hotel
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickPreset("Rest Area Tol (Istirahat & Sholat)")}
                  className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <Coffee className="w-2.5 h-2.5" />
                  + Rest Area Tol
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {[1, 2, 3, 4, 5, 6].map((num) => {
                const key = `destinasi_${num}` as keyof DestinationNote;
                const currentValue = formData[key] || "";
                const isRequired = num === 1;

                return (
                  <div
                    key={num}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 inline-flex items-center justify-center text-[10px] font-bold">
                          {num}
                        </span>
                        Destinasi {num}
                        {isRequired ? (
                          <span className="text-destructive">*</span>
                        ) : (
                          <span className="text-[10px] font-normal text-slate-400">
                            (Opsional)
                          </span>
                        )}
                      </Label>

                      {currentValue && (
                        <button
                          type="button"
                          onClick={() => handleClearSlot(num)}
                          className="text-[10px] text-red-500 hover:text-red-700 dark:text-red-400 flex items-center gap-0.5"
                          title="Kosongkan slot ini"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus
                        </button>
                      )}
                    </div>

                    {/* Dropdown Pilihan Destinasi */}
                    <select
                      value={currentValue}
                      onChange={(e) => handleSelectDropdown(num, e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Pilih dari Dropdown Destinasi --</option>
                      
                      {/* Destinasi Database User */}
                      {userSavedDestinations.length > 0 && (
                        <optgroup label="📍 Destinasi Database Anda">
                          {userSavedDestinations.map((d, idx) => (
                            <option key={`saved-${idx}`} value={d}>
                              {d}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {/* Destinasi Populer Nasional */}
                      {POPULAR_DESTINATIONS.map((cat, idx) => (
                        <optgroup key={idx} label={cat.kategori}>
                          {cat.items.map((item, itemIdx) => (
                            <option key={itemIdx} value={item}>
                              {item}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    {/* Input Text (Untuk penyesuaian detail atau ketik manual) */}
                    <Input
                      value={currentValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [key]: e.target.value,
                        })
                      }
                      placeholder={
                        isRequired
                          ? "Pilih dropdown di atas atau ketik nama destinasi..."
                          : `Destinasi ${num} (Pilih dropdown atau ketik kustom...)`
                      }
                      required={isRequired}
                      className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900"
                    />
                  </div>
                );
              })}

              <div className="pt-2">
                <Button type="submit" className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20">
                  Simpan Catatan Destinasi
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="text-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
          </div>
        ) : destinasiArray.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs text-muted-foreground">
              Belum ada catatan destinasi untuk trip ini.
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Klik &quot;Edit Destinasi&quot; untuk memilih destinasi wisata dari dropdown.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {destinasiArray.map((dest, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-start gap-2"
              >
                <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Destinasi {idx + 1}
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {dest}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
