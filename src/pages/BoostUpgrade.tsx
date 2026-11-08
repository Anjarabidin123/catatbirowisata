import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Check,
  Crown,
  Sparkles,
  ShieldCheck,
  Server,
  Globe,
  Users,
  Monitor,
  Smartphone,
  FileText,
  Copy,
  ArrowLeft,
  ChevronRight,
  MessageCircle,
  CreditCard,
  Building2,
  HelpCircle,
  CheckCircle2,
  X,
  Lock,
  Layers,
  Award,
  PhoneCall,
  Laptop,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getLocalBiroProfile, BiroProfile } from "@/utils/biroProfile";
import { getCurrentEntitlements } from "@/utils/licenseEntitlement";

const FOUNDER_WHATSAPP = "6285747000888";
const REK_BCA = "0840539121";
const REK_ATAS_NAMA = "Nugroho Anjar Abidin";

type PlanTier = "starter" | "pro" | "enterprise";
type EnterpriseBilling = "bulanan" | "tahunan";

export const BoostUpgrade: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<BiroProfile>(getLocalBiroProfile());
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("pro");
  const [enterpriseCycle, setEnterpriseCycle] = useState<EnterpriseBilling>("tahunan");

  // Add-ons
  const [addonWebsite, setAddonWebsite] = useState<boolean>(false);
  const [addonExtraCrew, setAddonExtraCrew] = useState<boolean>(false);

  useEffect(() => {
    setProfile(getLocalBiroProfile());
  }, []);

  const entitlements = getCurrentEntitlements();

  // Price calculations
  const calculateTotal = () => {
    let base = 0;
    if (selectedPlan === "starter") {
      base = 750000;
    } else if (selectedPlan === "pro") {
      base = 1500000;
    } else if (selectedPlan === "enterprise") {
      base = enterpriseCycle === "tahunan" ? 3500000 : 350000;
    }

    let addonTotal = 0;
    if (addonWebsite) addonTotal += 750000;
    if (addonExtraCrew) addonTotal += 250000;

    return {
      basePrice: base,
      addonPrice: addonTotal,
      grandTotal: base + addonTotal,
    };
  };

  const { basePrice, addonPrice, grandTotal } = calculateTotal();

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleCopyRekening = () => {
    navigator.clipboard.writeText(REK_BCA);
    toast.success("Nomor Rekening BCA berhasil disalin: " + REK_BCA);
  };

  const handleOrderWhatsApp = () => {
    const biroName = profile.nama_biro || "Biro Wisata";
    const pimpinanName = profile.pimpinan || "Pemilik Biro";

    let planName = "";
    let priceNote = "";

    if (selectedPlan === "starter") {
      planName = "Paket STARTER (Lifetime)";
      priceNote = formatRupiah(750000);
    } else if (selectedPlan === "pro") {
      planName = "Paket PRO BISNIS (Lifetime) - Rekomendasi";
      priceNote = formatRupiah(1500000);
    } else {
      planName = `Paket ENTERPRISE CLOUD (${enterpriseCycle === "tahunan" ? "Tahunan" : "Bulanan"})`;
      priceNote = formatRupiah(enterpriseCycle === "tahunan" ? 3500000 : 350000);
    }

    const addons: string[] = [];
    if (addonWebsite) addons.push("Website Promosi + VPS Singapore (Rp 750.000/thn)");
    if (addonExtraCrew) addons.push("Tambah Slot Kru +5 Akun (Rp 250.000)");

    const addonText = addons.length > 0 ? addons.join("\n- ") : "Tidak Ada";

    const message = `Halo Mas Anjar (Founder CatatBiro), saya ${pimpinanName} dari ${biroName}.

Saya ingin memesan / upgrade lisensi CatatBiro:
📦 Paket Dipilih: ${planName} (${priceNote})
➕ Add-On Tambahan:
- ${addonText}
💰 Total Investasi: ${formatRupiah(grandTotal)}

Rekening Tujuan:
BCA 0840539121 a/n Nugroho Anjar Abidin

Mohon dibantu konfirmasi invoice & aktivasi lisensinya. Terima kasih!`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${FOUNDER_WHATSAPP}?text=${encoded}`, "_blank");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-16 safe-top lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                title="Kembali"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight truncate">
                    Upgrade Paket & Cloud VPS
                  </h1>
                  <Badge
                    variant="secondary"
                    className="hidden sm:inline-flex bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] font-black"
                  >
                    Lisensi Resmi
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Tingkatkan kuota trip, mode PC desktop bento, dan server VPS Singapore untuk biro Anda
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-500 hidden md:inline">
                Status Saat Ini:
              </span>
              <Badge className="bg-slate-900 text-white dark:bg-slate-800 text-xs font-black uppercase tracking-wider px-3 py-1">
                {entitlements.currentTier}
              </Badge>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 bg-gradient-to-r from-amber-600 via-orange-600 to-slate-950 p-6 sm:p-10 text-white shadow-2xl border border-amber-500/20">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black text-amber-100">
                <Crown className="w-4 h-4 text-amber-300" />
                <span>Investasi Resmi Operasional Biro Wisata</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Tingkatkan Skala Operasional Biro Tanpa Batas
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed max-w-xl">
                Buka akses penuh mode Bento Grid PC Desktop, cetak PDF resmi ber-kop surat dengan SK Kemenkumham & NIB OSS, import rundown Word otomatis, hingga custom domain namabiro.com dengan Cloud VPS Singapore super cepat.
              </p>
            </div>

            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-15 pointer-events-none hidden lg:block">
              <Zap className="w-96 h-96 text-white" />
            </div>
          </div>
        </div>

        {/* Pricing Cards Comparison */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Pilihan Paket Lisensi Resmi CatatBiro
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Biaya transparan sekali bayar selamanya (lifetime) tanpa potongan komisi tersembunyi.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* 1. Starter Tier */}
            <div
              onClick={() => setSelectedPlan("starter")}
              className={`rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border-2 transition-all flex flex-col justify-between cursor-pointer relative shadow-sm hover:shadow-xl ${
                selectedPlan === "starter"
                  ? "border-blue-600 ring-2 ring-blue-500/30"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-black border-slate-300 dark:border-slate-700">
                    Starter
                  </Badge>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    Starter Mobile
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Cocok untuk operator bus pariwisata pemula & TL independen.
                  </p>
                </div>

                <div className="pt-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    Rp 750.000
                  </span>
                  <span className="text-xs font-bold text-slate-500 block">
                    Sekali Bayar (Lifetime)
                  </span>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Maksimal 5 Trip Aktif
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>2 Akun Kru Lapangan (Tour Leader)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mode Layar HP & Tablet (Mobile Only)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>PWA Offline-First & Catatan HTM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Kas Saku Lapangan (Petty Cash)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <X className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    <span className="line-through">Mode Desktop PC Bento Grid</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  variant={selectedPlan === "starter" ? "default" : "outline"}
                  className="w-full rounded-xl text-xs font-black h-11"
                >
                  {selectedPlan === "starter" ? "✓ Dipilih" : "Pilih Starter Mobile"}
                </Button>
              </div>
            </div>

            {/* 2. Pro Tier (Best Value - Populer) */}
            <div
              onClick={() => setSelectedPlan("pro")}
              className={`rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border-2 transition-all flex flex-col justify-between cursor-pointer relative shadow-xl hover:shadow-2xl ${
                selectedPlan === "pro"
                  ? "border-amber-500 ring-4 ring-amber-500/20"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              {/* Popular Badge */}
              <div className="inline-flex items-center gap-1.5 self-start bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Paling Populer & Best Value</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-amber-500 text-slate-950 font-black text-xs">
                    Pro Bisnis
                  </Badge>
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Monitor className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    Pro Desktop PC
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Standar utama biro wisata berkembang dengan meja kantor operasional.
                  </p>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      Rp 1.500.000
                    </span>
                    <span className="text-xs text-slate-400 line-through">
                      Rp 2.500.000
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                    Sekali Bayar Selamanya (Lifetime)
                  </span>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-black text-slate-900 dark:text-white">
                      Maksimal 15 Trip Aktif
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">5 Akun Kru TL & Driver</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-black text-amber-600 dark:text-amber-400">
                      Buka Mode Layar PC Desktop Bento Grid
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">Cetak PDF Kop Surat AHU & NIB Resmi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">Arsip Riwayat Download PDF Terintegrasi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Import Rundown Word (.docx) Otomatis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Denah Kursi Bus Pariwisata Interaktif (50 Seat)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Buku Kas & Rekap Laba Bersih Owner</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  className={`w-full rounded-xl text-xs font-black h-11 ${
                    selectedPlan === "pro"
                      ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/30"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  {selectedPlan === "pro" ? "✓ Dipilih (Rekomendasi Utama)" : "Pilih Pro Bisnis"}
                </Button>
              </div>
            </div>

            {/* 3. Enterprise Tier */}
            <div
              onClick={() => setSelectedPlan("enterprise")}
              className={`rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border-2 transition-all flex flex-col justify-between cursor-pointer relative shadow-sm hover:shadow-xl ${
                selectedPlan === "enterprise"
                  ? "border-blue-600 ring-2 ring-blue-500/30"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-600 text-white font-bold text-xs">
                    Enterprise
                  </Badge>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Server className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    Enterprise Cloud VPS
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Untuk biro tour & travel skala besar dengan armada puluhan bus.
                  </p>
                </div>

                {/* Billing cycle toggle */}
                <div className="pt-2">
                  <div className="flex items-center gap-1.5 mb-2.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnterpriseCycle("tahunan");
                      }}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-black transition-all ${
                        enterpriseCycle === "tahunan"
                          ? "bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                      }`}
                    >
                      Tahunan (Hemat 2 Bln)
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnterpriseCycle("bulanan");
                      }}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-black transition-all ${
                        enterpriseCycle === "bulanan"
                          ? "bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                      }`}
                    >
                      Bulanan
                    </button>
                  </div>

                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {enterpriseCycle === "tahunan" ? "Rp 3.500.000" : "Rp 350.000"}
                  </span>
                  <span className="text-xs font-bold text-slate-500 block">
                    {enterpriseCycle === "tahunan" ? "Per Tahun (Hanya Rp 291rb/bln)" : "Per Bulan"}
                  </span>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-black text-blue-600 dark:text-blue-400">
                      Trip & Kru Tanpa Batas (Unlimited)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">Custom Domain Sendiri (namabiro.com)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">VPS Dedicated Singapore (Latensi &lt;20ms)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Backup Database Harian Otomatis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dedicated WhatsApp Priority Support 24/7</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  variant={selectedPlan === "enterprise" ? "default" : "outline"}
                  className="w-full rounded-xl text-xs font-black h-11"
                >
                  {selectedPlan === "enterprise" ? "✓ Dipilih" : "Pilih Enterprise Cloud"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Matriks Perbandingan Fitur Lengkap (Desktop View Bento) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>Matriks Perbandingan Fitur Lengkap</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Evaluasi detail kapabilitas setiap paket untuk disesuaikan dengan kebutuhan biro wisata Anda.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400">
                Transparan 100%
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4 font-black">Fitur Utama</th>
                    <th className="py-3 px-4 font-black text-center w-36">Starter Mobile</th>
                    <th className="py-3 px-4 font-black text-center w-40 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 rounded-t-xl">
                      Pro Bisnis ★
                    </th>
                    <th className="py-3 px-4 font-black text-center w-40">Enterprise Cloud</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                  {/* Operasional */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                    <td colSpan={4} className="py-2.5 px-4 font-black text-[11px] uppercase tracking-wider text-slate-500">
                      Operasional & Kapasitas
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Kuota Trip Aktif</td>
                    <td className="py-3 px-4 text-center">5 Trip</td>
                    <td className="py-3 px-4 text-center font-black text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20">
                      15 Trip
                    </td>
                    <td className="py-3 px-4 text-center font-black text-blue-600">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Akun Kru (Tour Leader & Driver)</td>
                    <td className="py-3 px-4 text-center">2 Akun</td>
                    <td className="py-3 px-4 text-center font-black bg-amber-50/60 dark:bg-amber-950/20">5 Akun</td>
                    <td className="py-3 px-4 text-center font-black text-blue-600">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Denah Kursi Bus Pariwisata 50-Seat</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Ada</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-600 bg-amber-50/60 dark:bg-amber-950/20">✓ Ada</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Ada</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Import Rundown Word (.docx) Otomatis</td>
                    <td className="py-3 px-4 text-center text-slate-400">-</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-600 bg-amber-50/60 dark:bg-amber-950/20">✓ Lengkap</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Lengkap</td>
                  </tr>

                  {/* Tampilan & Akses */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                    <td colSpan={4} className="py-2.5 px-4 font-black text-[11px] uppercase tracking-wider text-slate-500">
                      Tampilan Antarmuka & Perangkat
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Mode Smartphone & Tablet PWA Offline</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Aktif</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-600 bg-amber-50/60 dark:bg-amber-950/20">✓ Aktif</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Aktif</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Mode Layar Desktop PC Bento Grid</td>
                    <td className="py-3 px-4 text-center text-slate-400">Terkunci (HP Only)</td>
                    <td className="py-3 px-4 text-center font-black text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20">
                      ✓ Terbuka Penuh
                    </td>
                    <td className="py-3 px-4 text-center font-black text-blue-600">✓ Terbuka Penuh</td>
                  </tr>

                  {/* Dokumen & Legalitas */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                    <td colSpan={4} className="py-2.5 px-4 font-black text-[11px] uppercase tracking-wider text-slate-500">
                      Cetak Dokumen & Legalitas
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Cetak Kwitansi & Invoice Ber-Kop Surat</td>
                    <td className="py-3 px-4 text-center text-slate-500">Standar (Watermark)</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-600 bg-amber-50/60 dark:bg-amber-950/20">
                      ✓ Clean Resmi
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Clean Resmi</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Kop Surat SK Kemenkumham (AHU) & NIB OSS</td>
                    <td className="py-3 px-4 text-center text-slate-400">-</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-600 bg-amber-50/60 dark:bg-amber-950/20">✓ Lengkap</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Lengkap</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Riwayat & Arsip Dokumen PDF Terbit</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Ada</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-600 bg-amber-50/60 dark:bg-amber-950/20">✓ Ada</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Ada</td>
                  </tr>

                  {/* Infrastruktur */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                    <td colSpan={4} className="py-2.5 px-4 font-black text-[11px] uppercase tracking-wider text-slate-500">
                      Server & Domain Pribadi
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Domain Pribadi (namabiro.com)</td>
                    <td className="py-3 px-4 text-center text-slate-400">-</td>
                    <td className="py-3 px-4 text-center text-slate-500 bg-amber-50/60 dark:bg-amber-950/20">Opsional Add-on</td>
                    <td className="py-3 px-4 text-center font-black text-blue-600">✓ Termasuk Free</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Server Dedicated Cloud VPS Singapore</td>
                    <td className="py-3 px-4 text-center text-slate-500">Shared Cloud</td>
                    <td className="py-3 px-4 text-center text-slate-500 bg-amber-50/60 dark:bg-amber-950/20">Shared Cloud</td>
                    <td className="py-3 px-4 text-center font-black text-blue-600">✓ Dedicated VPS</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add-On Services Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Add-On Tambahan (Opsional)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tingkatkan kekuatan branding dan daya tampung kru biro Anda sesuai kebutuhan operasional.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Add-on 1: Website Promosi */}
              <label
                className={`p-4 sm:p-5 rounded-2xl border-2 flex items-start gap-3.5 cursor-pointer transition-all ${
                  addonWebsite
                    ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-600 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <Checkbox
                  checked={addonWebsite}
                  onCheckedChange={(c) => setAddonWebsite(!!c)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      Website Promosi + Cloud VPS Singapore
                    </span>
                    <Badge variant="secondary" className="text-[11px] font-black text-blue-700 bg-blue-100 dark:bg-blue-950 dark:text-blue-300">
                      Rp 750.000 / thn
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Website profil biro resmi (Landing Page, Galeri Bus, Form Reservasi WhatsApp) terpasang di VPS Singapore dengan nama domain namabiro.com.
                  </p>
                </div>
              </label>

              {/* Add-on 2: Extra Slot Kru */}
              <label
                className={`p-4 sm:p-5 rounded-2xl border-2 flex items-start gap-3.5 cursor-pointer transition-all ${
                  addonExtraCrew
                    ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-600 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <Checkbox
                  checked={addonExtraCrew}
                  onCheckedChange={(c) => setAddonExtraCrew(!!c)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      Tambah Slot Kru (+5 Akun Kru)
                    </span>
                    <Badge variant="secondary" className="text-[11px] font-black text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300">
                      Rp 250.000 Sekali Bayar
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Tambahan kuota 5 akun untuk Tour Leader, Driver, dan admin kantor dengan hak akses RBAC multi-device.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Investment Summary & Checkout Box */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Ringkasan Pemesanan Lisensi
                </span>
                <h3 className="text-xl sm:text-2xl font-black">
                  Biro: {profile.nama_biro}
                </h3>
                <p className="text-xs text-slate-400">
                  Pimpinan: {profile.pimpinan || "Owner Biro"} • WhatsApp: {profile.telepon || "-"}
                </p>
              </div>

              <div className="text-left md:text-right">
                <span className="text-xs text-slate-400 block">Total Nilai Investasi:</span>
                <span className="text-3xl sm:text-4xl font-black text-amber-400">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            {/* Bank Transfer Details & WhatsApp Action */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* Rekening Pembayaran */}
              <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <span className="text-xs font-bold text-slate-300">
                      Rekening Resmi Founder CatatBiro
                    </span>
                  </div>
                  <Badge className="bg-blue-600 text-white font-black text-[10px]">
                    BCA Official
                  </Badge>
                </div>

                <div className="flex items-center justify-between bg-slate-900/90 p-3.5 rounded-xl border border-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Bank Central Asia (BCA)
                    </span>
                    <span className="text-lg font-mono font-black text-white tracking-wider">
                      {REK_BCA}
                    </span>
                    <span className="text-xs text-slate-300 block font-semibold">
                      a/n {REK_ATAS_NAMA}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyRekening}
                    className="border-slate-600 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 text-xs font-black gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Salin
                  </Button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Setelah melakukan transfer, silakan kirim konfirmasi via WhatsApp. Lisensi dan akun langsung diaktifkan dalam hitungan menit.
                </p>
              </div>

              {/* Order via WhatsApp Button */}
              <div className="space-y-3">
                <Button
                  size="lg"
                  onClick={handleOrderWhatsApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base rounded-2xl h-14 shadow-lg shadow-emerald-600/30 gap-2.5"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span>Konfirmasi Pesanan via WhatsApp Founder</span>
                </Button>
                <div className="flex items-center justify-center gap-4 text-xs text-slate-400 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Aktivasi 5-15 Menit</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Garansi Pendampingan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Konsultasi Bebas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <span>Pertanyaan Umum Seputar Upgrade Lisensi</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <span className="font-black text-slate-900 dark:text-white">
                  Apakah data trip lama saya akan hilang saat upgrade?
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tidak sama sekali. Semua data jadwal trip, catatan keuangan kas, manifest denah bus, dan profil biro Anda 100% aman dan langsung terbuka dengan kuota baru.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <span className="font-black text-slate-900 dark:text-white">
                  Berapa lama proses aktivasi setelah transfer?
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Proses aktivasi berlangsung instan, antara 5 hingga 15 menit setelah bukti transfer Anda dikonfirmasi oleh Founder via WhatsApp.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <span className="font-black text-slate-900 dark:text-white">
                  Apakah paket Pro Bisnis benar-benar sekali bayar selamanya?
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Ya, betul. Paket Pro Bisnis adalah skema Lifetime (sekali bayar tanpa biaya langganan bulanan) untuk seluruh fitur desktop PC bento, cetak PDF resmi, dan denah kursi bus.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <span className="font-black text-slate-900 dark:text-white">
                  Bagaimana jika saya butuh bantuan setting domain namabiro.com?
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tim teknis Founder CatatBiro akan membantu setting DNS domain, sertifikat SSL HTTPS gratis, dan koneksi server Cloud VPS hingga siap digunakan oleh biro Anda.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default BoostUpgrade;
