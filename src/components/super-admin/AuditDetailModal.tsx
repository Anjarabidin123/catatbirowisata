import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SuperAdminAuditLog } from "@/utils/superAdminAuditLogs";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { FileText, ShieldAlert, Clock, User, Globe, ArrowRight } from "lucide-react";

interface AuditDetailModalProps {
  log: SuperAdminAuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({ log, open, onOpenChange }) => {
  if (!log) return null;

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "OVERRIDE_FEATURE":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "CREATE_TENANT":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "UPDATE_TENANT":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "DELETE_TENANT":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "REVOKE_DEVICE":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "BILLING_RECORD":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "LOGIN_ROOT":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      default:
        return "bg-slate-700 text-slate-300 border-slate-600";
    }
  };

  const formattedDate = () => {
    try {
      return format(new Date(log.createdAt), "EEEE, dd MMMM yyyy - HH:mm:ss 'WIB'", { locale: id });
    } catch {
      return log.createdAt;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-slate-100 max-h-[85vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-amber-400 border border-slate-700">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Detail Audit Trail #{log.id}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Rekam jejak kepatuhan dan integritas modifikasi data enterprise
                </DialogDescription>
              </div>
            </div>
            <Badge className={`${getActionBadgeColor(log.action)} font-mono text-xs px-2.5 py-1 uppercase`}>
              {log.action}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 text-sm">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-400">Waktu:</span>
              <span className="font-medium text-slate-200">{formattedDate()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-400">Admin:</span>
              <span className="font-mono text-cyan-400">{log.adminEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-400">Target Tabel:</span>
              <span className="font-mono text-amber-300">{log.tableName}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-400">IP Address:</span>
              <span className="font-mono text-slate-300">{log.ipAddress || "-"}</span>
            </div>
            {log.tenantName && (
              <div className="sm:col-span-2 flex items-center gap-2 text-xs pt-1 border-t border-slate-800/60">
                <span className="text-slate-400">Biro / Tenant:</span>
                <Badge variant="outline" className="text-slate-200 border-slate-700 bg-slate-800/40">
                  {log.tenantName} ({log.tenantId || log.recordId})
                </Badge>
              </div>
            )}
          </div>

          {/* Deskripsi Aktivitas */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Deskripsi Kejadian
            </span>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-200 font-medium">
              {log.description}
            </div>
          </div>

          {/* Side-by-side JSON Data Diff */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-400">
                <span>Data Sebelum (Old Data)</span>
                <Badge variant="outline" className="border-rose-900/60 text-rose-400 bg-rose-950/30 text-[10px]">
                  Original
                </Badge>
              </div>
              <pre className="p-3 bg-slate-950 rounded-xl border border-rose-950/40 text-xs font-mono text-rose-300/90 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                {log.oldData ? JSON.stringify(log.oldData, null, 2) : "// Tidak ada data sebelumnya (Entri Baru)"}
              </pre>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span>Data Sesudah (New Data)</span>
                <Badge variant="outline" className="border-emerald-900/60 text-emerald-400 bg-emerald-950/30 text-[10px]">
                  Applied
                </Badge>
              </div>
              <pre className="p-3 bg-slate-950 rounded-xl border border-emerald-950/40 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                {log.newData ? JSON.stringify(log.newData, null, 2) : "// Data dihapus"}
              </pre>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
          >
            Tutup Dialog
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
