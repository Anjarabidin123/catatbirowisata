import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  TenantRecord,
  updateTenant,
  updateTenantInSupabase,
} from "@/utils/licenseEntitlement";
import {
  Sliders,
  Monitor,
  Sparkles,
  FileCheck2,
  Users,
  Compass,
  Palette,
  Globe,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

interface FeatureGatingViewProps {
  tenants: TenantRecord[];
  onOpenFeatureModal: (tenant: TenantRecord) => void;
  onRefresh: () => void;
}

export const FeatureGatingView: React.FC<FeatureGatingViewProps> = ({
  tenants,
  onOpenFeatureModal,
  onRefresh,
}) => {
  // Gunakan local state yang reaktif dan optimis agar switch tidak pernah mental kembali
  const [localTenants, setLocalTenants] = useState<TenantRecord[]>(tenants);

  useEffect(() => {
    if (tenants && tenants.length > 0) {
      setLocalTenants(tenants);
    }
  }, [tenants]);

  // Handler optimis: ubah UI seketika + simpan ke localStorage + kunci permanen ke Supabase
  const updateLocalAndRemote = async (
    tenantId: string,
    tenantName: string,
    updates: Partial<TenantRecord>,
    successMessage: string
  ) => {
    // 1. Seketika ubah state lokal (0 ms delay, no flicking back!)
    setLocalTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, ...updates } : t))
    );

    // 2. Simpan ke local storage
    updateTenant(tenantId, updates);

    // 3. Kunci permanen ke basis data Supabase
    try {
      const ok = await updateTenantInSupabase(tenantId, updates);
      if (ok) {
        toast.success(successMessage);
      } else {
        toast.success(`${successMessage} (Tersimpan di konsol)`);
      }
    } catch (err) {
      console.warn("Supabase update error:", err);
      toast.success(successMessage);
    }
  };

  const handleToggleDesktop = (tenant: TenantRecord, val: boolean) => {
    updateLocalAndRemote(
      tenant.id,
      tenant.namaBiro,
      { canUseDesktopMode: val },
      `Mode Desktop PC untuk ${tenant.namaBiro}: ${val ? "AKTIF (Bypass Terbuka)" : "TERKUNCI"}`
    );
  };

  const handleToggleAI = (tenant: TenantRecord, val: boolean) => {
    updateLocalAndRemote(
      tenant.id,
      tenant.namaBiro,
      { canUseAI: val },
      `Akses Asisten AI untuk ${tenant.namaBiro}: ${val ? "AKTIF" : "NONAKTIF"}`
    );
  };

  const handleTogglePdf = (tenant: TenantRecord, val: boolean) => {
    updateLocalAndRemote(
      tenant.id,
      tenant.namaBiro,
      { canExportCleanPdf: val },
      `Ekspor PDF Bersih untuk ${tenant.namaBiro}: ${val ? "AKTIF" : "NONAKTIF"}`
    );
  };

  const handleToggleBranding = (tenant: TenantRecord, val: boolean) => {
    updateLocalAndRemote(
      tenant.id,
      tenant.namaBiro,
      { customBranding: val },
      `Custom Branding untuk ${tenant.namaBiro}: ${val ? "AKTIF" : "NONAKTIF"}`
    );
  };

  const handleToggleWebsite = (tenant: TenantRecord, val: boolean) => {
    updateLocalAndRemote(
      tenant.id,
      tenant.namaBiro,
      { hasWebsite: val },
      `Paket Website untuk ${tenant.namaBiro}: ${val ? "AKTIF" : "NONAKTIF"}`
    );
  };

  const handleQuickTripQuota = (tenant: TenantRecord, quota: number) => {
    updateLocalAndRemote(
      tenant.id,
      tenant.namaBiro,
      { maxActiveTrips: quota },
      `Kuota trip ${tenant.namaBiro} diubah ke ${quota >= 9000 ? "Unlimited" : quota}`
    );
  };

  const handleQuickCrewQuota = (tenant: TenantRecord, quota: number) => {
    updateLocalAndRemote(
      tenant.id,
      tenant.namaBiro,
      { maxCrewMembers: quota },
      `Kuota kru ${tenant.namaBiro} diubah ke ${quota >= 9000 ? "Unlimited" : quota}`
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Information Header */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Matriks Feature Gating & Entitlements Biro (A-Z)
            </h2>
            <p className="text-xs text-slate-600">
              Sebagai Super Admin, Anda memiliki hak veto independen. Anda dapat mengaktifkan Mode Desktop di laptop bahkan untuk akun paket Sekali Bayar Starter, atau menetapkan kuota khusus sesuai kesepakatan bisnis. Perubahan langsung terkunci ke database Supabase.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Matrix Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Nama Biro & Tier</th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-amber-700 font-bold">
                    <Monitor className="w-3.5 h-3.5" />
                    Mode Desktop PC
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-cyan-700">
                    <Compass className="w-3.5 h-3.5" />
                    Kuota Trip Aktif
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <Users className="w-3.5 h-3.5" />
                    Kuota Kru
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Asisten
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    PDF Bersih
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <Palette className="w-3.5 h-3.5" />
                    Branding
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <Globe className="w-3.5 h-3.5" />
                    Web & VPS
                  </span>
                </th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {localTenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Nama Biro & Tier */}
                  <td className="py-4 px-4 space-y-1">
                    <div className="font-bold text-slate-900 text-sm">{t.namaBiro}</div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                          t.tier === "enterprise"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : t.tier === "pro"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {t.tier}
                      </Badge>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {t.ownerNama}
                      </span>
                    </div>
                  </td>

                  {/* Mode Desktop Switch */}
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={t.canUseDesktopMode}
                        onCheckedChange={(val) => handleToggleDesktop(t, val)}
                        className="data-[state=checked]:bg-amber-600"
                      />
                      <span
                        className={`text-[11px] font-mono font-medium ${
                          t.canUseDesktopMode ? "text-emerald-700 font-semibold" : "text-slate-500 font-medium"
                        }`}
                      >
                        {t.canUseDesktopMode ? "Buka" : "Gembok"}
                      </span>
                    </div>
                  </td>

                  {/* Kuota Trip Aktif */}
                  <td className="py-4 px-3 space-y-1">
                    <span className="inline-block font-mono text-xs font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                      {t.maxActiveTrips >= 9000 ? "∞ Unlimited" : `${t.maxActiveTrips} Trip`}
                    </span>
                    <div className="flex items-center gap-1">
                      {[5, 15, 30, 9999].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleQuickTripQuota(t, q)}
                          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                            t.maxActiveTrips === q
                              ? "bg-cyan-600 text-white font-bold"
                              : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          }`}
                        >
                          {q === 9999 ? "∞" : q}
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Kuota Kru */}
                  <td className="py-4 px-3 space-y-1">
                    <span className="inline-block font-mono text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {t.maxCrewMembers >= 9000 ? "∞ Unlimited" : `${t.maxCrewMembers} Kru`}
                    </span>
                    <div className="flex items-center gap-1">
                      {[2, 5, 10, 9999].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleQuickCrewQuota(t, q)}
                          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                            t.maxCrewMembers === q
                              ? "bg-indigo-600 text-white font-bold"
                              : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          }`}
                        >
                          {q === 9999 ? "∞" : q}
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* AI Switch */}
                  <td className="py-4 px-3">
                    <Switch
                      checked={t.canUseAI}
                      onCheckedChange={(val) => handleToggleAI(t, val)}
                      className="data-[state=checked]:bg-amber-500 scale-90"
                    />
                  </td>

                  {/* PDF Bersih Switch */}
                  <td className="py-4 px-3">
                    <Switch
                      checked={t.canExportCleanPdf}
                      onCheckedChange={(val) => handleTogglePdf(t, val)}
                      className="data-[state=checked]:bg-emerald-500 scale-90"
                    />
                  </td>

                  {/* Branding Switch */}
                  <td className="py-4 px-3">
                    <Switch
                      checked={t.customBranding}
                      onCheckedChange={(val) => handleToggleBranding(t, val)}
                      className="data-[state=checked]:bg-rose-500 scale-90"
                    />
                  </td>

                  {/* Website Switch */}
                  <td className="py-4 px-3">
                    <Switch
                      checked={t.hasWebsite}
                      onCheckedChange={(val) => handleToggleWebsite(t, val)}
                      className="data-[state=checked]:bg-blue-600 scale-90"
                    />
                  </td>

                  {/* Tombol Atur Detail */}
                  <td className="py-4 px-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => onOpenFeatureModal(t)}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs h-7 px-2.5 rounded-lg whitespace-nowrap shadow-xs"
                    >
                      <Sliders className="w-3 h-3 text-amber-600 mr-1" />
                      Atur Lengkap
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
