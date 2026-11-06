import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Monitor,
  Smartphone,
  Sparkles,
  Lock,
  ArrowRight,
  TrendingUp,
  FileText,
  Users,
  ShieldCheck,
  MessageCircle,
  Zap,
} from "lucide-react";
import { getCurrentEntitlements, SUPER_ADMIN_EMAIL } from "@/utils/licenseEntitlement";

export const DesktopModeLockOverlay: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [entitlements, setEntitlements] = useState(getCurrentEntitlements);
  const [isDesktopScreen, setIsDesktopScreen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsDesktopScreen(window.innerWidth >= 1024);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);

    const handleUpdate = () => {
      setEntitlements(getCurrentEntitlements());
    };
    window.addEventListener("catatbiro-entitlement-updated", handleUpdate);

    return () => {
      window.removeEventListener("resize", checkScreen);
      window.removeEventListener("catatbiro-entitlement-updated", handleUpdate);
    };
  }, []);

  // Jangan pernah blokir halaman Super Admin, Login, Landing Page, Upgrade Lisensi, atau Pusat Panduan
  if (
    location.pathname.startsWith("/super-admin") ||
    location.pathname === "/auth" ||
    location.pathname === "/" ||
    location.pathname === "/boost" ||
    location.pathname === "/learn"
  ) {
    return null;
  }

  // Jika di layar mobile (< 1024px) ATAU tenant memiliki izin desktop, jangan tampilkan overlay
  if (!isDesktopScreen || entitlements.canUseDesktopMode) {
    return null;
  }

  const handleContactFounder = () => {
    const message = `Halo Mas Anjar (Founder CatatBiro), saya ingin upgrade lisensi biro wisata saya ke Paket Pro agar bisa membuka Mode Desktop Eksekutif & Bento KPI di laptop. Mohon informasi aktivasi dan rekening pembayarannya. Terima kasih! 🙏`;
    const waUrl = `https://wa.me/6285747000888?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 lg:pl-64 animate-fade-in font-sans">
      <Card className="max-w-2xl w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700/80 shadow-2xl relative overflow-hidden">
        {/* Dekorasi Aksen Gradien */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="space-y-6 relative z-10">
          {/* Header Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Lisensi Starter (Mobile-Only)</span>
              </span>
              {entitlements.activePerspective === "starter" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Mode Simulasi Tester
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Gunakan HP untuk Akses Penuh</span>
            </div>
          </div>

          {/* Judul & Deskripsi Utama */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Mode Desktop Eksekutif Khusus Lisensi Pro</span>
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Akun biro wisata Anda saat ini terdaftar pada <strong>Paket Starter (Sekali Bayar Murah)</strong> yang didesain khusus untuk penggunaan praktis lewat aplikasi ponsel (PWA smartphone).
            </p>
          </div>

          {/* Grid Fitur Pro yang Terbuka Setelah Upgrade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Executive Command Center
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Bento grid statistik omset, laba rugi, dan kalender bus interaktif.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Cetak PDF Resmi Tanpa Watermark
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Invoice, kwitansi, dan lembar manifes penumpang ber-kop biro siap kirim.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Multi-Kru & Trip Tanpa Batas
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Hingga 15 kru bertugas, kuota trip leluasa, dan pantau sesi perangkat.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Layar Lebar & Multi-Jendela
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Buka rundown, manifes bus, dan pembukuan sekaligus di monitor laptop/PC.
                </p>
              </div>
            </div>
          </div>

          {/* Kotak Aksi & WhatsApp Founder */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="button"
              onClick={() => navigate("/boost")}
              className="w-full sm:flex-1 h-11 text-xs sm:text-sm font-black rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2 shadow-md transition-transform active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>Bandingkan Paket & Add-On (/boost)</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              onClick={handleContactFounder}
              variant="outline"
              className="w-full sm:w-auto h-11 text-xs sm:text-sm font-bold rounded-2xl border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Founder</span>
            </Button>
          </div>

          <p className="text-[11px] text-center text-muted-foreground">
            Ingin tetap memakai akun ini di laptop? Silakan kecilkan jendela browser ke ukuran ponsel (mobile view) atau buka aplikasi lewat browser di smartphone Anda.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default DesktopModeLockOverlay;
