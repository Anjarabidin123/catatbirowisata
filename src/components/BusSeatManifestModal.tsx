import React, { useState, useEffect, useRef, useMemo } from "react";
import { savePdf } from "@/utils/pdfSaver";
import { recordDownloadedDoc } from "@/utils/downloadedDocTracker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getLocalBiroProfile, formatLegalitasBiro } from "@/utils/biroProfile";
import { drawDigitalStamp, ensureTransparentImage } from "@/utils/stampPdfHelper";
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
      try {
        recordDownloadedDoc({
          docType: "manifest",
          nomorDokumen: `MAN-DOCX-${tripInfo?.id ? tripInfo.id.substring(0, 8) : Date.now()}`,
          judul: `Manifest Word (.doc): ${tripInfo?.nama_trip || "Trip Pariwisata"}`,
          namaKlienOrTrip: `${tripInfo?.nama_trip || "Trip"} (${tripInfo?.nama_kendaraan || "Bus"} - ${occupiedCount} Peserta)`,
          statusPembayaran: "Resmi",
          fileName: `MANIFEST_KURSI_${(tripInfo?.nama_trip || "TRIP").replace(/[^a-zA-Z0-9_-]/g, "_")}.doc`,
        });
      } catch {}
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
    let profile = getLocalBiroProfile();

    // Otomatis bersihkan latar stempel & tanda tangan agar transparan murni & auto-crop (tidak kurus)
    if (profile.logo_url && !profile.logo_url.endsWith(".svg")) {
      const cleaned = await ensureTransparentImage(profile.logo_url);
      if (cleaned) profile = { ...profile, logo_url: cleaned };
    }
    if (profile.stempel_custom_image_url) {
      const cleaned = await ensureTransparentImage(profile.stempel_custom_image_url);
      if (cleaned) profile = { ...profile, stempel_custom_image_url: cleaned };
    }
    if (profile.tanda_tangan_url) {
      const cleaned = await ensureTransparentImage(profile.tanda_tangan_url);
      if (cleaned) profile = { ...profile, tanda_tangan_url: cleaned };
    }

    const doc = new jsPDFClass({ orientation: "portrait", unit: "mm", format: "a4" });

    // Kop Resmi Biro (AHU, NIB, & Garis Ganda) - Dinaikkan presisi ke atas
    const legalitasText = formatLegalitasBiro(profile);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18); // Diperbesar dari 14 ke 18 agar gagah
    doc.setTextColor(15, 44, 89);
    let curY = 5; // Dinaikkan presisi ke atas
    doc.text(profile.nama_biro.toUpperCase(), 105, curY, { align: "center" });
    curY += 4.5;

    if (legalitasText) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(legalitasText.toUpperCase(), 105, curY, { align: "center" });
      curY += 3.8;
    } else if (profile.slogan) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text(profile.slogan.toUpperCase(), 105, curY, { align: "center" });
      curY += 3.8;
    }

    if (profile.alamat || profile.telepon) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const infoKontak = [
        profile.alamat ? `Alamat: ${profile.alamat}` : null,
        profile.telepon ? `CP/WA: ${profile.telepon}` : null,
      ].filter(Boolean).join("  |  ");
      doc.text(infoKontak, 105, curY, { align: "center" });
      curY += 3.6;
    }

    const lineY = curY + 1.2;
    doc.setLineWidth(1.2);
    doc.setDrawColor(15, 44, 89);
    doc.line(14, lineY, 196, lineY);
    doc.setLineWidth(0.35);
    doc.line(14, lineY + 1.1, 196, lineY + 1.1);

    const titleY = lineY + 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");


    doc.setLineWidth(0.8);
    doc.setDrawColor(15, 44, 89);


    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("MANIFEST RESMI ALOKASI KURSI BUS PARIWISATA", 105, titleY, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(
      `Rombongan: ${tripInfo?.nama_trip || "Trip"}  |  Destinasi: ${tripInfo?.tujuan || "-"}`,
      14,
      titleY + 7
    );
    doc.text(
      `Armada: ${tripInfo?.nama_kendaraan || "Bus Pariwisata"} (${tripInfo?.nomor_polisi || "-"})  |  Driver: ${
        tripInfo?.nama_driver || "-"
      }`,
      14,
      titleY + 12
    );
    doc.text(
      `Tipe: ${busStructure.title}  |  Kapasitas: ${totalSeats} Kursi  |  Terisi: ${occupiedCount} Peserta  |  Kosong: ${emptyCount} Kursi`,
      14,
      titleY + 17
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
      startY: titleY + 22,
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

    // Blok Pengesahan Resmi (Tanda Tangan & Stempel Biro)
    const finalTableY = (doc as any).lastAutoTable?.finalY || (titleY + 100);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    let signY = finalTableY + 8;
    if (signY > pageHeight - 40) {
      doc.addPage();
      signY = 20;
    }

    const tglManifest = format(new Date(), "dd MMMM yyyy", { locale: (await import("date-fns/locale")).id });
    const kotaPimpinan = profile.kota_tanda_tangan || (profile.alamat?.includes("Demak") ? "Demak" : "Indonesia");
    const colRight = pageWidth - 46;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`${kotaPimpinan}, ${tglManifest}`, colRight, signY, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(profile.nama_biro || "Catat Biro Wisata", colRight, signY + 4, { align: "center" });

    // TTD & Stempel - posisi stempel di kiri, menimpa separuh kiri TTD, sejajar vertikal
    if (profile.tanda_tangan_url) {
      try {
        doc.addImage(profile.tanda_tangan_url, "PNG", colRight - 8, signY + 7, 26, 14);
      } catch (e) {}
    }
    drawDigitalStamp(doc, colRight - 7, signY + 14, profile, "VERIFIED", 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(profile.pimpinan || "H. Anjar Abidin, S.E.", colRight, signY + 27, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(profile.jabatan_penandatangan || "Pimpinan Operasional", colRight, signY + 31, { align: "center" });

    const pdfFilename = `MANIFEST_KURSI_BUS_${tripInfo?.nama_trip?.replace(/\s+/g, "_") || "TRIP"}.pdf`;
    void savePdf(doc, pdfFilename);

    try {
      recordDownloadedDoc({
        docType: "manifest",
        nomorDokumen: `MAN-${tripInfo?.id ? tripInfo.id.substring(0, 8) : Date.now()}`,
        judul: `Manifest Kursi Bus: ${tripInfo?.nama_trip || "Trip Pariwisata"}`,
        namaKlienOrTrip: `${tripInfo?.nama_trip || "Trip"} (${tripInfo?.nama_kendaraan || "Bus"} - ${occupiedCount} Peserta)`,
        statusPembayaran: "Resmi",
        fileName: pdfFilename,
      });
    } catch {}

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
  // RENDER SEAT (RESPONSIF PENUH DI MOBILE & DESKTOP)
  // =========================================================
  const renderSeatItem = (seatNo: string) => {
    const assigned = manifest[seatNo];
    const isOccupied = Boolean(assigned);
    const isMatchingSearch =
      searchQuery.trim() !== "" &&
      (seatNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (assigned && assigned.name.toLowerCase().includes(searchQuery.toLowerCase())));

    return (
      <div key={seatNo} className="relative inline-flex items-center flex-shrink-0">
        {/* Armrest Kiri */}
        <div
          className={`w-0.5 sm:w-1 h-6 sm:h-7 rounded-l-sm -mr-[1px] z-10 transition-colors ${
            isOccupied ? "bg-slate-700 dark:bg-slate-400" : "bg-slate-400 dark:bg-slate-600"
          }`}
        />

        {/* Badan Kursi */}
        <button
          type="button"
          onClick={() => handleSeatClick(seatNo)}
          className={`w-9 sm:w-11 md:w-12 min-h-[46px] sm:min-h-[52px] rounded-lg sm:rounded-xl border-1.5 sm:border-2 transition-all relative flex flex-col justify-between p-0.5 sm:p-1 shadow-2xs group text-left ${
            isMatchingSearch
              ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/80 border-amber-500 shadow-md"
              : isOccupied
              ? "bg-blue-50/95 dark:bg-blue-950/80 border-slate-800 dark:border-blue-400 hover:border-blue-600 hover:shadow-md"
              : "bg-white dark:bg-slate-900 border-slate-700 dark:border-slate-500 hover:bg-slate-50 hover:border-blue-500"
          }`}
          title={`Kursi ${seatNo}: ${assigned ? assigned.name : "Kosong (Klik untuk isi)"}`}
        >
          {/* Headrest Cushion */}
          <div
            className={`w-5 sm:w-7 h-1 sm:h-1.5 rounded-t-sm mx-auto -mt-0.5 border-b transition-colors ${
              isOccupied
                ? "bg-blue-600 border-blue-700 dark:bg-blue-500"
                : "bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600"
            }`}
          />

          {/* Nomor Kursi */}
          <div className="flex items-center justify-center w-full my-auto">
            <span
              className={`text-[11px] sm:text-xs md:text-sm font-black font-mono tracking-tight leading-none ${
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
            <div className="w-full text-center overflow-hidden">
              <p className="text-[7.5px] sm:text-[8.5px] font-black text-slate-900 dark:text-white truncate leading-none">
                {assigned.name}
              </p>
              {assigned.category && assigned.category !== "Umum" && (
                <span className="text-[6.5px] sm:text-[7px] font-bold px-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-300 inline-block truncate max-w-full">
                  {assigned.category}
                </span>
              )}
            </div>
          ) : (
            <div className="text-center w-full pb-0.5">
              <span className="text-[7px] font-bold text-slate-400 group-hover:text-blue-600">
                Kosong
              </span>
            </div>
          )}
        </button>

        {/* Armrest Kanan */}
        <div
          className={`w-0.5 sm:w-1 h-6 sm:h-7 rounded-r-sm -ml-[1px] z-10 transition-colors ${
            isOccupied ? "bg-slate-700 dark:bg-slate-400" : "bg-slate-400 dark:bg-slate-600"
          }`}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[calc(100vw-16px)] sm:max-w-3xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden min-w-0 rounded-2xl sm:rounded-3xl p-3 sm:p-5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 shadow-2xl z-50">
        {/* Header Modal Rapi (Dengan pr-8 agar tidak menabrak tombol X di mobile) */}
        <DialogHeader className="text-left border-b border-slate-200 dark:border-slate-800 pb-2.5 pr-10 sm:pr-12 min-w-0 w-full">
          <div className="flex items-center gap-2 min-w-0 w-full">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <Bus className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                Denah Kabin & Manifest Bus
              </DialogTitle>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <Badge variant="outline" className="text-[9px] sm:text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                  {busStructure.configLabel}
                </Badge>
                <span className="text-[10px] sm:text-xs text-slate-500 font-semibold truncate max-w-[140px] sm:max-w-xs">
                  {tripInfo?.nama_trip || "Trip Pariwisata"}
                </span>
              </div>
            </div>
          </div>

          {/* Baris Selector Preset & Tombol Atur Denah */}
          <div className="flex items-center gap-1.5 mt-2 min-w-0 w-full">
            <Select
              value={busConfig.layout}
              onValueChange={(val: any) => handlePresetChange(val)}
            >
              <SelectTrigger className="h-8 text-xs font-bold rounded-xl flex-1 min-w-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 truncate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medium_bus_31" className="text-xs font-semibold">
                  Medium Bus 31 (Sketsa Standar)
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
              className="h-8 px-2.5 text-xs font-black rounded-xl gap-1 flex-shrink-0"
              title="Sesuaikan formasi kursi kiri/kanan"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Atur Denah</span>
              {showConfigPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </DialogHeader>

        {/* ========================================================
            PANEL KUSTOMISASI DENAH (KIRI 2/3, KANAN 2/3, BARIS, DLL)
            ======================================================== */}
        {showConfigPanel && (
          <div className="mt-2.5 p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <h4 className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Sesuaikan Formasi Kursi Kabin Bus</span>
              </h4>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                Total: {totalSeats} Kursi
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {/* Kursi Kiri */}
              <div className="space-y-0.5">
                <Label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                  Kursi Kiri
                </Label>
                <Select
                  value={String(busConfig.leftSeatsPerRow)}
                  onValueChange={(val) => updateCustomConfig({ leftSeatsPerRow: Number(val) })}
                >
                  <SelectTrigger className="h-7 text-xs font-bold rounded-lg bg-white dark:bg-slate-950">
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
              <div className="space-y-0.5">
                <Label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                  Kursi Kanan
                </Label>
                <Select
                  value={String(busConfig.rightSeatsPerRow)}
                  onValueChange={(val) => updateCustomConfig({ rightSeatsPerRow: Number(val) })}
                >
                  <SelectTrigger className="h-7 text-xs font-bold rounded-lg bg-white dark:bg-slate-950">
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
              <div className="space-y-0.5">
                <Label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                  Baris ({busConfig.rowCount})
                </Label>
                <Select
                  value={String(busConfig.rowCount)}
                  onValueChange={(val) => updateCustomConfig({ rowCount: Number(val) })}
                >
                  <SelectTrigger className="h-7 text-xs font-bold rounded-lg bg-white dark:bg-slate-950">
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
              <div className="space-y-0.5">
                <Label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                  Penomoran
                </Label>
                <Select
                  value={busConfig.numberingStyle}
                  onValueChange={(val: any) => updateCustomConfig({ numberingStyle: val })}
                >
                  <SelectTrigger className="h-7 text-xs font-bold rounded-lg bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Angka (1, 2, 3...)</SelectItem>
                    <SelectItem value="letter">Huruf (1A, 1B, 1C...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bangku Belakang */}
              <div className="space-y-0.5">
                <Label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
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
                  <SelectTrigger className="h-7 text-xs font-bold rounded-lg bg-white dark:bg-slate-950">
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
              <div className="space-y-0.5">
                <Label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                  Pintu Belakang
                </Label>
                <div className="h-7 flex items-center gap-1.5">
                  <Switch
                    checked={busConfig.hasRearDoor}
                    onCheckedChange={(checked) => updateCustomConfig({ hasRearDoor: checked })}
                  />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    {busConfig.hasRearDoor ? "Ada" : "Tidak"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TOOLBAR COMPACT: PENCARIAN & AKSI RAPI (TIDAK PENUH DI HP)
            ======================================================== */}
        <div className="mt-2 p-2 sm:p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5 min-w-0 w-full max-w-full">
          {/* Baris 1: Pencarian & Kuota Terisi */}
          <div className="flex items-center gap-2 min-w-0 w-full">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari peserta / no kursi..."
                className="h-8 pl-8 text-xs font-semibold rounded-xl bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
              />
            </div>

            <Badge className="bg-blue-600 text-white font-black text-[11px] h-8 px-2.5 rounded-xl flex-shrink-0 flex items-center gap-1 shadow-2xs">
              <span>{occupiedCount}/{totalSeats} Terisi</span>
            </Badge>
          </div>

          {/* Baris 2: Toolbar Aksi Rapi (Dropdown Dropdown/Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar min-w-0 w-full max-w-full">
            {/* Input file Word tersembunyi */}
            <input
              type="file"
              ref={wordFileInputRef}
              onChange={handleWordFileChange}
              accept=".docx,.doc,.txt"
              className="hidden"
            />
            {/* Input file Foto tersembunyi */}
            <input
              type="file"
              ref={photoFileInputRef}
              onChange={handlePhotoFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Dropdown Menu Import & Scan */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessingFile}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs font-bold rounded-xl gap-1 border-blue-300 text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-950 flex-shrink-0 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Import / Scan</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 rounded-xl p-1 z-[70]">
                <DropdownMenuItem
                  onClick={() => wordFileInputRef.current?.click()}
                  className="text-xs font-semibold gap-2 py-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Import File Word (.docx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => photoFileInputRef.current?.click()}
                  className="text-xs font-semibold gap-2 py-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-purple-600" />
                  <span>Scan Foto Manifest (AI)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setQuickPasteOpen(true)}
                  className="text-xs font-semibold gap-2 py-2 cursor-pointer"
                >
                  <ClipboardPaste className="w-4 h-4 text-slate-700" />
                  <span>Salin & Tempel (Paste WA)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dropdown Menu Ekspor Dokumen */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs font-bold rounded-xl gap-1 border-amber-300 text-amber-800 dark:text-amber-300 bg-white dark:bg-slate-950 flex-shrink-0 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ekspor</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 rounded-xl p-1 z-[70]">
                <DropdownMenuItem
                  onClick={handleExportImage}
                  className="text-xs font-semibold gap-2 py-2 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span>Download Gambar (PNG)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportWord}
                  className="text-xs font-semibold gap-2 py-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-700" />
                  <span>Download Dokumen Word (.doc)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportPDF}
                  className="text-xs font-semibold gap-2 py-2 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-slate-900 dark:text-slate-100" />
                  <span>Download PDF Manifest Resmi</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tombol Cepat Share WA */}
            <Button
              size="sm"
              onClick={handleExportWhatsApp}
              className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs font-bold rounded-xl gap-1 bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0 shadow-2xs"
              title="Kirim Manifest ke WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim WA</span>
            </Button>

            {/* Tombol Cepat Simpan Gambar PNG */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportImage}
              className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs font-bold rounded-xl gap-1 bg-white dark:bg-slate-950 border-slate-300 hover:bg-slate-100 text-slate-800 dark:text-slate-200 flex-shrink-0 shadow-2xs"
              title="Download Gambar Denah"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Simpan Gambar</span>
            </Button>
          </div>
        </div>

        {/* ========================================================
            VISUAL SKETSA KABIN BUS (PAS DENGAN LORONG PROPORSIONAL)
            ======================================================== */}
        <div className="mt-2.5 overflow-x-auto p-1 flex justify-center no-scrollbar min-w-0 w-full max-w-full">
          <div
            ref={busCabinRef}
            className="w-fit max-w-full mx-auto rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-950 p-2.5 sm:p-4 shadow-xl relative space-y-2.5 sm:space-y-3"
          >
            {/* Bagian Atas / Depan Bus: Tangga Depan, Tour Leader, dan Sopir */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-3 pb-2.5 border-b-2 border-slate-900 dark:border-slate-700">
              {/* Kiri Depan: Pintu Masuk (lebar pas dengan kursi di bawahnya) */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-18 sm:w-22 h-8 sm:h-9 rounded-lg border-2 border-slate-900 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 p-0.5 sm:p-1 flex flex-col justify-between">
                  <div className="w-full h-[1.5px] sm:h-[2px] bg-slate-800 dark:bg-slate-400" />
                  <div className="w-full h-[1.5px] sm:h-[2px] bg-slate-800 dark:bg-slate-400" />
                  <div className="w-full h-[1.5px] sm:h-[2px] bg-slate-800 dark:bg-slate-400" />
                </div>
                <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-slate-500 mt-0.5">
                  Pintu Depan
                </span>
              </div>

              {/* Tengah Depan: Kursi Tour Leader (TL) - pas di lorong */}
              <div className="w-5 sm:w-7 flex-shrink-0 flex flex-col items-center justify-center">
                <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg border-2 border-slate-900 dark:border-slate-400 bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-0.5 text-center shadow-xs">
                  <span className="text-[7.5px] sm:text-[8px] font-black text-slate-800 dark:text-slate-200 leading-none">
                    TL
                  </span>
                </div>
                <span className="text-[6.5px] sm:text-[7px] font-bold text-slate-400 mt-0.5">Kru</span>
              </div>

              {/* Kanan Depan: Kursi Sopir / Driver (lebar pas dengan kursi di bawahnya) */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-18 sm:w-22 h-8 sm:h-9 rounded-lg border-2 border-slate-900 dark:border-slate-400 bg-slate-200 dark:bg-slate-800 flex items-center justify-center gap-1 p-0.5 sm:p-1 shadow-xs">
                  <User className="w-3 h-3 text-slate-700 dark:text-slate-200 flex-shrink-0" />
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-900 dark:text-white">
                    Sopir
                  </span>
                </div>
                <span className="text-[7px] sm:text-[7.5px] font-bold text-slate-500 mt-0.5 truncate max-w-[80px]">
                  {tripInfo?.nama_driver || "Kemudi"}
                </span>
              </div>
            </div>

            {/* Badan Kabin Kursi Penumpang (Per Baris) */}
            <div className="space-y-2 py-0.5">
              {busStructure.rows.map((row) => {
                // Baris Paling Belakang (Bangku 5/6 Kursi Sejajar)
                if (row.isBackRow && row.backSeats) {
                  return (
                    <div key={`back-${row.rowNumber}`} className="pt-1.5">
                      <div className="p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1 flex-nowrap">
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
                      className="flex items-center justify-center gap-1.5 sm:gap-3 py-0.5"
                    >
                      {/* Tangga Pintu Belakang di Sisi Kiri (Persis Sketsa) */}
                      <div className="w-18 sm:w-22 h-8 sm:h-9 rounded-lg border-2 border-slate-900 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 p-0.5 sm:p-1 flex flex-col justify-between">
                        <div className="w-full h-[1.5px] sm:h-[2px] bg-slate-800 dark:bg-slate-400" />
                        <div className="w-full h-[1.5px] sm:h-[2px] bg-slate-800 dark:bg-slate-400" />
                        <div className="w-full h-[1.5px] sm:h-[2px] bg-slate-800 dark:bg-slate-400" />
                      </div>

                      {/* Lorong Tengah - Fixed Compact Width */}
                      <div className="w-5 sm:w-7 flex-shrink-0 flex items-center justify-center">
                        <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 font-mono">
                          |
                        </span>
                      </div>

                      {/* Kursi Sisi Kanan (misal 25, 26) */}
                      <div className="flex items-center gap-0.5 sm:gap-1 justify-start">
                        {row.rightSeats.map((seatNo) => renderSeatItem(seatNo))}
                      </div>
                    </div>
                  );
                }

                // Baris Normal (Kiri - Lorong Proporsional - Kanan)
                return (
                  <div
                    key={`row-${row.rowNumber}`}
                    className="flex items-center justify-center gap-1.5 sm:gap-3 py-0.5"
                  >
                    {/* Sisi Kiri (2 atau 3 Kursi) */}
                    <div className="flex items-center gap-0.5 sm:gap-1 justify-end">
                      {row.leftSeats.map((seatNo) => renderSeatItem(seatNo))}
                    </div>

                    {/* LORONG TENGAH (AISLE) - FIXED COMPACT LEGA & PROPORSIONAL */}
                    <div className="w-5 sm:w-7 flex-shrink-0 flex items-center justify-center py-0.5">
                      <span className="text-[8.5px] sm:text-[9.5px] font-black font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-1 py-0.2 rounded">
                        {row.rowNumber}
                      </span>
                    </div>

                    {/* Sisi Kanan (2 atau 3 Kursi) */}
                    <div className="flex items-center gap-0.5 sm:gap-1 justify-start">
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
          <div className="mt-2.5 p-3 rounded-2xl bg-blue-50/90 dark:bg-blue-950/60 border-2 border-blue-400 dark:border-blue-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Pengaturan Alokasi Kursi #{selectedSeat}</span>
              </h4>
              {manifest[selectedSeat] && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleClearSeat(selectedSeat)}
                  className="h-6 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-100 gap-1 px-2"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Kosongkan Kursi</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2 space-y-0.5">
                <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Nama Penumpang *
                </Label>
                <Input
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Ketik nama lengkap peserta"
                  className="h-8 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border-slate-300"
                  autoFocus
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Kategori
                </Label>
                <Select
                  value={passengerCategory}
                  onValueChange={(val: any) => setPassengerCategory(val)}
                >
                  <SelectTrigger className="h-8 text-xs font-bold rounded-xl bg-white dark:bg-slate-900">
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

              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  No. HP / WA
                </Label>
                <Input
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  placeholder="0812..."
                  className="h-8 text-xs font-mono rounded-xl bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Catatan Khusus (contoh: Mabuk darat / Dekat pintu)
              </Label>
              <Input
                value={passengerNotes}
                onChange={(e) => setPassengerNotes(e.target.value)}
                placeholder="Catatan permintaan khusus..."
                className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-0.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedSeat(null)}
                className="h-7 text-xs font-bold rounded-xl"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSeat}
                className="h-7 text-xs font-black rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs px-3"
              >
                Simpan Alokasi
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* ========================================================
          MODAL PREVIEW IMPORT (WORD / FOTO / PASTE)
          ======================================================== */}
      <Dialog open={importPreviewOpen} onOpenChange={setImportPreviewOpen}>
        <DialogContent className="w-[95vw] max-w-[calc(100vw-16px)] sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl p-4 sm:p-6 z-[80]">
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
        <DialogContent className="w-[95vw] max-w-[calc(100vw-16px)] sm:max-w-md rounded-3xl p-4 sm:p-5 z-[80]">
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
