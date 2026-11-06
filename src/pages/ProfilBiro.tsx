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
  FileCheck2,
  Landmark,
  ShieldAlert,
  Smartphone,
  BookOpen,
  User,
  Info,
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
  BiroCmsData,
  CmsKategoriItem,
  RekananBus,
  RekananResto,
} from "@/utils/biroCmsStore";
import {
  getCurrentEntitlements,
  EntitlementState,
  isSuperAdminUser,
} from "@/utils/licenseEntitlement";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthCache, getActiveUserSync } from "@/utils/authHelper";

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
  const activeUser = getActiveUserSync();

  // Modal-modal detail setting (seperti submenu di iOS / Instagram)
  const [activeModal, setActiveModal] = useState<
    "kop" | "identitas" | "bank" | "bus" | "resto" | "kategori" | "lisensi" | "ai" | "qr" | "ticket" | null
  >(null);

  // Loading States
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setEntitlements(getCurrentEntitlements());
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

  // Upload Logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Harap pilih berkas gambar (PNG, JPG, SVG)");
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
      toast.error("Gagal mengunggah logo: " + (err.message || "Gagal"));
    } finally {
      setUploadingLogo(false);
    }
  };

  // Simpan Profil
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      await saveBiroProfile(profile);
      saveBiroCmsData(cmsData);
      toast.success("Pengaturan profil berhasil disimpan!");
      setActiveModal(null);
    } catch (err: any) {
      toast.error("Gagal menyimpan profil: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Tambah Bus
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
    toast.success(`PO Bus "${item.namaPO}" berhasil disimpan!`);
  };

  // Tambah Resto
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
    toast.success(`Rumah makan "${item.namaResto}" berhasil disimpan!`);
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
    toast.success(`Kategori "${item.nama}" berhasil disimpan!`);
  };

  // Hapus Bus
  const handleDeleteBus = (id: string) => {
    const updated = { ...cmsData, rekananBus: cmsData.rekananBus.filter((b) => b.id !== id) };
    setCmsData(updated);
    saveBiroCmsData(updated);
    toast.success("PO Bus dihapus dari katalog");
  };

  // Hapus Resto
  const handleDeleteResto = (id: string) => {
    const updated = { ...cmsData, rekananResto: cmsData.rekananResto.filter((r) => r.id !== id) };
    setCmsData(updated);
    saveBiroCmsData(updated);
    toast.success("Rumah makan dihapus dari katalog");
  };

  // Simpan API Key AI
  const handleSaveApiKey = () => {
    setStoredApiKey(tempApiKey.trim());
    setApiKey(tempApiKey.trim());
    setIsEditingApiKey(false);
    toast.success("Kunci Gemini API berhasil diperbarui!");
  };

  // Logout
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
        {/* HEADER TOP BAR */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Pengaturan & Profil Biro
                </h1>
                <p className="text-[11px] text-slate-500 font-mono">
                  {profile.nama_biro}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal("qr")}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="QR Profil"
            >
              <QrCode className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* 1. KOTAK PROFIL UTAMA (Gaya Akun Apple ID / Instagram Header Card) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-amber-500 p-0.5 shadow-sm">
                  <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-900 p-1 flex items-center justify-center overflow-hidden">
                    {profile.logo_url ? (
                      <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-700"
                  title="Ganti Logo"
                >
                  {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {profile.nama_biro}
                  </h2>
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold">
                    ✓
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {profile.slogan || "Biro Perjalanan Wisata & Tour Organizer"}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 ${
                      entitlements.tier === "enterprise"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : entitlements.tier === "pro"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {entitlements.tier} Tier
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {activeUser?.email || profile.email}
                  </span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveModal("identitas")}
              className="text-xs h-8 px-3 rounded-xl border-slate-300 dark:border-slate-700 font-semibold flex-shrink-0"
            >
              Ubah
            </Button>
          </div>

          {/* 2. KOTAK META ACCOUNTS CENTER (Pusat Akun & Lisensi SaaS) */}
          <div
            onClick={() => setActiveModal("lisensi")}
            className="p-4 rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 text-white border border-indigo-800/40 shadow-sm cursor-pointer hover:border-indigo-700 transition-all flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    Pusat Akun & Lisensi
                  </span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 text-[9px] font-mono py-0">
                    SINKRON LIVE
                  </Badge>
                </div>
                <div className="text-xs text-slate-300 font-medium truncate mt-0.5">
                  Paket {entitlements.tier.toUpperCase()} • {entitlements.canUseDesktopMode ? "Desktop Mode Aktif" : "Mobile Only"} • {entitlements.maxActiveTrips >= 9000 ? "Trip Unlimited" : `${entitlements.maxActiveTrips} Kuota Trip`}
                </div>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
          </div>

          {/* 3. GROUP 1: IDENTITAS & DOKUMEN RESMI (Kotak Pengaturan Memanjang ke Bawah) */}
          <div className="space-y-2">
            <div className="px-3 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Identitas & Dokumen Resmi
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
              {/* Row Kop Surat */}
              <div
                onClick={() => setActiveModal("kop")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Kop Surat Resmi & Cetak PDF
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Pratinjau lembar A4, kop surat invoice, kwitansi & laporan
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                    A4 Preview
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Row Identitas & Kontak */}
              <div
                onClick={() => setActiveModal("identitas")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Profil & Kontak Kantor
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Alamat fisik, nomor WhatsApp CS, email & website
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Row Rekening Bank */}
              <div
                onClick={() => setActiveModal("bank")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Rekening Pembayaran Tamu
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {profile.nama_bank || "BCA / Mandiri"} • No. {profile.nomor_rekening || "Belum diatur"}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* 4. GROUP 2: REKANAN & KATALOG OPERASIONAL (Kotak Menu Kedua) */}
          <div className="space-y-2">
            <div className="px-3 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Katalog Rekanan & Keuangan
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
              {/* Row PO Bus */}
              <div
                onClick={() => setActiveModal("bus")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
                    <Bus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Katalog Rekanan PO Bus
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {cmsData.rekananBus.length} PO Bus Pariwisata terdaftar
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Row Resto */}
              <div
                onClick={() => setActiveModal("resto")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Katalog Rumah Makan & Resto
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {cmsData.rekananResto.length} Rumah Makan rute favorit
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Row Pos Kas Keuangan */}
              <div
                onClick={() => setActiveModal("kategori")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Kategori Kas Laba & Pengeluaran
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Pos anggaran solar, tol, makan, tiket, dan uang muka
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Row Manajemen Kru */}
              <div
                onClick={() => navigate("/manajemen-kru")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Manajemen Personel Kru & Sesi (RBAC)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Batasan akses kas untuk Tour Leader & driver
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200">
                    Hak Akses
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* 5. GROUP 3: KECERDASAN BUATAN & SISTEM */}
          <div className="space-y-2">
            <div className="px-3 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Kecerdasan Buatan & Bantuan
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
              {/* Row AI Gemini */}
              <div
                onClick={() => setActiveModal("ai")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Kunci Asisten Wisata AI (Google Gemini)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Konfigurasi API Key dengan konfirmasi ganda
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    Aktif
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Row Pusat SOP & Panduan */}
              <div
                onClick={() => navigate("/learn")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Pusat Panduan & SOP Biro Wisata
                    </div>
                    <div className="text-[11px] text-slate-500">
                      SOP Word parser, denah bus, kas saku, & domain
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Row Bantuan & Tiket */}
              <div
                onClick={() => setActiveModal("ticket")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <LifeBuoy className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Pusat Tiket Bantuan & Laporan Kendala
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Kirim pesan langsung ke Super Admin platform
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* 6. GROUP 4: AKSI AKUN & KELUAR */}
          <div className="space-y-2">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
              <div
                onClick={() => navigate("/boost")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Upgrade Lisensi & Cloud VPS
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Buka Mode Desktop, domain biro.com & VPS
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div
                onClick={handleLogout}
                className="p-4 flex items-center justify-between gap-3 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-rose-600">
                    Keluar dari Akun Biro
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-300" />
              </div>
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* MODAL 1: KOP SURAT RESMI & LIVE A4 PREVIEW                                */}
        {/* ========================================================================= */}
        <Dialog open={activeModal === "kop"} onOpenChange={(o) => !o && setActiveModal(null)}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Pengaturan Kop Surat & Dokumen Cetak
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Kop surat ini otomatis dicetak di lembar PDF kwitansi, invoice, dan laporan resmi biro Anda.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Pratinjau Dokumen A4 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-3 border-b-2 border-slate-900 dark:border-white pb-3">
                  <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 p-1 flex items-center justify-center flex-shrink-0">
                    {profile.logo_url ? (
                      <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 text-left space-y-0.5">
                    <div className="text-sm font-black uppercase text-slate-900 dark:text-white">
                      {profile.nama_biro}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                      {profile.slogan}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {profile.alamat} • Telp/WA: {profile.telepon}
                    </div>
                  </div>
                </div>
                <div className="pt-2 text-[10px] text-slate-400 text-right font-mono">
                  Rekening Resmi: {profile.nama_bank} No. {profile.nomor_rekening} a/n {profile.atas_nama_rekening}
                </div>
              </div>

              {/* Form Input Kop Surat */}
              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nama Resmi di Kop *</Label>
                    <Input
                      value={profile.nama_biro}
                      onChange={(e) => setProfile({ ...profile, nama_biro: e.target.value })}
                      className="text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Slogan / Keterangan Usaha</Label>
                    <Input
                      value={profile.slogan}
                      onChange={(e) => setProfile({ ...profile, slogan: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Alamat Kantor Lengkap</Label>
                  <Input
                    value={profile.alamat || ""}
                    onChange={(e) => setProfile({ ...profile, alamat: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nomor Telepon / WhatsApp</Label>
                    <Input
                      value={profile.telepon || ""}
                      onChange={(e) => setProfile({ ...profile, telepon: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email Kantor</Label>
                    <Input
                      value={profile.email || ""}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setActiveModal(null)} className="text-xs h-9">
                    Tutup
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-indigo-600 text-white text-xs h-9 px-4">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Simpan Kop Surat
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 2: IDENTITAS & KONTAK                                               */}
        {/* ========================================================================= */}
        <Dialog open={activeModal === "identitas"} onOpenChange={(o) => !o && setActiveModal(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Edit Profil & Kontak Biro</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveProfile} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Nama Biro Wisata</Label>
                <Input
                  value={profile.nama_biro}
                  onChange={(e) => setProfile({ ...profile, nama_biro: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Slogan / Tagline</Label>
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
                <Label className="text-xs">No. WhatsApp</Label>
                <Input
                  value={profile.telepon || ""}
                  onChange={(e) => setProfile({ ...profile, telepon: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Website Biro</Label>
                <Input
                  value={profile.website || ""}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setActiveModal(null)} className="text-xs h-9">
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="bg-indigo-600 text-white text-xs h-9">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 3: REKENING BANK                                                    */}
        {/* ========================================================================= */}
        <Dialog open={activeModal === "bank"} onOpenChange={(o) => !o && setActiveModal(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-600" />
                Rekening Pembayaran Tamu
              </DialogTitle>
              <DialogDescription className="text-xs">
                Nomor rekening ini otomatis dicantumkan di lembar kwitansi & invoice pembayaran tamu.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveProfile} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Nama Bank</Label>
                <Input
                  value={profile.nama_bank || ""}
                  onChange={(e) => setProfile({ ...profile, nama_bank: e.target.value })}
                  placeholder="Misal: Bank Mandiri / BCA / BNI"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Nomor Rekening</Label>
                <Input
                  value={profile.nomor_rekening || ""}
                  onChange={(e) => setProfile({ ...profile, nomor_rekening: e.target.value })}
                  placeholder="136-00-1234567-8"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Atas Nama Rekening</Label>
                <Input
                  value={profile.atas_nama_rekening || ""}
                  onChange={(e) => setProfile({ ...profile, atas_nama_rekening: e.target.value })}
                  placeholder="PT Catat Biro Wisata"
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setActiveModal(null)} className="text-xs h-9">
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="bg-emerald-600 text-white text-xs h-9">
                  Simpan Rekening
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 4: PO BUS                                                           */}
        {/* ========================================================================= */}
        <Dialog open={activeModal === "bus"} onOpenChange={(o) => !o && setActiveModal(null)}>
          <DialogContent className="max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Bus className="w-5 h-5 text-cyan-600" />
                Katalog Rekanan PO Bus
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Form Tambah PO */}
              <form onSubmit={handleAddBus} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-2 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-800 dark:text-slate-200">Tambah PO Bus Baru</div>
                <Input
                  required
                  placeholder="Nama PO Bus (Misal: PO Haryanto / Subur Jaya)"
                  value={newBus.namaPO}
                  onChange={(e) => setNewBus({ ...newBus, namaPO: e.target.value })}
                  className="text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Kontak Person (CP)"
                    value={newBus.kontakPerson}
                    onChange={(e) => setNewBus({ ...newBus, kontakPerson: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    placeholder="No. Telepon / WA"
                    value={newBus.telepon}
                    onChange={(e) => setNewBus({ ...newBus, telepon: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
                <Button type="submit" className="w-full bg-cyan-600 text-white text-xs h-8">
                  + Simpan ke Katalog PO Bus
                </Button>
              </form>

              {/* List PO */}
              <div className="space-y-2">
                {cmsData.rekananBus.map((bus) => (
                  <div key={bus.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{bus.namaPO}</div>
                      <div className="text-slate-500">{bus.kontakPerson} • {bus.telepon}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteBus(bus.id)} className="text-rose-600 h-7 w-7 p-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 5: RESTO                                                            */}
        {/* ========================================================================= */}
        <Dialog open={activeModal === "resto"} onOpenChange={(o) => !o && setActiveModal(null)}>
          <DialogContent className="max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-amber-600" />
                Katalog Rumah Makan / Resto
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <form onSubmit={handleAddResto} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-2 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-800 dark:text-slate-200">Tambah Resto Baru</div>
                <Input
                  required
                  placeholder="Nama Resto (Misal: RM Grafika Cikole)"
                  value={newResto.namaResto}
                  onChange={(e) => setNewResto({ ...newResto, namaResto: e.target.value })}
                  className="text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Lokasi / Rute Perjalanan"
                    value={newResto.lokasiRute}
                    onChange={(e) => setNewResto({ ...newResto, lokasiRute: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Harga Rata-Rata/Pax"
                    value={newResto.hargaPerPax}
                    onChange={(e) => setNewResto({ ...newResto, hargaPerPax: Number(e.target.value) })}
                    className="text-xs font-mono"
                  />
                </div>
                <Button type="submit" className="w-full bg-amber-600 text-white text-xs h-8">
                  + Simpan ke Katalog Resto
                </Button>
              </form>

              <div className="space-y-2">
                {cmsData.rekananResto.map((resto) => (
                  <div key={resto.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{resto.namaResto}</div>
                      <div className="text-slate-500">{resto.lokasiRute} • Rp {resto.hargaPerPax.toLocaleString("id-ID")}/pax</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteResto(resto.id)} className="text-rose-600 h-7 w-7 p-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 6: KATEGORI KAS                                                     */}
        {/* ========================================================================= */}
        <Dialog open={activeModal === "kategori"} onOpenChange={(o) => !o && setActiveModal(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                Pos Kategori Kas Keuangan
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <form onSubmit={handleAddKategori} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-2 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-800 dark:text-slate-200">Tambah Pos Baru</div>
                <Input
                  required
                  placeholder="Nama Pos (Misal: Kas Tol Cipali, Parkir Wisata)"
                  value={newKatNama}
                  onChange={(e) => setNewKatNama(e.target.value)}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <select
                    value={newKatJenis}
                    onChange={(e: any) => setNewKatJenis(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 text-xs"
                  >
                    <option value="pengeluaran">Pengeluaran Kas</option>
                    <option value="pemasukan">Pemasukan Kas</option>
                  </select>
                  <Button type="submit" className="bg-emerald-600 text-white text-xs h-8">
                    + Tambah
                  </Button>
                </div>
              </form>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {cmsData.kategoriKeuangan.map((k) => (
                  <div key={k.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{k.nama}</div>
                      <Badge className={`text-[9px] ${k.jenis === "pemasukan" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {k.jenis.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 7: LISENSI & MATRIKS HAK AKSES                                      */}
        {/* ========================================================================= */}
        <Dialog open={activeModal === "lisensi"} onOpenChange={(o) => !o && setActiveModal(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Pusat Lisensi & Hak Akses Biro
              </DialogTitle>
              <DialogDescription className="text-xs">
                Status paket dan sakelar fitur yang aktif di akun biro Anda.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Paket Lisensi:</span>
                <Badge className="font-mono uppercase bg-indigo-600 text-white">{entitlements.tier}</Badge>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Mode Desktop PC:</span>
                {entitlements.canUseDesktopMode ? (
                  <span className="text-emerald-600 font-bold">✓ Aktif (Buka)</span>
                ) : (
                  <span className="text-amber-600 font-bold">Terkunci (Mobile Only)</span>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Bebas Watermark PDF:</span>
                {entitlements.canExportCleanPdf ? (
                  <span className="text-emerald-600 font-bold">✓ Bersih (Kop Resmi)</span>
                ) : (
                  <span className="text-slate-500">Watermark CatatBiro</span>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Batas Kuota Trip:</span>
                <span className="font-mono font-bold text-cyan-600">
                  {entitlements.maxActiveTrips >= 9000 ? "∞ Unlimited" : `${entitlements.maxActiveTrips} Trip`}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Kapasitas Kru:</span>
                <span className="font-mono font-bold text-indigo-600">
                  {entitlements.maxCrewMembers >= 9000 ? "∞ Unlimited" : `${entitlements.maxCrewMembers} Kru`}
                </span>
              </div>
            </div>

            <Button
              onClick={() => {
                setActiveModal(null);
                navigate("/boost");
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-semibold text-xs h-9 rounded-xl"
            >
              Lihat Pilihan Upgrade Paket di /boost
            </Button>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 8: AI GEMINI API KEY                                                */}
        {/* ========================================================================= */}
        <Dialog open={activeModal === "ai"} onOpenChange={(o) => !o && setActiveModal(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Konfigurasi Kunci AI Gemini
              </DialogTitle>
              <DialogDescription className="text-xs">
                Asisten AI menggunakan API Key Google AI Studio. Dilindungi konfirmasi keamanan bertingkat.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {!isEditingApiKey ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Key Saat Ini:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTempApiKey(apiKey);
                        setShowApiKeyConfirmModal(true);
                      }}
                      className="text-xs h-7 px-2.5"
                    >
                      <Key className="w-3 h-3 mr-1 text-amber-500" /> Ganti Key
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      readOnly
                      value={apiKey ? "••••••••••••••••••••••••••••••••••••••••" : "Belum diatur"}
                      className="text-xs font-mono cursor-not-allowed bg-slate-50 dark:bg-slate-950"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="h-9 px-3"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">Masukkan Kunci API Gemini Baru</Label>
                  <Input
                    type="text"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="text-xs font-mono"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setIsEditingApiKey(false)} className="text-xs h-8">
                      Batal
                    </Button>
                    <Button size="sm" onClick={handleSaveApiKey} className="bg-indigo-600 text-white text-xs h-8">
                      Simpan Key Baru
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL KONFIRMASI GANTI KEY AI */}
        <Dialog open={showApiKeyConfirmModal} onOpenChange={setShowApiKeyConfirmModal}>
          <DialogContent className="max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ubah Kunci Gemini AI?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Pastikan Anda sudah memiliki API Key Google AI Studio aktif agar fitur konsultasi AI tidak berhenti berfungsi.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowApiKeyConfirmModal(false)} className="flex-1 text-xs h-9">
                Batal
              </Button>
              <Button
                onClick={() => {
                  setShowApiKeyConfirmModal(false);
                  setIsEditingApiKey(true);
                }}
                className="flex-1 bg-amber-600 text-white text-xs h-9"
              >
                Ya, Ubah
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL QR CODE */}
        <Dialog open={activeModal === "qr"} onOpenChange={(o) => !o && setActiveModal(null)}>
          <DialogContent className="max-w-xs text-center bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <QrCode className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{profile.nama_biro}</h3>
              <p className="text-[11px] text-slate-500">Scan QR Code untuk kontak WhatsApp & profil biro</p>
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

        {/* MODAL BUAT TIKET KENDALA KE SUPER ADMIN */}
        <CreateSupportTicketModal
          open={activeModal === "ticket"}
          onOpenChange={(o) => !o && setActiveModal(null)}
          profile={profile}
          onTicketCreated={() => {
            toast.success("Laporan Anda berhasil dikirim ke Super Admin!");
            setActiveModal(null);
          }}
        />

        {/* BOTTOM NAVIGATION PWA */}
        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default ProfilBiro;
