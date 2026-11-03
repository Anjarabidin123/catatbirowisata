import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  FileDown,
  Share2,
  CheckCircle2,
  Receipt,
  CreditCard,
  Building,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { RupiahInput } from "@/components/RupiahInput";
import { terbilang } from "@/utils/terbilang";
import {
  generateInvoiceOrKwitansiPDF,
  GenerateInvoiceKwitansiOptions,
} from "@/utils/invoicePdfGenerator";
import { getLocalBiroProfile } from "@/utils/biroProfile";
import { supabase } from "@/integrations/supabase/client";

interface KwitansiInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTripId?: string;
  defaultDocType?: "kwitansi" | "invoice";
}

interface SimpleTrip {
  id: string;
  nama_trip: string;
  tujuan: string;
  tanggal: string;
}

export const KwitansiInvoiceDialog: React.FC<KwitansiInvoiceDialogProps> = ({
  open,
  onOpenChange,
  defaultTripId,
  defaultDocType = "kwitansi",
}) => {
  const [docType, setDocType] = useState<"kwitansi" | "invoice">(defaultDocType);
  const [trips, setTrips] = useState<SimpleTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>(defaultTripId || "");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const defaultDueDate = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

  const [nomorDokumen, setNomorDokumen] = useState("");
  const [tanggal, setTanggal] = useState(todayStr);
  const [jatuhTempo, setJatuhTempo] = useState(defaultDueDate);
  const [namaKlien, setNamaKlien] = useState("");
  const [kontakKlien, setKontakKlien] = useState("");
  const [nominal, setNominal] = useState<number>(0);
  const [terbayar, setTerbayar] = useState<number>(0);
  const [peruntukan, setPeruntukan] = useState("");
  const [statusPembayaran, setStatusPembayaran] = useState<
    "Lunas" | "Uang Muka (DP)" | "Termin 2" | "Belum Lunas"
  >("Lunas");
  const [metodePembayaran, setMetodePembayaran] = useState("Transfer Bank");
  const [generating, setGenerating] = useState(false);

  // 1. Ambil daftar trip saat dialog pertama kali dibuka (hanya bergantung pada [open])
  useEffect(() => {
    if (open) {
      if (defaultDocType) {
        setDocType(defaultDocType);
      }
      if (defaultTripId) {
        setSelectedTripId(defaultTripId);
      }

      supabase
        .from("trips")
        .select("id, nama_trip, tujuan, tanggal")
        .order("tanggal", { ascending: false })
        .then(({ data }) => {
          if (data) {
            setTrips(data);
            if (data.length > 0) {
              const targetTrip = defaultTripId
                ? data.find((t) => t.id === defaultTripId) || data[0]
                : data[0];
              setSelectedTripId((prev) => prev || targetTrip.id);
              setNamaKlien((prev) => prev || `Rombongan ${targetTrip.nama_trip}`);
              setPeruntukan(
                (prev) =>
                  prev || `Pembayaran Paket Wisata ${targetTrip.nama_trip} ke ${targetTrip.tujuan}`
              );
            }
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 2. Auto-generate nomor dokumen saat dialog dibuka atau jenis dokumen (docType) berganti
  useEffect(() => {
    if (open) {
      const prefix = docType === "kwitansi" ? "KWT" : "INV";
      const ym = format(new Date(), "yyyyMM");
      const rand = Math.floor(100 + Math.random() * 900);
      setNomorDokumen(`${prefix}/${ym}/${rand}`);
    }
  }, [open, docType]);

  const activeTrip = trips.find((t) => t.id === selectedTripId);

  const handleTripChange = (tripId: string) => {
    setSelectedTripId(tripId);
    const chosen = trips.find((t) => t.id === tripId);
    if (chosen) {
      if (!namaKlien || namaKlien.startsWith("Rombongan")) {
        setNamaKlien(`Rombongan ${chosen.nama_trip}`);
      }
      if (!peruntukan || peruntukan.startsWith("Pembayaran Paket")) {
        setPeruntukan(`Pembayaran Paket Wisata ${chosen.nama_trip} ke ${chosen.tujuan}`);
      }
    }
  };

  const handleGeneratePDF = async () => {
    if (!namaKlien.trim()) {
      toast.error("Mohon isi nama pemesan / klien");
      return;
    }
    if (nominal <= 0) {
      toast.error("Mohon isi nominal pembayaran");
      return;
    }

    setGenerating(true);
    try {
      const options: GenerateInvoiceKwitansiOptions = {
        docType,
        nomorDokumen,
        tanggal,
        jatuhTempo: docType === "invoice" ? jatuhTempo : undefined,
        namaKlien,
        kontakKlien: kontakKlien || undefined,
        namaTrip: activeTrip?.nama_trip || "Tour Wisata",
        tujuanTrip: activeTrip?.tujuan,
        tanggalTrip: activeTrip?.tanggal,
        nominal,
        terbayar: docType === "invoice" ? terbayar : undefined,
        peruntukan:
          peruntukan ||
          `Pelunasan biaya perjalanan wisata ${activeTrip?.nama_trip || "Rombongan"}`,
        statusPembayaran,
        metodePembayaran,
        profile: getLocalBiroProfile(),
        autoDownload: true,
      };

      await generateInvoiceOrKwitansiPDF(options);
      toast.success(
        `${docType === "kwitansi" ? "Kwitansi" : "Invoice"} resmi #${nomorDokumen} berhasil diunduh!`
      );
      onOpenChange(false);
    } catch (err: any) {
      console.error("Gagal membuat PDF:", err);
      toast.error("Gagal membuat PDF: " + (err.message || "Kesalahan"));
    } finally {
      setGenerating(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!namaKlien.trim() || nominal <= 0) {
      toast.error("Mohon lengkapi nama klien dan nominal");
      return;
    }

    const profile = getLocalBiroProfile();
    const typeTitle = docType === "kwitansi" ? "KWITANSI PEMBAYARAN" : "INVOICE TAGIHAN";
    const nominalStr = `Rp ${nominal.toLocaleString("id-ID")}`;
    const terbilangStr = terbilang(nominal);

    const message = `*${typeTitle} RESMI - ${profile.nama_biro.toUpperCase()}*\n\n` +
      `📄 No: *${nomorDokumen}*\n` +
      `👤 Kepada/Diterima Dari: *${namaKlien}*\n` +
      `🚌 Kegiatan: ${activeTrip?.nama_trip || "-"}\n` +
      `💰 Nominal: *${nominalStr}*\n` +
      `📝 Terbilang: _${terbilangStr}_\n` +
      `📌 Peruntukan: ${peruntukan}\n` +
      `💳 Status: *${statusPembayaran.toUpperCase()}* (${metodePembayaran})\n\n` +
      `🏦 *Rekening Resmi Biro:*\n` +
      `Bank: ${profile.nama_bank || "Mandiri / BCA"}\n` +
      `No. Rek: *${profile.nomor_rekening || "-"}*\n` +
      `A.n: ${profile.atas_nama_rekening || profile.nama_biro}\n\n` +
      `_Terima kasih atas kepercayaannya bersama ${profile.nama_biro}._`;

    const waUrl = `https://wa.me/${kontakKlien ? kontakKlien.replace(/\D/g, "") : ""}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
    toast.success("Membuka WhatsApp untuk mengirimkan ringkasan...");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Penerbitan Dokumen Keuangan Resmi
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Kwitansi tanda terima & Invoice tagihan resmi dengan Kop Surat & Stempel Digital
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Pemilihan: Kwitansi vs Invoice */}
        <div className="mt-2">
          <Tabs
            value={docType}
            onValueChange={(val) => setDocType(val as "kwitansi" | "invoice")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full h-10 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <TabsTrigger
                value="kwitansi"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 shadow-none"
              >
                Kwitansi Pembayaran
              </TabsTrigger>
              <TabsTrigger
                value="invoice"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 shadow-none"
              >
                Invoice Tagihan
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Form Isi Dokumen */}
        <div className="space-y-3.5 mt-3">
          {/* Pilih Trip Terkait */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Trip / Rombongan Terkait
            </Label>
            <Select value={selectedTripId} onValueChange={handleTripChange}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Pilih Trip..." />
              </SelectTrigger>
              <SelectContent>
                {trips.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.nama_trip} ({t.tujuan})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Baris Nomor & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nomor Dokumen
              </Label>
              <Input
                value={nomorDokumen}
                onChange={(e) => setNomorDokumen(e.target.value)}
                className="h-9 text-xs font-mono font-semibold rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Tanggal Terbit
              </Label>
              <Input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Jika Invoice: Jatuh Tempo */}
          {docType === "invoice" && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Tanggal Jatuh Tempo Pembayaran
              </Label>
              <Input
                type="date"
                value={jatuhTempo}
                onChange={(e) => setJatuhTempo(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          )}

          {/* Baris Klien: Nama & Kontak WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {docType === "kwitansi" ? "Diterima Dari (Nama Klien)" : "Ditagihkan Kepada"}
              </Label>
              <Input
                value={namaKlien}
                onChange={(e) => setNamaKlien(e.target.value)}
                placeholder="Contoh: Bpk. H. Sukarno / SMA 1"
                className="h-9 text-xs rounded-xl font-medium"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                No. WhatsApp Klien (Opsional)
              </Label>
              <Input
                value={kontakKlien}
                onChange={(e) => setKontakKlien(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Nominal Uang & Live Terbilang */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Nominal {docType === "kwitansi" ? "Pembayaran Diterima" : "Total Tagihan"}
              </Label>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                Rupiah
              </span>
            </div>
            <RupiahInput
              value={nominal || ""}
              onChange={(val) => setNominal(typeof val === "number" ? val : parseFloat(val) || 0)}
              placeholder="0"
              className="h-10 text-base font-bold text-blue-700 dark:text-blue-300 rounded-xl bg-white dark:bg-slate-900"
            />
            {/* Terbilang Live Preview */}
            <div className="pt-1">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Terbilang:
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 italic">
                "{terbilang(nominal)}"
              </p>
            </div>
          </div>

          {/* Untuk Pembayaran / Peruntukan */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Peruntukan / Keterangan Pembayaran
            </Label>
            <Textarea
              value={peruntukan}
              onChange={(e) => setPeruntukan(e.target.value)}
              placeholder="Contoh: Pembayaran Uang Muka (DP) 50% Paket Tour Bali 45 Pax Bus Pariwisata"
              rows={2}
              className="text-xs rounded-xl resize-none"
            />
          </div>

          {/* Status & Metode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Status Pembayaran
              </Label>
              <Select
                value={statusPembayaran}
                onValueChange={(val: any) => setStatusPembayaran(val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lunas" className="text-xs font-semibold text-emerald-600">
                    LUNAS
                  </SelectItem>
                  <SelectItem value="Uang Muka (DP)" className="text-xs font-semibold text-blue-600">
                    Uang Muka (DP)
                  </SelectItem>
                  <SelectItem value="Termin 2" className="text-xs font-semibold text-amber-600">
                    Termin 2
                  </SelectItem>
                  <SelectItem value="Belum Lunas" className="text-xs font-semibold text-rose-600">
                    Belum Lunas
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Metode Pembayaran
              </Label>
              <Select
                value={metodePembayaran}
                onValueChange={(val) => setMetodePembayaran(val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transfer Bank Mandiri" className="text-xs">
                    Transfer Bank Mandiri
                  </SelectItem>
                  <SelectItem value="Transfer Bank BCA" className="text-xs">
                    Transfer Bank BCA
                  </SelectItem>
                  <SelectItem value="Transfer Bank BRI / BNI" className="text-xs">
                    Transfer Bank BRI / BNI
                  </SelectItem>
                  <SelectItem value="Tunai / Kasir Biro" className="text-xs">
                    Tunai / Kasir Biro
                  </SelectItem>
                  <SelectItem value="QRIS Biro" className="text-xs">
                    QRIS Biro
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShareWhatsApp}
            className="h-9 text-xs rounded-xl text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5 font-semibold"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Kirim WhatsApp</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleGeneratePDF}
            disabled={generating}
            className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-sm shadow-blue-600/30"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Unduh PDF Resmi</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KwitansiInvoiceDialog;
