import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { getLocalBiroProfile } from "@/utils/biroProfile";
import { logCrewActivity } from "@/utils/rbacAuditLogger";
import { useRole } from "@/contexts/RoleContext";

export type BusLayoutType = "big_bus_50" | "big_bus_59" | "medium_bus_31" | "hiace_14";

export interface SeatAssignment {
  seatNumber: string;
  name: string;
  category?: "Umum" | "Lansia" | "Anak" | "Ibu Hamil" | "Kru / TL";
  notes?: string;
  phone?: string;
}

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

// Generator daftar nomor kursi berdasarkan tipe bus
const generateSeatNumbers = (layout: BusLayoutType): string[] => {
  const seats: string[] = [];

  if (layout === "big_bus_50") {
    // 10 baris 2-2 = 40 kursi, baris belakang 5 kursi + 5 kursi tambahan = 50 kursi
    for (let r = 1; r <= 11; r++) {
      seats.push(`${r}A`, `${r}B`, `${r}C`, `${r}D`);
    }
    seats.push("12A", "12B", "12C", "12D", "12E", "12F");
    return seats.slice(0, 50);
  }

  if (layout === "big_bus_59") {
    // 2-3 configuration (A,B - koridor - C,D,E)
    for (let r = 1; r <= 11; r++) {
      seats.push(`${r}A`, `${r}B`, `${r}C`, `${r}D`, `${r}E`);
    }
    seats.push("12A", "12B", "12C", "12D");
    return seats.slice(0, 59);
  }

  if (layout === "medium_bus_31") {
    // Medium bus 2-2 konfigurasi (7 baris x 4 = 28 + baris belakang 5 = 33)
    for (let r = 1; r <= 7; r++) {
      seats.push(`${r}A`, `${r}B`, `${r}C`, `${r}D`);
    }
    seats.push("8A", "8B", "8C");
    return seats.slice(0, 31);
  }

  if (layout === "hiace_14") {
    // Toyota HiAce 14 Seat (Depan 1 + Baris 1: 3 + Baris 2: 3 + Baris 3: 3 + Belakang: 4)
    return ["1A", "2A", "2B", "2C", "3A", "3B", "3C", "4A", "4B", "4C", "5A", "5B", "5C", "5D"];
  }

  return [];
};

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

  const [layoutType, setLayoutType] = useState<BusLayoutType>("big_bus_50");
  const [manifest, setManifest] = useState<Record<string, SeatAssignment>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  // Form edit kursi
  const [passengerName, setPassengerName] = useState("");
  const [passengerCategory, setPassengerCategory] = useState<any>("Umum");
  const [passengerNotes, setPassengerNotes] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");

  // Load manifest dari Supabase notes / localStorage
  useEffect(() => {
    if (!open) return;

    let foundLocal = false;
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.layout) setLayoutType(parsed.layout);
        if (parsed.manifest) setManifest(parsed.manifest);
        foundLocal = true;
      }
    } catch {}

    if (!foundLocal) {
      setLayoutType("big_bus_50");
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
          if (parsed.layout) setLayoutType(parsed.layout);
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

  // Simpan manifest ke local & Supabase
  const saveManifestData = async (
    newManifest: Record<string, SeatAssignment>,
    layout: BusLayoutType
  ) => {
    setManifest(newManifest);
    const payload = { layout, manifest: newManifest };
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
      // Jika dikosongkan, hapus alokasi
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

    saveManifestData(updated, layoutType);
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
    saveManifestData(updated, layoutType);
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

  const handleLayoutChange = (newLayout: BusLayoutType) => {
    if (!canManageManifest) {
      toast.error("Izin akses Denah Kursi & Manifest dinonaktifkan oleh Pemilik Biro");
      return;
    }
    setLayoutType(newLayout);
    saveManifestData(manifest, newLayout);
  };

  const seatList = generateSeatNumbers(layoutType);
  const totalSeats = seatList.length;
  const occupiedCount = Object.keys(manifest).filter((k) => seatList.includes(k)).length;
  const emptyCount = totalSeats - occupiedCount;

  // Export PDF Manifest Resmi
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
    doc.text(`Rombongan: ${tripInfo?.nama_trip || "Trip"}  |  Destinasi: ${tripInfo?.tujuan || "-"}`, 14, 37);
    doc.text(`Armada: ${tripInfo?.nama_kendaraan || "Bus Pariwisata"} (${tripInfo?.nomor_polisi || "-"})  |  Driver: ${tripInfo?.nama_driver || "-"}`, 14, 42);
    doc.text(`Kapasitas: ${totalSeats} Kursi  |  Terisi: ${occupiedCount} Peserta  |  Kosong: ${emptyCount} Kursi`, 14, 47);

    // Table
    const sortedSeats = [...seatList].sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      return numA === numB ? a.localeCompare(b) : numA - numB;
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

    void savePdf(doc, `MANIFEST_KURSI_BUS_${tripInfo?.nama_trip?.replace(/\s+/g, "_") || "TRIP"}.pdf`);
    toast.success("PDF Manifest kursi bus berhasil diunduh!");
  };

  // Export WhatsApp
  const handleExportWhatsApp = () => {
    let text = `🚌 *MANIFEST ALOKASI KURSI BUS PARIWISATA*\n` +
      `Trip: *${tripInfo?.nama_trip || "Wisata"}*\n` +
      `Armada: ${tripInfo?.nama_kendaraan || "Bus"} (${tripInfo?.nomor_polisi || "-"}) | Driver: ${tripInfo?.nama_driver || "-"}\n` +
      `Total Terisi: ${occupiedCount}/${totalSeats} Kursi\n` +
      `-----------------------------------------\n`;

    const sortedSeats = [...seatList].sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      return numA === numB ? a.localeCompare(b) : numA - numB;
    });

    sortedSeats.forEach((seat) => {
      const p = manifest[seat];
      if (p) {
        text += `💺 *${seat}*: ${p.name} ${p.notes ? `(${p.notes})` : ""}\n`;
      }
    });

    text += `\n_Mohon peserta menempati kursi sesuai manifest. Salam Pariwisata!_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    toast.success("Membuka WhatsApp untuk mengirimkan manifest...");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-6">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Denah Kursi & Manifest Penumpang Bus
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Visual denah interaktif, alokasi posisi tempat duduk wisatawan & ekspor resmi
                </DialogDescription>
              </div>
            </div>

            {/* Selector Tipe Armada */}
            <div className="flex items-center gap-2">
              <Select
                value={layoutType}
                onValueChange={(val: any) => handleLayoutChange(val)}
              >
                <SelectTrigger className="h-8 text-xs font-semibold rounded-xl w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="big_bus_50" className="text-xs">
                    Big Bus 50 Seat (2-2)
                  </SelectItem>
                  <SelectItem value="big_bus_59" className="text-xs">
                    Big Bus 59 Seat (2-3)
                  </SelectItem>
                  <SelectItem value="medium_bus_31" className="text-xs">
                    Medium Bus 31 Seat
                  </SelectItem>
                  <SelectItem value="hiace_14" className="text-xs">
                    Toyota HiAce 14 Seat
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {/* Stats Strip & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mt-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white font-bold text-xs h-6">
              {occupiedCount} / {totalSeats} Kursi Terisi
            </Badge>
            <span className="text-xs text-slate-500 font-medium">
              ({emptyCount} Kursi Kosong)
            </span>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama peserta / nomor kursi..."
              className="h-8 pl-8 text-xs rounded-xl"
            />
          </div>

          <div className="flex items-center gap-1.5 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportWhatsApp}
              className="h-8 text-xs rounded-xl font-semibold gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              className="h-8 text-xs rounded-xl font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF Manifest</span>
            </Button>
          </div>
        </div>

        {/* Visual Denah Kursi Bus */}
        <div className="mt-4 p-4 rounded-3xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
          {/* Bagian Depan Bus (Kaca Depan & Posisi Supir) */}
          <div className="mb-4 pb-2 border-b border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Pintu Masuk Depan</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              <User className="w-3.5 h-3.5" />
              <span>Posisi Supir</span>
            </div>
          </div>

          {/* Grid Kursi */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {seatList.map((seatNo) => {
              const assigned = manifest[seatNo];
              const isOccupied = Boolean(assigned);
              const isMatchingSearch =
                searchQuery.trim() !== "" &&
                (seatNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (assigned &&
                    assigned.name.toLowerCase().includes(searchQuery.toLowerCase())));

              return (
                <button
                  key={seatNo}
                  type="button"
                  onClick={() => handleSeatClick(seatNo)}
                  className={`p-2 rounded-2xl border text-center transition-all relative flex flex-col justify-between min-h-[64px] ${
                    isMatchingSearch
                      ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/60 border-amber-400"
                      : isOccupied
                      ? "bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-xs hover:border-blue-500"
                      : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 border-dashed hover:bg-white hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-black font-mono text-slate-900 dark:text-slate-100">
                      {seatNo}
                    </span>
                    {isOccupied && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </div>

                  {isOccupied ? (
                    <div className="text-left w-full mt-1">
                      <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                        {assigned.name}
                      </p>
                      {assigned.category && assigned.category !== "Umum" && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold inline-block truncate max-w-full">
                          {assigned.category}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium">Kosong</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dialog / Panel Edit Kursi Terpilih */}
        {selectedSeat && (
          <div className="mt-4 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Alokasi Kursi #{selectedSeat}</span>
              </h4>
              {manifest[selectedSeat] && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleClearSeat(selectedSeat)}
                  className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Kursi</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nama Penumpang *
                </Label>
                <Input
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Nama lengkap atau panggilan"
                  className="h-9 text-xs rounded-xl font-semibold bg-white dark:bg-slate-900"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Kategori
                </Label>
                <Select
                  value={passengerCategory}
                  onValueChange={(val: any) => setPassengerCategory(val)}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Umum" className="text-xs">Umum</SelectItem>
                    <SelectItem value="Lansia" className="text-xs">Lansia</SelectItem>
                    <SelectItem value="Anak" className="text-xs">Anak</SelectItem>
                    <SelectItem value="Ibu Hamil" className="text-xs">Ibu Hamil</SelectItem>
                    <SelectItem value="Kru / TL" className="text-xs">Kru / TL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  No. HP / WA (Opsional)
                </Label>
                <Input
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  placeholder="0812..."
                  className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Catatan Khusus (contoh: Mudah mabuk darat / Dekat pintu)
              </Label>
              <Input
                value={passengerNotes}
                onChange={(e) => setPassengerNotes(e.target.value)}
                placeholder="Catatan kebutuhan penumpang..."
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedSeat(null)}
                className="h-8 text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSeat}
                className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                Simpan Alokasi
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BusSeatManifestModal;
