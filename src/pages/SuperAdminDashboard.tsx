import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  isSuperAdminUser,
  SUPER_ADMIN_EMAIL,
  getAllTenants,
  TenantRecord,
} from "@/utils/licenseEntitlement";
import {
  getAuditLogs,
  SuperAdminAuditLog,
} from "@/utils/superAdminAuditLogs";
import {
  getAllDevices,
  TenantDeviceSession,
} from "@/utils/superAdminDevices";
import { SuperAdminLayout } from "@/components/super-admin/SuperAdminLayout";
import { OverviewView } from "@/components/super-admin/views/OverviewView";
import { TenantsView } from "@/components/super-admin/views/TenantsView";
import { FeatureGatingView } from "@/components/super-admin/views/FeatureGatingView";
import { AuditLogsView } from "@/components/super-admin/views/AuditLogsView";
import { DeviceManagementView } from "@/components/super-admin/views/DeviceManagementView";
import { BillingView } from "@/components/super-admin/views/BillingView";
import { WebsitesView } from "@/components/super-admin/views/WebsitesView";
import { DatabaseManagerView } from "@/components/super-admin/views/DatabaseManagerView";
import { SandboxTesterView } from "@/components/super-admin/views/SandboxTesterView";
import { GranularFeatureModal } from "@/components/super-admin/GranularFeatureModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft, Crown, Key } from "lucide-react";
import { toast } from "sonner";

export const SuperAdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const location = useLocation();

  const getViewFromLocation = (): string => {
    const q = searchParams.get("view");
    if (q) return q;
    const sub = location.pathname.replace(/^\/super-admin\/?/, "").replace(/-/g, "_");
    const validViews = [
      "overview",
      "tenants",
      "feature_gating",
      "audit_logs",
      "devices",
      "billing",
      "websites",
      "database",
      "sandbox",
    ];
    if (validViews.includes(sub)) return sub;
    return "overview";
  };

  const currentView = getViewFromLocation();

  // Data Stores
  const [tenants, setTenants] = useState<TenantRecord[]>(getAllTenants);
  const [auditLogs, setAuditLogs] = useState<SuperAdminAuditLog[]>(getAuditLogs);
  const [devices, setDevices] = useState<TenantDeviceSession[]>(getAllDevices);
  const [isSuper, setIsSuper] = useState<boolean>(isSuperAdminUser);

  // Modal State
  const [selectedTenantForFeature, setSelectedTenantForFeature] = useState<TenantRecord | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  const refreshAllData = () => {
    setTenants(getAllTenants());
    setAuditLogs(getAuditLogs());
    setDevices(getAllDevices());
    setIsSuper(isSuperAdminUser());
  };

  useEffect(() => {
    refreshAllData();

    const handleTenantsUpdate = () => setTenants(getAllTenants());
    const handleAuditUpdate = () => setAuditLogs(getAuditLogs());
    const handleDevicesUpdate = () => setDevices(getAllDevices());
    const handleEntitlementUpdate = () => setIsSuper(isSuperAdminUser());

    window.addEventListener("catatbiro-tenants-updated", handleTenantsUpdate);
    window.addEventListener("catatbiro-audit-updated", handleAuditUpdate);
    window.addEventListener("catatbiro-devices-updated", handleDevicesUpdate);
    window.addEventListener("catatbiro-entitlement-updated", handleEntitlementUpdate);

    return () => {
      window.removeEventListener("catatbiro-tenants-updated", handleTenantsUpdate);
      window.removeEventListener("catatbiro-audit-updated", handleAuditUpdate);
      window.removeEventListener("catatbiro-devices-updated", handleDevicesUpdate);
      window.removeEventListener("catatbiro-entitlement-updated", handleEntitlementUpdate);
    };
  }, []);

  const handleSelectView = (view: string) => {
    setSearchParams({ view });
  };

  const handleOpenFeatureModal = (tenant: TenantRecord) => {
    setSelectedTenantForFeature(tenant);
    setShowFeatureModal(true);
  };

  // If user is not Super Admin (anjarbdn@gmail.com), show enterprise authorization barrier
  if (!isSuper) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-slate-900 border-2 border-rose-900/60 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/40">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-white">
              Akses Ditolak (Restricted Area)
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Konsol Super Admin Master hanya dapat diakses secara eksklusif oleh akun Founder whitelist (<strong className="text-amber-400">{SUPER_ADMIN_EMAIL}</strong>).
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400 text-left space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Developer Bypass (Testing Mode):
            </div>
            <p className="text-[11px] text-slate-400">
              Anda dapat mengaktifkan bypass pengujian lokal sementara dengan tombol di bawah:
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => {
                localStorage.setItem("catatbiro_is_superadmin_override", "true");
                setIsSuper(true);
                toast.success("Bypass Super Admin diaktifkan untuk sesi ini!");
                refreshAllData();
              }}
              className="w-full bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-semibold text-xs h-10 rounded-xl"
            >
              <Crown className="w-4 h-4 mr-1.5" />
              Aktifkan Akses Founder Bypass
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="w-full border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-9 rounded-xl flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Aplikasi Biro
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <SuperAdminLayout
      currentView={currentView}
      onSelectView={handleSelectView}
      tenants={tenants}
      devicesCount={devices.length}
      auditCount={auditLogs.length}
      onRefresh={refreshAllData}
      onOpenAddTenant={() => handleSelectView("tenants")}
    >
      {/* Dynamic Sub-Views */}
      {currentView === "overview" && (
        <OverviewView
          tenants={tenants}
          auditLogs={auditLogs}
          devices={devices}
          onNavigate={handleSelectView}
          onOpenFeatureModal={handleOpenFeatureModal}
        />
      )}

      {currentView === "tenants" && (
        <TenantsView
          tenants={tenants}
          onOpenFeatureModal={handleOpenFeatureModal}
          onRefresh={refreshAllData}
        />
      )}

      {currentView === "feature_gating" && (
        <FeatureGatingView
          tenants={tenants}
          onOpenFeatureModal={handleOpenFeatureModal}
          onRefresh={refreshAllData}
        />
      )}

      {currentView === "audit_logs" && (
        <AuditLogsView logs={auditLogs} onRefresh={refreshAllData} />
      )}

      {currentView === "devices" && (
        <DeviceManagementView devices={devices} onRefresh={refreshAllData} />
      )}

      {currentView === "billing" && (
        <BillingView tenants={tenants} onRefresh={refreshAllData} />
      )}

      {currentView === "websites" && (
        <WebsitesView tenants={tenants} onRefresh={refreshAllData} />
      )}

      {currentView === "database" && (
        <DatabaseManagerView onRefresh={refreshAllData} />
      )}

      {currentView === "sandbox" && (
        <SandboxTesterView tenants={tenants} onRefresh={refreshAllData} />
      )}

      {/* Modal Kustomisasi Fitur A-Z Granular (Bisa dipanggil dari mana saja) */}
      <GranularFeatureModal
        tenant={selectedTenantForFeature}
        open={showFeatureModal}
        onOpenChange={setShowFeatureModal}
        onSaved={refreshAllData}
      />
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;
