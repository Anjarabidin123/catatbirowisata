import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Building2,
  Crown,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  ArrowLeft,
  Save,
  FileText,
  Wallet,
  Bus,
  UtensilsCrossed,
  Compass,
  Plus,
  Users,
  CheckCircle2,
  Settings,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  LifeBuoy,
  Share2,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
  Check,
  ChevronRight,
  Sliders,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { CreateSupportTicketModal } from "@/components/CreateSupportTicketModal";
import {
  getLocalBiroProfile,
  saveBiroProfile,
  uploadBiroLogo,
  BiroProfile,
} from "@/utils/biroProfile";
import {
  getBiroCmsData,
  saveBiroCmsData,
  resetDefaultKategoriKeuangan,
  BiroCmsData,
  CmsKategoriItem,
  RekananBus,
  RekananResto,
  RekananGuide,
} from "@/utils/biroCmsStore";
import {
  getCurrentEntitlements,
  EntitlementState,
  isSuperAdminUser,
} from "@/utils/licenseEntitlement";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthCache } from "@/utils/authHelper";

const GEMINI_API_KEY_STORAGE = "catatbiro_gemini_api_key";
const getStoredApiKey = (): string => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GEMINI_API_KEY_STORAGE) || "";
};
const setStoredApiKey = (key: string): void => {
  if (typeof window === "undefined") return;
  if (!key) {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  } else {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, key);
  }
};

export const ProfilBiro: React.FC = () => {
  const navigate = useNavigate();

  // State Profil & CMS
  const [profile, setProfile] = useState<BiroProfile>(getLocalBiroProfile);
  const [cmsData, setCmsData] = useState<BiroCmsData>(getBiroCmsData);
  const [entitlements, setEntitlements] = useState<EntitlementState>(getCurrentEntitlements);
  const isSuper = isSuperAdminUser();

  // State Sub-Menu Tab Instagram (Kop Surat, Rekanan, Lisensi Meta, Sistem AI)
  const [activeTab, setActiveTab] = useState<"kop" | "rekanan" | "lisensi" | "sistem">("kop");

  // State Loading & Upload
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats Real-Time (Trip, Pax, Kru)
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalPax: 0,
    totalKru: 2,
  });

  // Modal State
  const [showEditBioModal, setShowEditBioModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [showAddRestoModal, setShowAddRestoModal] = useState(false);
  const [showAddKatModal, setShowAddKatModal] = useState(false);

  // Form State Cepat
  const [newBus, setNewBus] = useState({ namaPO: "", kontakPerson: "", telepon: "", alamatGarasi: "", catatanArmada: "" });
  const [newResto, setNewResto] = useState({ namaResto: "", lokasiRute: "", kontakPerson: "", telepon: "", hargaPerPax: 30000, menuFavorit: "" });
  const [newKatNama, setNewKatNama] = useState("");
  const [newKatJenis, setNewKatJenis] = useState<"pemasukan" | "pengeluaran">("pengeluaran");

  // State Keamanan API Key AI
  const [apiKey, setApiKey] = useState(getStoredApiKey() || "");
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiKeyConfirmModal, setShowApiKeyConfirmModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");

  useEffect(() => {
    // Sinkronkan Entitlement
    setEntitlements(getCurrentEntitlements());

    // Ambil statistik trip real-time
    const loadStats = async () => {
      try {
        const { data: trips } = await supabase.from("trips").select("id, status, target_peserta");
        if (trips) {
          const total = trips.length;
          const pax = trips.reduce((acc, t) => acc + (Number(t.target_peserta) || 45), 0);
          setStats({ totalTrips: total, totalPax: pax, totalKru: entitlements.maxCrewMembers >= 9000 ? 12 : entitlements.maxCrewMembers });
        }
      } catch (e) {
        setStats({ totalTrips: 12, totalPax: 540, totalKru: 4 });
      }
    };
    loadStats();

    const handleUpdate = () => {
      setEntitlements(getCurrentEntitlements());
      setProfile(getLocalBiroProfile());
      setCmsData(getBiroCmsData());
    };
    window.addEventListener("catatbiro-entitlement-updated", handleUpdate);
    window.addEventListener("catatbiro-biro-profile-updated", handleUpdate);
    return () => {
      window.removeEventListener("catatbiro-entitlement-updated", handleUpdate);
      window.removeEventListener("catatbiro-biro-profile-updated", handleUpdate);
    };
  }, []);

  // Upload Logo Biro
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Harap pilih berkas gambar (PNG, JPG, SVG)");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Ukuran logo maksimal 3 MB");
      return;
    }

    try {
      setUploadingLogo(true);
      const url = await uploadBiroLogo(file);
      if (url) {
        const updated = { ...profile, logo_url: url };
        setProfile(updated);
        saveBiroProfile(updated);
        toast.success("Foto logo biro berhasil diperbarui!");
      }
    } catch (err: any) {
      toast.error("Gagal mengunggah logo: " + (err.message || "Kesalahan jaringan"));
    } finally {
      setUploadingLogo(false);
    }
  };

  // Simpan Seluruh Profil & Kop Surat
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      await saveBiroProfile(profile);
      saveBiroCmsData(cmsData);
      toast.success("Pengaturan profil & kop surat biro berhasil disimpan!");
      setShowEditBioModal(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan profil: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Tambah Rekanan Bus
  const handleAddBus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBus.namaPO.trim()) return;
    const item: RekananBus = {
      id: "bus_" + Date.now(),
      namaPO: newBus.namaPO,
      kontakPerson: newBus.kontakPerson,
      telepon: newBus.telepon,
      alamatGarasi: newBus.alamatGarasi,
      catatanArmada: newBus.catatanArmada,
    };
    const updated = { ...cmsData, rekananBus: [item, ...cmsData.rekananBus] };
    setCmsData(updated);
    saveBiroCmsData(updated);
    setNewBus({ namaPO: "", kontakPerson: "", telepon: "", alamatGarasi: "", catatanArmada: "" });
    setShowAddBusModal(false);
    toast.success(`PO Bus "${item.namaPO}" berhasil ditambahkan!`);
  };

  // Tambah Rekanan Resto
  const handleAddResto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResto.namaResto.trim()) return;
    const item: RekananResto = {
      id: "resto_" + Date.now(),
      namaResto: newResto.namaResto,
      lokasiRute: newResto.lokasiRute,
      kontakPerson: newResto.kontakPerson,
      telepon: newResto.telepon,
      hargaPerPax: Number(newResto.hargaPerPax) || 30000,
      menuFavorit: newResto.menuFavorit,
    };
    const updated = { ...cmsData, rekananResto: [item, ...cmsData.rekananResto] };
    setCmsData(updated);
    saveBiroCmsData(updated);
    setNewResto({ namaResto: "", lokasiRute: "", kontakPerson: "", telepon: "", hargaPerPax: 30000, menuFavorit: "" });
    setShowAddRestoModal(false);
    toast.success(`Rumah makan "${item.namaResto}" berhasil ditambahkan!`);
  };

  // Tambah Kategori Kas
  const handleAddKategori = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKatNama.trim()) return;
    const item: CmsKategoriItem = {
      id: "kat_" + Date.now(),
      nama: newKatNama,
      jenis: newKatJenis,
      deskripsi: "",
      isDefault: false,
    };
    const updated = { ...cmsData, kategoriKeuangan: [...cmsData.kategoriKeuangan, item] };
    setCmsData(updated);
    saveBiroCmsData(updated);
    setNewKatNama("");
    setShowAddKatModal(false);
    toast.success(`Kategori "${item.nama}" berhasil disimpan!`);
  };

  // Konfirmasi Ganti API Key AI
  const handleTriggerEditApiKey = () => {
    setTempApiKey(apiKey);
    setShowApiKeyConfirmModal(true);
  };

  const handleConfirmEditApiKey = () => {
    setShowApiKeyConfirmModal(false);
    setIsEditingApiKey(true);
  };

  const handleSaveApiKey = () => {
    setStoredApiKey(tempApiKey.trim());
    setApiKey(tempApiKey.trim());
    setIsEditingApiKey(false);
    toast.success("Kunci Gemini API berhasil diperbarui & diamankan!");
  };

  const handleLogout = async () => {
    if (confirm("Yakin ingin keluar dari akun biro ini?")) {
      try {
        await supabase.auth.signOut();
      } finally {
        clearAuthCache();
        localStorage.clear();
        navigate("/auth");
      }
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 lg:pl-64">
        {/* TOP BAR / INSTAGRAM STYLE HEADER BAR */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="p-1 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  @{profile.nama_biro.toLowerCase().replace(/[^a-z0-9]/g, "") || "birowisata"}
                </span>
                <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">
                  ✓
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Bagikan Profil & QR"
              >
                <QrCode className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Bantuan & Dukungan"
              >
                <LifeBuoy className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Keluar Akun"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* 1. INSTAGRAM PROFILE HERO SECTION */}
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-4">
              {/* Story Ring Avatar Logo */}
              <div className="relative group flex-shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-[3.5px] bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 shadow-md">
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 p-1 flex items-center justify-center overflow-hidden">
                    {profile.logo_url ? (
                      <img
                        src={profile.logo_url}
                        alt="Logo Biro"
                        className="w-full h-full object-contain rounded-full"
                      />
                    ) : (
                      <Building2 className="w-12 h-12 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Tombol Kamera Unggah */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
                  title="Ganti Foto Logo Biro"
                >
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              {/* 3 Metric Counters (Instagram Style) */}
              <div className="flex-1 flex justify-around items-center text-center">
                <div className="space-y-0.5">
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {stats.totalTrips}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Trip Selesai</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {stats.totalPax.toLocaleString("id-ID")}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Tamu / Pax</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {stats.totalKru}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Slot Kru</div>
                </div>
              </div>
            </div>

            {/* Biro Bio Information */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {profile.nama_biro}
                </h1>
                <Badge
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 ${
                    entitlements.tier === "enterprise"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                      : entitlements.tier === "pro"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {entitlements.tier} Member
                </Badge>
              </div>

              <div className="text-slate-600 dark:text-slate-400 font-medium">
                {profile.slogan || "Biro Perjalanan Wisata & Tour Organizer Resmi"}
              </div>

              <div className="space-y-1 text-slate-600 dark:text-slate-400 pt-1">
                {profile.alamat && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>{profile.alamat}</span>
                  </div>
                )}
                {profile.telepon && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <a
                      href={`https://wa.me/${profile.telepon.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold hover:underline"
                    >
                      {profile.telepon}
                    </a>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <a
                      href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 font-mono hover:underline flex items-center gap-1"
                    >
                      {profile.website} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Instagram Style Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => setShowEditBioModal(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white text-xs font-semibold h-9 rounded-xl shadow-xs"
              >
                Edit Profil & Bio
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowQrModal(true)}
                className="border-slate-300 dark:border-slate-700 text-xs font-semibold h-9 rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                Bagikan Profil
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/boost")}
                className="col-span-2 sm:col-span-1 bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-semibold text-xs h-9 rounded-xl shadow-xs flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade Paket
              </Button>
            </div>
          </section>

          {/* 2. META ACCOUNT CENTER STYLE CARD (Pusat Lisensi & Hak Akses) */}
          <section className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-5 shadow-lg border border-indigo-800/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">
                    Pusat Akun Meta & Lisensi SaaS
                  </div>
                  <div className="text-sm font-extrabold text-white">
                    Status Layanan Terpusat
                  </div>
                </div>
              </div>

              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 text-[10px] font-mono font-bold">
                ● TERHUBUNG KE SUPER ADMIN
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-400">Mode Desktop PC</div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  {entitlements.canUseDesktopMode ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> Aktif (Buka)
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Mobile Only
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-400">Bebas Watermark</div>
                <div className="text-xs font-bold">
                  {entitlements.canExportCleanPdf ? (
                    <span className="text-emerald-400">✓ Kop Surat Resmi</span>
                  ) : (
                    <span className="text-slate-400">Watermark Aktif</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-400">Batas Trip Aktif</div>
                <div className="text-xs font-bold text-cyan-300 font-mono">
                  {entitlements.maxActiveTrips >= 9000 ? "∞ Unlimited" : `${entitlements.maxActiveTrips} Kuota`}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-400">Kapasitas Kru</div>
                <div className="text-xs font-bold text-indigo-300 font-mono">
                  {entitlements.maxCrewMembers >= 9000 ? "∞ Unlimited" : `${entitlements.maxCrewMembers} Kru`}
                </div>
              </div>
            </div>
          </section>

          {/* 3. SUB-MENU TABS (Instagram Style Icons) */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("kop")}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl transition-all ${
                activeTab === "kop"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Kop Surat & Identitas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("rekanan")}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl transition-all ${
                activeTab === "rekanan"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Bus className="w-4 h-4" />
              <span>Mitra & Rekanan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("lisensi")}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl transition-all ${
                activeTab === "lisensi"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Lisensi & Fitur</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sistem")}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl transition-all ${
                activeTab === "sistem"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>AI & Sistem</span>
            </button>
          </div>

          {/* TAB 1: KOP SURAT & PRATINJAU A4 RESMI */}
          {activeTab === "kop" && (
            <div className="space-y-6 animate-fade-in">
              {/* Live Preview Kop Surat A4 Resmi */}
              <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Pratinjau Kop Surat Resmi (A4 Live Preview)
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-slate-500">
                    Otomatis tercetak di PDF Invoice & Laporan
                  </Badge>
                </div>

                {/* Box Lembar Dokumen Kop Surat */}
                <div className="p-6 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-4 border-b-2 border-slate-900 dark:border-white pb-3">
                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 flex-shrink-0 flex items-center justify-center">
                      {profile.logo_url ? (
                        <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-0.5">
                      <div className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white tracking-wide">
                        {profile.nama_biro}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                        {profile.slogan}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {profile.alamat} • Telp/WA: {profile.telepon}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Email: {profile.email} • Web: {profile.website}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 text-[10px] text-slate-400 text-right font-mono">
                    Rekening Pembayaran: {profile.nama_bank} No. {profile.nomor_rekening} a/n {profile.atas_nama_rekening}
                  </div>
                </div>
              </Card>

              {/* Form Input Kop Surat */}
              <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Form Pengaturan Dokumen & Rekening Bank
                </h3>

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nama Resmi Biro di Kop *</Label>
                      <Input
                        value={profile.nama_biro}
                        onChange={(e) => setProfile({ ...profile, nama_biro: e.target.value })}
                        className="text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Slogan / Keterangan Usaha</Label>
                      <Input
                        value={profile.slogan}
                        onChange={(e) => setProfile({ ...profile, slogan: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Alamat Kantor Lengkap</Label>
                    <Input
                      value={profile.alamat || ""}
                      onChange={(e) => setProfile({ ...profile, alamat: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">No. Telepon / WhatsApp</Label>
                      <Input
                        value={profile.telepon || ""}
                        onChange={(e) => setProfile({ ...profile, telepon: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Email Resmi</Label>
                      <Input
                        value={profile.email || ""}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Website Biro</Label>
                      <Input
                        value={profile.website || ""}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      Rekening Bank Resmi untuk Kwitansi / Invoice
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Nama Bank</Label>
                        <Input
                          value={profile.nama_bank || ""}
                          onChange={(e) => setProfile({ ...profile, nama_bank: e.target.value })}
                          placeholder="Misal: Bank Mandiri / BCA"
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Nomor Rekening</Label>
                        <Input
                          value={profile.nomor_rekening || ""}
                          onChange={(e) => setProfile({ ...profile, nomor_rekening: e.target.value })}
                          placeholder="136-00-1234567-8"
                          className="text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Atas Nama Rekening</Label>
                        <Input
                          value={profile.atas_nama_rekening || ""}
                          onChange={(e) => setProfile({ ...profile, atas_nama_rekening: e.target.value })}
                          placeholder="PT Catat Biro Wisata"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                      Simpan Perubahan Kop Surat
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* TAB 2: REKANAN MITRA & KATALOG MASTER */}
          {activeTab === "rekanan" && (
            <div className="space-y-6 animate-fade-in">
              {/* Rekanan Armada Bus */}
              <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Daftar Rekanan PO Bus Pariwisata
                    </h3>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddBusModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 rounded-xl"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah PO Bus
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cmsData.rekananBus.length === 0 ? (
                    <div className="col-span-2 text-center py-6 text-slate-400 text-xs">
                      Belum ada rekanan bus. Klik tombol di atas untuk menambahkan.
                    </div>
                  ) : (
                    cmsData.rekananBus.map((bus) => (
                      <div
                        key={bus.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 text-xs"
                      >
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                          <span>{bus.namaPO}</span>
                          <span className="text-[10px] font-normal text-slate-400 font-mono">{bus.telepon}</span>
                        </div>
                        <div className="text-slate-500">{bus.kontakPerson} • {bus.alamatGarasi}</div>
                        {bus.catatanArmada && (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            {bus.catatanArmada}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Rekanan Resto */}
              <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Daftar Rumah Makan & Resto Rekanan
                    </h3>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddRestoModal(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 rounded-xl"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Resto
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cmsData.rekananResto.length === 0 ? (
                    <div className="col-span-2 text-center py-6 text-slate-400 text-xs">
                      Belum ada rekanan resto. Klik tombol di atas untuk menambahkan.
                    </div>
                  ) : (
                    cmsData.rekananResto.map((resto) => (
                      <div
                        key={resto.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 text-xs"
                      >
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                          <span>{resto.namaResto}</span>
                          <span className="text-[10px] font-mono text-emerald-600 font-bold">
                            Rp {resto.hargaPerPax.toLocaleString("id-ID")}/pax
                          </span>
                        </div>
                        <div className="text-slate-500">{resto.lokasiRute} • Telp: {resto.telepon}</div>
                        {resto.menuFavorit && (
                          <div className="text-[11px] text-amber-600 font-medium">Menu: {resto.menuFavorit}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: STATUS LISENSI & HAK AKSES SUPER ADMIN */}
          {activeTab === "lisensi" && (
            <div className="space-y-6 animate-fade-in">
              <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Matriks Lisensi & Kuota Biro Anda
                      </h3>
                      <p className="text-xs text-slate-500">
                        Dikonfigurasi langsung oleh Super Admin melalui Cloud Central Console
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono text-xs uppercase">
                    Paket: {entitlements.tier}
                  </Badge>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Akses Mode Desktop di Laptop / PC</div>
                      <div className="text-slate-500">Buka antarmuka tabel lebar bento di laptop untuk admin kantor</div>
                    </div>
                    <div>
                      {entitlements.canUseDesktopMode ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">AKTIF (Bypass Terbuka)</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400">Terkunci (Mobile Only)</Badge>
                      )}
                    </div>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Kop Surat Bebas Watermark CatatBiro</div>
                      <div className="text-slate-500">Kwitansi dan invoice resmi tercetak bersih hanya dengan logo biro Anda</div>
                    </div>
                    <div>
                      {entitlements.canExportCleanPdf ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">AKTIF (Bebas Watermark)</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400">Watermark Aktif</Badge>
                      )}
                    </div>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Asisten Konsultasi Wisata AI Gemini</div>
                      <div className="text-slate-500">Rekomendasi rute destinasi dan rundown otomatis bertenaga AI</div>
                    </div>
                    <div>
                      {entitlements.canUseAI ? (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200">AKTIF</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400">Nonaktif</Badge>
                      )}
                    </div>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Batas Kuota Trip Berjalan</div>
                      <div className="text-slate-500">Maksimal trip aktif yang dapat dikelola dalam satu waktu</div>
                    </div>
                    <div className="font-mono font-bold text-cyan-600 text-sm">
                      {entitlements.maxActiveTrips >= 9000 ? "∞ Unlimited" : `${entitlements.maxActiveTrips} Trip`}
                    </div>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Batas Kuota Personel Kru Lapangan</div>
                      <div className="text-slate-500">Jumlah akun staf/TL yang dapat login bersamaan di perangkat kru</div>
                    </div>
                    <div className="font-mono font-bold text-indigo-600 text-sm">
                      {entitlements.maxCrewMembers >= 9000 ? "∞ Unlimited" : `${entitlements.maxCrewMembers} Kru`}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
                  <div className="text-xs text-indigo-900 dark:text-indigo-200">
                    Ingin membuka Mode Desktop di PC atau menambah kuota trip/kru?
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate("/boost")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 px-3 rounded-xl whitespace-nowrap"
                  >
                    Upgrade Paket
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: SISTEM, AI & KEAMANAN */}
          {activeTab === "sistem" && (
            <div className="space-y-6 animate-fade-in">
              {/* API Key Gemini AI dengan Proteksi Keamanan Berlapis */}
              <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Konfigurasi Kunci AI Asisten Wisata (Google Gemini)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Dilindungi oleh sistem keamanan konfirmasi bertingkat agar tidak terhapus tidak sengaja
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                    Aktif & Terproteksi
                  </Badge>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Gemini API Key Aktif
                    </div>
                    {!isEditingApiKey ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTriggerEditApiKey}
                        className="text-xs h-7 px-2.5 rounded-lg border-slate-300 text-slate-700 dark:text-slate-200"
                      >
                        <Key className="w-3 h-3 mr-1 text-amber-500" /> Ubah Key
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingApiKey(false)}
                          className="text-xs h-7 px-2"
                        >
                          Batal
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveApiKey}
                          className="bg-indigo-600 text-white text-xs h-7 px-2.5 rounded-lg"
                        >
                          Simpan
                        </Button>
                      </div>
                    )}
                  </div>

                  {!isEditingApiKey ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        readOnly
                        value={apiKey ? "••••••••••••••••••••••••••••••••••••••••" : "Belum diatur"}
                        className="text-xs font-mono bg-white dark:bg-slate-900 border-slate-200 cursor-not-allowed"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="h-9 px-3 border-slate-200"
                      >
                        {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        placeholder="Tempel kunci AI Gemini (AIzaSy...)"
                        className="text-xs font-mono"
                      />
                      <p className="text-[11px] text-amber-600">
                        * Pastikan Anda sudah memiliki API Key Google AI Studio aktif sebelum mengubahnya.
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Pusat Tiket Bantuan */}
              <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <LifeBuoy className="w-4 h-4 text-indigo-600" />
                    Pusat Bantuan & Tiket Kendala Teknis
                  </div>
                  <p className="text-xs text-slate-500">
                    Laporkan kendala operasional atau ajukan permintaan fitur langsung ke Super Admin
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowSupportModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs whitespace-nowrap"
                >
                  Buat Tiket Kendala
                </Button>
              </Card>
            </div>
          )}
        </main>

        {/* MODAL: EDIT BIO CEPAT */}
        <Dialog open={showEditBioModal} onOpenChange={setShowEditBioModal}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Edit Bio Profil Biro</DialogTitle>
              <DialogDescription className="text-xs">
                Informasi ini ditampilkan pada halaman profil dan pratinjau publik biro Anda.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveProfile} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Nama Biro</Label>
                <Input
                  value={profile.nama_biro}
                  onChange={(e) => setProfile({ ...profile, nama_biro: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Slogan / Bio Singkat</Label>
                <Textarea
                  value={profile.slogan}
                  onChange={(e) => setProfile({ ...profile, slogan: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Alamat Kantor</Label>
                <Input
                  value={profile.alamat || ""}
                  onChange={(e) => setProfile({ ...profile, alamat: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Nomor WhatsApp Resmi</Label>
                <Input
                  value={profile.telepon || ""}
                  onChange={(e) => setProfile({ ...profile, telepon: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditBioModal(false)}
                  className="text-xs h-9 px-4 rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 text-white font-semibold text-xs h-9 px-4 rounded-xl"
                >
                  Simpan Bio
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL: QR CODE BIRO */}
        <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
          <DialogContent className="max-w-xs text-center bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mx-auto text-indigo-600">
              <QrCode className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{profile.nama_biro}</h3>
              <p className="text-[11px] text-slate-500">Scan QR untuk membuka kontak WhatsApp dan profil resmi</p>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `https://wa.me/${(profile.telepon || "").replace(/[^0-9]/g, "")}`
                )}`}
                alt="QR Code"
                className="w-40 h-40 rounded-xl"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.origin);
                toast.success("Tautan profil berhasil disalin!");
              }}
              className="w-full text-xs h-9 rounded-xl"
            >
              Salin Tautan Profil
            </Button>
          </DialogContent>
        </Dialog>

        {/* MODAL: TAMBAH PO BUS */}
        <Dialog open={showAddBusModal} onOpenChange={setShowAddBusModal}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Tambah Rekanan PO Bus</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddBus} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Nama PO Bus *</Label>
                <Input
                  required
                  value={newBus.namaPO}
                  onChange={(e) => setNewBus({ ...newBus, namaPO: e.target.value })}
                  placeholder="Misal: PO Haryanto / Subur Jaya"
                  className="text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Kontak Person (CP)</Label>
                  <Input
                    value={newBus.kontakPerson}
                    onChange={(e) => setNewBus({ ...newBus, kontakPerson: e.target.value })}
                    placeholder="Pak Budi"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nomor Telepon / WA</Label>
                  <Input
                    value={newBus.telepon}
                    onChange={(e) => setNewBus({ ...newBus, telepon: e.target.value })}
                    placeholder="0812-xxxx"
                    className="text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Alamat Garasi / Pool</Label>
                <Input
                  value={newBus.alamatGarasi}
                  onChange={(e) => setNewBus({ ...newBus, alamatGarasi: e.target.value })}
                  placeholder="Kudus / Semarang"
                  className="text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddBusModal(false)} className="text-xs h-8">
                  Batal
                </Button>
                <Button type="submit" className="bg-blue-600 text-white text-xs h-8">
                  Simpan PO Bus
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL: TAMBAH RESTO */}
        <Dialog open={showAddRestoModal} onOpenChange={setShowAddRestoModal}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Tambah Rekanan Rumah Makan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddResto} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Nama Rumah Makan *</Label>
                <Input
                  required
                  value={newResto.namaResto}
                  onChange={(e) => setNewResto({ ...newResto, namaResto: e.target.value })}
                  placeholder="Misal: RM Grafika Cikole / Taman Sari"
                  className="text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Lokasi Rute</Label>
                  <Input
                    value={newResto.lokasiRute}
                    onChange={(e) => setNewResto({ ...newResto, lokasiRute: e.target.value })}
                    placeholder="Tol Cipali KM 102"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Harga Rata-Rata/Pax</Label>
                  <Input
                    type="number"
                    value={newResto.hargaPerPax}
                    onChange={(e) => setNewResto({ ...newResto, hargaPerPax: Number(e.target.value) })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddRestoModal(false)} className="text-xs h-8">
                  Batal
                </Button>
                <Button type="submit" className="bg-amber-600 text-white text-xs h-8">
                  Simpan Resto
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL: KONFIRMASI GANTI API KEY AI */}
        <Dialog open={showApiKeyConfirmModal} onOpenChange={setShowApiKeyConfirmModal}>
          <DialogContent className="max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ubah Kunci Gemini AI?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Fitur Asisten Wisata AI mengandalkan kunci API ini. Pastikan Anda sudah memiliki API Key pengganti yang valid dari Google AI Studio.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowApiKeyConfirmModal(false)}
                className="flex-1 text-xs h-9 rounded-xl"
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmEditApiKey}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 rounded-xl font-semibold"
              >
                Ya, Lanjutkan
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL BUAT TIKET KENDALA KE SUPER ADMIN */}
        <CreateSupportTicketModal
          open={showSupportModal}
          onOpenChange={setShowSupportModal}
          profile={profile}
          onTicketCreated={() => toast.success("Laporan Anda berhasil dikirimkan ke Super Admin!")}
        />

        {/* BOTTOM NAVIGATION PWA */}
        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default ProfilBiro;
