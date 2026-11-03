import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  FileCheck,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import {
  ParsedRundownItem,
  extractTextFromWordFile,
  summarizeWordRundownWithAI,
  batchSaveRundownToTrip,
} from "@/utils/wordRundownParser";

interface ImportWordRundownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTripId?: string;
  defaultTripName?: string;
  onSuccess?: () => void;
}

export const ImportWordRundownDialog: React.FC<ImportWordRundownDialogProps> = ({
  open,
  onOpenChange,
  defaultTripId,
  defaultTripName,
  onSuccess,
}) => {
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>(defaultTripId || "");
  const [mode, setMode] = useState<"upload" | "paste">("upload");

  // State File & Teks
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [extractedRawText, setExtractedRawText] = useState("");

  // State Hasil Rangkuman
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedRundownItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultTripId) {
      setSelectedTripId(defaultTripId);
    }
  }, [defaultTripId]);

  useEffect(() => {
    if (!open) return;
    const fetchTrips = async () => {
      try {
        const cached = localStorage.getItem("catatbiro_cached_trips");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTrips(parsed);
            if (!selectedTripId) setSelectedTripId(parsed[0].id);
          }
        }

        const user = await getActiveUser();
        if (!user) return;

        const { data } = await supabase
          .from("trips")
          .select("id, nama_trip, tujuan, tanggal")
          .order("tanggal", { ascending: false });

        if (data && data.length > 0) {
          setTrips(data);
          if (!selectedTripId) setSelectedTripId(defaultTripId || data[0].id);
        }
      } catch (e) {
        console.warn("Gagal memuat trips:", e);
      }
    };
    fetchTrips();
  }, [open, defaultTripId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    try {
      const text = await extractTextFromWordFile(file);
      setExtractedRawText(text);
      toast.success(`File "${file.name}" berhasil dibaca.`);
    } catch (err: any) {
      toast.error("Gagal membaca file: " + (err.message || "Format tidak didukung"));
    }
  };

  const handleProcessDocument = async () => {
    const textToProcess =
      mode === "upload" ? extractedRawText.trim() : pastedText.trim();

    if (!textToProcess) {
      toast.error(
        mode === "upload"
          ? "Silakan pilih file dokumen Word (.docx) terlebih dahulu."
          : "Silakan tempel teks rundown Word pada kolom yang disediakan."
      );
      return;
    }

    setIsProcessing(true);
    setParsedItems([]);

    try {
      const targetTrip = trips.find((t) => t.id === selectedTripId);
      const items = await summarizeWordRundownWithAI(textToProcess, {
        nama_trip: targetTrip?.nama_trip || defaultTripName,
        tujuan: targetTrip?.tujuan,
      });

      if (items.length === 0) {
        toast.warning("Tidak ditemukan jadwal waktu pada dokumen ini.");
      } else {
        setParsedItems(items);
        toast.success(`Berhasil merangkum ${items.length} butir jadwal acara!`);
      }
    } catch (err: any) {
      toast.error("Gagal merangkum dokumen: " + (err.message || "Format tidak sesuai"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof ParsedRundownItem,
    value: any
  ) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddManualRow = () => {
    const lastItem = parsedItems[parsedItems.length - 1];
    const nextHari = lastItem ? lastItem.hari_ke : 1;
    setParsedItems((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        hari_ke: nextHari,
        jam_mulai: "08:00",
        jam_selesai: "09:00",
        judul_acara: "Agenda Tambahan",
        keterangan: "",
      },
    ]);
  };

  const handleSaveToTrip = async () => {
    if (!selectedTripId) {
      toast.error("Silakan pilih trip yang akan diisi jadwal rundown ini.");
      return;
    }
    if (parsedItems.length === 0) {
      toast.error("Belum ada jadwal yang dirangkum untuk disimpan.");
      return;
    }

    setIsSaving(true);
    try {
      const targetTrip = trips.find((t) => t.id === selectedTripId);
      const res = await batchSaveRundownToTrip(
        selectedTripId,
        parsedItems,
        targetTrip?.nama_trip || defaultTripName
      );

      if (res.success) {
        toast.success(`Sukses! ${res.insertedCount} jadwal acara berhasil dimasukkan ke trip.`);
        if (onSuccess) onSuccess();
        onOpenChange(false);
        // Reset state
        setSelectedFile(null);
        setPastedText("");
        setExtractedRawText("");
        setParsedItems([]);
      } else {
        toast.error("Gagal menyimpan: " + (res.error || "Terjadi kesalahan database"));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl p-5 sm:p-6 font-sans">
        <DialogHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Import Rundown dari Dokumen Word (.docx)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Upload file Word atau tempel teks itinerary. AI akan otomatis membaca, merapikan format jam, dan memasukkannya ke jadwal trip tanpa perlu input satu per satu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* 1. Pilih Trip Sasaran */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Trip yang Dituju
              </Label>
              <p className="text-[11px] text-slate-500">
                Jadwal yang dirangkum akan langsung dimasukkan ke trip ini.
              </p>
            </div>

            <div className="w-full sm:w-72">
              {trips.length > 0 ? (
                <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                  <SelectTrigger className="h-9 text-xs rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <SelectValue placeholder="Pilih trip tujuan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {trips.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.nama_trip} ({t.tujuan})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-xs text-slate-400">Belum ada trip aktif</div>
              )}
            </div>
          </div>

          {/* 2. Pilihan Upload File atau Tempel Teks */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  mode === "upload"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Upload File Word (.docx)
              </button>
              <button
                type="button"
                onClick={() => setMode("paste")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  mode === "paste"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Tempel Teks Dokumen
              </button>
            </div>

            {mode === "upload" ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <FileCheck className="w-8 h-8 text-emerald-600" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti file
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Klik untuk memilih file dokumen Word (.docx)
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Mendukung Microsoft Word (.docx) atau file teks (.txt)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Salin dan tempel naskah rundown Word di sini... Contoh:&#10;07.00 - 08.00 Kumpul di titik temu garasi bus&#10;08.00 - 11.00 Perjalanan menuju Borobudur&#10;11.00 - 13.00 Wisata Borobudur & Makan Siang"
                  className="min-h-[140px] text-xs font-mono rounded-lg border-slate-300 dark:border-slate-700"
                />
                <p className="text-[11px] text-slate-500">
                  Format bebas (tabel Word, poin-poin, atau teks biasa). AI akan memisahkan jam, acara, dan keterangan secara otomatis.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                Format waktu di dokumen akan dinormalisasi ke format HH:MM.
              </span>

              <Button
                type="button"
                onClick={handleProcessDocument}
                disabled={isProcessing}
                className="h-9 px-4 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Membaca & Merangkum...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Rangkum Jadwal dengan AI</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 3. Pratinjau Hasil Ekstraksi (Editable Table) */}
          {parsedItems.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Hasil Rangkuman: {parsedItems.length} Butir Jadwal Terdeteksi</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Anda dapat memeriksa atau mengubah teks sebelum disimpan ke trip {selectedTrip?.nama_trip || ""}.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddManualRow}
                  className="h-8 text-xs font-medium rounded-lg gap-1 border-slate-300 dark:border-slate-700 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold">
                      <th className="py-2.5 px-3 w-16">Hari</th>
                      <th className="py-2.5 px-3 w-24">Mulai</th>
                      <th className="py-2.5 px-3 w-24">Selesai</th>
                      <th className="py-2.5 px-3">Nama Kegiatan / Destinasi</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                      <th className="py-2.5 px-3 w-10 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {parsedItems.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="p-2">
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={item.hari_ke}
                            onChange={(e) =>
                              handleItemChange(idx, "hari_ke", parseInt(e.target.value, 10) || 1)
                            }
                            className="h-8 text-xs font-semibold text-center rounded px-1"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.jam_mulai}
                            onChange={(e) => handleItemChange(idx, "jam_mulai", e.target.value)}
                            className="h-8 text-xs font-mono rounded px-1"
                            placeholder="08:00"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.jam_selesai}
                            onChange={(e) => handleItemChange(idx, "jam_selesai", e.target.value)}
                            className="h-8 text-xs font-mono rounded px-1"
                            placeholder="09:00"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.judul_acara}
                            onChange={(e) => handleItemChange(idx, "judul_acara", e.target.value)}
                            className="h-8 text-xs font-medium rounded"
                            placeholder="Nama acara / destinasi"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.keterangan || ""}
                            onChange={(e) => handleItemChange(idx, "keterangan", e.target.value)}
                            className="h-8 text-xs text-slate-500 rounded"
                            placeholder="Catatan..."
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tombol Simpan Final */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
                <p className="text-xs text-slate-500">
                  Pastikan jadwal sudah sesuai sebelum dimasukkan ke database trip.
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="h-9 text-xs rounded-lg font-medium"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveToTrip}
                    disabled={isSaving}
                    className="h-9 px-5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan ke Trip...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Simpan Semua ({parsedItems.length} Jadwal) ke Trip</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
