import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Activity,
  Plus,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Building2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  getImpersonatedTenantId,
  stopImpersonation,
  TenantRecord,
} from "@/utils/licenseEntitlement";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SuperAdminHeaderProps {
  currentView: string;
  onRefresh: () => void;
  onOpenAddTenant?: () => void;
  onSelectView: (view: string) => void;
  tenants: TenantRecord[];
}

export const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({
  currentView,
  onRefresh,
  onOpenAddTenant,
  onSelectView,
  tenants,
}) => {
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState<string>("");
  const impersonatedId = getImpersonatedTenantId();
  const impersonatedTenant = tenants.find((t) => t.id === impersonatedId);

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(format(new Date(), "HH:mm:ss 'WIB'", { locale: id }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getViewTitle = (view: string) => {
    switch (view) {
      case "overview":
        return "Executive Dashboard";
      case "tenants":
        return "Direktori Klien Biro";
      case "feature_gating":
        return "Matriks Feature Gating A-Z";
      case "audit_logs":
        return "Audit Logs & Aktivitas";
      case "devices":
        return "Manajemen Perangkat & Sesi";
      case "billing":
        return "Penagihan & Invoicing";
      case "websites":
        return "Web Promosi & VPS";
      case "database":
        return "Database & SQL Manager";
      case "sandbox":
        return "Sandbox Persona Tester";
      default:
        return "Dashboard";
    }
  };

  const handleStopImpersonate = () => {
    stopImpersonation();
    toast.success("Sesi impersonasi dihentikan. Kembali ke Super Admin Master.");
    onRefresh();
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0a0f1d]/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex flex-col gap-2 select-none shadow-md">
      {/* Impersonation Banner if active */}
      {impersonatedTenant && (
        <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/60 flex items-center justify-between text-xs text-amber-200 animate-pulse">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>
              Mode Impersonasi Aktif: <strong className="text-white">{impersonatedTenant.namaBiro}</strong>
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleStopImpersonate}
            className="text-[11px] h-6 bg-amber-600 hover:bg-amber-500 text-white px-2 rounded-lg"
          >
            Hentikan Impersonasi
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Breadcrumb Title */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono text-slate-400">ROOT CONSOLE</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <h2 className="text-sm font-bold text-white tracking-tight">
            {getViewTitle(currentView)}
          </h2>
        </div>

        {/* Right Status Indicators & Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Live System Time */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{timeStr || "Memuat..."}</span>
          </div>

          {/* Cluster Status Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-400">Supabase Online</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Ping 24ms</span>
          </div>

          {/* Quick Add Biro Button */}
          {onOpenAddTenant && (
            <Button
              size="sm"
              onClick={onOpenAddTenant}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              Biro Baru
            </Button>
          )}

          {/* Refresh Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-8 w-8 p-0 rounded-xl"
            title="Muat ulang data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>

          {/* Link to Client App */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-8 px-2.5 rounded-xl hidden sm:flex items-center gap-1"
          >
            Aplikasi Biro <ExternalLink className="w-3 h-3 text-slate-500" />
          </Button>
        </div>
      </div>
    </header>
  );
};
