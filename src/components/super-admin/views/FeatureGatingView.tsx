import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  TenantRecord,
  updateTenant,
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
  const [editingQuotaId, setEditingQuotaId] = useState<string | null>(null);

  const handleToggleDesktop = (tenant: TenantRecord, val: boolean) => {
    updateTenant(tenant.id, { canUseDesktopMode: val });
    toast.success(
      `Mode Desktop untuk ${tenant.namaBiro} diubah menjadi: ${val ? "AKTIF (Bypass Terbuka)" : "TERKUNCI"}`
    );
    onRefresh();
  };

  const handleToggleAI = (tenant: TenantRecord, val: boolean) => {
    updateTenant(tenant.id, { canUseAI: val });
    toast.success(`Akses Asisten AI untuk ${tenant.namaBiro} diubah menjadi: ${val ? "AKTIF" : "NONAKTIF"}`);
    onRefresh();
  };

  const handleTogglePdf = (tenant: TenantRecord, val: boolean) => {
    updateTenant(tenant.id, { canExportCleanPdf: val });
    toast.success(`Ekspor PDF Bersih untuk ${tenant.namaBiro} diubah menjadi: ${val ? "AKTIF" : "NONAKTIF"}`);
    onRefresh();
  };

  const handleToggleBranding = (tenant: TenantRecord, val: boolean) => {
    updateTenant(tenant.id, { customBranding: val });
    toast.success(`Custom Branding untuk ${tenant.namaBiro} diubah menjadi: ${val ? "AKTIF" : "NONAKTIF"}`);
    onRefresh();
  };

  const handleToggleWebsite = (tenant: TenantRecord, val: boolean) => {
    updateTenant(tenant.id, { hasWebsite: val });
    toast.success(`Paket Website untuk ${tenant.namaBiro} diubah menjadi: ${val ? "AKTIF" : "NONAKTIF"}`);
    onRefresh();
  };

  const handleQuickTripQuota = (tenant: TenantRecord, quota: number) => {
    updateTenant(tenant.id, { maxActiveTrips: quota });
    toast.success(`Kuota trip ${tenant.namaBiro} diperbarui ke ${quota >= 9000 ? "Unlimited" : quota}`);
    onRefresh();
  };

  const handleQuickCrewQuota = (tenant: TenantRecord, quota: number) => {
    updateTenant(tenant.id, { maxCrewMembers: quota });
    toast.success(`Kuota kru ${tenant.namaBiro} diperbarui ke ${quota >= 9000 ? "Unlimited" : quota}`);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Information Header */}
      <div className="p-6 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Matriks Feature Gating & Entitlements Biro (A-Z)
            </h2>
            <p className="text-xs text-slate-400">
              Sebagai Super Admin, Anda memiliki hak veto independen. Anda dapat mengaktifkan Mode Desktop di laptop bahkan untuk akun paket Sekali Bayar Starter, atau menetapkan kuota khusus sesuai kesepakatan bisnis.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Matrix Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Nama Biro & Tier</th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Monitor className="w-3.5 h-3.5" />
                    Mode Desktop PC
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Compass className="w-3.5 h-3.5" />
                    Kuota Trip Aktif
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <Users className="w-3.5 h-3.5" />
                    Kuota Kru
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Asisten
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    PDF Bersih
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <Palette className="w-3.5 h-3.5" />
                    Branding
                  </span>
                </th>
                <th className="py-3.5 px-3">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <Globe className="w-3.5 h-3.5" />
                    Web & VPS
                  </span>
                </th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Nama Biro & Tier */}
                  <td className="py-4 px-4 space-y-1">
                    <div className="font-bold text-white text-sm">{t.namaBiro}</div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                          t.tier === "enterprise"
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                            : t.tier === "pro"
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {t.tier}
                      </Badge>
                      <span className="text-[11px] text-slate-400 font-mono">
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
                        className="data-[state=checked]:bg-amber-500"
                      />
                      <span
                        className={`text-[11px] font-mono font-medium ${
                          t.canUseDesktopMode ? "text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        {t.canUseDesktopMode ? "Buka" : "Gembok"}
                      </span>
                    </div>
                  </td>

                  {/* Kuota Trip Aktif */}
                  <td className="py-4 px-3 space-y-1">
                    <span className="inline-block font-mono text-xs font-bold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
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
                              : "bg-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {q === 9999 ? "∞" : q}
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Kuota Kru */}
                  <td className="py-4 px-3 space-y-1">
                    <span className="inline-block font-mono text-xs font-bold text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/50">
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
                              : "bg-slate-800 text-slate-400 hover:text-slate-200"
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
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs h-7 px-2.5 rounded-lg whitespace-nowrap"
                    >
                      <Sliders className="w-3 h-3 text-amber-400 mr-1" />
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
