import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Building2,
  Sliders,
  FileText,
  Smartphone,
  CreditCard,
  Globe,
  Database,
  ShieldAlert,
  Crown,
  ArrowLeft,
  X,
  Megaphone,
  LifeBuoy,
  HardDrive,
  SlidersHorizontal,
} from "lucide-react";
import { SUPER_ADMIN_EMAIL } from "@/utils/licenseEntitlement";
import { getActiveUserSync } from "@/utils/authHelper";

export interface SuperAdminNavGroup {
  title: string;
  items: {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[];
}

interface SuperAdminSidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  tenantsCount: number;
  devicesCount: number;
  auditCount: number;
  broadcastsCount?: number;
  ticketsCount?: number;
  className?: string;
  onClose?: () => void;
}

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({
  currentView,
  onSelectView,
  tenantsCount,
  devicesCount,
  auditCount,
  broadcastsCount,
  ticketsCount,
  className = "",
  onClose,
}) => {
  const navGroups: SuperAdminNavGroup[] = [
    {
      title: "Pusat Kontrol",
      items: [
        {
          key: "overview",
          label: "Executive Dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Multi-Tenant Biro",
      items: [
        {
          key: "tenants",
          label: "Direktori Klien Biro",
          icon: Building2,
          badge: `${tenantsCount}`,
          badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
        },
        {
          key: "feature_gating",
          label: "Feature Gating A-Z",
          icon: Sliders,
          badge: "A-Z Kontrol",
          badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        },
      ],
    },
    {
      title: "Komunikasi & Layanan",
      items: [
        {
          key: "broadcasts",
          label: "Broadcast Global",
          icon: Megaphone,
          badge: broadcastsCount !== undefined && broadcastsCount > 0 ? `${broadcastsCount}` : undefined,
          badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        },
        {
          key: "tickets",
          label: "Pusat Tiket Bantuan",
          icon: LifeBuoy,
          badge: ticketsCount !== undefined && ticketsCount > 0 ? `${ticketsCount}` : undefined,
          badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
        },
      ],
    },
    {
      title: "Keamanan & Audit",
      items: [
        {
          key: "audit_logs",
          label: "Audit Logs & Aktivitas",
          icon: FileText,
          badge: `${auditCount}`,
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        },
        {
          key: "devices",
          label: "Perangkat & Sesi Login",
          icon: Smartphone,
          badge: "Sesi",
          badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        },
      ],
    },
    {
      title: "Monetisasi & Cloud",
      items: [
        {
          key: "billing",
          label: "Penagihan & Invoicing",
          icon: CreditCard,
          badge: "Finance",
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        },
        {
          key: "websites",
          label: "Web Promosi & VPS",
          icon: Globe,
          badge: "Rp 750k/thn",
          badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        },
      ],
    },
    {
      title: "Sistem & Konfigurasi",
      items: [
        {
          key: "backups",
          label: "Backup & Ekspor Global",
          icon: HardDrive,
          badge: "1-Klik",
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        },
        {
          key: "settings",
          label: "Konfigurasi Platform",
          icon: SlidersHorizontal,
        },
        {
          key: "database",
          label: "Database & SQL Manager",
          icon: Database,
          badge: "SQL Live",
          badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
        },
        {
          key: "sandbox",
          label: "Sandbox Persona Tester",
          icon: ShieldAlert,
          badge: "Simulator",
          badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
        },
      ],
    },
  ];

  return (
    <aside
      className={`w-64 bg-white border-r-2 border-slate-300 flex flex-col flex-shrink-0 min-h-screen text-slate-700 select-none ${className}`}
    >
      {/* Brand & Console Title (Clean Solid 2px Border) */}
      <div className="p-4 border-b-2 border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 flex-shrink-0">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">CATATBIRO</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1 rounded font-mono font-bold">
                  ROOT
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider truncate">
                FOUNDER CONSOLE v2.4
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0 text-slate-500 hover:text-slate-900 lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Master User Card (Clean Solid 2px Border) */}
        {(() => {
          const currentUser = getActiveUserSync();
          const displayEmail = currentUser?.email || SUPER_ADMIN_EMAIL;
          const displayInitials = (displayEmail.split("@")[0] || "SA").slice(0, 2).toUpperCase();
          const isFounder = displayEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

          return (
            <div className="mt-3 p-2 rounded-xl bg-white border-2 border-slate-200 shadow-xs flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
                {displayInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">{displayEmail}</div>
                <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {isFounder ? "Founder Whitelist" : "Session Super Admin"}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5 text-xs">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-800">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectView(item.key)}
                    className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20"
                        : "text-slate-700 font-semibold hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <IconComponent
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? "text-white" : "text-slate-600 group-hover:text-slate-900"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                          isActive
                            ? "bg-white/20 text-white border-white/30 font-bold"
                            : item.badgeColor || "bg-slate-100 text-slate-700 border-slate-200 font-medium"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Footer: Back to Client App */}
      <div className="p-3 border-t-2 border-slate-200 bg-slate-50 space-y-2">
        <Link
          to="/dashboard"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-2 border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          Ke Aplikasi Biro (Client App)
        </Link>
        <div className="text-[10px] text-center text-slate-500 font-mono">
          Cluster: ID-SGP-SaaS-01
        </div>
      </div>
    </aside>
  );
};
