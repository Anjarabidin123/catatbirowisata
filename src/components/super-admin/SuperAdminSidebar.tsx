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
  Server,
  Zap,
  Activity,
  Layers,
} from "lucide-react";
import { SUPER_ADMIN_EMAIL } from "@/utils/licenseEntitlement";

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
}

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({
  currentView,
  onSelectView,
  tenantsCount,
  devicesCount,
  auditCount,
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
          badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        },
        {
          key: "feature_gating",
          label: "Feature Gating A-Z",
          icon: Sliders,
          badge: "/agy-customizations",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
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
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        },
        {
          key: "devices",
          label: "Perangkat & Sesi Login",
          icon: Smartphone,
          badge: "/teamwork-preview",
          badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
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
          badge: "/boost",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        },
        {
          key: "websites",
          label: "Web Promosi & VPS",
          icon: Globe,
          badge: "Rp 750k/thn",
          badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        },
      ],
    },
    {
      title: "Sistem & Pengujian",
      items: [
        {
          key: "database",
          label: "Database & SQL Manager",
          icon: Database,
          badge: "/learn",
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        },
        {
          key: "sandbox",
          label: "Sandbox Persona Tester",
          icon: ShieldAlert,
          badge: "Simulator",
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col flex-shrink-0 min-h-screen text-slate-300 select-none">
      {/* Brand & Console Title */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 flex-shrink-0">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-sm tracking-tight">CATATBIRO</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-mono font-bold">
                ROOT
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider truncate">
              FOUNDER CONSOLE v2.4
            </p>
          </div>
        </div>

        {/* Master User Card */}
        <div className="mt-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-xs font-bold text-indigo-300">
            NA
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">{SUPER_ADMIN_EMAIL}</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Unconditional Bypass
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5 text-xs">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-medium transition-all ${
                      isActive
                        ? "bg-indigo-600/20 text-white border border-indigo-500/40 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <IconComponent
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? "text-indigo-400" : "text-slate-500"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium border ${
                          item.badgeColor || "bg-slate-800 text-slate-300 border-slate-700"
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
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
        <Link
          to="/dashboard"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
          Ke Aplikasi Biro (Client App)
        </Link>
        <div className="text-[10px] text-center text-slate-500 font-mono">
          Cluster: ID-SGP-SaaS-01
        </div>
      </div>
    </aside>
  );
};
