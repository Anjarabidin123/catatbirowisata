import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TesterPerspective,
  getActivePerspective,
  setActivePerspective,
  getImpersonatedTenantId,
  stopImpersonation,
  TenantRecord,
} from "@/utils/licenseEntitlement";
import {
  ShieldAlert,
  Crown,
  Smartphone,
  Monitor,
  Sparkles,
  Users,
  Check,
  ArrowRight,
  LogOut,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SandboxTesterViewProps {
  tenants: TenantRecord[];
  onRefresh: () => void;
}

export const SandboxTesterView: React.FC<SandboxTesterViewProps> = ({ tenants, onRefresh }) => {
  const navigate = useNavigate();
  const [currentPerspective, setCurrentPerspective] = useState<TesterPerspective>(getActivePerspective());
  const impersonatedTenantId = getImpersonatedTenantId();
  const impersonatedTenant = tenants.find((t) => t.id === impersonatedTenantId);

  const handleSelectMode = (mode: TesterPerspective) => {
    setActivePerspective(mode);
    setCurrentPerspective(mode);
    toast.success(`Mode simulator diubah ke: ${mode.toUpperCase()}`);
    onRefresh();
  };

  const handleStopImpersonate = () => {
    stopImpersonation();
    toast.success("Sesi impersonasi dihentikan. Kembali ke mode Super Admin Master.");
    onRefresh();
  };

  const modes: {
    id: TesterPerspective;
    title: string;
    badge: string;
    badgeColor: string;
    icon: React.ReactNode;
    desc: string;
    features: string[];
  }[] = [
    {
      id: "super_admin",
      title: "Mode Root Super Admin (Master Founder)",
      badge: "ROOT BYPASS",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Crown className="w-6 h-6 text-amber-500" />,
      desc: "Hak akses absolut tanpa batas. Membuka seluruh fitur, bypassing overlay desktop, dan bebas mengelola seluruh biro.",
      features: [
        "Akses konsol /super-admin penuh",
        "Mode desktop laptop tidak terkunci",
        "Kuota trip & kru tanpa batas (9999)",
        "Akses AI Asisten & PDF tanpa watermark",
      ],
    },
    {
      id: "starter",
      title: "Simulasi Klien: Tier Starter (Paket Murah)",
      badge: "STARTER TIER",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
      icon: <Smartphone className="w-6 h-6 text-slate-600" />,
      desc: "Mensimulasikan pengalaman biro yang hanya membeli lisensi smartphone. Jika layar laptop >= 1024px, overlay gembok akan muncul.",
      features: [
        "Mode desktop laptop TERKUNCI overlay",
        "Hanya dapat digunakan lancar di smartphone",
        "Batas maksimal 5 trip aktif",
        "Batas maksimal 2 personel kru",
        "Laporan PDF berwatermark CatatBiro",
        "AI Asisten dinonaktifkan",
      ],
    },
    {
      id: "pro",
      title: "Simulasi Klien: Tier Pro (Paket Standar Sekali Bayar)",
      badge: "PRO TIER",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <Monitor className="w-6 h-6 text-blue-600" />,
      desc: "Mensimulasikan biro paket Pro. Mode desktop terbuka penuh dengan Bento KPI, laporan PDF bersih dengan kop surat sendiri.",
      features: [
        "Mode desktop laptop TERBUKA PENUH (Bento KPI)",
        "Batas maksimal 30 trip aktif",
        "Batas maksimal 10 personel kru",
        "Laporan PDF bersih (Kop Surat Resmi)",
        "Akses AI Asisten Wisata aktif",
      ],
    },
    {
      id: "enterprise",
      title: "Simulasi Klien: Tier Enterprise (Langganan SaaS)",
      badge: "ENTERPRISE TIER",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      icon: <Sparkles className="w-6 h-6 text-purple-600" />,
      desc: "Mensimulasikan biro skala besar dengan kuota tak terbatas, multi-cabang, dan domain promosi tersendiri.",
      features: [
        "Seluruh fitur operasional terbuka 100%",
        "Kuota trip aktif TANPA BATAS (∞)",
        "Kuota kru personel TANPA BATAS (∞)",
        "Termasuk paket website promosi biro",
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Sandbox Persona Tester & Simulator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Uji pengalaman pengguna secara langsung dari berbagai sudut pandang (Starter, Pro, Enterprise, atau Impersonate).
            </p>
          </div>
        </div>
      </div>

      {/* Impersonation Banner if Active */}
      {impersonatedTenant && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-amber-600" />
            <div>
              <div className="text-xs font-bold text-amber-900">
                SEDANG MENG-IMPERSONATE: {impersonatedTenant.namaBiro}
              </div>
              <p className="text-[11px] text-amber-800">
                Aplikasi saat ini menampilkan hak akses persis milik biro ini (Desktop: {impersonatedTenant.canUseDesktopMode ? "Buka" : "Kunci"}, Kuota: {impersonatedTenant.maxActiveTrips}).
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleStopImpersonate}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 whitespace-nowrap shadow-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            Hentikan Impersonasi
          </Button>
        </div>
      )}

      {/* Mode Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modes.map((m) => {
          const isSelected = currentPerspective === m.id && !impersonatedTenant;
          return (
            <Card
              key={m.id}
              className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? "bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                  : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
              }`}
              onClick={() => handleSelectMode(m.id)}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      {m.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{m.title}</h3>
                      <Badge className={`${m.badgeColor} text-[10px] font-mono mt-1`}>
                        {m.badge}
                      </Badge>
                    </div>
                  </div>

                  {isSelected && (
                    <Badge className="bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs">
                      <Check className="w-3.5 h-3.5" /> AKTIF
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {m.desc}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Ketentuan Fitur:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {m.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectMode(m.id);
                    }}
                    className={`text-xs h-8 px-3 rounded-xl font-medium ${
                      isSelected
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
                    }`}
                  >
                    {isSelected ? "Sedang Digunakan" : "Gunakan Mode Ini"}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="text-xs text-slate-600">
          Ingin melihat tampilan aplikasi biro setelah mengganti mode?
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 shadow-xs font-semibold"
        >
          Ke Aplikasi Biro <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
