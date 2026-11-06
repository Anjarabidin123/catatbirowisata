import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Crown,
  Smartphone,
  Monitor,
  Sparkles,
  Users,
  Settings,
  ChevronUp,
  ChevronDown,
  X,
  Building2,
  LogOut,
} from "lucide-react";
import {
  isSuperAdminUser,
  getActivePerspective,
  setActivePerspective,
  TesterPerspective,
  SUPER_ADMIN_EMAIL,
  getImpersonatedTenantId,
  getTenantById,
  stopImpersonation,
} from "@/utils/licenseEntitlement";
import { toast } from "sonner";

export const SuperAdminSimulatorBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSuper, setIsSuper] = useState(false);
  const [currentMode, setCurrentMode] = useState<TesterPerspective>("normal");
  const [collapsed, setCollapsed] = useState(true);
  const [impersonatedId, setImpersonatedId] = useState<string | null>(getImpersonatedTenantId);

  useEffect(() => {
    setIsSuper(isSuperAdminUser());
    setCurrentMode(getActivePerspective());

    const handleUpdate = () => {
      setIsSuper(isSuperAdminUser());
      setCurrentMode(getActivePerspective());
      setImpersonatedId(getImpersonatedTenantId());
    };

    window.addEventListener("catatbiro-entitlement-updated", handleUpdate);
    return () => {
      window.removeEventListener("catatbiro-entitlement-updated", handleUpdate);
    };
  }, []);

  // Jika bukan Super Admin atau sedang berada di konsol Super Admin sendiri, sembunyikan floating bar
  if (!isSuper || location.pathname.startsWith("/super-admin")) {
    return null;
  }


  const handleSwitchMode = (mode: TesterPerspective) => {
    setActivePerspective(mode);
    setCurrentMode(mode);
    const labels: Record<TesterPerspective, string> = {
      super_admin: "Mode Super Admin Master",
      starter: "Simulasi Klien: Tier Starter (Mobile-Only, Layar PC Terkunci)",
      pro: "Simulasi Klien: Tier Pro (Desktop Bento Terbuka, PDF Bersih)",
      enterprise: "Simulasi Klien: Tier Enterprise (Langganan & Full Website)",
      kru: "Simulasi Klien: Kru Lapangan",
      normal: "Mode Normal Akun Saat Ini",
    };
    toast.info(`Berpindah ke: ${labels[mode]}`);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-amber-700 border border-amber-300 shadow-xl text-[11px] font-bold hover:bg-amber-50 transition-all"
        title="Buka Sandbox Simulator Super Admin"
      >
        <Crown className="w-3.5 h-3.5 text-amber-600" />
        <span>Tester Switcher</span>
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 sm:right-6 z-50 animate-fade-in font-sans">
      <div className="p-2 sm:p-2.5 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl flex flex-col sm:flex-row items-center gap-2 max-w-xl">
        {/* Badge Identitas Founder */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-2 border-b sm:border-b-0 sm:border-r border-slate-200 pb-1.5 sm:pb-0 sm:pr-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Crown className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-amber-800 tracking-wider uppercase block">
                Founder Sandbox
              </span>
              <span className="text-[9px] text-slate-500 truncate max-w-[110px] block">
                {SUPER_ADMIN_EMAIL}
              </span>
            </div>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
            title="Sembunyikan toolbar"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Impersonated Tenant Pill */}
        {impersonatedId && (() => {
          const tenant = getTenantById(impersonatedId);
          if (!tenant) return null;
          return (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-amber-50 border border-amber-300 text-xs">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-bold text-amber-900">
                Impersonasi: {tenant.namaBiro} ({tenant.tier.toUpperCase()})
              </span>
              <button
                type="button"
                onClick={() => {
                  stopImpersonation();
                  toast.success("Sesi impersonasi dihentikan. Kembali ke Super Admin.");
                  navigate("/super-admin?view=tenants");
                }}
                className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-1.5 py-0.5 rounded font-bold transition-colors"
              >
                Keluar
              </button>
            </div>
          );
        })()}

        {/* Pilihan Mode Tester */}
        <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
          <Button
            type="button"
            size="sm"
            onClick={() => handleSwitchMode("super_admin")}
            className={`h-7 px-2 text-[10px] rounded-xl font-bold gap-1 transition-all ${
              currentMode === "super_admin"
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            <Crown className="w-3 h-3" />
            <span>Super Admin</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSwitchMode("starter")}
            className={`h-7 px-2 text-[10px] rounded-xl font-bold gap-1 transition-all ${
              currentMode === "starter"
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
            title="Simulasi Akun Murah: Mode Desktop PC Terkunci"
          >
            <Smartphone className="w-3 h-3" />
            <span>Simulasi Starter</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSwitchMode("pro")}
            className={`h-7 px-2 text-[10px] rounded-xl font-bold gap-1 transition-all ${
              currentMode === "pro"
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
            title="Simulasi Akun Pro: Desktop Bento Terbuka Penuh"
          >
            <Monitor className="w-3 h-3" />
            <span>Simulasi Pro</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSwitchMode("enterprise")}
            className={`h-7 px-2 text-[10px] rounded-xl font-bold gap-1 transition-all ${
              currentMode === "enterprise"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
            title="Simulasi Akun Enterprise: Langganan & Website"
          >
            <Sparkles className="w-3 h-3" />
            <span>Enterprise</span>
          </Button>

          <Link to="/super-admin">
            <Button
              type="button"
              size="sm"
              className="h-7 px-2.5 text-[10px] rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1 ml-1 shadow-xs transition-colors"
            >
              <Settings className="w-3 h-3" />
              <span>Portal Admin ↗</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
