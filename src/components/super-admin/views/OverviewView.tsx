import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TenantRecord,
  SUPER_ADMIN_EMAIL,
} from "@/utils/licenseEntitlement";
import { SuperAdminAuditLog } from "@/utils/superAdminAuditLogs";
import { TenantDeviceSession } from "@/utils/superAdminDevices";
import {
  Building2,
  Users,
  CreditCard,
  Globe,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Monitor,
  Activity,
  CheckCircle2,
  Clock,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface OverviewViewProps {
  tenants: TenantRecord[];
  auditLogs: SuperAdminAuditLog[];
  devices: TenantDeviceSession[];
  onNavigate: (view: string) => void;
  onOpenFeatureModal: (tenant: TenantRecord) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  tenants,
  auditLogs,
  devices,
  onNavigate,
  onOpenFeatureModal,
}) => {
  // Metrik Finansial & Lisensi
  const totalOmset = useMemo(() => {
    return tenants.reduce((acc, t) => acc + (t.nominalBayar || 0), 0);
  }, [tenants]);

  const activeWebsites = useMemo(() => {
    return tenants.filter((t) => t.hasWebsite);
  }, [tenants]);

  const activeDevices = useMemo(() => {
    return devices.filter((d) => d.status === "active");
  }, [devices]);

  const tierDistribution = useMemo(() => {
    return {
      starter: tenants.filter((t) => t.tier === "starter").length,
      pro: tenants.filter((t) => t.tier === "pro").length,
      enterprise: tenants.filter((t) => t.tier === "enterprise").length,
    };
  }, [tenants]);

  const expiringSoonWebsites = useMemo(() => {
    return tenants.filter((t) => t.hasWebsite && t.domainExpiredAt);
  }, [tenants]);

  const formatRupiah = (num: number) => {
    return "Rp " + Math.floor(num).toLocaleString("id-ID");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Executive Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs px-2.5 py-0.5 font-mono">
                FOUNDER COMMAND SUITE
              </Badge>
              <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Node Cluster Online
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Pusat Kendali Ekosistem Biro Wisata
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Selamat datang kembali, <strong className="text-slate-900">{SUPER_ADMIN_EMAIL}</strong>. Pantau seluruh biro wisata mitra, kelola hak akses fitur granular A sampai Z, perpanjangan VPS website, serta audit jejak sesi perangkat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => onNavigate("tenants")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Kelola Semua Biro ({tenants.length})
            </Button>
            <Button
              onClick={() => onNavigate("feature_gating")}
              variant="outline"
              className="border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs"
            >
              <Sliders className="w-4 h-4 text-amber-600" />
              Matriks Gating A-Z
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omset */}
        <Card className="bg-white border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Omset Lisensi
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(totalOmset)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Dari {tenants.length} mitra biro wisata terdaftar
            </p>
          </div>
        </Card>

        {/* Total Biro Mitra */}
        <Card className="bg-white border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mitra Biro Aktif
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {tenants.length} <span className="text-sm font-medium text-slate-500">Tenant</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="text-amber-700 font-semibold">{tierDistribution.starter} Starter</span> •{" "}
              <span className="text-blue-700 font-semibold">{tierDistribution.pro} Pro</span> •{" "}
              <span className="text-purple-700 font-semibold">{tierDistribution.enterprise} Enterprise</span>
            </div>
          </div>
        </Card>

        {/* Website & VPS Hosting */}
        <Card className="bg-white border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Web Promosi & VPS
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {activeWebsites.length} <span className="text-sm font-medium text-slate-500">Domain</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Add-on tahunan Rp 750.000 / biro
            </p>
          </div>
        </Card>

        {/* Sesi Perangkat Terhubung */}
        <Card className="bg-white border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sesi Perangkat Aktif
            </span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {activeDevices.length} <span className="text-sm font-medium text-slate-500">Device</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Keamanan login kru & owner terverifikasi
            </p>
          </div>
        </Card>
      </div>

      {/* Row: Quick Feature Control Shortcuts & Live Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1-2: Highlight Biro & Quick Feature Adjust */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">
                Kontrol Cepat Hak Akses Fitur Biro
              </h3>
            </div>
            <button
              onClick={() => onNavigate("feature_gating")}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 transition-colors"
            >
              Lihat Seluruh Matriks <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {tenants.map((t) => (
              <Card
                key={t.id}
                className="bg-white border-slate-200 hover:border-slate-300 p-4 rounded-xl transition-all shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{t.namaBiro}</h4>
                      <Badge
                        className={`text-[10px] uppercase font-mono ${
                          t.tier === "enterprise"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : t.tier === "pro"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {t.tier}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200 bg-slate-50">
                        {t.paymentModel === "lifetime" ? "Sekali Bayar" : "Langganan SaaS"}
                      </Badge>
                      {t.canUseDesktopMode && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] flex items-center gap-1 font-medium">
                          <Monitor className="w-3 h-3" /> Mode PC Aktif
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                      <span>Owner: <strong className="text-slate-800">{t.ownerNama}</strong></span>
                      <span>Kuota Trip: <strong className="text-cyan-700 font-semibold">{t.maxActiveTrips >= 9000 ? "Unlimited" : t.maxActiveTrips}</strong></span>
                      <span>Kuota Kru: <strong className="text-indigo-700 font-semibold">{t.maxCrewMembers >= 9000 ? "Unlimited" : t.maxCrewMembers}</strong></span>
                      {t.domainName && (
                        <span className="text-blue-700 font-mono font-medium flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {t.domainName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      onClick={() => onOpenFeatureModal(t)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-600" />
                      Atur Fitur (A-Z)
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Kolom 3: Live Audit & Device Security Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                Aktivitas Audit Terbaru
              </h3>
            </div>
            <button
              onClick={() => onNavigate("audit_logs")}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 transition-colors"
            >
              Semua Log <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3.5 shadow-xs">
            {auditLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="pb-3 border-b border-slate-100 last:border-0 last:pb-0 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    {format(new Date(log.createdAt), "HH:mm 'WIB'")}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {log.description}
                </p>
                {log.tenantName && (
                  <span className="inline-block text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                    {log.tenantName}
                  </span>
                )}
              </div>
            ))}

            <Button
              onClick={() => onNavigate("audit_logs")}
              variant="outline"
              className="w-full text-xs h-8 border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-xs"
            >
              Buka Konsol Audit Lengkap
            </Button>
          </div>

          {/* Quick Security Status */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Integritas Sesi Perangkat
              </h4>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                {activeDevices.length} Aktif
              </Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Semua sesi login kru dan pemilik biro dipantau secara real-time. Jika terdeteksi anomali, gunakan Kill Switch untuk memutus sesi dari jarak jauh.
            </p>
            <Button
              onClick={() => onNavigate("devices")}
              variant="outline"
              className="w-full text-xs h-8 border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
              Kelola Sesi Perangkat ({devices.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
