import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SuperAdminAuditLog,
  AuditActionType,
  exportAuditLogsToCsv,
  clearAuditLogs,
} from "@/utils/superAdminAuditLogs";
import { AuditDetailModal } from "../AuditDetailModal";
import {
  FileText,
  Search,
  Calendar,
  Filter,
  Download,
  Trash2,
  Eye,
  ShieldAlert,
  Clock,
  User,
  Globe,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface AuditLogsViewProps {
  logs: SuperAdminAuditLog[];
  onRefresh: () => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<SuperAdminAuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Action filter
      if (actionFilter !== "ALL" && log.action !== actionFilter) return false;

      // Date filter
      if (dateFilter) {
        const logDate = log.createdAt.slice(0, 10);
        if (logDate !== dateFilter) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          log.description.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.tableName.toLowerCase().includes(q) ||
          (log.tenantName || "").toLowerCase().includes(q) ||
          log.adminEmail.toLowerCase().includes(q) ||
          (log.ipAddress || "").includes(q)
        );
      }

      return true;
    });
  }, [logs, actionFilter, dateFilter, searchTerm]);

  const handleOpenDetail = (log: SuperAdminAuditLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleExportCsv = () => {
    exportAuditLogsToCsv(filteredLogs);
    toast.success("Berhasil mengekspor catatan audit ke format CSV");
  };

  const handleClearLogs = () => {
    if (confirm("Peringatan: Yakin ingin mereset seluruh catatan audit trail?")) {
      clearAuditLogs();
      toast.success("Catatan audit berhasil dibersihkan");
      onRefresh();
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "OVERRIDE_FEATURE":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-mono">OVERRIDE</Badge>;
      case "CREATE_TENANT":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono">CREATE</Badge>;
      case "UPDATE_TENANT":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-mono">UPDATE</Badge>;
      case "DELETE_TENANT":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-mono">DELETE</Badge>;
      case "REVOKE_DEVICE":
        return <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] font-mono">REVOKE</Badge>;
      case "BILLING_RECORD":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-mono">BILLING</Badge>;
      case "LOGIN_ROOT":
        return <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px] font-mono">AUTH</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-mono border-slate-200 text-slate-700 bg-slate-50">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Audit Logs & Pelacak Aktivitas Sistem
                </h2>
                <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-mono">
                  {logs.length} Total Rekam
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Audit trail menyeluruh mencatat setiap perubahan izin fitur, transaksi penagihan, pemutusan perangkat, dan otorisasi Founder.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-9 rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-cyan-600" />
              Ekspor CSV
            </Button>
            <Button
              onClick={handleClearLogs}
              variant="outline"
              size="sm"
              className="text-xs border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 h-9 rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Log
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3 flex-wrap shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari deskripsi, biro, admin, IP address, atau tabel..."
            className="pl-9 bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl placeholder:text-slate-400"
          />
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px] bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl">
            <SelectValue placeholder="Semua Aksi" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200 text-slate-900 text-xs">
            <SelectItem value="ALL">Semua Aksi</SelectItem>
            <SelectItem value="OVERRIDE_FEATURE">Override Fitur (Gating)</SelectItem>
            <SelectItem value="CREATE_TENANT">Pendaftaran Biro</SelectItem>
            <SelectItem value="UPDATE_TENANT">Update Biro</SelectItem>
            <SelectItem value="DELETE_TENANT">Hapus Biro</SelectItem>
            <SelectItem value="REVOKE_DEVICE">Putus Sesi Perangkat</SelectItem>
            <SelectItem value="BILLING_RECORD">Transaksi Penagihan</SelectItem>
            <SelectItem value="LOGIN_ROOT">Login Root Founder</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-[160px] bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl"
          placeholder="Filter Tanggal"
        />

        {(searchTerm || actionFilter !== "ALL" || dateFilter) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchTerm("");
              setActionFilter("ALL");
              setDateFilter("");
            }}
            className="text-xs text-slate-500 hover:text-slate-900 h-9"
          >
            Reset Filter
          </Button>
        )}
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Waktu (WIB)</th>
                <th className="py-3.5 px-3">Aksi</th>
                <th className="py-3.5 px-3">Biro / Tenant</th>
                <th className="py-3.5 px-3">Deskripsi Kejadian</th>
                <th className="py-3.5 px-3">Admin & IP</th>
                <th className="py-3.5 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Tidak ada rekam jejak audit yang sesuai dengan filter
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                      <div>
                        {format(new Date(log.createdAt), "dd MMM yyyy", { locale: id })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {format(new Date(log.createdAt), "HH:mm:ss 'WIB'")}
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Biro / Tenant */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {log.tenantName ? (
                        <div className="font-semibold text-slate-900">{log.tenantName}</div>
                      ) : (
                        <span className="text-slate-500 italic">Sistem Global</span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {log.tableName}
                      </span>
                    </td>

                    {/* Deskripsi */}
                    <td className="py-3.5 px-3 max-w-md">
                      <div className="text-slate-700 line-clamp-2 leading-relaxed">
                        {log.description}
                      </div>
                    </td>

                    {/* Admin & IP */}
                    <td className="py-3.5 px-3 whitespace-nowrap space-y-0.5">
                      <div className="font-mono text-[11px] text-cyan-700 font-medium">
                        {log.adminEmail}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {log.ipAddress || "-"}
                      </div>
                    </td>

                    {/* Tombol Lihat Perubahan */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        onClick={() => handleOpenDetail(log)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs h-7 px-2.5 rounded-lg flex items-center gap-1 ml-auto shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        Perubahan
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Diff Modal */}
      <AuditDetailModal
        log={selectedLog}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />
    </div>
  );
};
