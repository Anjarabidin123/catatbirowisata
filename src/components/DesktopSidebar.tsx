import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Bus,
  Wallet,
  FileText,
  StickyNote,
  Map,
  Settings,
  Calendar,
  LogOut,
  ShieldCheck,
  UserCheck,
  ArrowRightLeft,
  Users,
  Smartphone,
  Crown,
  Target,
  BookOpen,
  Zap,
} from "lucide-react";
import { isSuperAdminUser } from "@/utils/licenseEntitlement";
import { getLocalBiroProfile, fetchBiroProfile, BiroProfile, clearBiroProfileCache } from "@/utils/biroProfile";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser, clearAuthCache } from "@/utils/authHelper";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const DesktopSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    role,
    toggleRole,
    isPemilik,
    isKru,
    activeCrew,
    switchActiveCrew,
    crewList,
    currentDevice,
    hasPermission,
  } = useRole();
  const canSeeFinancials = hasPermission("rule_buku_kas_laba");
  const canManageKru = hasPermission("rule_manajemen_kru");
  const canEditBiro = hasPermission("rule_pengaturan_biro");
  const [profile, setProfile] = useState<BiroProfile>(getLocalBiroProfile());
  const [userEmail, setUserEmail] = useState<string>("");
  const [isSuper, setIsSuper] = useState<boolean>(isSuperAdminUser);

  useEffect(() => {
    fetchBiroProfile().then(setProfile);

    const handleProfileUpdate = (e: any) => {
      if (e.detail) setProfile(e.detail);
    };
    window.addEventListener("biro-profile-updated", handleProfileUpdate);

    getActiveUser().then((user) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || "");
    });

    const handleEntitlementUpdate = () => setIsSuper(isSuperAdminUser());
    window.addEventListener("catatbiro-entitlement-updated", handleEntitlementUpdate);

    return () => {
      window.removeEventListener("biro-profile-updated", handleProfileUpdate);
      window.removeEventListener("catatbiro-entitlement-updated", handleEntitlementUpdate);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
    } finally {
      clearAuthCache();
      clearBiroProfileCache();
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith("sb-") ||
              key.includes("supabase") ||
              key === "active_trip_id" ||
              key === "app_user_role")
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {}

      toast.success("Berhasil keluar dari sistem");
      navigate("/auth");
    }
  };

  // Menu Navigasi Terpisah Tegas Berdasarkan Role & Matriks Hak Akses (RBAC)
  const navItems = isPemilik
    ? [
        {
          label: "Beranda Eksekutif",
          path: "/dashboard",
          icon: Home,
          badge: "Owner",
        },
        {
          label: "Target Omset & KPI",
          path: "/goal",
          icon: Target,
          badge: "Goal",
        },
        {
          label: "Kalender & Jadwal Bus",
          path: "/trips",
          icon: Calendar,
        },
        {
          label: "Buku Kas & Laba",
          path: "/keuangan",
          icon: Wallet,
          badge: "Penuh",
        },
        {
          label: "Laporan & Invoice",
          path: "/laporan",
          icon: FileText,
          badge: "Resmi",
        },
        {
          label: "Catatan & Database HTM",
          path: "/notesnew",
          icon: StickyNote,
        },
        {
          label: "Rute & Destinasi",
          path: "/destinations",
          icon: Map,
        },
      ]
    : [
        {
          label: "Posko Lapangan TL",
          path: "/dashboard",
          icon: Home,
          badge: "Kru",
        },
        {
          label: "Jadwal Keberangkatan",
          path: "/trips",
          icon: Calendar,
          badge: "Tugas",
        },
        {
          label: canSeeFinancials ? "Buku Kas & Laba" : "Kas Saku Lapangan",
          path: "/keuangan",
          icon: Wallet,
          badge: canSeeFinancials ? "Penuh" : "Petty Cash",
        },
        ...(canSeeFinancials
          ? [
              {
                label: "Target Omset & KPI",
                path: "/goal",
                icon: Target,
                badge: "Goal",
              },
              {
                label: "Laporan & Invoice",
                path: "/laporan",
                icon: FileText,
                badge: "Resmi",
              },
            ]
          : []),
        {
          label: "Catatan & Info HTM",
          path: "/notesnew",
          icon: StickyNote,
        },
        {
          label: "Panduan Destinasi",
          path: "/destinations",
          icon: Map,
        },
      ];

  // Menu Pusat Kendali: Mengikuti Role & Matriks Hak Akses RBAC
  const controlItems = [
    ...(canManageKru
      ? [
          {
            label: "Monitor Kru & RBAC",
            path: "/manajemen-kru",
            icon: Users,
            iconColor: "text-amber-600 dark:text-amber-400",
            badge: "Kru & Device",
            badgeClass:
              "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
          },
        ]
      : []),
    {
      label: "Import Rundown Word",
      path: "/import-rundown",
      icon: FileText,
      iconColor: "text-blue-600 dark:text-blue-400",
      badge: "Word .docx",
      badgeClass:
        "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    },
    {
      label: "Pusat SOP & Panduan",
      path: "/learn",
      icon: BookOpen,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      badge: "SOP Biro",
      badgeClass:
        "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    },
    {
      label: "Upgrade Paket & VPS",
      path: "/boost",
      icon: Zap,
      iconColor: "text-amber-500",
      badge: "Cloud VPS",
      badgeClass:
        "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    },
    ...(canEditBiro
      ? [
          {
            label: "Pusat Kontrol CMS Biro",
            path: "/pengaturan-biro",
            icon: Settings,
            iconColor: "text-slate-600 dark:text-slate-300",
          },
        ]
      : []),
    ...(isSuper
      ? [
          {
            label: "Super Admin Panel",
            path: "/super-admin",
            icon: Crown,
            iconColor: "text-amber-500",
            badge: "Founder",
            badgeClass:
              "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
          },
        ]
      : []),
  ];

  // Jangan tampilkan di landing (/), login (/auth), atau seluruh rute Super Admin terpisah (/super-admin)
  if (
    location.pathname === "/" ||
    location.pathname === "/auth" ||
    location.pathname.startsWith("/super-admin")
  ) {
    return null;
  }

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-slate-100/75 dark:bg-slate-900/90 border-r border-slate-200/90 dark:border-slate-800 flex-col z-40 select-none shadow-[1px_0_12px_rgba(0,0,0,0.03)] backdrop-blur-md">
      {/* Brand Header */}
      <Link
        to={canEditBiro ? "/pengaturan-biro" : "/dashboard"}
        className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex items-center gap-3 hover:bg-white/90 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer"
        title={canEditBiro ? "Klik untuk kelola Profil & Rekening Biro" : "Posko Operasional Kru"}
      >
        <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-xs p-1 group-hover:scale-105 transition-transform">
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              alt={profile.nama_biro}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/pwa-icon.svg";
              }}
            />
          ) : (
            <Bus className="w-5 h-5 text-blue-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-slate-950 dark:text-white tracking-tight truncate group-hover:text-blue-600 transition-colors">
            {profile.nama_biro}
          </h2>
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
            {isPemilik ? "Panel Kontrol Pemilik Biro" : `Posko Kru: ${activeCrew.jabatan}`}
          </p>
        </div>
      </Link>

      {/* RBAC Role Card & Identity Switcher */}
      <div
        className={`p-3 mx-3 my-2.5 rounded-2xl border shadow-xs ${
          isPemilik
            ? "bg-amber-50/60 dark:bg-slate-800/90 border-amber-200/90 dark:border-amber-800/50"
            : "bg-emerald-50/70 dark:bg-slate-800/90 border-emerald-200/90 dark:border-emerald-800/50"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {isPemilik ? (
              <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
            ) : (
              <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span className="text-xs font-black text-slate-950 dark:text-white tracking-tight truncate">
              {isPemilik ? "Pemilik Biro (Owner)" : activeCrew.nama}
            </span>
          </div>
          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 h-4 font-black border uppercase tracking-wider flex-shrink-0 ${
              isPemilik
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : "bg-emerald-100 text-emerald-900 border-emerald-300"
            }`}
          >
            {role}
          </Badge>
        </div>

        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-snug mb-2">
          {isPemilik
            ? "Akses penuh: kas & laba, invoice, monitor kru & device login"
            : `${activeCrew.jabatan} • Fokus lapangan, kas saku TL & checklist`}
        </p>

        {/* Pemilih Identitas Kru saat Mode Kru aktif */}
        {isKru && crewList.length > 0 && (
          <div className="mb-2">
            <select
              value={activeCrew.crewId}
              onChange={(e) => switchActiveCrew(e.target.value)}
              aria-label="Pilih Personel Kru Aktif"
              className="w-full h-7 px-2 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
            >
              {crewList.map((c) => (
                <option key={c.id} value={c.id}>
                  👤 {c.nama} ({c.jabatan})
                </option>
              ))}
            </select>
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={toggleRole}
          className="w-full h-7 text-[11px] font-black bg-white/90 dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 gap-1.5 shadow-2xs"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
          <span>Ganti ke Mode {isPemilik ? "Kru Lapangan" : "Pemilik Biro"}</span>
        </Button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1.5">
        <p className="px-2 pt-1 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isPemilik ? "Menu Eksekutif & Operasional" : "Menu Operasional Lapangan"}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] tracking-tight transition-all group ${
                isActive
                  ? isPemilik
                    ? "bg-blue-600 text-white font-black shadow-md shadow-blue-600/30 ring-1 ring-blue-500 border border-blue-600"
                    : "bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/30 ring-1 ring-emerald-500 border border-emerald-600"
                  : "bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 hover:text-blue-600 text-slate-900 dark:text-slate-100 font-extrabold shadow-2xs"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-slate-700 dark:text-slate-200 group-hover:text-blue-600"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/90 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300/60"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-2.5">
          <p className="px-2 pt-1 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isPemilik ? "Pusat Kendali Pemilik (RBAC)" : "Alat Bantu Kru"}
          </p>

          <div className="space-y-1.5">
            {controlItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] tracking-tight transition-all group ${
                    isActive
                      ? "bg-blue-600 text-white font-black shadow-md shadow-blue-600/30 ring-1 ring-blue-500 border border-blue-600"
                      : "bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 hover:text-blue-600 text-slate-900 dark:text-slate-100 font-extrabold shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive
                          ? "text-white"
                          : item.iconColor || "text-slate-700 dark:text-slate-200 group-hover:text-blue-600"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-black border ${
                        isActive
                          ? "bg-white/20 text-white border-transparent"
                          : item.badgeClass || "bg-blue-100 text-blue-800 border-blue-200"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer User, Device Status & Logout */}
      <div className="p-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
          <Smartphone className="w-3 text-emerald-600 flex-shrink-0" />
          <span className="truncate">
            Device: {currentDevice.os} • {currentDevice.browser}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-950 dark:text-white truncate">
              {isPemilik ? profile.pimpinan || "Pemilik Biro" : activeCrew.nama}
            </p>
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 truncate">
              {isPemilik ? userEmail || "owner@birowisata.id" : `${activeCrew.jabatan} (${activeCrew.kodeKru})`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
            title="Keluar dari Akun"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
