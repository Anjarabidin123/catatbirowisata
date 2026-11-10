import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, MapPin, Trash2, GripVertical, ChevronUp, ChevronDown, Plus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { logCrewActivity } from "@/utils/rbacAuditLogger";
import { useTouchReorder } from "@/hooks/useTouchReorder";

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
  const [noteRecordId, setNoteRecordId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic destination list for intuitive reordering
  const [destinationList, setDestinationList] = useState<string[]>([]);

  // Reorder hook for touch long-press & desktop drag-and-drop
  const {
    draggingIndex,
    moveUp,
    moveDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useTouchReorder<string>({
    items: destinationList,
    onReorder: (newItems) => setDestinationList(newItems),
    longPressMs: 200,
  });

  useEffect(() => {
    loadNote();

    // Realtime subscription for trip destination notes (silent reload)
    const channel = supabase
      .channel(`trip-destination-notes-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_destination_notes", filter: `trip_id=eq.${tripId}` },
        () => loadNote(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const loadNote = async (silent = false) => {
    if (!silent && !note.destinasi_1) {
      setLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from("trip_destination_notes")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setNoteRecordId(data.id);
        const loaded: DestinationNote = {
          destinasi_1: data.destinasi_1 || "",
          destinasi_2: data.destinasi_2 || "",
          destinasi_3: data.destinasi_3 || "",
          destinasi_4: data.destinasi_4 || "",
          destinasi_5: data.destinasi_5 || "",
          destinasi_6: data.destinasi_6 || "",
        };
        setNote(loaded);

        const list = [
          data.destinasi_1,
          data.destinasi_2,
          data.destinasi_3,
          data.destinasi_4,
          data.destinasi_5,
          data.destinasi_6,
        ].filter(Boolean) as string[];

        setDestinationList(list.length > 0 ? list : [""]);
      } else {
        setDestinationList([""]);
      }
    } catch (error: any) {
      console.error("Error loading note:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    const list = [
      note.destinasi_1,
      note.destinasi_2,
      note.destinasi_3,
      note.destinasi_4,
      note.destinasi_5,
      note.destinasi_6,
    ].filter(Boolean) as string[];

    setDestinationList(list.length > 0 ? [...list] : [""]);
    setDialogOpen(true);
  };

  const handleItemChange = (index: number, val: string) => {
    setDestinationList((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleAddItem = () => {
    if (destinationList.length >= 8) {
      toast.info("Maksimal 8 titik destinasi.");
      return;
    }
    setDestinationList((prev) => [...prev, ""]);
  };

  const handleRemoveItem = (index: number) => {
    setDestinationList((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditDestinations) {
      toast.error("Akses Dibatasi: Anda tidak memiliki izin mengubah catatan destinasi.");
      return;
    }

    const cleanedList = destinationList.map((d) => d.trim()).filter(Boolean);
    if (cleanedList.length === 0) {
      toast.error("Tuliskan minimal 1 destinasi utama!");
      return;
    }

    // 1. Optimistic Instant UI Update (Zero Delay)
    const previousNote = { ...note };
    const cleanData: DestinationNote = {
      destinasi_1: cleanedList[0] || "",
      destinasi_2: cleanedList[1] || "",
      destinasi_3: cleanedList[2] || "",
      destinasi_4: cleanedList[3] || "",
      destinasi_5: cleanedList[4] || "",
      destinasi_6: cleanedList[5] || "",
    };

    setNote(cleanData);
    setDestinationList(cleanedList);
    setDialogOpen(false);
    toast.success("Urutan dan catatan destinasi berhasil disimpan!");
    setSubmitting(true);

    // 2. Background Asynchronous Database Persistence
    try {
      const user = await getActiveUser();
      if (!user) throw new Error("User not authenticated");

      const payload = {
        destinasi_1: cleanData.destinasi_1,
        destinasi_2: cleanData.destinasi_2 || null,
        destinasi_3: cleanData.destinasi_3 || null,
        destinasi_4: cleanData.destinasi_4 || null,
        destinasi_5: cleanData.destinasi_5 || null,
        destinasi_6: cleanData.destinasi_6 || null,
      };

      let currentId = noteRecordId;
      if (!currentId) {
        const { data: existing } = await supabase
          .from("trip_destination_notes")
          .select("id")
          .eq("trip_id", tripId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing?.id) {
          currentId = existing.id;
          setNoteRecordId(existing.id);
        }
      }

      if (currentId) {
        const { error } = await supabase
          .from("trip_destination_notes")
          .update(payload)
          .eq("id", currentId);

        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("trip_destination_notes")
          .insert({
            trip_id: tripId,
            user_id: user.id,
            ...payload,
          })
          .select("id")
          .single();

        if (error) throw error;
        if (inserted?.id) setNoteRecordId(inserted.id);
      }

      logCrewActivity({
        kategori: "keuangan_lapangan",
        aksi: "Memperbarui Urutan Destinasi Trip",
        detail: `Menyimpan urutan destinasi trip ${tripName}: ${cleanedList.join(" ➔ ")}`,
        tripName,
      });
    } catch (error: any) {
      console.error("Error saving destination notes:", error);
      setNote(previousNote);
      toast.error("Gagal menyimpan ke database: " + (error?.message || "Koneksi terputus"));
    } finally {
      setSubmitting(false);
    }
  };

  const destinasiArray = [
    note.destinasi_1,
    note.destinasi_2,
    note.destinasi_3,
    note.destinasi_4,
    note.destinasi_5,
    note.destinasi_6,
  ].filter((d) => d && d.trim());

  return (
    <Card className="p-4 sm:p-5 border border-slate-300/90 dark:border-slate-800 shadow-xs">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div
            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Catatan Destinasi
              </h3>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {destinasiArray.length > 0
                  ? `${destinasiArray.length} titik destinasi berurutan`
                  : "Belum ada catatan destinasi"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              {canEditDestinations && (
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenDialog}
                    className="h-8 px-2.5 sm:px-3 text-xs rounded-xl font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-50 gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Atur Urutan Destinasi</span>
                    <span className="sm:hidden">Atur</span>
                  </Button>
                </DialogTrigger>
              )}

          <DialogContent className="w-[95vw] max-w-[calc(100vw-16px)] sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6 z-50">
            <DialogHeader className="space-y-1 text-left pr-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Atur & Urutkan Destinasi
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Susun rute destinasi untuk trip {tripName}. Tekan agak lama kartu lalu geser, atau gunakan tombol panah untuk memindahkan urutan.
              </DialogDescription>
            </DialogHeader>

            {/* Banner Panduan Sentuh & Geser (Long-Press Drag & Drop) */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-black text-blue-700 dark:text-blue-300">Cara Memindahkan No Urut:</span>{" "}
                <strong>Tekan agak lama</strong> pada kartu/gagang (⠿) lalu <strong>geser ke atas/bawah</strong>. Anda juga bisa klik tombol panah (▲ / ▼) untuk geser instan.
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5 pt-1">
              <div className="space-y-2">
                {destinationList.map((destName, idx) => {
                  const isDragging = draggingIndex === idx;
                  const isFirst = idx === 0;
                  const isLast = idx === destinationList.length - 1;

                  return (
                    <div
                      key={idx}
                      data-reorder-idx={idx}
                      draggable
                      onDragStart={(e) => handleDragStart(idx, e)}
                      onDragOver={(e) => handleDragOver(idx, e)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(idx, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={`p-2.5 rounded-2xl border transition-all duration-150 flex items-center gap-2 select-none relative ${
                        isDragging
                          ? "scale-[1.02] shadow-xl border-blue-500 bg-blue-50/90 dark:bg-blue-950/80 ring-2 ring-blue-400 z-20"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      {/* Gagang Sentuh Drag (Touch Handle) */}
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 touch-none flex-shrink-0"
                        title="Tekan agak lama & geser"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Nomor Urut Badge */}
                      <div className="flex-shrink-0">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 inline-flex items-center justify-center text-xs font-black">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Input Nama Destinasi */}
                      <div className="flex-1 min-w-0">
                        <Input
                          value={destName}
                          onChange={(e) => handleItemChange(idx, e.target.value)}
                          placeholder={
                            idx === 0
                              ? "Destinasi 1 (Tujuan Utama)..."
                              : `Destinasi ${idx + 1} (Opsional)...`
                          }
                          className="h-8 text-xs font-semibold rounded-xl bg-slate-50/80 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:bg-white"
                        />
                      </div>

                      {/* Tombol Geser Cepat Panah (▲ / ▼) & Hapus */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => moveUp(idx)}
                          className={`p-1 rounded-md transition-colors ${
                            isFirst
                              ? "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                              : "text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                          }`}
                          title="Geser ke atas"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => moveDown(idx)}
                          className={`p-1 rounded-md transition-colors ${
                            isLast
                              ? "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                              : "text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                          }`}
                          title="Geser ke bawah"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors cursor-pointer ml-0.5"
                          title="Hapus baris destinasi"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tombol Tambah Baris Destinasi */}
              <div className="pt-1 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  disabled={destinationList.length >= 8}
                  className="h-8 text-xs font-bold rounded-xl border-dashed border-slate-300 dark:border-slate-700 text-blue-600 hover:bg-blue-50/50 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Titik Destinasi</span>
                </Button>

                <span className="text-[10px] text-slate-400 font-semibold">
                  {destinationList.length} / 8 Destinasi
                </span>
              </div>

              {/* Tombol Aksi Simpan */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="h-9 text-xs rounded-xl font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20"
                >
                  {submitting ? "Menyimpan..." : "Simpan Urutan & Catatan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <CollapsibleTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title={isExpanded ? "Tutup rincian destinasi" : "Buka rincian destinasi"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
      </div>
    </div>

    {/* Tampilan Daftar Destinasi di Kartu Utama (Collapsible Content) */}
    <CollapsibleContent className="mt-3">
      {loading ? (
        <div className="text-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
        </div>
      ) : destinasiArray.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/30">
          <p className="text-xs text-muted-foreground font-semibold">
            Belum ada catatan destinasi untuk trip ini.
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Klik &quot;Atur Urutan Destinasi&quot; untuk menuliskan daftar tujuan wisata.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-0.5">
          {destinasiArray.map((dest, idx) => (
            <div
              key={idx}
              className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-start gap-2.5"
            >
              <span className="w-5 h-5 rounded-lg bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  Destinasi ke-{idx + 1}
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {dest}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollapsibleContent>
  </Collapsible>
</Card>
  );
};
