import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertOctagon,
  X,
  Wrench,
  Megaphone,
} from "lucide-react";
import {
  SystemBroadcast,
  getActiveBroadcasts,
  isBroadcastDismissed,
  dismissBroadcast,
} from "@/utils/superAdminBroadcasts";
import { getPlatformSettings, PlatformSettings } from "@/utils/superAdminSettings";

export const SystemBroadcastBanner: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(getPlatformSettings);

  const reloadData = () => {
    const active = getActiveBroadcasts();
    const visible = active.filter((b) => !isBroadcastDismissed(b.id));
    setBroadcasts(visible);
    setPlatformSettings(getPlatformSettings());
  };

  useEffect(() => {
    reloadData();

    const handleBroadcastUpdate = () => reloadData();
    const handleSettingsUpdate = () => reloadData();
    const handleDismissUpdate = () => reloadData();

    window.addEventListener("catatbiro-broadcasts-updated", handleBroadcastUpdate);
    window.addEventListener("catatbiro-platform-settings-updated", handleSettingsUpdate);
    window.addEventListener("catatbiro-broadcast-dismissed", handleDismissUpdate);

    return () => {
      window.removeEventListener("catatbiro-broadcasts-updated", handleBroadcastUpdate);
      window.removeEventListener("catatbiro-platform-settings-updated", handleSettingsUpdate);
      window.removeEventListener("catatbiro-broadcast-dismissed", handleDismissUpdate);
    };
  }, []);

  const handleDismiss = (id: string) => {
    dismissBroadcast(id);
    reloadData();
  };

  const getStyleForType = (type: string) => {
    switch (type) {
      case "urgent":
        return {
          wrapper: "bg-rose-600 text-white border border-rose-700 shadow-md",
          icon: AlertOctagon,
          badge: "bg-white/20 text-white border-white/30",
          text: "text-white",
          closeBtn: "text-rose-100 hover:text-white hover:bg-rose-700",
        };
      case "warning":
        return {
          wrapper: "bg-amber-500 text-slate-950 border border-amber-600 shadow-md",
          icon: AlertTriangle,
          badge: "bg-black/10 text-slate-900 border-black/15",
          text: "text-slate-950",
          closeBtn: "text-slate-800 hover:text-slate-950 hover:bg-amber-600/30",
        };
      case "success":
        return {
          wrapper: "bg-emerald-600 text-white border border-emerald-700 shadow-md",
          icon: CheckCircle2,
          badge: "bg-white/20 text-white border-white/30",
          text: "text-white",
          closeBtn: "text-emerald-100 hover:text-white hover:bg-emerald-700",
        };
      case "info":
      default:
        return {
          wrapper: "bg-indigo-600 text-white border border-indigo-700 shadow-md",
          icon: Info,
          badge: "bg-white/20 text-white border-white/30",
          text: "text-white",
          closeBtn: "text-indigo-100 hover:text-white hover:bg-indigo-700",
        };
    }
  };

  const hasMaintenance = platformSettings.emergencyMaintenanceMode;
  const hasBroadcasts = broadcasts.length > 0;

  if (!hasMaintenance && !hasBroadcasts) {
    return null;
  }

  return (
    <div className="space-y-2 mb-3">
      {/* 1. Emergency Maintenance Banner (Unconditional, cannot be dismissed) */}
      {hasMaintenance && (
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 text-white px-4 py-3 rounded-2xl shadow-lg border-2 border-rose-400/60 flex items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-wider text-rose-100 flex items-center gap-1.5 flex-wrap">
                <span>Mode Pemeliharaan Sistem Aktif</span>
                <span className="text-[10px] bg-rose-900/60 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                  SaaS Maintenance
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/95 leading-snug break-words font-medium mt-0.5">
                {platformSettings.maintenanceMessage ||
                  "Sistem sedang dalam proses peningkatan infrastruktur. Data tersimpan aman."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Active System Broadcasts */}
      {broadcasts.map((bc) => {
        const style = getStyleForType(bc.type);
        const Icon = style.icon;
        return (
          <div
            key={bc.id}
            className={`${style.wrapper} px-4 py-3 rounded-2xl flex items-start sm:items-center justify-between gap-3 transition-all`}
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-black/10 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold">{bc.title}</span>
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold border ${style.badge}`}
                  >
                    {bc.type}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs opacity-95 leading-snug break-words mt-0.5">
                  {bc.message}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDismiss(bc.id)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${style.closeBtn}`}
              title="Tutup pengumuman"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
