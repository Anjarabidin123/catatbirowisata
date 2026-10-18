import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Compass, 
  MapPin, 
  Bus, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Utensils, 
  Ticket, 
  ArrowRight, 
  RotateCcw, 
  SlidersHorizontal,
  ShieldAlert,
  Users
} from "lucide-react";
import { 
  TourConsultationParams, 
  TourProposalResult, 
  TargetRombonganType, 
  TARGET_LABELS, 
  generateTourProposal 
} from "@/utils/asistenWisataAI";

interface AsistenWisataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTripRoute?: (tripData: { nama: string; tujuan: string; rundown?: any[] }) => void;
}

const POPULAR_CITIES = ["Semarang", "Yogyakarta", "Demak & Ziarah Pantura", "Malang & Batu", "Bandung", "Dieng", "Solo"];

export const AsistenWisataModal = ({
  open,
  onOpenChange,
  onSelectTripRoute,
}: AsistenWisataModalProps) => {
  // Step 1: Input Parameter Lapangan
  const [params, setParams] = useState<TourConsultationParams>({
    targetRombongan: "smp",
    kotaTujuan: "Semarang",
    durasiHari: "1",
    armadaBus: "big_bus",
    catatanKhusus: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TourProposalResult | null>(null);

  const handleGenerate = () => {
    if (!params.kotaTujuan.trim()) return;
    setLoading(true);

    setTimeout(() => {
      const proposal = generateTourProposal(params);
      setResult(proposal);
      setLoading(false);
    }, 450);
  };

  const handleReset = () => {
    setResult(null);
  };

  const handleApplyToTrip = () => {
    if (result && onSelectTripRoute) {
      onSelectTripRoute({
        nama: result.judulTrip,
        tujuan: result.kotaTujuan,
        rundown: result.rundown,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden">
        
        {/* Header Bersih & Profesional */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Konsultan Rute & Rundown Lapangan
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Menyusun itinerary akurat disesuaikan dengan karakter target rombongan & kapasitas bus.
                </DialogDescription>
              </div>
            </div>

            {result && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs rounded-xl font-medium border-slate-200 dark:border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Ubah Parameter
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content Body: Wizard Parameter vs Hasil Proposal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!result ? (
            /* ============================================================ */
            /* MODE 1: FORM PARAMETER LAPANGAN TERPERINCI                  */
            /* ============================================================ */
            <div className="space-y-5">
              {/* 1. Pilih Target Rombongan (Segmentasi Lapangan) */}
              <div>
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>1. Siapa Target Rombongan Peserta Trip Ini?</span>
                </Label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(TARGET_LABELS) as TargetRombonganType[]).map((key) => {
                    const item = TARGET_LABELS[key];
                    const isSelected = params.targetRombongan === key;
                    return (
                      <div
                        key={key}
                        onClick={() => setParams({ ...params, targetRombongan: key })}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-600 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-600"
                            : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{item.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Kota Destinasi Tujuan */}
              <div>
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>2. Kota Destinasi Tujuan</span>
                </Label>
                <Input
                  value={params.kotaTujuan}
                  onChange={(e) => setParams({ ...params, kotaTujuan: e.target.value })}
                  placeholder="Contoh: Semarang, Demak & Kudus, Yogyakarta, Malang..."
                  className="rounded-xl h-10 text-xs sm:text-sm font-medium"
                />
                
                {/* Quick Chips Destinasi */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-1">
                  <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">Rute Cepat:</span>
                  {POPULAR_CITIES.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setParams({ ...params, kotaTujuan: city })}
                      className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all whitespace-nowrap ${
                        params.kotaTujuan.toLowerCase() === city.toLowerCase()
                          ? "bg-blue-600 text-white border-blue-600 font-bold"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Durasi & Armada Bus */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Durasi */}
                <div>
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>3. Durasi Perjalanan</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "1", label: "1 Hari" },
                      { id: "2", label: "2H 1M" },
                      { id: "3", label: "3H 2M" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setParams({ ...params, durasiHari: d.id as any })}
                        className={`py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                          params.durasiHari === d.id
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spesifikasi Armada Bus */}
                <div>
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                    <Bus className="w-4 h-4 text-emerald-600" />
                    <span>4. Armada Bus Yang Dipakai</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "big_bus", label: "Big Bus", sub: "50 Seat" },
                      { id: "medium_bus", label: "Medium", sub: "33 Seat" },
                      { id: "microbus", label: "HiAce", sub: "15 Seat" },
                    ].map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setParams({ ...params, armadaBus: a.id as any })}
                        className={`p-1.5 rounded-xl border text-center transition-all flex flex-col justify-center items-center ${
                          params.armadaBus === a.id
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-bold">{a.label}</span>
                        <span className={`text-[9px] ${params.armadaBus === a.id ? "text-blue-100" : "text-slate-400"}`}>
                          {a.sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tombol Buat Proposal */}
              <div className="pt-2">
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !params.kotaTujuan.trim()}
                  className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>{loading ? "Menyusun Rekomendasi Lapangan..." : "Susun Rundown & Rekomendasi Lapangan"}</span>
                </Button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* MODE 2: HASIL PROPOSAL OPERASIONAL LAPANGAN                 */
            /* ============================================================ */
            <div className="space-y-6">
              {/* Ringkasan Header Rute */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 mb-1">
                    <span>Target: {result.targetLabel}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {result.judulTrip}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>⏱️ {result.durasiLabel}</span>
                    <span>•</span>
                    <span>🚌 {result.armadaLabel}</span>
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleApplyToTrip}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Terapkan ke Jadwal Trip
                </Button>
              </div>

              {/* Peringatan Keselamatan & Karakteristik Rombongan */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Catatan Khusus Lapangan untuk Tour Leader & Driver:</span>
                </div>
                <p className="text-[11px] leading-relaxed font-medium pl-6">
                  {result.peringatanKeselamatan}
                </p>
                <div className="pl-6 space-y-1 pt-1 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800/90 dark:text-amber-300/90">
                  {result.karakteristikTarget.map((k, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span>•</span>
                      <span>{k}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Rundown Jam demi Jam (Format Bersih & Rapi) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rundown Operasional Jam demi Jam (Siap Pakai):</span>
                </h4>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  {result.rundown.map((item, idx) => (
                    <div key={idx} className="p-3 text-xs flex items-start gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="w-24 flex-shrink-0 font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded-lg text-center text-[11px]">
                        {item.jamMulai} - {item.jamSelesai}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{item.kegiatan}</p>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex-shrink-0">
                            {item.kategori}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
                          <span>{item.lokasi}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 italic mt-1 bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-md">
                          ℹ️ {item.keterangan}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Objek Wisata Terpilih & Estimasi HTM */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-blue-600" />
                  <span>Objek Wisata Terpilih Sesuai Karakter Peserta:</span>
                </h4>

                <div className="grid grid-cols-1 gap-2.5">
                  {result.destinasiRekomendasi.map((d, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{d.nama}</p>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                          HTM: {d.htmPerOrang}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Akses Bus:</span> {d.aksesBus}
                      </p>
                      <p className="text-[10px] text-slate-500 italic">
                        Alasan rekomendasi: {d.alasanCocok}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restoran Rombongan */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rekomendasi Resto Rombongan (Ramah Parkir Bus Besar):</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {result.restoRekomendasi.map((r, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 text-xs space-y-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{r.nama}</p>
                      <p className="text-[11px] text-slate-500">
                        Kapasitas: <span className="font-semibold text-slate-700 dark:text-slate-300">{r.kapasitas}</span> • {r.parkirBus}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Menu Favorit: {r.menuFavorit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tombol Terapkan Utama */}
              <div className="pt-2 flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="rounded-xl h-11 text-xs font-semibold flex-1 border-slate-200 dark:border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Ubah Parameter Rombongan
                </Button>
                <Button
                  onClick={handleApplyToTrip}
                  className="rounded-xl h-11 text-xs font-bold flex-[2] bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  <span>Terapkan ke Jadwal Trip Baru</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};
