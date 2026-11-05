import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, MapPin, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const TripDestinationsCard = ({ tripId, tripName }: TripDestinationsCardProps) => {
  const { hasPermission } = useRole();
  const canEditDestinations = hasPermission("rule_rundown_catatan");
  const [note, setNote] = useState<DestinationNote>({ destinasi_1: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<DestinationNote>({ destinasi_1: "" });

  useEffect(() => {
    loadNote();

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
        kategori: "keuangan_lapangan",
        aksi: "Memperbarui Catatan Destinasi Trip",
        detail: `Menyimpan daftar destinasi trip ${tripName}: ${filledList}`,
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
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs rounded-xl font-medium border-slate-200 dark:border-slate-700"
              >
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
                Tuliskan daftar destinasi kunjungan untuk agenda trip {tripName}.
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
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
                      <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
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
                          className="text-[10px] text-red-500 hover:text-red-700 dark:text-red-400 flex items-center gap-0.5 cursor-pointer"
                          title="Kosongkan slot ini"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus
                        </button>
                      )}
                    </div>

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
                          ? "Ketik nama destinasi tujuan utama..."
                          : `Destinasi ${num} (Opsional)...`
                      }
                      required={isRequired}
                      className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                );
              })}

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20"
                >
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
              Klik &quot;Edit Destinasi&quot; untuk menuliskan daftar destinasi wisata.
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
