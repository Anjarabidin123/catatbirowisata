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
      planName = "Paket PRO BISNIS (Lifetime)";
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-12 safe-top lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
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
                    className="hidden sm:inline-flex bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] font-bold"
                  >
                    Lisensi Resmi
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Tingkatkan kuota trip, mode PC desktop, dan server VPS Singapore untuk biro Anda
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                Status Saat Ini:
              </span>
              <Badge className="bg-slate-900 text-white dark:bg-slate-800 text-xs font-bold uppercase">
                {entitlements.currentTier}
              </Badge>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-amber-600 via-orange-600 to-slate-950 p-6 sm:p-10 text-white shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold">
                <Crown className="w-4 h-4 text-amber-200" />
                <span>Investasi Terbaik Operasional Biro Wisata</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Kembangkan Biro Wisata Anda Tanpa Batas
              </h2>
              <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
                Pilih paket lisensi resmi CatatBiro. Buka akses layar PC Desktop Bento, cetak PDF resmi ber-kop surat,
                hingga custom domain namabiro.com dengan Cloud VPS Singapore super cepat.
              </p>
            </div>

            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none hidden lg:block">
              <Zap className="w-96 h-96 text-white" />
            </div>
          </div>
        </div>

        {/* Pricing Cards Comparison */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Pilihan Paket Lisensi Resmi
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Biaya transparan tanpa biaya tersembunyi. Didukung langsung oleh tim founder & engineer.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* 1. Starter Tier */}
            <div
              onClick={() => setSelectedPlan("starter")}
              className={`rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border-2 transition-all flex flex-col justify-between cursor-pointer relative shadow-xs hover:shadow-lg ${
                selectedPlan === "starter"
                  ? "border-blue-600 ring-2 ring-blue-500/30"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-bold border-slate-300">
                    Starter
                  </Badge>
                  <Smartphone className="w-5 h-5 text-slate-400" />
                </div>

                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    Starter Mobile
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Cocok untuk biro wisata rintisan & operator bus pariwisata pemula.
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
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Maksimal 5 Trip Aktif
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>2 Akun Kru Lapangan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Mode Layar HP & Tablet (Mobile Only)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>PWA Offline-First & Catatan HTM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Kas Saku Lapangan (Petty Cash)</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  variant={selectedPlan === "starter" ? "default" : "outline"}
                  className="w-full rounded-xl text-xs font-bold h-10"
                >
                  {selectedPlan === "starter" ? "✓ Dipilih" : "Pilih Starter"}
                </Button>
              </div>
            </div>

            {/* 2. Pro Tier (Best Value) */}
            <div
              onClick={() => setSelectedPlan("pro")}
              className={`rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border-2 transition-all flex flex-col justify-between cursor-pointer relative shadow-xl hover:shadow-2xl ${
                selectedPlan === "pro"
                  ? "border-amber-500 ring-4 ring-amber-500/20"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              {/* Popular Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-linear-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                Paling Populer & Best Value
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-amber-500 text-slate-950 font-black text-xs">
                    Pro Bisnis
                  </Badge>
                  <Monitor className="w-5 h-5 text-amber-500" />
                </div>

                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    Pro Desktop PC
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Standar utama biro wisata berkembang dengan kantor administrasi.
                  </p>
                </div>

                <div className="pt-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    Rp 1.500.000
                  </span>
                  <span className="text-xs font-bold text-slate-500 block">
                    Sekali Bayar (Lifetime)
                  </span>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-black text-slate-900 dark:text-white">
                      Maksimal 15 Trip Aktif
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-bold">5 Akun Kru Operasional</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      Buka Desktop Mode Bento Grid (PC & Laptop)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Cetak PDF Resmi (Invoice, Kwitansi, Manifest)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Import Rundown Word (.docx) Otomatis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Buku Kas & Rekap Laba Bersih Owner</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  className={`w-full rounded-xl text-xs font-black h-10 ${
                    selectedPlan === "pro"
                      ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/30"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  {selectedPlan === "pro" ? "✓ Dipilih (Rekomendasi)" : "Pilih Pro Bisnis"}
                </Button>
              </div>
            </div>

            {/* 3. Enterprise Tier */}
            <div
              onClick={() => setSelectedPlan("enterprise")}
              className={`rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border-2 transition-all flex flex-col justify-between cursor-pointer relative shadow-xs hover:shadow-lg ${
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
                  <Server className="w-5 h-5 text-blue-600" />
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
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnterpriseCycle("tahunan");
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        enterpriseCycle === "tahunan"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600"
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
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        enterpriseCycle === "bulanan"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                      }`}
                    >
                      Bulanan
                    </button>
                  </div>

                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {enterpriseCycle === "tahunan" ? "Rp 3.500.000" : "Rp 350.000"}
                  </span>
                  <span className="text-xs font-bold text-slate-500 block">
                    {enterpriseCycle === "tahunan" ? "Per Tahun (Rp 291rb/bln)" : "Per Bulan"}
                  </span>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-black text-blue-600 dark:text-blue-400">
                      Trip & Kru Tanpa Batas (Unlimited)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-bold">Custom Domain Sendiri (namabiro.com)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-bold">VPS Dedicated Singapore (Latensi &lt;20ms)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Backup Database Harian Otomatis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Dedicated WhatsApp Support 24/7 Priority</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  variant={selectedPlan === "enterprise" ? "default" : "outline"}
                  className="w-full rounded-xl text-xs font-bold h-10"
                >
                  {selectedPlan === "enterprise" ? "✓ Dipilih" : "Pilih Enterprise"}
                </Button>
              </div>
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
                Tingkatkan kekuatan branding dan daya tampung kru biro Anda sesuai kebutuhan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Add-on 1: Website Promosi */}
              <label
                className={`p-4 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                  addonWebsite
                    ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-600"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <Checkbox
                  checked={addonWebsite}
                  onCheckedChange={(c) => setAddonWebsite(!!c)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      Website Promosi + Cloud VPS Singapore
                    </span>
                    <Badge variant="secondary" className="text-[11px] font-black text-blue-700 bg-blue-100">
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
                className={`p-4 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                  addonExtraCrew
                    ? "bg-amber-50/50 dark:bg-amber-950/30 border-amber-600"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <Checkbox
                  checked={addonExtraCrew}
                  onCheckedChange={(c) => setAddonExtraCrew(!!c)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      Tambah Slot Kru (+5 Akun Kru)
                    </span>
                    <Badge variant="secondary" className="text-[11px] font-black text-amber-700 bg-amber-100">
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
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Ringkasan Pemesanan Lisensi
                </span>
                <h3 className="text-xl sm:text-2xl font-black">
                  Biro: {profile.nama_biro}
                </h3>
                <p className="text-xs text-slate-400">
                  Pimpinan: {profile.pimpinan || "Owner Biro"} • WhatsApp: {profile.telepon || "-"}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Investasi:</span>
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
                  <Badge className="bg-blue-600 text-white font-bold text-[10px]">
                    BCA Official
                  </Badge>
                </div>

                <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-xl border border-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">
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
                    className="border-slate-600 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 text-xs font-bold"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Salin
                  </Button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Setelah melakukan transfer, silakan kirim bukti pembayaran via WhatsApp agar lisensi diaktifkan seketika.
                </p>
              </div>

              {/* Order via WhatsApp Button */}
              <div className="space-y-3">
                <Button
                  size="lg"
                  onClick={handleOrderWhatsApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base rounded-2xl h-14 shadow-lg shadow-emerald-600/30 gap-2"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span>Pesan via WhatsApp Founder</span>
                </Button>
                <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Aktivasi Cepat</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Garansi Pendampingan</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Bebas Konsultasi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <span>Pertanyaan Umum Seputar Upgrade Lisensi</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <span className="font-black text-slate-900 dark:text-white">
                  Apakah data trip lama saya akan hilang saat upgrade?
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tidak sama sekali. Semua data jadwal trip, catatan keuangan, rundown, dan profil biro Anda 100% aman dan langsung terbuka dengan kuota baru.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                <span className="font-black text-slate-900 dark:text-white">
                  Berapa lama proses aktivasi setelah transfer?
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Proses aktivasi berlangsung antara 5 hingga 15 menit setelah bukti transfer Anda dikonfirmasi oleh Founder via WhatsApp.
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
