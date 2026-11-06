import React, { useState, useEffect, useRef, useMemo } from "react";
import { savePdf } from "@/utils/pdfSaver";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bus,
  Search,
  User,
  Users,
  FileDown,
  Share2,
  Trash2,
  CheckCircle2,
  Plus,
  Shield,
  Phone,
  Camera,
  FileText,
  Image as ImageIcon,
  Loader2,
  Download,
  ClipboardPaste,
  Sparkles,
  ArrowRight,
  Info,
  Check,
  Settings2,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { getLocalBiroProfile } from "@/utils/biroProfile";
import { logCrewActivity } from "@/utils/rbacAuditLogger";
import { useRole } from "@/contexts/RoleContext";
import {
  BusLayoutType,
  BusConfig,
  SeatAssignment,
  getDefaultBusConfig,
  buildBusStructureFromConfig,
  getAllSeatNumbers,
  parseWordManifest,
  scanPhotoManifestWithAI,
  exportManifestToWordDoc,
} from "@/utils/busManifestHelper";

interface BusSeatManifestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripInfo?: {
    nama_trip?: string;
    tujuan?: string;
    nama_kendaraan?: string | null;
    nomor_polisi?: string | null;
    nama_driver?: string | null;
  };
}

export const BusSeatManifestModal: React.FC<BusSeatManifestModalProps> = ({
  open,
  onOpenChange,
  tripId,
  tripInfo,
}) => {
  const { hasPermission } = useRole();
  const canManageManifest = hasPermission("rule_manifest_kursi");
  const noteTitle = `[MANIFEST] bus_${tripId}`;
  const localKey = `bus_manifest_${tripId}`;

  // Konfigurasi denah kabin bus
  const [busConfig, setBusConfig] = useState<BusConfig>(() =>
    getDefaultBusConfig("medium_bus_31")
  );
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const [manifest, setManifest] = useState<Record<string, SeatAssignment>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  // Form edit kursi
  const [passengerName, setPassengerName] = useState("");
  const [passengerCategory, setPassengerCategory] = useState<any>("Umum");
  const [passengerNotes, setPassengerNotes] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");

  // State Import & Export
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importedPassengers, setImportedPassengers] = useState<
    { seat?: string; name: string; notes?: string }[]
  >([]);
  const [importSourceType, setImportSourceType] = useState<"word" | "foto" | "paste">("word");

  // State Quick Paste
  const [quickPasteOpen, setQuickPasteOpen] = useState(false);
  const [quickPasteText, setQuickPasteText] = useState("");

  const wordFileInputRef = useRef<HTMLInputElement>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const busCabinRef = useRef<HTMLDivElement>(null);

  // Hitung struktur kabin bus dari konfigurasi aktif
  const busStructure = useMemo(
    () => buildBusStructureFromConfig(busConfig),
    [busConfig]
  );
  const seatList = useMemo(() => getAllSeatNumbers(busStructure), [busStructure]);
  const totalSeats = busStructure.totalSeats;
  const occupiedCount = Object.keys(manifest).filter((k) => seatList.includes(k)).length;
  const emptyCount = totalSeats - occupiedCount;

  // Load manifest dari Supabase notes / localStorage
  useEffect(() => {
    if (!open) return;

    let foundLocal = false;
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.config) {
          setBusConfig(parsed.config);
        } else if (parsed.layout) {
          setBusConfig(getDefaultBusConfig(parsed.layout));
        }
        if (parsed.manifest) setManifest(parsed.manifest);
        foundLocal = true;
      }
    } catch {}

    if (!foundLocal) {
      setBusConfig(getDefaultBusConfig("medium_bus_31"));
      setManifest({});
    }

    const loadRemote = async () => {
      try {
        const user = await getActiveUser();
        if (!user || !tripId) return;

        const { data } = await supabase
          .from("notes")
          .select("konten")
          .eq("trip_id", tripId)
          .eq("judul", noteTitle)
          .maybeSingle();

        if (data && data.konten) {
          const parsed = JSON.parse(data.konten);
          if (parsed.config) {
            setBusConfig(parsed.config);
          } else if (parsed.layout) {
            setBusConfig(getDefaultBusConfig(parsed.layout));
          }
          if (parsed.manifest) {
            setManifest(parsed.manifest);
            localStorage.setItem(localKey, JSON.stringify(parsed));
          }
        }
      } catch (e) {
        console.warn("Error loading bus manifest:", e);
      }
    };

    loadRemote();
  }, [open, tripId, noteTitle, localKey]);

  // Simpan manifest & config ke local & Supabase
  const saveManifestData = async (
    newManifest: Record<string, SeatAssignment>,
    configToSave = busConfig
  ) => {
    setManifest(newManifest);
    const payload = { config: configToSave, layout: configToSave.layout, manifest: newManifest };
    try {
      localStorage.setItem(localKey, JSON.stringify(payload));
    } catch {}

    try {
      const user = await getActiveUser();
      if (!user || !tripId) return;

      const { data: existing } = await supabase
        .from("notes")
        .select("id")
        .eq("trip_id", tripId)
        .eq("judul", noteTitle)
        .maybeSingle();

      const jsonStr = JSON.stringify(payload);

      if (existing) {
        await supabase.from("notes").update({ konten: jsonStr }).eq("id", existing.id);
      } else {
        await supabase.from("notes").insert({
          trip_id: tripId,
          user_id: user.id,
          judul: noteTitle,
          konten: jsonStr,
        });
      }
    } catch (e) {
      console.warn("Error saving bus manifest to notes:", e);
    }
  };

  const handleSeatClick = (seatNo: string) => {
    if (!canManageManifest) {
      toast.error("Izin akses Denah Kursi & Manifest dinonaktifkan oleh Pemilik Biro");
      return;
    }
    setSelectedSeat(seatNo);
    const existing = manifest[seatNo];
    if (existing) {
      setPassengerName(existing.name || "");
      setPassengerCategory(existing.category || "Umum");
      setPassengerNotes(existing.notes || "");
      setPassengerPhone(existing.phone || "");
    } else {
      setPassengerName("");
      setPassengerCategory("Umum");
      setPassengerNotes("");
      setPassengerPhone("");
    }
  };

  const handleSaveSeat = () => {
    if (!canManageManifest) {
      toast.error("Izin akses Denah Kursi & Manifest dinonaktifkan oleh Pemilik Biro");
      return;
    }
    if (!selectedSeat) return;
    if (!passengerName.trim()) {
      handleClearSeat(selectedSeat);
      return;
    }

    const updated = {
      ...manifest,
      [selectedSeat]: {
        seatNumber: selectedSeat,
        name: passengerName.trim(),
        category: passengerCategory,
        notes: passengerNotes.trim() || undefined,
        phone: passengerPhone.trim() || undefined,
      },
    };

    saveManifestData(updated, busConfig);
    logCrewActivity({
      kategori: "manifest_kursi",
      aksi: `Mengatur Kursi Bus No. ${selectedSeat}`,
      detail: `Penumpang: ${passengerName.trim()} (${passengerCategory})${
        passengerNotes.trim() ? ` - ${passengerNotes.trim()}` : ""
      }`,
      tripName: tripInfo?.nama_trip,
    });
    setSelectedSeat(null);
    toast.success(`Kursi ${selectedSeat} berhasil dialokasikan untuk ${passengerName.trim()}`);
  };

  const handleClearSeat = (seatNo: string) => {
    if (!canManageManifest) {
      toast.error("Izin akses Denah Kursi & Manifest dinonaktifkan oleh Pemilik Biro");
      return;
    }
    const previous = manifest[seatNo];
    const updated = { ...manifest };
    delete updated[seatNo];
    saveManifestData(updated, busConfig);
    if (previous) {
      logCrewActivity({
        kategori: "manifest_kursi",
        aksi: `Mengosongkan Kursi Bus No. ${seatNo}`,
        detail: `Menghapus alokasi kursi ${seatNo} (${previous.name})`,
        tripName: tripInfo?.nama_trip,
        status: "peringatan",
      });
    }
    setSelectedSeat(null);
    toast.info(`Alokasi kursi ${seatNo} dikosongkan`);
  };

  // Ubah preset cepat
  const handlePresetChange = (preset: BusLayoutType) => {
    if (!canManageManifest) {
      toast.error("Izin akses Denah Kursi & Manifest dinonaktifkan oleh Pemilik Biro");
      return;
    }
    const newCfg = getDefaultBusConfig(preset);
    setBusConfig(newCfg);
    saveManifestData(manifest, newCfg);
    toast.success(`Denah diubah ke ${newCfg.layout.replace(/_/g, " ").toUpperCase()}`);
  };

  // Ubah konfigurasi kustom (kiri/kanan/baris)
  const updateCustomConfig = (partial: Partial<BusConfig>) => {
    const updated: BusConfig = {
      ...busConfig,
      ...partial,
      layout: "custom",
    };
    setBusConfig(updated);
    saveManifestData(manifest, updated);
  };

  // =========================================================
  // FITUR: IMPORT WORD (.docx / .txt)
  // =========================================================
  const handleWordFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const parsed = await parseWordManifest(file);
      if (parsed.length === 0) {
        toast.error("Tidak dapat menemukan nama peserta dalam file dokumen tersebut");
        return;
      }
      setImportedPassengers(parsed);
      setImportSourceType("word");
      setImportPreviewOpen(true);
      toast.success(`Berhasil membaca ${parsed.length} nama peserta dari file Word!`);
    } catch (err: any) {
      console.error("Gagal membaca file Word:", err);
      toast.error(`Gagal membaca file: ${err.message || "Pastikan format dokumen valid"}`);
    } finally {
      setIsProcessingFile(false);
      if (wordFileInputRef.current) wordFileInputRef.current.value = "";
    }
  };

  // =========================================================
  // FITUR: SCAN FOTO (AI OCR VISION)
  // =========================================================
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      toast.loading("Menganalisis foto denah / daftar nama dengan AI...", { id: "ai-scan" });
      const parsed = await scanPhotoManifestWithAI(file);
      toast.dismiss("ai-scan");

      if (parsed.length === 0) {
        toast.info("AI tidak dapat membaca teks jelas. Silakan gunakan opsi Salin & Tempel Teks.");
        setQuickPasteOpen(true);
        return;
      }
      setImportedPassengers(parsed);
      setImportSourceType("foto");
      setImportPreviewOpen(true);
      toast.success(`AI berhasil mengekstrak ${parsed.length} nama peserta dari foto!`);
    } catch (err: any) {
      toast.dismiss("ai-scan");
      console.warn("Gagal scan foto AI:", err);
      toast.error("Gagal memproses gambar. Membuka formulir Salin & Tempel cepat.");
      setQuickPasteOpen(true);
    } finally {
      setIsProcessingFile(false);
      if (photoFileInputRef.current) photoFileInputRef.current.value = "";
    }
  };

  // =========================================================
  // FITUR: QUICK PASTE TEXT (DARI WHATSAPP / EXCEL)
  // =========================================================
  const handleProcessQuickPaste = () => {
    const lines = quickPasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast.error("Silakan masukkan teks daftar nama terlebih dahulu");
      return;
    }

    const parsed: { seat?: string; name: string }[] = [];
    const seatPrefixRegex = /^([0-9]{1,2}[A-F]?)\s*[:\-\.\|]\s*(.+)$/i;
    const numberedListRegex = /^[0-9]{1,3}[\.\)\-]\s*(.+)$/;

    lines.forEach((line) => {
      const matchSeat = line.match(seatPrefixRegex);
      if (matchSeat) {
        parsed.push({ seat: matchSeat[1].toUpperCase(), name: matchSeat[2].trim() });
        return;
      }
      const matchNum = line.match(numberedListRegex);
      if (matchNum) {
        parsed.push({ name: matchNum[1].trim() });
        return;
      }
      parsed.push({ name: line });
    });

    setImportedPassengers(parsed);
    setImportSourceType("paste");
    setQuickPasteOpen(false);
    setImportPreviewOpen(true);
    toast.success(`Memuat ${parsed.length} nama dari teks!`);
  };

  // Terapkan hasil import ke kursi-kursi bus
  const applyImportedToManifest = () => {
    if (importedPassengers.length === 0) return;

    const newManifest: Record<string, SeatAssignment> = { ...manifest };
    let unassignedSeats = [...seatList].filter((s) => !newManifest[s]);

    let filledCount = 0;

    importedPassengers.forEach((item) => {
      if (item.seat && seatList.includes(item.seat)) {
        newManifest[item.seat] = {
          seatNumber: item.seat,
          name: item.name,
          category: "Umum",
          notes: item.notes,
        };
        unassignedSeats = unassignedSeats.filter((s) => s !== item.seat);
        filledCount++;
      } else if (unassignedSeats.length > 0) {
        const nextSeat = unassignedSeats.shift()!;
        newManifest[nextSeat] = {
          seatNumber: nextSeat,
          name: item.name,
          category: "Umum",
          notes: item.notes,
        };
        filledCount++;
      }
    });

    saveManifestData(newManifest, busConfig);
    logCrewActivity({
      kategori: "manifest_kursi",
      aksi: `Import Massal Manifest Kursi (${importSourceType.toUpperCase()})`,
      detail: `Mengalokasikan ${filledCount} penumpang ke denah bus ${busStructure.title}`,
      tripName: tripInfo?.nama_trip,
    });

    setImportPreviewOpen(false);
    setImportedPassengers([]);
    toast.success(`Sukses! ${filledCount} kursi berhasil dialokasikan.`);
  };

  // =========================================================
  // FITUR: EXPORT KE WORD (.doc)
  // =========================================================
  const handleExportWord = () => {
    try {
      const profile = getLocalBiroProfile();
      exportManifestToWordDoc(tripInfo || {}, manifest, busStructure, profile);
      toast.success("Dokumen Microsoft Word (.doc) berhasil diunduh!");
    } catch (e: any) {
      toast.error(`Gagal export Word: ${e.message}`);
    }
  };

  // =========================================================
  // FITUR: EXPORT KE GAMBAR / FOTO (PNG)
  // =========================================================
  const handleExportImage = async () => {
    if (!busCabinRef.current) return;
    try {
      toast.loading("Membuat gambar denah bus resolusi tinggi...", { id: "img-gen" });
      const { default: html2canvas } = await import("html2canvas");

      const canvas = await html2canvas(busCabinRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      const cleanTrip = (tripInfo?.nama_trip || "TRIP").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.href = dataUrl;
      a.download = `DENAH_KURSI_BUS_${cleanTrip}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.dismiss("img-gen");
      toast.success("Foto / Gambar denah kursi bus berhasil diunduh!");
    } catch (err: any) {
      toast.dismiss("img-gen");
      toast.error(`Gagal mengunduh gambar: ${err.message}`);
    }
  };

  // =========================================================
  // FITUR: EXPORT PDF RESMI
  // =========================================================
  const handleExportPDF = async () => {
    const [{ default: jsPDFClass }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const profile = getLocalBiroProfile();
    const doc = new jsPDFClass({ orientation: "portrait", unit: "mm", format: "a4" });

    // Kop
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 44, 89);
    doc.text(profile.nama_biro.toUpperCase(), 105, 15, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(profile.slogan || "Biro Perjalanan Wisata", 105, 20, { align: "center" });

    doc.setLineWidth(0.8);
    doc.setDrawColor(15, 44, 89);
    doc.line(14, 23, 196, 23);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("MANIFEST RESMI ALOKASI KURSI BUS PARIWISATA", 105, 30, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(
      `Rombongan: ${tripInfo?.nama_trip || "Trip"}  |  Destinasi: ${tripInfo?.tujuan || "-"}`,
      14,
      37
    );
    doc.text(
      `Armada: ${tripInfo?.nama_kendaraan || "Bus Pariwisata"} (${tripInfo?.nomor_polisi || "-"})  |  Driver: ${
        tripInfo?.nama_driver || "-"
      }`,
      14,
      42
    );
    doc.text(
      `Tipe: ${busStructure.title}  |  Kapasitas: ${totalSeats} Kursi  |  Terisi: ${occupiedCount} Peserta  |  Kosong: ${emptyCount} Kursi`,
      14,
      47
    );

    const sortedSeats = [...seatList].sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      return isNaN(numA) || isNaN(numB)
        ? a.localeCompare(b)
        : numA === numB
        ? a.localeCompare(b)
        : numA - numB;
    });

    const rows = sortedSeats.map((seat) => {
      const p = manifest[seat];
      return [
        seat,
        p ? p.name : "(Kursi Kosong)",
        p?.category || "-",
        p?.phone || "-",
        p?.notes || "-",
      ];
    });

    autoTable(doc, {
      startY: 52,
      head: [["No Kursi", "Nama Peserta", "Kategori", "No. Telepon / WA", "Catatan Khusus"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [15, 44, 89], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", cellWidth: 16 },
        1: { fontStyle: "bold", cellWidth: 54 },
        2: { halign: "center", cellWidth: 24 },
        3: { cellWidth: 38 },
        4: { cellWidth: 50 },
      },
      margin: { left: 14, right: 14 },
    });

    void savePdf(
      doc,
      `MANIFEST_KURSI_BUS_${tripInfo?.nama_trip?.replace(/\s+/g, "_") || "TRIP"}.pdf`
    );
    toast.success("PDF Manifest kursi bus berhasil diunduh!");
  };

  // =========================================================
  // FITUR: EXPORT WHATSAPP
  // =========================================================
  const handleExportWhatsApp = () => {
    let text =
      `🚌 *MANIFEST ALOKASI KURSI BUS PARIWISATA*\n` +
      `Trip: *${tripInfo?.nama_trip || "Wisata"}*\n` +
      `Armada: ${tripInfo?.nama_kendaraan || "Bus"} (${tripInfo?.nomor_polisi || "-"}) | Driver: ${
        tripInfo?.nama_driver || "-"
      }\n` +
      `Total Terisi: ${occupiedCount}/${totalSeats} Kursi (${emptyCount} Kosong)\n` +
      `-----------------------------------------\n`;

    const sortedSeats = [...seatList].sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      return isNaN(numA) || isNaN(numB)
        ? a.localeCompare(b)
        : numA === numB
        ? a.localeCompare(b)
        : numA - numB;
    });

    sortedSeats.forEach((seat) => {
      const p = manifest[seat];
      if (p) {
        text += `💺 *${seat}*: ${p.name} ${p.notes ? `(${p.notes})` : ""}\n`;
      }
    });

    text += `\n_Mohon peserta menempati kursi sesuai nomor tiket/manifest. Salam Wisata!_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    toast.success("Membuka WhatsApp untuk mengirimkan manifest...");
  };

  // =========================================================
  // RENDER SEAT (PERSIS SEPERTI SKETSA DENGAN SANDARAN & ARMREST)
  // =========================================================
  const renderSeatItem = (seatNo: string) => {
    const assigned = manifest[seatNo];
    const isOccupied = Boolean(assigned);
    const isMatchingSearch =
      searchQuery.trim() !== "" &&
      (seatNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (assigned && assigned.name.toLowerCase().includes(searchQuery.toLowerCase())));

    return (
      <div key={seatNo} className="relative inline-flex items-center">
        {/* Armrest Kiri */}
        <div
          className={`w-1.5 h-8 sm:h-9 rounded-l-md -mr-[1px] z-10 transition-colors ${
            isOccupied ? "bg-slate-700 dark:bg-slate-400" : "bg-slate-400 dark:bg-slate-600"
          }`}
        />

        {/* Badan Kursi */}
        <button
          type="button"
          onClick={() => handleSeatClick(seatNo)}
          className={`w-12 sm:w-14 min-h-[56px] sm:min-h-[64px] rounded-xl border-2 transition-all relative flex flex-col justify-between p-1 shadow-2xs group text-left ${
            isMatchingSearch
              ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/80 border-amber-500 shadow-md"
              : isOccupied
              ? "bg-blue-50/90 dark:bg-blue-950/70 border-slate-800 dark:border-blue-400 hover:border-blue-600 hover:shadow-md"
              : "bg-white dark:bg-slate-900 border-slate-700 dark:border-slate-500 hover:bg-slate-50 hover:border-blue-500"
          }`}
          title={`Kursi ${seatNo}: ${assigned ? assigned.name : "Kosong (Klik untuk isi)"}`}
        >
          {/* Headrest Cushion */}
          <div
            className={`w-8 h-2 rounded-t-lg mx-auto -mt-0.5 border-b transition-colors ${
              isOccupied
                ? "bg-blue-600 border-blue-700 dark:bg-blue-500"
                : "bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600"
            }`}
          />

          {/* Nomor Kursi */}
          <div className="flex items-center justify-center w-full my-auto">
            <span
              className={`text-xs sm:text-sm font-black font-mono tracking-tight ${
                isOccupied
                  ? "text-blue-950 dark:text-blue-100"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {seatNo}
            </span>
          </div>

          {/* Nama Penumpang jika terisi */}
          {isOccupied ? (
            <div className="w-full text-center">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-900 dark:text-white truncate leading-none">
                {assigned.name}
              </p>
              {assigned.category && assigned.category !== "Umum" && (
                <span className="text-[7.5px] font-bold px-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-300 inline-block truncate max-w-full mt-0.5">
                  {assigned.category}
                </span>
              )}
            </div>
          ) : (
            <div className="text-center w-full pb-0.5">
              <span className="text-[8px] font-bold text-slate-400 group-hover:text-blue-600">
                Kosong
              </span>
            </div>
          )}
        </button>

        {/* Armrest Kanan */}
        <div
          className={`w-1.5 h-8 sm:h-9 rounded-r-md -ml-[1px] z-10 transition-colors ${
            isOccupied ? "bg-slate-700 dark:bg-slate-400" : "bg-slate-400 dark:bg-slate-600"
          }`}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto rounded-3xl p-4 sm:p-6 bg-white dark:bg-slate-950">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Denah Kabin & Manifest Penumpang Bus</span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                    {busStructure.configLabel}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-semibold mt-0.5">
                  Sketsa kabin bus asli dengan konfigurasi kursi bebas (kiri 2/3, lorong, kanan 2/3)
                </DialogDescription>
              </div>
            </div>

            {/* Presets & Tombol Pengaturan Denah */}
            <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
              <Select
                value={busConfig.layout}
                onValueChange={(val: any) => handlePresetChange(val)}
              >
                <SelectTrigger className="h-9 text-xs font-bold rounded-xl w-[210px] border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medium_bus_31" className="text-xs font-semibold">
                    Medium Bus 31 Seat (Sketsa Standar)
                  </SelectItem>
                  <SelectItem value="big_bus_50" className="text-xs font-semibold">
                    Big Bus 50 Seat (2 - 2)
                  </SelectItem>
                  <SelectItem value="big_bus_59" className="text-xs font-semibold">
                    Big Bus 59 Seat (2 - 3)
                  </SelectItem>
                  <SelectItem value="big_bus_60" className="text-xs font-semibold">
                    Big Bus 60 Seat (3 - 3)
                  </SelectItem>
                  <SelectItem value="hiace_14" className="text-xs font-semibold">
                    Toyota HiAce 14 Seat
                  </SelectItem>
                  <SelectItem value="custom" className="text-xs font-semibold">
                    Custom Bebas
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={showConfigPanel ? "default" : "outline"}
                size="sm"
                onClick={() => setShowConfigPanel(!showConfigPanel)}
                className="h-9 text-xs font-black rounded-xl gap-1.5"
                title="Atur formasi kursi (kiri 2/3, kanan 2/3, jumlah baris)"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Atur Denah</span>
                {showConfigPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ========================================================
            PANEL KUSTOMISASI DENAH (KIRI 2/3, KANAN 2/3, BARIS, DLL)
            ======================================================== */}
        {showConfigPanel && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-600" />
                <span>Sesuaikan Formasi Kursi & Tata Letak Kabin Bus</span>
              </h4>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Total Hasil: {totalSeats} Kursi
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Kursi Kiri */}
              <div className="space-y-1">
                <Label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                  Kursi Sisi Kiri
                </Label>
                <Select
                  value={String(busConfig.leftSeatsPerRow)}
                  onValueChange={(val) => updateCustomConfig({ leftSeatsPerRow: Number(val) })}
                >
                  <SelectTrigger className="h-8 text-xs font-bold rounded-xl bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Kursi (VIP)</SelectItem>
                    <SelectItem value="2">2 Kursi (Standar)</SelectItem>
                    <SelectItem value="3">3 Kursi (Ekonomi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Kursi Kanan */}
              <div className="space-y-1">
                <Label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                  Kursi Sisi Kanan
                </Label>
                <Select
                  value={String(busConfig.rightSeatsPerRow)}
                  onValueChange={(val) => updateCustomConfig({ rightSeatsPerRow: Number(val) })}
                >
                  <SelectTrigger className="h-8 text-xs font-bold rounded-xl bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Kursi (VIP)</SelectItem>
                    <SelectItem value="2">2 Kursi (Standar)</SelectItem>
                    <SelectItem value="3">3 Kursi (Ekonomi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Jumlah Baris */}
              <div className="space-y-1">
                <Label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                  Jumlah Baris ({busConfig.rowCount} Baris)
                </Label>
                <Select
                  value={String(busConfig.rowCount)}
                  onValueChange={(val) => updateCustomConfig({ rowCount: Number(val) })}
                >
                  <SelectTrigger className="h-8 text-xs font-bold rounded-xl bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} Baris
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gaya Penomoran */}
              <div className="space-y-1">
                <Label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                  Gaya Penomoran
                </Label>
                <Select
                  value={busConfig.numberingStyle}
                  onValueChange={(val: any) => updateCustomConfig({ numberingStyle: val })}
                >
                  <SelectTrigger className="h-8 text-xs font-bold rounded-xl bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Angka (1, 2, 3...)</SelectItem>
                    <SelectItem value="letter">Huruf (1A, 1B, 1C...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bangku Belakang */}
              <div className="space-y-1">
                <Label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                  Bangku Belakang
                </Label>
                <Select
                  value={String(busConfig.backRowSeatsCount)}
                  onValueChange={(val) =>
                    updateCustomConfig({
                      backRowSeatsCount: Number(val),
                      hasBackRow: Number(val) > 0,
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs font-bold rounded-xl bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tidak Ada</SelectItem>
                    <SelectItem value="4">4 Kursi</SelectItem>
                    <SelectItem value="5">5 Kursi (Standar)</SelectItem>
                    <SelectItem value="6">6 Kursi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pintu Belakang Kiri */}
              <div className="space-y-1">
                <Label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                  Tangga Pintu Belakang
                </Label>
                <div className="h-8 flex items-center gap-2">
                  <Switch
                    checked={busConfig.hasRearDoor}
                    onCheckedChange={(checked) => updateCustomConfig({ hasRearDoor: checked })}
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {busConfig.hasRearDoor ? "Ada (Kiri)" : "Tidak Ada"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar Input & Export */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
          {/* Stats Bar & Pencarian */}
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            <Badge className="bg-blue-600 text-white font-black text-xs h-7 px-3 rounded-xl shadow-xs">
              {occupiedCount} / {totalSeats} Kursi Terisi
            </Badge>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              ({emptyCount} Kosong)
            </span>

            <div className="relative flex-1 min-w-[170px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari peserta / no kursi..."
                className="h-8 pl-8 text-xs font-semibold rounded-xl bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Tombol Import & Export Terintegrasi */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <input
              type="file"
              ref={wordFileInputRef}
              onChange={handleWordFileChange}
              accept=".docx,.doc,.txt"
              className="hidden"
            />
            <input
              type="file"
              ref={photoFileInputRef}
              onChange={handlePhotoFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Tombol Import Word */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => wordFileInputRef.current?.click()}
              disabled={isProcessingFile}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-white dark:bg-slate-950 border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
              title="Import daftar nama dari file Word (.docx)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Import Word</span>
            </Button>

            {/* Tombol Scan Foto AI */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => photoFileInputRef.current?.click()}
              disabled={isProcessingFile}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-white dark:bg-slate-950 border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50"
              title="Scan foto coretan kertas denah bus dengan AI"
            >
              <Camera className="w-3.5 h-3.5 text-purple-600" />
              <span>Scan Foto</span>
            </Button>

            {/* Tombol Quick Paste */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setQuickPasteOpen(true)}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-white dark:bg-slate-950 border-slate-300 hover:bg-slate-100"
              title="Salin dan tempel daftar nama dari chat WA"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-slate-700" />
              <span>Paste Teks</span>
            </Button>

            <div className="hidden sm:block h-5 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Tombol Export Gambar PNG */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportImage}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-white dark:bg-slate-950 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50"
              title="Download gambar denah bus (PNG) untuk share ke WA"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Gambar (PNG)</span>
            </Button>

            {/* Tombol Export Word .doc */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportWord}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-white dark:bg-slate-950 border-blue-400 text-blue-800 dark:text-blue-200 hover:bg-blue-50"
              title="Download tabel denah manifest format Microsoft Word"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>Word (.doc)</span>
            </Button>

            {/* Tombol PDF */}
            <Button
              size="sm"
              onClick={handleExportPDF}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm"
              title="Unduh PDF Resmi Manifest"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF</span>
            </Button>

            {/* Tombol WhatsApp */}
            <Button
              size="sm"
              onClick={handleExportWhatsApp}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              title="Bagikan Manifest ke WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WA</span>
            </Button>
          </div>
        </div>

        {/* ========================================================
            VISUAL SKETSA KABIN BUS (PERSIS SEPERTI GAMBAR USER)
            ======================================================== */}
        <div className="mt-4 overflow-x-auto p-2 sm:p-4">
          <div
            ref={busCabinRef}
            className="max-w-xl mx-auto rounded-[32px] border-4 border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-950 p-4 sm:p-6 shadow-2xl relative space-y-4"
          >
            {/* Bagian Atas / Depan Bus: Tangga Depan, Tour Leader, dan Sopir */}
            <div className="flex items-start justify-between gap-2 pb-4 border-b-2 border-slate-900 dark:border-slate-700">
              {/* Kiri Depan: Pintu Masuk / 3 Garis Anak Tangga Boarding */}
              <div className="space-y-1">
                <div className="w-20 sm:w-24 h-12 rounded-lg border-2 border-slate-900 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 p-1 flex flex-col justify-between">
                  <div className="w-full h-[2px] bg-slate-800 dark:bg-slate-400" />
                  <div className="w-full h-[2px] bg-slate-800 dark:bg-slate-400" />
                  <div className="w-full h-[2px] bg-slate-800 dark:bg-slate-400" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block text-center">
                  Pintu Depan
                </span>
              </div>

              {/* Tengah Depan: Kursi Tour Leader (TL) */}
              <div className="flex flex-col items-center pt-2">
                <div className="w-14 h-10 rounded-xl border-2 border-slate-900 dark:border-slate-400 bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-1 text-center shadow-xs">
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 leading-tight">
                    Tour<br />Leader
                  </span>
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-0.5">Kru Biro</span>
              </div>

              {/* Kanan Depan: Kursi Sopir / Driver */}
              <div className="flex flex-col items-center">
                <div className="w-14 sm:w-16 h-11 rounded-xl border-2 border-slate-900 dark:border-slate-400 bg-slate-200 dark:bg-slate-800 flex items-center justify-center p-1 text-center shadow-xs">
                  <span className="text-[11px] font-black text-slate-900 dark:text-white">
                    Sopir
                  </span>
                </div>
                <span className="text-[8px] font-bold text-slate-500 mt-0.5">
                  {tripInfo?.nama_driver || "Kemudi"}
                </span>
              </div>
            </div>

            {/* Badan Kabin Kursi Penumpang (Per Baris) */}
            <div className="space-y-3.5 py-1">
              {busStructure.rows.map((row) => {
                // Baris Paling Belakang (Bangku 5/6 Kursi Sejajar)
                if (row.isBackRow && row.backSeats) {
                  return (
                    <div key={`back-${row.rowNumber}`} className="pt-2">
                      <div className="p-2 sm:p-2.5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                          {row.backSeats.map((seatNo) => renderSeatItem(seatNo))}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Baris Tangga Pintu Belakang di Kiri
                if (row.isRearDoorRow) {
                  return (
                    <div
                      key={`row-${row.rowNumber}`}
                      className="flex items-center justify-between gap-2 sm:gap-4 py-0.5"
                    >
                      {/* Tangga Pintu Belakang di Sisi Kiri (Persis Sketsa) */}
                      <div className="w-24 sm:w-28 h-12 rounded-lg border-2 border-slate-900 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 p-1 flex flex-col justify-between">
                        <div className="w-full h-[2px] bg-slate-800 dark:bg-slate-400" />
                        <div className="w-full h-[2px] bg-slate-800 dark:bg-slate-400" />
                        <div className="w-full h-[2px] bg-slate-800 dark:bg-slate-400" />
                      </div>

                      {/* Lorong Tengah */}
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 font-mono">
                          |
                        </span>
                      </div>

                      {/* Kursi Sisi Kanan (misal 25, 26) */}
                      <div className="flex items-center gap-1.5 sm:gap-2 justify-start">
                        {row.rightSeats.map((seatNo) => renderSeatItem(seatNo))}
                      </div>
                    </div>
                  );
                }

                // Baris Normal (Kiri 2/3 - Lorong - Kanan 2/3)
                return (
                  <div
                    key={`row-${row.rowNumber}`}
                    className="flex items-center justify-between gap-2 sm:gap-4 py-0.5"
                  >
                    {/* Sisi Kiri */}
                    <div className="flex items-center gap-1 sm:gap-2 justify-end">
                      {row.leftSeats.map((seatNo) => renderSeatItem(seatNo))}
                    </div>

                    {/* LORONG TENGAH (AISLE GANG JALAN) */}
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[10px] font-black font-mono text-slate-300 dark:text-slate-700">
                        {row.rowNumber}
                      </span>
                    </div>

                    {/* Sisi Kanan */}
                    <div className="flex items-center gap-1 sm:gap-2 justify-start">
                      {row.rightSeats.map((seatNo) => renderSeatItem(seatNo))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel Form Edit Alokasi Kursi Terpilih */}
        {selectedSeat && (
          <div className="mt-4 p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/60 border-2 border-blue-400 dark:border-blue-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Pengaturan Alokasi Kursi #{selectedSeat}</span>
              </h4>
              {manifest[selectedSeat] && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleClearSeat(selectedSeat)}
                  className="h-7 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-100 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Kursi</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Nama Penumpang *
                </Label>
                <Input
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Ketik nama lengkap peserta"
                  className="h-9 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border-slate-300"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Kategori
                </Label>
                <Select
                  value={passengerCategory}
                  onValueChange={(val: any) => setPassengerCategory(val)}
                >
                  <SelectTrigger className="h-9 text-xs font-bold rounded-xl bg-white dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Umum" className="text-xs font-semibold">
                      Umum
                    </SelectItem>
                    <SelectItem value="Lansia" className="text-xs font-semibold">
                      Lansia
                    </SelectItem>
                    <SelectItem value="Anak" className="text-xs font-semibold">
                      Anak
                    </SelectItem>
                    <SelectItem value="Ibu Hamil" className="text-xs font-semibold">
                      Ibu Hamil
                    </SelectItem>
                    <SelectItem value="Kru / TL" className="text-xs font-semibold">
                      Kru / TL
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  No. HP / WA
                </Label>
                <Input
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  placeholder="0812..."
                  className="h-9 text-xs font-mono rounded-xl bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Catatan Khusus (contoh: Mabuk darat / Dekat pintu / Permintaan keluarga)
              </Label>
              <Input
                value={passengerNotes}
                onChange={(e) => setPassengerNotes(e.target.value)}
                placeholder="Catatan permintaan khusus..."
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedSeat(null)}
                className="h-8 text-xs font-bold rounded-xl"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSeat}
                className="h-8 text-xs font-black rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                Simpan Alokasi Kursi
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* ========================================================
          MODAL PREVIEW IMPORT (WORD / FOTO / PASTE)
          ======================================================== */}
      <Dialog open={importPreviewOpen} onOpenChange={setImportPreviewOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Preview Alokasi Penumpang ({importedPassengers.length} Terdeteksi)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Periksa daftar nama di bawah sebelum otomatis dimasukkan ke dalam denah kursi bus
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-3">
            <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
              {importedPassengers.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 flex items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 text-center font-mono font-bold text-slate-400">
                      {idx + 1}.
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </span>
                  </div>
                  {item.seat ? (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-mono font-black text-[11px]">
                      Kursi {item.seat}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-semibold italic">
                      Otomatis kursi depan
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
              <span>
                Nama-nama peserta di atas akan dialokasikan ke kursi yang masih kosong secara berurutan
                dari baris depan hingga baris belakang.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportPreviewOpen(false)}
                className="h-9 text-xs font-bold rounded-xl"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={applyImportedToManifest}
                className="h-9 text-xs font-black rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Terapkan ke Denah Kursi ({importedPassengers.length} Peserta)</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL QUICK PASTE TEKS (DARI WHATSAPP / EXCEL)
          ======================================================== */}
      <Dialog open={quickPasteOpen} onOpenChange={setQuickPasteOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardPaste className="w-5 h-5 text-blue-600" />
              <span>Salin & Tempel Daftar Nama Peserta</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Tempel daftar nama peserta (1 nama per baris). Format bisa "1A: Nama" atau nomor biasa "1. Nama"
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-3">
            <Textarea
              rows={8}
              value={quickPasteText}
              onChange={(e) => setQuickPasteText(e.target.value)}
              placeholder={`Contoh:\n1: Budi Santoso\n2: Ibu Siti\n3: Ahmad Fauzi\nAtau cukup daftar nama:\nBudi Santoso\nIbu Siti\nAhmad Fauzi`}
              className="text-xs font-mono rounded-2xl border-slate-300 p-3 leading-relaxed"
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickPasteOpen(false)}
                className="h-9 text-xs font-bold rounded-xl"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleProcessQuickPaste}
                className="h-9 text-xs font-black rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                <span>Proses Daftar Nama</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default BusSeatManifestModal;
