import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
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
  ArrowLeft,
  Calendar,
  Bus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import {
  ParsedRundownItem,
  extractWordDocument,
  extractTextFromWordFile,
  summarizeWordRundownWithAI,
  batchSaveRundownToTrip,
} from "@/utils/wordRundownParser";

const ImportWordRundown: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripIdParam = searchParams.get("tripId");

  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>(tripIdParam || "");
  const [mode, setMode] = useState<"upload" | "paste">("upload");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [extractedRawText, setExtractedRawText] = useState("");
  const [extractedHtml, setExtractedHtml] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedRundownItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const cached = localStorage.getItem("catatbiro_cached_trips");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTrips(parsed);
            if (!selectedTripId) setSelectedTripId(tripIdParam || parsed[0].id);
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
          if (!selectedTripId) setSelectedTripId(tripIdParam || data[0].id);
        }
      } catch (e) {
        console.warn("Gagal memuat trips:", e);
      }
    };
    fetchTrips();
  }, [tripIdParam]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    try {
      const extracted = await extractWordDocument(file);
      const text = extracted.rawText;
      setExtractedHtml(extracted.html);
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
      const items = await summarizeWordRundownWithAI(
        textToProcess,
        {
          nama_trip: targetTrip?.nama_trip,
          tujuan: targetTrip?.tujuan,
        },
        mode === "upload" ? extractedHtml : undefined
      );




      if (items.length === 0) {
        toast.warning("Tidak ditemukan format jadwal jam pada dokumen ini.");
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
        targetTrip?.nama_trip
      );

      if (res.success) {
        toast.success(`Sukses! ${res.insertedCount} jadwal acara berhasil dimasukkan ke trip.`);
        navigate(`/trips/${selectedTripId}`);
      } else {
        toast.error("Gagal menyimpan: " + (res.error || "Terjadi kesalahan database"));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 lg:pl-64 pb-20 lg:pb-8 font-sans text-slate-900 dark:text-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-5">
          {/* Header Bersih */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-lg border-slate-200 dark:border-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Import Rundown dari Dokumen Word (.docx)
                </h1>
                <p className="text-xs text-slate-500">
                  Upload file Word atau tempel naskah itinerary. Sistem akan membaca dan memasukkan seluruh jadwal ke sistem.
                </p>
              </div>
            </div>
          </div>

          {/* 1. Pilih Trip Tujuan */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-900 dark:text-white block">
                Pilih Trip yang Dituju
              </Label>
              <p className="text-xs text-slate-500">
                Pilih paket perjalanan atau jadwal keberangkatan yang akan diisi rundown.
              </p>
            </div>

            <div className="w-full sm:w-80">
              {trips.length > 0 ? (
                <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                  <SelectTrigger className="h-9 text-xs rounded-lg border-slate-300 dark:border-slate-700">
                    <SelectValue placeholder="Pilih trip..." />
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

          {/* 2. File Upload / Teks Box */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
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
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-950/40 transition-colors"
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
                    <FileCheck className="w-10 h-10 text-emerald-600" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti file
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Klik untuk memilih dokumen Word (.docx)
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Format tabel Word atau naskah rundown akan dibaca otomatis oleh sistem
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
                  placeholder="Tempel naskah rundown dari Word di sini...&#10;Contoh:&#10;06.30 - 07.30 Kumpul di Pool Bus&#10;07.30 - 10.00 Perjalanan Tol Trans Jawa&#10;10.00 - 12.00 Kunjungan Wisata Pertama"
                  className="min-h-[160px] text-xs font-mono rounded-lg border-slate-300 dark:border-slate-700"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                Format jam (07.00 WIB / 07:00) akan dinormalisasi ke format HH:MM.
              </span>

              <Button
                type="button"
                onClick={handleProcessDocument}
                disabled={isProcessing}
                className="w-full sm:w-auto h-10 sm:h-9 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Membaca & Merangkum...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Baca & Susun Jadwal</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 3. Tabel Pratinjau Rangkuman */}
          {parsedItems.length > 0 && (
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Hasil Rangkuman: {parsedItems.length} Butir Jadwal Terdeteksi</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Periksa kembali data di bawah. Anda dapat mengedit teks sebelum dimasukkan ke trip {selectedTrip?.nama_trip || ""}.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddManualRow}
                  className="h-8 text-xs font-medium rounded-lg gap-1 border-slate-300 dark:border-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </Button>
              </div>

              {/* TAMPILAN MOBILE: Kartu Per Jadwal */}
              <div className="sm:hidden space-y-2.5">
                {parsedItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500">Hari ke-</span>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={item.hari_ke}
                          onChange={(e) =>
                            handleItemChange(idx, "hari_ke", parseInt(e.target.value, 10) || 1)
                          }
                          className="h-7 w-12 text-center text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 px-1"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <Input
                          value={item.jam_mulai}
                          onChange={(e) => handleItemChange(idx, "jam_mulai", e.target.value)}
                          className="h-7 w-16 text-center text-xs font-mono font-bold rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 px-1"
                          placeholder="08:00"
                        />
                        <span className="text-xs text-slate-400 font-bold">-</span>
                        <Input
                          value={item.jam_selesai}
                          onChange={(e) => handleItemChange(idx, "jam_selesai", e.target.value)}
                          className="h-7 w-16 text-center text-xs font-mono font-bold rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 px-1"
                          placeholder="09:00"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors ml-auto cursor-pointer"
                        title="Hapus baris ini"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>

                    <div>
                      <Input
                        value={item.judul_acara}
                        onChange={(e) => handleItemChange(idx, "judul_acara", e.target.value)}
                        className="h-8 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        placeholder="Nama kegiatan / destinasi..."
                      />
                    </div>

                    <div>
                      <Input
                        value={item.keterangan || ""}
                        onChange={(e) => handleItemChange(idx, "keterangan", e.target.value)}
                        className="h-7 text-xs text-slate-600 dark:text-slate-300 rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        placeholder="Keterangan / instruksi rombongan (opsional)..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* TAMPILAN DESKTOP: Tabel Kompak Lebar */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[650px] text-left border-collapse text-xs">
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

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-500">
                  {parsedItems.length} jadwal siap disimpan ke trip {selectedTrip?.nama_trip || ""}.
                </span>

                <Button
                  type="button"
                  onClick={handleSaveToTrip}
                  disabled={isSaving}
                  className="h-10 px-6 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Jadwal Trip...</span>
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
          )}
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default ImportWordRundown;
