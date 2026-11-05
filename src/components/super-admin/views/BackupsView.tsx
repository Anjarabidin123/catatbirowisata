import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  HardDrive,
  Database,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileJson,
  Layers,
  Building2,
  FileText,
  Smartphone,
  Megaphone,
  LifeBuoy,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  getBackupHistory,
  triggerDownloadBackup,
  generateFullBackupPayload,
  restoreBackupPayload,
  BackupHistoryRecord,
} from "@/utils/superAdminBackups";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface BackupsViewProps {
  onRefresh: () => void;
}

export const BackupsView: React.FC<BackupsViewProps> = ({ onRefresh }) => {
  const [history, setHistory] = useState<BackupHistoryRecord[]>(getBackupHistory);
  const [downloading, setDownloading] = useState(false);
  const [payloadMeta, setPayloadMeta] = useState(() => generateFullBackupPayload().meta);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshLocal = () => {
    setHistory(getBackupHistory());
    setPayloadMeta(generateFullBackupPayload().meta);
    onRefresh();
  };

  useEffect(() => {
    const handleHistoryUpdate = () => {
      setHistory(getBackupHistory());
    };
    window.addEventListener("catatbiro-backup-history-updated", handleHistoryUpdate);
    return () => {
      window.removeEventListener("catatbiro-backup-history-updated", handleHistoryUpdate);
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await triggerDownloadBackup();
      toast.success(`Backup basis data berhasil diekspor: ${res.fileName}`);
      refreshLocal();
    } catch (err) {
      toast.error("Gagal melakukan backup basis data");
    } finally {
      setDownloading(false);
    }
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (
          confirm(
            `Apakah Anda yakin ingin memulihkan basis data dari berkas "${file.name}"? Data lokal sistem akan diperbarui dengan isi cadangan ini.`
          )
        ) {
          const res = restoreBackupPayload(json);
          if (res.success) {
            toast.success(`Berhasil memulihkan ${res.restoredRecords} entitas data sistem!`);
            refreshLocal();
          } else {
            toast.error(res.error || "Gagal memulihkan cadangan");
          }
        }
      } catch (err) {
        toast.error("Gagal membaca berkas JSON: format berkas tidak valid");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <HardDrive className="w-6 h-6 text-indigo-600" />
            <span>Pusat Backup & Ekspor Basis Data Global</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ekspor arsip cadangan (full system snapshot) seluruh entitas platform CatatBiro ke format JSON aman dalam 1 klik.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refreshLocal}
          className="h-8 px-3 rounded-xl text-xs text-slate-700 border-slate-300 bg-white hover:bg-slate-50 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Periksa Ukuran Data</span>
        </Button>
      </div>

      {/* Hero 1-Click Backup Card */}
      <Card className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white border-2 border-indigo-700/60 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-radial from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Basis Data Sehat & Terproteksi
              </Badge>
              <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-500/40 text-[10px] font-mono">
                SNAPSHOT ENGINE v2.4
              </Badge>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Unduh Cadangan Lengkap Sistem (1-Klik)
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100/80 mt-1.5 leading-relaxed">
                Menghasilkan arsip terenkripsi berisi seluruh daftar biro wisata ({payloadMeta.tenantsCount} tenant),
                log audit ({payloadMeta.auditLogsCount} log), perangkat aktif ({payloadMeta.devicesCount} sesi),
                broadcast global ({payloadMeta.broadcastsCount}), dan tiket bantuan ({payloadMeta.ticketsCount}).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-200 pt-1 font-mono">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Total Objek: {payloadMeta.totalRecords} Entitas
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-amber-400" />
                Format File: JSON Standar
              </span>
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileRestore}
              accept=".json,application/json"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-12 px-5 rounded-2xl border-indigo-400/50 bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
              title="Pulihkan data dari berkas cadangan JSON"
            >
              <Upload className="w-4 h-4 text-cyan-300" />
              <span>Pulihkan (Restore)</span>
            </Button>

            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="h-12 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-sm shadow-xl shadow-indigo-900/50 flex items-center justify-center gap-2.5 transition-transform active:scale-95"
            >
              <Download className="w-5 h-5 text-amber-200" />
              <span>{downloading ? "Mengemas Data..." : "Download Backup"}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Breakdown Entities Bento Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
          <Building2 className="w-5 h-5 text-indigo-600 mx-auto" />
          <div className="text-lg font-black text-slate-900">{payloadMeta.tenantsCount}</div>
          <div className="text-[11px] text-slate-500">Biro Klien</div>
        </Card>

        <Card className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
          <FileText className="w-5 h-5 text-emerald-600 mx-auto" />
          <div className="text-lg font-black text-slate-900">{payloadMeta.auditLogsCount}</div>
          <div className="text-[11px] text-slate-500">Audit Logs</div>
        </Card>

        <Card className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
          <Smartphone className="w-5 h-5 text-purple-600 mx-auto" />
          <div className="text-lg font-black text-slate-900">{payloadMeta.devicesCount}</div>
          <div className="text-[11px] text-slate-500">Perangkat</div>
        </Card>

        <Card className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
          <Megaphone className="w-5 h-5 text-blue-600 mx-auto" />
          <div className="text-lg font-black text-slate-900">{payloadMeta.broadcastsCount}</div>
          <div className="text-[11px] text-slate-500">Broadcast</div>
        </Card>

        <Card className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
          <LifeBuoy className="w-5 h-5 text-rose-600 mx-auto" />
          <div className="text-lg font-black text-slate-900">{payloadMeta.ticketsCount}</div>
          <div className="text-[11px] text-slate-500">Tiket Bantuan</div>
        </Card>

        <Card className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
          <Layers className="w-5 h-5 text-cyan-600 mx-auto" />
          <div className="text-lg font-black text-cyan-700">{payloadMeta.totalRecords}</div>
          <div className="text-[11px] text-slate-500">Total Objek</div>
        </Card>
      </div>

      {/* Backup History Table */}
      <Card className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
              Riwayat Ekspor Backup Terakhir
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {history.length} Arsip Tersimpan
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {history.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Belum ada riwayat unduhan backup. Klik tombol di atas untuk membuat backup perdana.
            </div>
          ) : (
            history.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-mono font-bold text-xs text-slate-900">{rec.fileName}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                      <span>{format(new Date(rec.timestamp), "dd MMMM yyyy, HH:mm:ss", { locale: id })}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{rec.totalRecords} Entitas</span>
                      <span>•</span>
                      <span>{formatBytes(rec.fileSizeBytes)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="h-8 px-3 rounded-xl text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor Ulang</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
