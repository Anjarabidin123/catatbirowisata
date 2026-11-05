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
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CREATE_TENANT":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "UPDATE_TENANT":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DELETE_TENANT":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "REVOKE_DEVICE":
        return "bg-red-50 text-red-700 border-red-200";
      case "BILLING_RECORD":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "LOGIN_ROOT":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
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
      <DialogContent className="max-w-3xl bg-white border-slate-200 text-slate-900 max-h-[85vh] flex flex-col p-6 rounded-2xl shadow-xl">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Detail Audit Trail #{log.id}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-500">Waktu:</span>
              <span className="font-medium text-slate-800">{formattedDate()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-500">Admin:</span>
              <span className="font-mono text-cyan-700 font-medium">{log.adminEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-500">Target Tabel:</span>
              <span className="font-mono text-amber-700 font-medium">{log.tableName}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-500">IP Address:</span>
              <span className="font-mono text-slate-700">{log.ipAddress || "-"}</span>
            </div>
            {log.tenantName && (
              <div className="sm:col-span-2 flex items-center gap-2 text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-500">Biro / Tenant:</span>
                <Badge variant="outline" className="text-slate-800 border-slate-300 bg-white shadow-xs">
                  {log.tenantName} ({log.tenantId || log.recordId})
                </Badge>
              </div>
            )}
          </div>

          {/* Deskripsi Aktivitas */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Deskripsi Kejadian
            </span>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium">
              {log.description}
            </div>
          </div>

          {/* Side-by-side JSON Data Diff */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-700">
                <span>Data Sebelum (Old Data)</span>
                <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50 text-[10px]">
                  Original
                </Badge>
              </div>
              <pre className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs font-mono text-rose-900 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                {log.oldData ? JSON.stringify(log.oldData, null, 2) : "// Tidak ada data sebelumnya (Entri Baru)"}
              </pre>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
                <span>Data Sesudah (New Data)</span>
                <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px]">
                  Applied
                </Badge>
              </div>
              <pre className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-mono text-emerald-900 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                {log.newData ? JSON.stringify(log.newData, null, 2) : "// Data dihapus"}
              </pre>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs shadow-xs"
          >
            Tutup Dialog
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
