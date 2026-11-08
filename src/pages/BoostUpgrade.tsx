import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Crown,
  Monitor,
  Smartphone,
  Server,
  Copy,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  CreditCard,
  Building2,
  HelpCircle,
  CheckCircle2,
  X,
  Layers,
  Globe,
  Users,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getLocalBiroProfile, BiroProfile } from "@/utils/biroProfile";
import { getCurrentEntitlements, EntitlementState } from "@/utils/licenseEntitlement";
import { getPlatformSettings, PlatformSettings } from "@/utils/superAdminSettings";

const FOUNDER_WHATSAPP = "6285747000888";
const REK_BCA = "0840539121";
const REK_ATAS_NAMA = "Nugroho Anjar Abidin";

type PlanTier = "starter" | "pro" | "enterprise";
type EnterpriseBilling = "bulanan" | "tahunan";

export const BoostUpgrade: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<BiroProfile>(getLocalBiroProfile);
  const [entitlements, setEntitlements] = useState<EntitlementState>(getCurrentEntitlements);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(getPlatformSettings);
  const [enterpriseCycle, setEnterpriseCycle] = useState<EnterpriseBilling>("tahunan");

  // Ambil data hak akses paket aktif saat ini
  const activeTier = entitlements.tier || "starter";
  const activeTierLabel =
    activeTier === "enterprise"
      ? "Enterprise Cloud"
      : activeTier === "pro"
      ? "Pro Bisnis PC"
      : "Starter Mobile";

  // Default pilihan upgrade: otomatis pilih paket setingkat di atasnya (atau tetap pro jika sudah enterprise)
  const defaultSelected: PlanTier =
    activeTier === "starter" ? "pro" : activeTier === "pro" ? "enterprise" : "enterprise";
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(defaultSelected);

  // Add-ons opsional
  const [addonWebsite, setAddonWebsite] = useState<boolean>(false);
  const [addonExtraCrew, setAddonExtraCrew] = useState<boolean>(false);

  // Toggle detail table
  const [showDetailTable, setShowDetailTable] = useState<boolean>(false);

  useEffect(() => {
    setProfile(getLocalBiroProfile());
    setEntitlements(getCurrentEntitlements());
    setPlatformSettings(getPlatformSettings());

    const handleUpdate = () => {
      setProfile(getLocalBiroProfile());
      setEntitlements(getCurrentEntitlements());
      setPlatformSettings(getPlatformSettings());
    };

    window.addEventListener("catatbiro-entitlement-updated", handleUpdate);
    window.addEventListener("catatbiro-platform-settings-updated", handleUpdate);
    window.addEventListener("catatbiro-tenants-updated", handleUpdate);
    window.addEventListener("biro-profile-updated", handleUpdate);

    return () => {
      window.removeEventListener("catatbiro-entitlement-updated", handleUpdate);
      window.removeEventListener("catatbiro-platform-settings-updated", handleUpdate);
      window.removeEventListener("catatbiro-tenants-updated", handleUpdate);
      window.removeEventListener("biro-profile-updated", handleUpdate);
    };
  }, []);

  // Kalkulasi harga total
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
    const biroName = profile.nama_biro || entitlements.activeTenantName || "Biro Wisata";
    const pimpinanName = profile.pimpinan || "Pemilik Biro";
    const targetWhatsapp = platformSettings.csWhatsappNumber || FOUNDER_WHATSAPP;

    let planName = "";
    let priceNote = "";

    if (selectedPlan === "starter") {
      planName = "Paket STARTER (Lifetime)";
      priceNote = formatRupiah(750000);
    } else if (selectedPlan === "pro") {
      planName = "Paket PRO BISNIS (Lifetime) - Rekomendasi Utama";
      priceNote = formatRupiah(1500000);
    } else {
      planName = `Paket ENTERPRISE CLOUD (${enterpriseCycle === "tahunan" ? "Tahunan" : "Bulanan"})`;
      priceNote = formatRupiah(enterpriseCycle === "tahunan" ? 3500000 : 350000);
    }

    const addons: string[] = [];
    if (addonWebsite) addons.push("Website Promosi + Domain Pribadi (Rp 750.000/thn)");
    if (addonExtraCrew) addons.push("Tambah Slot Kru +5 Akun (Rp 250.000 Sekali Bayar)");

    const addonText = addons.length > 0 ? addons.join("\n- ") : "Tidak Ada";

    const message = `Halo Mas Anjar (Founder CatatBiro), saya ${pimpinanName} dari ${biroName}.

Saya ingin memesan / upgrade lisensi CatatBiro:
📦 Paket Saat Ini: ${activeTierLabel}${entitlements.activeTenantName ? ` (${entitlements.activeTenantName})` : ""}
🚀 Paket Baru Dipilih: ${planName} (${priceNote})
➕ Add-On Tambahan:
- ${addonText}
💰 Total Investasi: ${formatRupiah(grandTotal)}

Rekening Tujuan:
BCA 0840539121 a/n Nugroho Anjar Abidin

Mohon dibantu konfirmasi invoice & aktivasi lisensinya. Terima kasih!`;

    const cleanNumber = targetWhatsapp.replace(/[^0-9]/g, "");
    const formattedPhone = cleanNumber.startsWith("0") ? "62" + cleanNumber.slice(1) : cleanNumber;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${formattedPhone}?text=${encoded}`, "_blank");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 safe-top lg:pl-64 font-sans text-slate-900 dark:text-slate-100">
        {/* Header Bersih & Kompak dengan Status Paket Saat Ini */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-8 w-8 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                title="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                    Paket Lisensi & Kapasitas Biro
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200">
                    Lisensi Resmi
                  </span>
                </div>
              </div>
            </div>

            {/* Status Paket Saat Ini di Pojok Kanan Atas */}
            <div className="flex items-center gap-2 shrink-0 text-xs bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 font-semibold text-[11px] hidden sm:inline">Paket Saat Ini:</span>
              <Badge className="font-extrabold text-xs uppercase px-2.5 py-0.5 bg-emerald-600 text-white shadow-2xs">
                {activeTierLabel}
              </Badge>
            </div>
          </div>
        </header>

        {/* Konten Utama: 2 Kolom di Desktop (Hemat Tempat, Tanpa Scroll Berlebihan) */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ============================================================== */}
            {/* KOLOM KIRI (7 Kolom): Pilihan Paket, Add-on & Tabel Fitur      */}
            {/* ============================================================== */}
            <div className="lg:col-span-7 space-y-4">
              {/* Banner Penanda Paket Aktif Biro Saat Ini */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/90 dark:border-emerald-900/50 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Paket Aktif Biro Anda Saat Ini: <strong className="text-emerald-600 dark:text-emerald-400">{activeTierLabel}</strong>
                        {entitlements.activeTenantName && (
                          <span className="text-slate-500 font-normal"> ({entitlements.activeTenantName})</span>
                        )}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                        Aktif
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      Kapasitas operasional: {entitlements.maxActiveTrips >= 9000 ? "Unlimited" : entitlements.maxActiveTrips} trip aktif, {entitlements.maxCrewMembers >= 9000 ? "Unlimited" : entitlements.maxCrewMembers} kru lapangan, {entitlements.canUseDesktopMode ? "Mode Desktop PC aktif" : "Akses Mobile HP"}, AI Asisten {entitlements.canUseAI ? "aktif" : "nonaktif"}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Judul & Keterangan Singkat */}
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Pilihan Peningkatan Lisensi Biro
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Investasi sekali bayar selamanya (lifetime). Bebas biaya komisi per trip dan tanpa potongan tersembunyi.
                </p>
              </div>

              {/* 3 Kartu Paket Berjejer Rapi & Padat */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Starter Mobile */}
                <div
                  onClick={() => setSelectedPlan("starter")}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedPlan === "starter"
                      ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Starter
                        </span>
                        {activeTier === "starter" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white uppercase">
                            Paket Saat Ini
                          </span>
                        )}
                      </div>
                      <Smartphone className="w-4 h-4 text-slate-400" />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Starter Mobile
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        Operator pemula & TL mandiri
                      </p>
                    </div>

                    <div>
                      <span className="text-lg font-black text-slate-900 dark:text-white block">
                        Rp 750.000
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Sekali Bayar (Lifetime)
                      </span>
                    </div>

                    <ul className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Maks <strong>5 Trip</strong> Aktif</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>2 Akun Kru</strong> Lapangan</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Layar HP & Tablet (Mobile)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Denah Kursi Bus & Absensi</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-400">
                        <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                        <span className="line-through">Mode Komputer Desktop</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTier === "starter"
                          ? "bg-emerald-600 text-white"
                          : selectedPlan === "starter"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {activeTier === "starter"
                        ? "✓ Paket Aktif Anda"
                        : selectedPlan === "starter"
                        ? "✓ Dipilih"
                        : "Pilih Starter"}
                    </button>
                  </div>
                </div>

                {/* 2. Pro Bisnis (Rekomendasi Utama) */}
                <div
                  onClick={() => setSelectedPlan("pro")}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                    selectedPlan === "pro"
                      ? "border-blue-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-blue-500/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white uppercase tracking-wider">
                          Paling Dipilih
                        </span>
                        {activeTier === "pro" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white uppercase">
                            Paket Saat Ini
                          </span>
                        )}
                      </div>
                      <Monitor className="w-4 h-4 text-blue-600" />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Pro Bisnis PC
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        Standar biro wisata kantor
                      </p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                          Rp 1.500.000
                        </span>
                        <span className="text-[10px] text-slate-400 line-through">
                          Rp 2.5jt
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        Sekali Bayar (Lifetime)
                      </span>
                    </div>

                    <ul className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Maks <strong>15 Trip</strong> Aktif</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>5 Akun Kru</strong> (TL & Driver)</span>
                      </li>
                      <li className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Buka Layar PC Meja Kantor</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Kop Surat SK Kemenkumham & NIB</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Import Rundown Word .docx</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Buku Kas Laba/Rugi & Arsip PDF</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTier === "pro"
                          ? "bg-emerald-600 text-white"
                          : selectedPlan === "pro"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {activeTier === "pro"
                        ? "✓ Paket Aktif Anda"
                        : selectedPlan === "pro"
                        ? "✓ Dipilih (Rekomendasi)"
                        : "Pilih Pro Bisnis"}
                    </button>
                  </div>
                </div>

                {/* 3. Enterprise Cloud */}
                <div
                  onClick={() => setSelectedPlan("enterprise")}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedPlan === "enterprise"
                      ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Enterprise
                        </span>
                        {activeTier === "enterprise" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white uppercase">
                            Paket Saat Ini
                          </span>
                        )}
                      </div>
                      <Server className="w-4 h-4 text-purple-600" />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Enterprise Cloud
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        Biro besar & armada banyak
                      </p>
                    </div>

                    {/* Cycle Switcher Mini */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnterpriseCycle("tahunan");
                        }}
                        className={`flex-1 py-0.5 rounded transition-all ${
                          enterpriseCycle === "tahunan"
                            ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                            : "text-slate-500"
                        }`}
                      >
                        Tahunan
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnterpriseCycle("bulanan");
                        }}
                        className={`flex-1 py-0.5 rounded transition-all ${
                          enterpriseCycle === "bulanan"
                            ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                            : "text-slate-500"
                        }`}
                      >
                        Bulanan
                      </button>
                    </div>

                    <div>
                      <span className="text-lg font-black text-slate-900 dark:text-white block">
                        {enterpriseCycle === "tahunan" ? "Rp 3.500.000" : "Rp 350.000"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {enterpriseCycle === "tahunan" ? "Per Tahun (Hemat 2 bln)" : "Per Bulan"}
                      </span>
                    </div>

                    <ul className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <li className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Trip & Kru <strong>Unlimited</strong></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Custom Domain (namabiro.com)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>VPS Dedicated Singapore</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Backup Database Harian</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Prioritas Layanan WA 24/7</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTier === "enterprise"
                          ? "bg-emerald-600 text-white"
                          : selectedPlan === "enterprise"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {activeTier === "enterprise"
                        ? "✓ Paket Aktif Anda"
                        : selectedPlan === "enterprise"
                        ? "✓ Dipilih"
                        : "Pilih Enterprise"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Add-On Opsional (Kompak & Elegan) */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span>Layanan Tambahan (Opsional)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Centang jika dibutuhkan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Addon 1 */}
                  <label
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      addonWebsite
                        ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-600"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <Checkbox
                      checked={addonWebsite}
                      onCheckedChange={(c) => setAddonWebsite(!!c)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          Website & Domain
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 shrink-0">
                          +750rb/thn
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                        Website profil resmi + VPS Singapore dengan domain namabiro.com
                      </p>
                    </div>
                  </label>

                  {/* Addon 2 */}
                  <label
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      addonExtraCrew
                        ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-600"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <Checkbox
                      checked={addonExtraCrew}
                      onCheckedChange={(c) => setAddonExtraCrew(!!c)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          Tambah 5 Slot Kru
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 shrink-0">
                          +250rb
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                        Tambahan 5 login kru untuk Tour Leader & Driver (Sekali bayar)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Toggle Detail Perbandingan Fitur */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowDetailTable(!showDetailTable)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Perbandingan Rinci Antar Paket (10 Fitur)</span>
                  </span>
                  {showDetailTable ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {/* Tabel Perbandingan Lengkap jika Dibuka */}
                {showDetailTable && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                          <th className="py-2 px-2.5">Fitur</th>
                          <th className="py-2 px-2.5 text-center">Starter</th>
                          <th className="py-2 px-2.5 text-center bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 font-extrabold">Pro Bisnis</th>
                          <th className="py-2 px-2.5 text-center">Enterprise</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                        <tr>
                          <td className="py-2 px-2.5 font-medium">Batas Trip Aktif</td>
                          <td className="py-2 px-2.5 text-center">5 Trip</td>
                          <td className="py-2 px-2.5 text-center font-bold bg-blue-50/50 dark:bg-blue-950/20 text-blue-700">15 Trip</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600">Unlimited</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2.5 font-medium">Akun Kru (TL & Driver)</td>
                          <td className="py-2 px-2.5 text-center">2 Akun</td>
                          <td className="py-2 px-2.5 text-center font-bold bg-blue-50/50 dark:bg-blue-950/20 text-blue-700">5 Akun</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600">Unlimited</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2.5 font-medium">Akses Layar PC Komputer</td>
                          <td className="py-2 px-2.5 text-center text-slate-400">HP Only</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600 bg-blue-50/50 dark:bg-blue-950/20">✓ Terbuka</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600">✓ Terbuka</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2.5 font-medium">Kop Surat AHU & NIB OSS</td>
                          <td className="py-2 px-2.5 text-center text-slate-400">-</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600 bg-blue-50/50 dark:bg-blue-950/20">✓ Lengkap</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600">✓ Lengkap</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2.5 font-medium">Import Rundown Word .docx</td>
                          <td className="py-2 px-2.5 text-center text-slate-400">-</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600 bg-blue-50/50 dark:bg-blue-950/20">✓ Ada</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600">✓ Ada</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2.5 font-medium">Denah Kursi Bus Pariwisata</td>
                          <td className="py-2 px-2.5 text-center text-emerald-600">✓ Ada</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600 bg-blue-50/50 dark:bg-blue-950/20">✓ Ada</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600">✓ Ada</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2.5 font-medium">Buku Kas & Laporan Laba</td>
                          <td className="py-2 px-2.5 text-center text-slate-400">Petty Cash</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600 bg-blue-50/50 dark:bg-blue-950/20">✓ Penuh</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600">✓ Penuh</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2.5 font-medium">Domain & VPS Dedicated</td>
                          <td className="py-2 px-2.5 text-center text-slate-400">-</td>
                          <td className="py-2 px-2.5 text-center text-slate-500 bg-blue-50/50 dark:bg-blue-950/20">Add-on</td>
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-600">✓ Termasuk</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* FAQ Ringkas (4 Item Penting) */}
              <div className="pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Apakah data lama akan hilang?
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Tidak sama sekali. Semua trip, keuangan, dan denah kursi langsung tersambung otomatis dengan kuota baru.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Berapa lama proses aktivasi?
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Instan 5-15 menit setelah bukti transfer dikonfirmasi oleh Founder via WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* KOLOM KANAN (5 Kolom): Ringkasan Checkout & Rekening BCA       */}
            {/* ============================================================== */}
            <div className="lg:col-span-5">
              <div className="sticky top-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
                {/* Header Ringkasan */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Ringkasan Pemesanan
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold border-slate-300">
                    Konfirmasi Cepat
                  </Badge>
                </div>

                {/* Status Paket Saat Ini di Kotak Ringkasan */}
                <div className="flex flex-col gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Paket Saat Ini:</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {activeTierLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Kapasitas:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {entitlements.maxActiveTrips >= 9000 ? "Unlimited" : `${entitlements.maxActiveTrips} Trip`} • {entitlements.maxCrewMembers >= 9000 ? "Unlimited" : `${entitlements.maxCrewMembers} Kru`}
                    </span>
                  </div>
                </div>

                {/* Info Biro */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Biro Pemesan
                  </span>
                  <p className="font-extrabold text-slate-900 dark:text-white truncate">
                    {profile.nama_biro || entitlements.activeTenantName || "Biro Wisata"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Pimpinan: {profile.pimpinan || "Owner Biro"}
                  </p>
                </div>

                {/* Rincian Biaya */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>
                      {selectedPlan === "starter"
                        ? "Paket Starter (Lifetime)"
                        : selectedPlan === "pro"
                        ? "Paket Pro Bisnis (Lifetime)"
                        : `Enterprise Cloud (${enterpriseCycle === "tahunan" ? "Tahunan" : "Bulanan"})`}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatRupiah(basePrice)}
                    </span>
                  </div>

                  {addonWebsite && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Website Promosi & Domain</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(750000)}
                      </span>
                    </div>
                  )}

                  {addonExtraCrew && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Slot Tambahan +5 Kru</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(250000)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        Total Investasi
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Tanpa biaya admin / komisi
                      </span>
                    </div>
                    <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                      {formatRupiah(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Box Rekening BCA Resmi */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      Transfer Bank Resmi
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      BCA
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="font-mono text-base font-black tracking-wider text-slate-900 dark:text-white block">
                        {REK_BCA}
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        a/n {REK_ATAS_NAMA}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyRekening}
                      className="h-7 text-xs font-bold gap-1 border-slate-300"
                    >
                      <Copy className="w-3 h-3" />
                      Salin
                    </Button>
                  </div>
                </div>

                {/* Tombol Aksi WhatsApp */}
                <div className="space-y-2">
                  <Button
                    type="button"
                    onClick={handleOrderWhatsApp}
                    className="w-full h-11 rounded-xl text-xs sm:text-sm font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Konfirmasi Pesanan via WhatsApp</span>
                  </Button>
                  <p className="text-[10px] text-center text-slate-400">
                    Aktivasi akun & lisensi diproses 5-15 menit setelah transfer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Navigasi Mobile */}
        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default BoostUpgrade;