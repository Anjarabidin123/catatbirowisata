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
import { BroadcastsView } from "@/components/super-admin/views/BroadcastsView";
import { TicketsView } from "@/components/super-admin/views/TicketsView";
import { BackupsView } from "@/components/super-admin/views/BackupsView";
import { PlatformSettingsView } from "@/components/super-admin/views/PlatformSettingsView";
import { getBroadcasts, SystemBroadcast } from "@/utils/superAdminBroadcasts";
import { getSupportTickets, SupportTicket } from "@/utils/superAdminTickets";
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
      "broadcasts",
      "tickets",
      "audit_logs",
      "devices",
      "billing",
      "websites",
      "backups",
      "settings",
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
  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>(getBroadcasts);
  const [tickets, setTickets] = useState<SupportTicket[]>(getSupportTickets);
  const [isSuper, setIsSuper] = useState<boolean>(isSuperAdminUser);

  // Modal State
  const [selectedTenantForFeature, setSelectedTenantForFeature] = useState<TenantRecord | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  const refreshAllData = () => {
    setTenants(getAllTenants());
    setAuditLogs(getAuditLogs());
    setDevices(getAllDevices());
    setBroadcasts(getBroadcasts());
    setTickets(getSupportTickets());
    setIsSuper(isSuperAdminUser());
  };

  useEffect(() => {
    refreshAllData();

    const handleTenantsUpdate = () => setTenants(getAllTenants());
    const handleAuditUpdate = () => setAuditLogs(getAuditLogs());
    const handleDevicesUpdate = () => setDevices(getAllDevices());
    const handleBroadcastsUpdate = () => setBroadcasts(getBroadcasts());
    const handleTicketsUpdate = () => setTickets(getSupportTickets());
    const handleEntitlementUpdate = () => setIsSuper(isSuperAdminUser());

    window.addEventListener("catatbiro-tenants-updated", handleTenantsUpdate);
    window.addEventListener("catatbiro-audit-updated", handleAuditUpdate);
    window.addEventListener("catatbiro-devices-updated", handleDevicesUpdate);
    window.addEventListener("catatbiro-broadcasts-updated", handleBroadcastsUpdate);
    window.addEventListener("catatbiro-tickets-updated", handleTicketsUpdate);
    window.addEventListener("catatbiro-entitlement-updated", handleEntitlementUpdate);

    return () => {
      window.removeEventListener("catatbiro-tenants-updated", handleTenantsUpdate);
      window.removeEventListener("catatbiro-audit-updated", handleAuditUpdate);
      window.removeEventListener("catatbiro-devices-updated", handleDevicesUpdate);
      window.removeEventListener("catatbiro-broadcasts-updated", handleBroadcastsUpdate);
      window.removeEventListener("catatbiro-tickets-updated", handleTicketsUpdate);
      window.removeEventListener("catatbiro-entitlement-updated", handleEntitlementUpdate);
    };
  }, []);

  const handleSelectView = (view: string) => {
    navigate(`/super-admin?view=${view}`);
  };

  const handleOpenFeatureModal = (tenant: TenantRecord) => {
    setSelectedTenantForFeature(tenant);
    setShowFeatureModal(true);
  };

  // If user is not Super Admin (anjarbdn@gmail.com), show enterprise authorization barrier
  if (!isSuper) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-white border border-rose-200 rounded-3xl text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-slate-900">
              Akses Ditolak (Restricted Area)
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Konsol Super Admin Master hanya dapat diakses secara eksklusif oleh akun Founder whitelist (<strong className="text-amber-700">{SUPER_ADMIN_EMAIL}</strong>).
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-600" />
              Developer Bypass (Testing Mode):
            </div>
            <p className="text-[11px] text-slate-500">
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
              className="w-full bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-semibold text-xs h-10 rounded-xl shadow-xs"
            >
              <Crown className="w-4 h-4 mr-1.5" />
              Aktifkan Akses Founder Bypass
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="w-full border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
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
      broadcastsCount={broadcasts.filter((b) => b.isActive).length}
      ticketsCount={tickets.filter((t) => t.status === "open").length}
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

      {currentView === "broadcasts" && (
        <BroadcastsView onRefresh={refreshAllData} />
      )}

      {currentView === "tickets" && (
        <TicketsView onRefresh={refreshAllData} />
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

      {currentView === "backups" && (
        <BackupsView onRefresh={refreshAllData} />
      )}

      {currentView === "settings" && (
        <PlatformSettingsView onRefresh={refreshAllData} />
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
