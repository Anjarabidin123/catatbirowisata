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
  Trash2,
  MapPin,
  Phone,
  Mail,
  Globe,
  ArrowLeft,
  Save,
  FileText,
  Bus,
  UtensilsCrossed,
  Plus,
  Users,
  CheckCircle2,
  LifeBuoy,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
  ChevronRight,
  Key,
  Eye,
  EyeOff,
  LogOut,
  AlertTriangle,
  Landmark,
  BookOpen,
  User,
  Copy,
  ExternalLink,
  Loader2,
  ShieldAlert,
  ChevronLeft,
  Stamp,
  Palette,
  Check,
  RotateCw,
  RotateCcw,
  Wand2,
  Sliders,
} from "lucide-react";
import { processSignatureOrStampImage } from "@/utils/imageTransparencyHelper";
import { CreateSupportTicketModal } from "@/components/CreateSupportTicketModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { KopSuratBiro } from "@/components/KopSuratBiro";
import {
  getLocalBiroProfile,
  saveBiroProfile,
  uploadBiroLogo,
  uploadBiroStempel,
  uploadBiroTtd,
  BiroProfile,
} from "@/utils/biroProfile";
import {
  getBiroCmsData,
  saveBiroCmsData,
  BiroCmsData,
  RekananBus,
  RekananResto,
} from "@/utils/biroCmsStore";
import {
  getCurrentEntitlements,
  EntitlementState,
  isSuperAdminUser,
} from "@/utils/licenseEntitlement";
import { getStoredApiKey, setStoredApiKey } from "@/utils/asistenWisataAI";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthCache, getActiveUserSync, safeLogout } from "@/utils/authHelper";

type SettingsSection =
  | "kop"
  | "stempel"
  | "identitas"
  | "bank"
  | "bus"
  | "resto"
  | "lisensi"
  | "ai"
  | "bantuan";

export const STEMPEL_COLOR_PRESETS = [
  { name: "Biru Dokumen Resmi", hex: "#2563eb", bg: "bg-blue-600" },
  { name: "Ungu Kantor & Pos", hex: "#7c3aed", bg: "bg-purple-600" },
  { name: "Merah Pelunasan Kas", hex: "#dc2626", bg: "bg-red-600" },
  { name: "Hijau Verifikasi Sah", hex: "#059669", bg: "bg-emerald-600" },
  { name: "Biru Dongker Navy", hex: "#1e3a8a", bg: "bg-slate-900" },
];

interface DigitalStampPreviewProps {
  profile: BiroProfile;
  size?: number;
  className?: string;
  statusOverride?: string;
}

export const DigitalStampPreview: React.FC<DigitalStampPreviewProps> = ({
  profile,
  size = 130,
  className = "",
  statusOverride,
}) => {
  const isCustom = profile.stempel_mode === "custom" && profile.stempel_custom_image_url;
  const color = profile.stempel_warna || "#2563eb";
  const teksAtas = (profile.stempel_teks_atas || profile.nama_biro || "BIRO WISATA").substring(0, 22).toUpperCase();
  const teksTengah = (statusOverride || profile.stempel_teks_tengah || "LUNAS").toUpperCase();
  const teksBawah = (profile.stempel_teks_bawah || "OFFICIAL VERIFIED").substring(0, 24).toUpperCase();

  if (isCustom) {
    return (
      <div
        className={`relative inline-flex items-center justify-center select-none ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={profile.stempel_custom_image_url!}
          alt="Stempel Basah Biro"
          className="w-full h-full object-contain drop-shadow-xs"
        />
      </div>
    );
  }

  const uid = React.useId().replace(/:/g, "");
  const topPathId = `stampTop_${uid}`;
  const bottomPathId = `stampBottom_${uid}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none drop-shadow-xs ${className}`}
      style={{ width: size, height: size, color }}
    >
      <svg
        viewBox="0 0 160 160"
        className="w-full h-full"
        style={{ overflow: "visible" }}
      >
        <defs>
          <path id={topPathId} d="M 22,80 A 58,58 0 0,1 138,80" fill="none" />
          <path id={bottomPathId} d="M 24,80 A 56,56 0 0,0 136,80" fill="none" />
        </defs>
        {/* Lingkaran Luar */}
        <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.92" />
        {/* Lingkaran Dalam */}
        <circle cx="80" cy="80" r="66" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.92" />
        {/* Teks Atas */}
        <text fill="currentColor" fontSize="10" fontWeight="bold" letterSpacing="0.8">
          <textPath href={`#${topPathId}`} startOffset="50%" textAnchor="middle">
            {teksAtas}
          </textPath>
        </text>
        {/* Bintang Dekorasi Kiri & Kanan */}
        <text x="21" y="83" fill="currentColor" fontSize="8" textAnchor="middle">★</text>
        <text x="139" y="83" fill="currentColor" fontSize="8" textAnchor="middle">★</text>
        {/* Banner Status Tengah */}
        <rect x="14" y="66" width="132" height="28" rx="4" fill="currentColor" />
        <text
          x="80"
          y="85"
          fill="#ffffff"
          fontSize="12"
          fontWeight="900"
          letterSpacing="1.5"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {teksTengah}
        </text>
        {/* Teks Bawah */}
        <text fill="currentColor" fontSize="8" fontWeight="bold" letterSpacing="0.8">
          <textPath href={`#${bottomPathId}`} startOffset="50%" textAnchor="middle">
            {teksBawah}
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export const ProfilBiro: React.FC = () => {
  const navigate = useNavigate();

  // State Profil & Data
  const [profile, setProfile] = useState<BiroProfile>(getLocalBiroProfile);
  const [cmsData, setCmsData] = useState<BiroCmsData>(getBiroCmsData);
  const [entitlements, setEntitlements] = useState<EntitlementState>(getCurrentEntitlements);
  const isSuper = isSuperAdminUser();
  const activeUser = getActiveUserSync();

  // Navigation: on desktop default to "kop", on mobile default to null (show menu list)
  const [activeSection, setActiveSection] = useState<SettingsSection>("kop");
  const [mobileViewActive, setMobileViewActive] = useState<boolean>(false);

  // Modals
  const [showQrModal, setShowQrModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Loading States
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStempel, setUploadingStempel] = useState(false);
  const [uploadingTtd, setUploadingTtd] = useState(false);
  const stempelInputRef = useRef<HTMLInputElement>(null);
  const ttdInputRef = useRef<HTMLInputElement>(null);

  // Image Editor Studio State (Pembersih Background Transparan & Rotasi TTD / Stempel)
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingTarget, setEditingTarget] = useState<"ttd" | "stempel">("ttd");
  const [rawEditorSrc, setRawEditorSrc] = useState<string>("");
  const [editorRotation, setEditorRotation] = useState<number>(0);
  const [editorThreshold, setEditorThreshold] = useState<number>(195);
  const [editorTintColor, setEditorTintColor] = useState<"original" | "black" | "blue">("black");
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string>("");

  // Forms
  const [newBus, setNewBus] = useState({ namaPO: "", kontakPerson: "", telepon: "", alamatGarasi: "", catatanArmada: "" });
  const [newResto, setNewResto] = useState({ namaResto: "", lokasiRute: "", kontakPerson: "", telepon: "", hargaPerPax: 30000, menuFavorit: "" });

  // Gemini AI Key Security
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

  // Upload Gambar Stempel Basah
  const handleStempelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Harap pilih berkas gambar stempel (PNG/JPG)");
      return;
    }

    try {
      setUploadingStempel(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        // Buka langsung di studio agar bisa hapus background kertas & diputar
        openImageEditor("stempel", dataUrl);
        setUploadingStempel(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("Gagal membaca stempel: " + (err.message || "Gagal"));
      setUploadingStempel(false);
    } finally {
      if (stempelInputRef.current) stempelInputRef.current.value = "";
    }
  };

  // Upload Coretan Tanda Tangan
  const handleTtdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Harap pilih berkas gambar tanda tangan (PNG/JPG)");
      return;
    }

    try {
      setUploadingTtd(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        // Buka langsung di studio agar user bisa memutar jika menceng dan membersihkan background
        openImageEditor("ttd", dataUrl);
        setUploadingTtd(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("Gagal membaca tanda tangan: " + (err.message || "Gagal"));
      setUploadingTtd(false);
    } finally {
      if (ttdInputRef.current) ttdInputRef.current.value = "";
    }
  };

  // Buka editor studio untuk TTD atau Stempel
  const openImageEditor = (target: "ttd" | "stempel", src: string) => {
    setEditingTarget(target);
    setRawEditorSrc(src);
    setEditorRotation(0);
    setEditorThreshold(195);
    setEditorTintColor(target === "ttd" ? "black" : "original");
    setShowImageEditor(true);
  };

  // Efek real-time saat slider atau rotasi diubah di studio
  useEffect(() => {
    if (!showImageEditor || !rawEditorSrc) return;
    let cancelled = false;
    processSignatureOrStampImage(rawEditorSrc, {
      rotationDeg: editorRotation,
      threshold: editorThreshold,
      tintColor: editorTintColor,
    }).then((res) => {
      if (!cancelled) setProcessedPreviewUrl(res);
    });
    return () => {
      cancelled = true;
    };
  }, [showImageEditor, rawEditorSrc, editorRotation, editorThreshold, editorTintColor]);

  // Rotasi bertahap (putar 90 derajat)
  const handleRotate = (degDelta: number) => {
    setEditorRotation((prev) => ((prev + degDelta) % 360 + 360) % 360);
  };

  // Terapkan hasil bersih & simpan
  const handleApplyProcessedImage = async () => {
    if (!processedPreviewUrl) return;
    try {
      setSaving(true);
      let updated: BiroProfile;
      if (editingTarget === "ttd") {
        updated = {
          ...profile,
          tanda_tangan_url: processedPreviewUrl,
        };
      } else {
        updated = {
          ...profile,
          stempel_custom_image_url: processedPreviewUrl,
          stempel_mode: "custom",
        };
      }
      setProfile(updated);
      await saveBiroProfile(updated);
      setShowImageEditor(false);
      toast.success(
        editingTarget === "ttd"
          ? "Tanda tangan berhasil dibuat transparan dan diluruskan!"
          : "Stempel basah berhasil dibersihkan dari latar kertas!"
      );
    } catch (err: any) {
      toast.error("Gagal menyimpan hasil: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStempelImage = async () => {
    const updated: BiroProfile = {
      ...profile,
      stempel_custom_image_url: null,
      stempel_mode: "otomatis",
    };
    setProfile(updated);
    await saveBiroProfile(updated);
    toast.success("Stempel custom dihapus. Beralih ke stempel vektor digital.");
  };

  const handleRemoveTtdImage = async () => {
    const updated: BiroProfile = {
      ...profile,
      tanda_tangan_url: null,
    };
    setProfile(updated);
    await saveBiroProfile(updated);
    toast.success("Gambar tanda tangan pimpinan dihapus.");
  };

  // Simpan Profil
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      await saveBiroProfile(profile);
      saveBiroCmsData(cmsData);
      toast.success("Pengaturan berhasil disimpan!");
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
    toast.success(`PO Bus "${item.namaPO}" berhasil ditambahkan!`);
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
    toast.success(`Rumah makan "${item.namaResto}" berhasil ditambahkan!`);
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
    toast.success("Kunci Google Gemini API berhasil diperbarui!");
  };

  // Logout
  const handleLogout = async () => {
    if (confirm("Yakin ingin keluar dari sesi akun biro ini?")) {
      await safeLogout();
      toast.success("Berhasil keluar dari sesi akun");
      navigate("/auth");
    }
  };

  const selectSection = (sec: SettingsSection) => {
    setActiveSection(sec);
    setMobileViewActive(true);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 lg:pb-12 lg:pl-64">
        {/* TOP BAR / HEADER */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mobileViewActive ? (
                <button
                  type="button"
                  onClick={() => setMobileViewActive(false)}
                  className="lg:hidden p-1.5 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-sm font-semibold"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Menu</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="p-1.5 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Kembali ke Dashboard"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Pengaturan Biro
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Kelola identitas resmi, kop surat, rekening, katalog mitra, dan lisensi akun
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle variant="segmented" className="hidden sm:inline-flex" />
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Tampilkan Kode QR Profil"
              >
                <QrCode className="w-5 h-5" />
              </button>
              <Button
                size="sm"
                onClick={() => handleSaveProfile()}
                disabled={saving}
                className="h-8 sm:h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs font-semibold rounded-xl"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                Simpan
              </Button>
            </div>
          </div>
        </header>

        {/* MAIN WORKSPACE: 2-COLUMN MASTER-DETAIL ON DESKTOP */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* ================================================================= */}
            {/* LEFT COLUMN: IDENTITAS KANTOR & MENU NAVIGASI PENGATURAN           */}
            {/* (Visible on desktop always; on mobile only when mobileViewActive=false) */}
            {/* ================================================================= */}
            <div
              className={`lg:col-span-4 xl:col-span-4 space-y-5 ${
                mobileViewActive ? "hidden lg:block" : "block"
              }`}
            >
              {/* KARTU PROFIL BIRO RESMI */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center overflow-hidden">
                      {profile.logo_url ? (
                        <img
                          src={profile.logo_url}
                          alt="Logo Biro"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-xs transition-colors"
                      title="Ganti Logo Biro"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Camera className="w-3 h-3" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <input
                      ref={stempelInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleStempelUpload}
                      className="hidden"
                    />
                    <input
                      ref={ttdInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleTtdUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {profile.nama_biro}
                      </h2>
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {profile.slogan || "Biro Perjalanan Wisata & Tour Organizer"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        Paket {entitlements.tier}
                      </Badge>
                      <span className="text-[11px] text-slate-400 font-mono truncate">
                        {activeUser?.email || profile.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{profile.alamat ? profile.alamat.split(",")[0] : "Alamat belum diatur"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{profile.telepon || "No telepon -"}</span>
                  </div>
                </div>
              </div>

              {/* GRUP MENU PENGATURAN 1: DOKUMEN & IDENTITAS */}
              <div className="space-y-1.5">
                <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Dokumen & Legalitas
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => selectSection("kop")}
                    className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      activeSection === "kop" && !mobileViewActive
                        ? "bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Kop Surat & Cetak PDF</div>
                        <div className="text-[11px] text-slate-400 truncate">Pratinjau A4 dokumen resmi</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => selectSection("stempel")}
                    className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      activeSection === "stempel" && !mobileViewActive
                        ? "bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          backgroundColor: `${profile.stempel_warna || "#2563eb"}15`,
                          color: profile.stempel_warna || "#2563eb",
                        }}
                      >
                        <Stamp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                          Stempel & Tanda Tangan
                          {profile.stempel_custom_image_url ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Stempel custom aktif" />
                          ) : null}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Cap biro resmi, warna tinta & TTD
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => selectSection("identitas")}
                    className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      activeSection === "identitas" && !mobileViewActive
                        ? "bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Profil & Kontak Kantor</div>
                        <div className="text-[11px] text-slate-400 truncate">Alamat, penanggung jawab, kontak</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => selectSection("bank")}
                    className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      activeSection === "bank" && !mobileViewActive
                        ? "bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Rekening Pembayaran</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {profile.nama_bank || "Bank Mandiri / BCA"}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                </div>
              </div>

              {/* GRUP MENU PENGATURAN 2: KATALOG & OPERASIONAL */}
              <div className="space-y-1.5">
                <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Operasional & Rekanan
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => selectSection("bus")}
                    className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      activeSection === "bus" && !mobileViewActive
                        ? "bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
                        <Bus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Rekanan PO Bus</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {cmsData.rekananBus.length} PO Bus terdaftar
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => selectSection("resto")}
                    className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      activeSection === "resto" && !mobileViewActive
                        ? "bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Rekanan Rumah Makan</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {cmsData.rekananResto.length} Resto rute terdaftar
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/manajemen-kru")}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Personel Kru & Hak Akses</div>
                        <div className="text-[11px] text-slate-400 truncate">Pembatasan menu untuk TL & Driver</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                </div>
              </div>

              {/* GRUP MENU PENGATURAN 3: SISTEM & BANTUAN */}
              <div className="space-y-1.5">
                <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Sistem & Langganan
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => selectSection("lisensi")}
                    className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      activeSection === "lisensi" && !mobileViewActive
                        ? "bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Paket Lisensi & Kuota</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Tier {entitlements.tier.toUpperCase()} • {entitlements.canUseDesktopMode ? "Desktop Aktif" : "Mobile Only"}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => selectSection("ai")}
                    className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      activeSection === "ai" && !mobileViewActive
                        ? "bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Integrasi AI (Google Gemini)</div>
                        <div className="text-[11px] text-slate-400 truncate">Konfigurasi API Key terlindungi</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/learn")}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Panduan SOP Biro Wisata</div>
                        <div className="text-[11px] text-slate-400 truncate">Konversi itinerary Word, denah bus & kas</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => selectSection("bantuan")}
                    className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      activeSection === "bantuan" && !mobileViewActive
                        ? "bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                        <LifeBuoy className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Pusat Bantuan & Tiket</div>
                        <div className="text-[11px] text-slate-400 truncate">Lapor kendala ke Super Admin</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                </div>
              </div>

              {/* PENGATURAN TEMA TAMPILAN SISTEM */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Mode Tampilan Aplikasi
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Paksa mode terang jika browser/ponsel mode gelap
                  </div>
                </div>
                <ThemeToggle variant="segmented" />
              </div>

              {/* LOGOUT BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar dari Sesi Biro
                </button>
              </div>
            </div>

            {/* ================================================================= */}
            {/* RIGHT COLUMN: WORKSPACE AKTIF SESUAI KATEGORI                     */}
            {/* (Visible on desktop always; on mobile only when mobileViewActive=true) */}
            {/* ================================================================= */}
            <div
              className={`lg:col-span-8 xl:col-span-8 space-y-6 ${
                mobileViewActive ? "block" : "hidden lg:block"
              }`}
            >
              {/* ------------------------------------------------------------- */}
              {/* 1. SECTION: KOP SURAT RESMI & LIVE A4 PREVIEW                 */}
              {/* ------------------------------------------------------------- */}
              {activeSection === "kop" && (
                <div className="space-y-6">
                  {/* Penjelasan Ringkas & Header Workspace */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          Kop Surat Dokumen & Cetak PDF Resmi
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Header kop surat ini otomatis dicetak di lembar kwitansi, penawaran wisata, dan invoice resmi biro Anda.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSaveProfile()}
                        disabled={saving}
                        className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8 px-4 rounded-xl flex-shrink-0"
                      >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        Simpan Kop Surat
                      </Button>
                    </div>

                    {/* LIVE REALISTIC A4 LETTERHEAD PREVIEW */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Pratinjau Kertas A4 (Kop Surat Resmi)
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Ukuran Standar 210 x 297 mm
                        </span>
                      </div>

                      {/* SIMULASI LEMBAR KERTAS A4 PUTIH */}
                      <div className="bg-white text-slate-900 border border-slate-300 rounded-xl p-6 sm:p-8 shadow-sm">
                        {/* KOP HEADER STANDAR DENGAN GARIS GANDA RESMI INDONESIA (AHU & NIB) */}
                        <KopSuratBiro profile={profile} />

                        {/* CONTOH ISI DOKUMEN KWITANSI / INVOICE */}
                        <div className="pt-4 pb-2 space-y-3 opacity-75">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                            <span>No: INV/TRIP/{new Date().getFullYear()}/0082</span>
                            <span>Tanggal: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                          </div>
                          <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-800 my-2">
                            Kwitansi / Tanda Terima Pembayaran Wisata
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[11px] space-y-1.5 font-sans">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Telah Diterima Dari:</span>
                              <span className="font-semibold text-slate-800">Rombongan Studi Tour SMP / Klien</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Untuk Pembayaran:</span>
                              <span className="font-semibold text-slate-800">Paket Wisata Bali 4D3N (Armada 2 Bus Jetbus 5)</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-1.5">
                              <span className="text-slate-500">Jumlah Pembayaran:</span>
                              <span className="font-bold text-slate-900">Rp 45.000.000 (Lunas)</span>
                            </div>
                          </div>

                          {/* AREA TANDA TANGAN & STEMPEL KWITANSI CONTOH */}
                          <div className="flex justify-end pt-2 pb-1">
                            <div className="text-center relative min-w-[170px] select-none">
                              <div className="text-[9px] text-slate-500 font-medium">
                                {profile.kota_tanda_tangan || "Demak"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                              </div>
                              <div className="text-[10px] font-bold text-slate-800">
                                {profile.nama_biro}
                              </div>
                              <div className="relative h-16 flex items-center justify-center my-0.5">
                                {profile.tanda_tangan_url ? (
                                  <img
                                    src={profile.tanda_tangan_url}
                                    alt="TTD"
                                    className="max-h-12 max-w-[90px] object-contain pointer-events-none z-10"
                                  />
                                ) : (
                                  <div className="text-[8px] text-slate-300 italic">
                                    ( Tanda Tangan )
                                  </div>
                                )}
                                <div
                                  className="absolute top-1/2 left-1/2 pointer-events-none z-20 mix-blend-multiply"
                                  style={{ transform: "translate(-56%, -48%) rotate(-8deg)" }}
                                >
                                  <DigitalStampPreview profile={profile} size={68} />
                                </div>
                              </div>
                              <div className="border-t border-slate-300 pt-0.5">
                                <div className="text-[9px] font-bold text-slate-800 underline">
                                  {profile.pimpinan || "H. Anjar Abidin, S.E."}
                                </div>
                                <div className="text-[8px] text-slate-400">
                                  {profile.jabatan_penandatangan || "Pimpinan / Manajemen Keuangan"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* FOOTER INFORMASI REKENING RESMI */}
                        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] text-slate-500">
                          <div>
                            Pembayaran Sah Melalui Rekening Resmi:
                            <span className="font-bold text-slate-800 ml-1">
                              {profile.nama_bank || "Bank Mandiri / BCA"} No. {profile.nomor_rekening || "136-00-xxxx-x"}
                            </span>
                            <span className="ml-1">a/n {profile.atas_nama_rekening || profile.nama_biro}</span>
                          </div>
                          <div className="text-[9px] font-semibold text-slate-400">
                            {entitlements.canExportCleanPdf ? "Dokumen Resmi Terverifikasi" : "Dicatat via CatatBiro Wisata"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* FORM EDIT DATA KOP SURAT */}
                    <form onSubmit={handleSaveProfile} className="mt-8 space-y-4">
                      <div className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                        Formulir Keterangan Kop Surat
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nama Resmi Perusahaan / Biro di Kop *</Label>
                          <Input
                            value={profile.nama_biro}
                            onChange={(e) => setProfile({ ...profile, nama_biro: e.target.value })}
                            placeholder="PT Biro Wisata Nusantara"
                            className="text-xs"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Slogan / Keterangan Usaha</Label>
                          <Input
                            value={profile.slogan}
                            onChange={(e) => setProfile({ ...profile, slogan: e.target.value })}
                            placeholder="Biro Perjalanan Wisata & Sewa Bus Pariwisata"
                            className="text-xs"
                          />
                        </div>
                      </div>

                      {/* LEGALITAS RESMI INDONESIA (AHU & NIB OSS) */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Legalitas Resmi Biro (Kemenkumham & OSS)
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            Dicetak di Kop Surat
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              Nomor SK AHU Kemenkumham
                            </Label>
                            <Input
                              value={profile.nomor_ahu || ""}
                              onChange={(e) => setProfile({ ...profile, nomor_ahu: e.target.value })}
                              placeholder="Contoh: AHU-0016871-AH.0114 TH 2025"
                              className="text-xs font-mono uppercase"
                            />
                            <p className="text-[10px] text-slate-400">
                              Format: AHU-xxxxxxx-AH.xxxx TH xxxx
                            </p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              Nomor Induk Berusaha (NIB OSS)
                            </Label>
                            <Input
                              value={profile.nomor_nib || ""}
                              onChange={(e) => setProfile({ ...profile, nomor_nib: e.target.value })}
                              placeholder="Contoh: 1604260107228"
                              className="text-xs font-mono"
                            />
                            <p className="text-[10px] text-slate-400">
                              Nomor 13 digit NIB resmi OSS
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              NPWP Badan Usaha (Opsional)
                            </Label>
                            <Input
                              value={profile.npwp || ""}
                              onChange={(e) => setProfile({ ...profile, npwp: e.target.value })}
                              placeholder="Contoh: 00.000.000.0-000.000"
                              className="text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              Nama Badan Usaha / PT / CV (Opsional)
                            </Label>
                            <Input
                              value={profile.nama_badan_usaha || ""}
                              onChange={(e) => setProfile({ ...profile, nama_badan_usaha: e.target.value })}
                              placeholder="Contoh: PT ENAM SEMBILAN WISATA ABADI"
                              className="text-xs uppercase"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Alamat Kantor Lengkap</Label>
                        <Input
                          value={profile.alamat || ""}
                          onChange={(e) => setProfile({ ...profile, alamat: e.target.value })}
                          placeholder="Jl. Pemuda No. 45, Kompleks Ruko Sentra Niaga, Semarang"
                          className="text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Telepon / WhatsApp Layanan</Label>
                          <Input
                            value={profile.telepon || ""}
                            onChange={(e) => setProfile({ ...profile, telepon: e.target.value })}
                            placeholder="0812-2578-9000"
                            className="text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Email Resmi Kantor</Label>
                          <Input
                            value={profile.email || ""}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            placeholder="operasional@birowisata.id"
                            className="text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Website Biro</Label>
                          <Input
                            value={profile.website || ""}
                            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                            placeholder="www.birowisata.id"
                            className="text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          type="submit"
                          disabled={saving}
                          className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-9 px-5 rounded-xl"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                          Simpan Perubahan Kop Surat
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SECTION: STEMPEL RESMI & TANDA TANGAN DOKUMEN                 */}
              {/* ------------------------------------------------------------- */}
              {activeSection === "stempel" && (
                <div className="space-y-6">
                  {/* Header Workspace */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Stamp className="w-5 h-5 text-blue-600" />
                          Pengaturan Stempel Biro & Tanda Tangan Resmi
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Atur format cap stempel digital otomatis atau unggah file scan stempel basah asli untuk dicetak pada Kwitansi & Invoice PDF.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSaveProfile()}
                        disabled={saving}
                        className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8 px-4 rounded-xl flex-shrink-0"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                        Simpan Pengaturan
                      </Button>
                    </div>

                    {/* LIVE INTERACTIVE REALISTIC DOCUMENT PREVIEW */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Pratinjau Nyata di Kertas Dokumen (Kwitansi & Invoice)
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Simulasi Cetak PDF Asli
                        </span>
                      </div>

                      {/* SIMULASI AREA TANDA TANGAN & STEMPEL DI ATAS KERTAS */}
                      <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-sm max-w-md mx-auto text-center relative overflow-hidden">
                        {/* Watermark grid tipis khas kertas dokumen */}
                        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                        {/* Tanggal & Tempat Dokumen */}
                        <div className="relative text-xs text-slate-600 font-medium">
                          {profile.kota_tanda_tangan || "Demak"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </div>

                        {/* Nama Biro */}
                        <div className="relative text-sm font-bold text-slate-900 mt-1 tracking-wide">
                          {profile.nama_biro}
                        </div>

                        {/* AREA STEMPEL & TANDA TANGAN BERPADU (AUTHENTIC OVERLAY) */}
                        <div className="relative h-32 flex items-center justify-center my-2">
                          {/* Tanda Tangan Basah Gambar (Jika Ada) - Posisi di sisi kanan */}
                          {profile.tanda_tangan_url ? (
                            <img
                              src={profile.tanda_tangan_url}
                              alt="Tanda Tangan Pimpinan"
                              className="max-h-24 max-w-[170px] object-contain select-none pointer-events-none z-10 translate-x-5 sm:translate-x-6"
                            />
                          ) : (
                            <div className="text-xs text-slate-300 italic select-none translate-x-5 sm:translate-x-6">
                              ( Area Tanda Tangan Pimpinan )
                            </div>
                          )}

                          {/* Stempel Digital / Basah - Posisi di sisi kiri, menimpa separuh kiri tanda tangan secara proporsional */}
                          <div
                            className="absolute top-1/2 left-1/2 pointer-events-none z-20 mix-blend-multiply transition-all duration-200"
                            style={{
                              transform: "translate(-68%, -50%) rotate(-7deg)",
                            }}
                          >
                            <DigitalStampPreview profile={profile} size={118} />
                          </div>
                        </div>

                        {/* Garis & Nama Terang Pimpinan */}
                        <div className="relative pt-1 border-t border-slate-300 max-w-[220px] mx-auto">
                          <div className="text-xs font-bold text-slate-900 underline decoration-slate-400 underline-offset-4">
                            {profile.pimpinan || "H. Anjar Abidin, S.E."}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {profile.jabatan_penandatangan || "Pimpinan / Manajemen Keuangan"}
                          </div>
                        </div>

                        <div className="relative mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-emerald-600 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Dokumen Resmi Terverifikasi Sah Secara Digital
                        </div>
                      </div>
                    </div>

                    {/* FORM EDIT PENGATURAN STEMPEL */}
                    <div className="mt-8 space-y-6">
                      {/* 1. PILIHAN TIPE STEMPEL */}
                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          1. Model / Jenis Stempel
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setProfile({ ...profile, stempel_mode: "otomatis" })}
                            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                              profile.stempel_mode !== "custom"
                                ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 ring-2 ring-blue-600/20"
                                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                Stempel Vektor Otomatis
                                {profile.stempel_mode !== "custom" && (
                                  <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0">Aktif</Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Digenerate otomatis sistem dengan lingkaran ganda resmi, tajam, dan teks yang bisa disesuaikan.
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (!profile.stempel_custom_image_url) {
                                stempelInputRef.current?.click();
                              } else {
                                setProfile({ ...profile, stempel_mode: "custom" });
                              }
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                              profile.stempel_mode === "custom"
                                ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-600/20"
                                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Camera className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                Unggah Stempel Basah Asli
                                {profile.stempel_mode === "custom" && (
                                  <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">Aktif</Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Unggah hasil scan/foto cap stempel fisik kantor Anda (format PNG transparan disarankan).
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* 2. PENGATURAN WARNA TINTA STEMPEL (JIKA VEKTOR) */}
                      <div className="space-y-3 pt-2">
                        <Label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <Palette className="w-4 h-4 text-slate-500" />
                          2. Warna Tinta Stempel
                        </Label>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          {STEMPEL_COLOR_PRESETS.map((c) => {
                            const isSelected = (profile.stempel_warna || "#2563eb").toLowerCase() === c.hex.toLowerCase();
                            return (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => setProfile({ ...profile, stempel_warna: c.hex })}
                                className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                                  isSelected
                                    ? "border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 shadow-xs"
                                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                }`}
                              >
                                <span
                                  className="w-4 h-4 rounded-full flex-shrink-0 border border-black/10 flex items-center justify-center text-white text-[10px]"
                                  style={{ backgroundColor: c.hex }}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </span>
                                <span>{c.name.split(" ")[0]}</span>
                              </button>
                            );
                          })}

                          {/* Custom Color Input */}
                          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                            <span className="text-[11px] text-slate-500">Kustom:</span>
                            <input
                              type="color"
                              value={profile.stempel_warna || "#2563eb"}
                              onChange={(e) => setProfile({ ...profile, stempel_warna: e.target.value })}
                              className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 bg-transparent p-0.5"
                              title="Pilih warna kustom"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3. PENGATURAN TEKS STEMPEL VEKTOR */}
                      <div className="space-y-4 pt-2">
                        <Label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          3. Teks Tulisan Stempel
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Teks Lingkar Atas</Label>
                              <button
                                type="button"
                                onClick={() => setProfile({ ...profile, stempel_teks_atas: profile.nama_biro })}
                                className="text-[10px] text-blue-600 hover:underline"
                              >
                                Samakan Nama Biro
                              </button>
                            </div>
                            <Input
                              value={profile.stempel_teks_atas ?? profile.nama_biro}
                              onChange={(e) => setProfile({ ...profile, stempel_teks_atas: e.target.value })}
                              placeholder="69 TRANS & TOUR"
                              className="text-xs uppercase font-semibold"
                            />
                            <p className="text-[10px] text-slate-400">
                              Maks 22 karakter di busur atas lingkaran
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs">Teks Kotak Tengah</Label>
                            <Input
                              value={profile.stempel_teks_tengah || "LUNAS"}
                              onChange={(e) => setProfile({ ...profile, stempel_teks_tengah: e.target.value })}
                              placeholder="LUNAS"
                              className="text-xs uppercase font-bold"
                            />
                            {/* Quick selection chips */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {["LUNAS", "TERVERIFIKASI", "OFFICIAL", "PAID"].map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setProfile({ ...profile, stempel_teks_tengah: tag })}
                                  className={`text-[9px] px-2 py-0.5 rounded-md border transition-colors ${
                                    (profile.stempel_teks_tengah || "LUNAS") === tag
                                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs">Teks Lingkar Bawah</Label>
                            <Input
                              value={profile.stempel_teks_bawah || "OFFICIAL VERIFIED"}
                              onChange={(e) => setProfile({ ...profile, stempel_teks_bawah: e.target.value })}
                              placeholder="OFFICIAL VERIFIED"
                              className="text-xs uppercase font-semibold"
                            />
                            {/* Quick selection chips */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {["OFFICIAL VERIFIED", "MANAJEMEN KEUANGAN", "DEMAK - JATENG"].map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setProfile({ ...profile, stempel_teks_bawah: tag })}
                                  className={`text-[9px] px-2 py-0.5 rounded-md border transition-colors ${
                                    (profile.stempel_teks_bawah || "OFFICIAL VERIFIED") === tag
                                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4. UNGGAH STEMPEL BASAH FISIK (OPSI SCAN GAMBAR) */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Camera className="w-4 h-4 text-slate-600 dark:text-slate-300 flex-shrink-0" />
                              Berkas Gambar Stempel Basah (Scan PNG)
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Jika biro Anda memiliki cap stempel fisik, unggah fotonya di sini.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            {profile.stempel_custom_image_url && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openImageEditor("stempel", profile.stempel_custom_image_url!)}
                                  className="text-xs h-8 px-2.5 font-bold border-blue-300 text-blue-700 bg-blue-50/60 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 flex-1 sm:flex-none gap-1"
                                  title="Bersihkan latar belakang kertas stempel agar transparan"
                                >
                                  <Wand2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Bersihkan</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleRemoveStempelImage}
                                  className="text-xs h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/40 flex-1 sm:flex-none gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus</span>
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => stempelInputRef.current?.click()}
                              disabled={uploadingStempel}
                              className="text-xs h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 flex-1 sm:flex-none gap-1"
                            >
                              {uploadingStempel ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Camera className="w-3.5 h-3.5" />
                              )}
                              <span>{profile.stempel_custom_image_url ? "Ganti" : "Unggah Stempel"}</span>
                            </Button>
                          </div>
                        </div>

                        {profile.stempel_custom_image_url && (
                          <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div className="relative w-12 h-12 flex-shrink-0 bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#ffffff_0%_50%)] [background-size:8px_8px] rounded-lg p-1 border border-slate-300 flex items-center justify-center overflow-hidden">
                              <img
                                src={profile.stempel_custom_image_url}
                                alt="Thumbnail Stempel"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 min-w-0 flex-1">
                              <span className="font-semibold text-emerald-600 flex items-center gap-1 truncate">
                                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Berkas Stempel Terunggah
                              </span>
                              <span className="text-[11px] text-slate-400 block truncate">
                                Mode: {profile.stempel_mode === "custom" ? "Menggunakan Stempel Gambar Ini" : "Menggunakan Stempel Vektor"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 5. PENGATURAN TANDA TANGAN & PIMPINAN */}
                      <div className="space-y-4 pt-2">
                        <Label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          4. Identitas Penandatangan & Tanda Tangan Digital
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Nama Terang Penandatangan *</Label>
                            <Input
                              value={profile.pimpinan || ""}
                              onChange={(e) => setProfile({ ...profile, pimpinan: e.target.value })}
                              placeholder="H. Anjar Abidin, S.E."
                              className="text-xs font-semibold"
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs">Jabatan Penandatangan</Label>
                            <Input
                              value={profile.jabatan_penandatangan || "Pimpinan / Manajemen Keuangan"}
                              onChange={(e) => setProfile({ ...profile, jabatan_penandatangan: e.target.value })}
                              placeholder="Pimpinan / Manajemen Keuangan"
                              className="text-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs">Kota Penerbitan Dokumen</Label>
                            <Input
                              value={profile.kota_tanda_tangan || "Demak"}
                              onChange={(e) => setProfile({ ...profile, kota_tanda_tangan: e.target.value })}
                              placeholder="Demak"
                              className="text-xs"
                            />
                          </div>
                        </div>

                        {/* Opsi Unggah Coretan Tanda Tangan */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {profile.tanda_tangan_url ? (
                              <div className="relative w-16 h-12 flex-shrink-0 bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#ffffff_0%_50%)] [background-size:8px_8px] rounded-lg p-1 border border-slate-300 flex items-center justify-center overflow-hidden">
                                <img
                                  src={profile.tanda_tangan_url}
                                  alt="Coretan TTD"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
                                ✍️
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                Coretan Tanda Tangan Asli (Opsional)
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {profile.tanda_tangan_url
                                  ? "Tanda tangan aktif. Jika menceng atau masih ada latar kertas, klik tombol 'Bersihkan & Putar'."
                                  : "Foto tanda tangan di atas kertas. Sistem akan otomatis membersihkan background kertas dan meluruskannya."}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 w-full pt-1">
                            {profile.tanda_tangan_url && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openImageEditor("ttd", profile.tanda_tangan_url!)}
                                  className="flex-1 sm:flex-none text-xs h-8 px-3 font-bold border-blue-400 text-blue-700 bg-blue-50/80 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-300 gap-1.5 shadow-2xs"
                                  title="Putar tanda tangan yang menceng dan hapus background kertas menjadi transparan"
                                >
                                  <Wand2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Bersihkan & Putar TTD</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleRemoveTtdImage}
                                  className="text-xs h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/40 flex-1 sm:flex-none gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus TTD</span>
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => ttdInputRef.current?.click()}
                              disabled={uploadingTtd}
                              className="text-xs h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 flex-1 sm:flex-none gap-1"
                            >
                              {uploadingTtd ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Camera className="w-3.5 h-3.5" />
                              )}
                              <span>{profile.tanda_tangan_url ? "Ganti Tanda Tangan" : "Unggah Tanda Tangan"}</span>
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Tombol Simpan Bawah */}
                      <div className="flex flex-col sm:flex-row justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          type="button"
                          onClick={() => handleSaveProfile()}
                          disabled={saving}
                          className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-9 px-5 rounded-xl shadow-xs"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                          Simpan Pengaturan Stempel & TTD
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 2. SECTION: PROFIL & KONTAK KANTOR                            */}
              {/* ------------------------------------------------------------- */}
              {activeSection === "identitas" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                        Identitas & Legalitas Biro Wisata
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Informasi identitas kantor yang tampil di portal publik dan dokumen resmi operasional.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSaveProfile()}
                      disabled={saving}
                      className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8 px-4 rounded-xl flex-shrink-0"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      Simpan Profil
                    </Button>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nama Biro Wisata *</Label>
                        <Input
                          value={profile.nama_biro}
                          onChange={(e) => setProfile({ ...profile, nama_biro: e.target.value })}
                          className="text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Penanggung Jawab / Pimpinan</Label>
                        <Input
                          value={profile.pimpinan || ""}
                          onChange={(e) => setProfile({ ...profile, pimpinan: e.target.value })}
                          placeholder="H. Fulan, S.E."
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Slogan / Tagline Usaha</Label>
                      <Input
                        value={profile.slogan}
                        onChange={(e) => setProfile({ ...profile, slogan: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    {/* LEGALITAS RESMI INDONESIA (AHU & NIB OSS) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          Legalitas & Izin Berusaha (Kemenkumham AHU & NIB OSS)
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          Resmi Terverifikasi
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Nomor SK AHU Kemenkumham
                          </Label>
                          <Input
                            value={profile.nomor_ahu || ""}
                            onChange={(e) => setProfile({ ...profile, nomor_ahu: e.target.value })}
                            placeholder="Contoh: AHU-0016871-AH.0114 TH 2025"
                            className="text-xs font-mono uppercase"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Nomor Induk Berusaha (NIB OSS)
                          </Label>
                          <Input
                            value={profile.nomor_nib || ""}
                            onChange={(e) => setProfile({ ...profile, nomor_nib: e.target.value })}
                            placeholder="Contoh: 1604260107228"
                            className="text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            NPWP Badan Usaha (Opsional)
                          </Label>
                          <Input
                            value={profile.npwp || ""}
                            onChange={(e) => setProfile({ ...profile, npwp: e.target.value })}
                            placeholder="Contoh: 00.000.000.0-000.000"
                            className="text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Nama Badan Usaha / PT / CV
                          </Label>
                          <Input
                            value={profile.nama_badan_usaha || ""}
                            onChange={(e) => setProfile({ ...profile, nama_badan_usaha: e.target.value })}
                            placeholder="Contoh: PT ENAM SEMBILAN WISATA ABADI"
                            className="text-xs uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Alamat Kantor Lengkap</Label>
                      <Textarea
                        value={profile.alamat || ""}
                        onChange={(e) => setProfile({ ...profile, alamat: e.target.value })}
                        rows={3}
                        className="text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nomor WhatsApp CS</Label>
                        <Input
                          value={profile.telepon || ""}
                          onChange={(e) => setProfile({ ...profile, telepon: e.target.value })}
                          className="text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Email Kantor</Label>
                        <Input
                          value={profile.email || ""}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          className="text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Website Resmi</Label>
                        <Input
                          value={profile.website || ""}
                          onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                          className="text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-9 px-5 rounded-xl"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                        Simpan Identitas Biro
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 3. SECTION: REKENING BANK PEMBAYARAN TAMU                     */}
              {/* ------------------------------------------------------------- */}
              {activeSection === "bank" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-emerald-600" />
                        Rekening Bank Pembayaran Tamu
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Rekening ini dicantumkan pada surat penawaran, invoice, kwitansi, dan konfirmasi transfer pembayaran paket wisata.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSaveProfile()}
                      disabled={saving}
                      className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8 px-4 rounded-xl flex-shrink-0"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      Simpan Rekening
                    </Button>
                  </div>

                  {/* KARTU BANK PREVIEW */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-sm space-y-4 max-w-md">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                        {profile.nama_bank || "BANK MANDIRI / BCA"}
                      </span>
                      <Landmark className="w-6 h-6 text-emerald-200" />
                    </div>
                    <div className="text-lg sm:text-xl font-mono font-bold tracking-wider pt-2">
                      {profile.nomor_rekening || "136-00-1234567-8"}
                    </div>
                    <div className="pt-2 flex justify-between items-end text-xs">
                      <div>
                        <div className="text-[10px] text-emerald-200 uppercase">Atas Nama Rekening</div>
                        <div className="font-semibold">{profile.atas_nama_rekening || profile.nama_biro}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(profile.nomor_rekening || "");
                          toast.success("Nomor rekening disalin ke clipboard!");
                        }}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                        title="Salin Nomor Rekening"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* FORM EDIT REKENING */}
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nama Bank</Label>
                        <Input
                          value={profile.nama_bank || ""}
                          onChange={(e) => setProfile({ ...profile, nama_bank: e.target.value })}
                          placeholder="Bank Mandiri / BCA / BNI / BRI / BSI"
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nomor Rekening</Label>
                        <Input
                          value={profile.nomor_rekening || ""}
                          onChange={(e) => setProfile({ ...profile, nomor_rekening: e.target.value })}
                          placeholder="136-00-1234567-8"
                          className="text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Atas Nama Rekening</Label>
                        <Input
                          value={profile.atas_nama_rekening || ""}
                          onChange={(e) => setProfile({ ...profile, atas_nama_rekening: e.target.value })}
                          placeholder="PT Catat Biro Wisata"
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-9 px-5 rounded-xl"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                        Simpan Rekening
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 4. SECTION: REKANAN PO BUS                                    */}
              {/* ------------------------------------------------------------- */}
              {activeSection === "bus" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Bus className="w-5 h-5 text-cyan-600" />
                      Katalog Rekanan PO Bus Pariwisata
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Daftar vendor armada bus langganan untuk memudahkan penugasan armada dan komunikasi kru lapangan.
                    </p>
                  </div>

                  {/* FORM TAMBAH PO BUS */}
                  <form onSubmit={handleAddBus} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      + Tambah Rekanan PO Bus Baru
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        required
                        placeholder="Nama PO (Contoh: PO Subur Jaya)"
                        value={newBus.namaPO}
                        onChange={(e) => setNewBus({ ...newBus, namaPO: e.target.value })}
                        className="text-xs"
                      />
                      <Input
                        placeholder="Kontak Person (CP / Marketing)"
                        value={newBus.kontakPerson}
                        onChange={(e) => setNewBus({ ...newBus, kontakPerson: e.target.value })}
                        className="text-xs"
                      />
                      <Input
                        placeholder="No. Telepon / WhatsApp"
                        value={newBus.telepon}
                        onChange={(e) => setNewBus({ ...newBus, telepon: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Alamat Garasi / Pool Bus"
                        value={newBus.alamatGarasi}
                        onChange={(e) => setNewBus({ ...newBus, alamatGarasi: e.target.value })}
                        className="text-xs"
                      />
                      <Input
                        placeholder="Catatan Armada (Contoh: Jetbus 5 50-Seat, HDD, SHD)"
                        value={newBus.catatanArmada}
                        onChange={(e) => setNewBus({ ...newBus, catatanArmada: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-8 px-4 rounded-lg">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Simpan ke Rekanan
                      </Button>
                    </div>
                  </form>

                  {/* LIST PO BUS */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-500">
                      Daftar Rekanan Terdaftar ({cmsData.rekananBus.length})
                    </div>
                    {cmsData.rekananBus.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        Belum ada data PO Bus. Tambahkan rekanan bus langganan Anda di atas.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {cmsData.rekananBus.map((bus) => (
                          <div
                            key={bus.id}
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-start gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {bus.namaPO}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                <span>{bus.kontakPerson || "Marketing"}</span>
                                <span>•</span>
                                <span className="font-mono text-cyan-600 dark:text-cyan-400">{bus.telepon || "-"}</span>
                              </div>
                              {bus.catatanArmada && (
                                <div className="text-[10px] text-slate-400 truncate">
                                  {bus.catatanArmada}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBus(bus.id)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0 flex-shrink-0"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 5. SECTION: REKANAN RUMAH MAKAN                               */}
              {/* ------------------------------------------------------------- */}
              {activeSection === "resto" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5 text-amber-600" />
                      Katalog Rekanan Rumah Makan & Restoran
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Katalog rumah makan rute perjalanan wisata untuk reservasi makan rombongan dan pencatatan kas per pax.
                    </p>
                  </div>

                  {/* FORM TAMBAH RESTO */}
                  <form onSubmit={handleAddResto} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      + Tambah Rumah Makan Baru
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        required
                        placeholder="Nama Resto (Contoh: RM Grafika Cikole)"
                        value={newResto.namaResto}
                        onChange={(e) => setNewResto({ ...newResto, namaResto: e.target.value })}
                        className="text-xs"
                      />
                      <Input
                        placeholder="Lokasi / Rute (Contoh: Lembang, Bandung)"
                        value={newResto.lokasiRute}
                        onChange={(e) => setNewResto({ ...newResto, lokasiRute: e.target.value })}
                        className="text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Estimasi Harga/Pax (Rp)"
                        value={newResto.hargaPerPax}
                        onChange={(e) => setNewResto({ ...newResto, hargaPerPax: Number(e.target.value) })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Kontak Person (CP Reservasi)"
                        value={newResto.kontakPerson}
                        onChange={(e) => setNewResto({ ...newResto, kontakPerson: e.target.value })}
                        className="text-xs"
                      />
                      <Input
                        placeholder="No. Telepon / WA Reservasi"
                        value={newResto.telepon}
                        onChange={(e) => setNewResto({ ...newResto, telepon: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-4 rounded-lg">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Simpan ke Rekanan
                      </Button>
                    </div>
                  </form>

                  {/* LIST RESTO */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-500">
                      Daftar Rumah Makan Terdaftar ({cmsData.rekananResto.length})
                    </div>
                    {cmsData.rekananResto.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        Belum ada data resto rekanan. Tambahkan rute resto favorit Anda di atas.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {cmsData.rekananResto.map((resto) => (
                          <div
                            key={resto.id}
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-start gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {resto.namaResto}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {resto.lokasiRute || "Jalur Utama"} •{" "}
                                <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                                  Rp {resto.hargaPerPax.toLocaleString("id-ID")}/pax
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                CP: {resto.kontakPerson || "-"} ({resto.telepon || "-"})
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteResto(resto.id)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0 flex-shrink-0"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 7. SECTION: STATUS PAKET LISENSI & KUOTA                      */}
              {/* ------------------------------------------------------------- */}
              {activeSection === "lisensi" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-500" />
                        Status Lisensi & Hak Akses Akun
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Informasi tingkat langganan aktif, kuota trip, kapasitas kru, dan fitur yang disetujui Super Admin.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate("/boost")}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-4 rounded-xl flex-shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5 mr-1.5" />
                      Upgrade Paket di /boost
                    </Button>
                  </div>

                  {/* KARTU STATUS LISENSI */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase">Tingkat Paket Aktif</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white uppercase font-mono">
                        {entitlements.tier}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {entitlements.tier === "enterprise"
                          ? "Lisensi Enterprise Dedicated dengan domain & VPS"
                          : entitlements.tier === "pro"
                          ? "Lisensi Pro Sekali Bayar dengan akses Desktop"
                          : "Lisensi Starter Mobile PWA"}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase">Akses Mode Desktop PC</div>
                      <div className="text-lg font-bold">
                        {entitlements.canUseDesktopMode ? (
                          <span className="text-emerald-600">✓ Terbuka (Aktif)</span>
                        ) : (
                          <span className="text-slate-500">Terkunci (Mobile Only)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {entitlements.canUseDesktopMode
                          ? "Anda bebas membuka aplikasi di laptop, PC, dan monitor besar"
                          : "Upgrade ke Pro/Enterprise untuk membuka antarmuka Desktop PC"}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase">Kapasitas Kuota Trip</div>
                      <div className="text-lg font-bold font-mono text-cyan-600">
                        {entitlements.maxActiveTrips >= 9000 ? "∞ Tidak Terbatas" : `${entitlements.maxActiveTrips} Jadwal Aktif`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Batas jumlah trip berjalan secara simultan
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase">Kapasitas Personel Kru</div>
                      <div className="text-lg font-bold font-mono text-indigo-600">
                        {entitlements.maxCrewMembers >= 9000 ? "∞ Tidak Terbatas" : `${entitlements.maxCrewMembers} Akun Kru`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Jumlah slot login untuk tour leader & driver lapangan
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left">
                      Butuh penambahan slot kuota atau bantuan konfigurasi domain kustom? Hubungi Super Admin langsung.
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTicketModal(true)}
                      className="text-xs h-8 px-4 rounded-lg flex-shrink-0"
                    >
                      Kirim Tiket ke Admin
                    </Button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 8. SECTION: INTEGRASI GOOGLE GEMINI AI                        */}
              {/* ------------------------------------------------------------- */}
              {activeSection === "ai" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-violet-600" />
                      Konfigurasi Asisten AI Wisata (Google Gemini)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Asisten konsultasi itinerary dan rekomendasi rute ditenagai oleh Google Gemini API. Dilindungi proteksi konfirmasi bertingkat agar tidak terhapus tanpa sengaja.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                        Status Kunci API Gemini:
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          apiKey ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {apiKey ? "✓ Terhubung Aktif" : "Belum Dikonfigurasi"}
                      </Badge>
                    </div>

                    {!isEditingApiKey ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type={showApiKey ? "text" : "password"}
                            readOnly
                            value={apiKey ? (showApiKey ? apiKey : "••••••••••••••••••••••••••••••••••••••••") : ""}
                            placeholder="Belum ada API Key tersimpan"
                            className="text-xs font-mono bg-white dark:bg-slate-900"
                          />
                          {apiKey && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="h-9 px-3 flex-shrink-0"
                              title={showApiKey ? "Sembunyikan" : "Tampilkan Key"}
                            >
                              {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                        </div>

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setTempApiKey(apiKey);
                              setShowApiKeyConfirmModal(true);
                            }}
                            className="text-xs h-8 px-3 rounded-lg"
                          >
                            <Key className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                            {apiKey ? "Ubah Kunci API Key" : "+ Pasang Kunci API Baru"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Masukkan Google Gemini API Key Baru:
                        </Label>
                        <Input
                          type="text"
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className="text-xs font-mono bg-white dark:bg-slate-900"
                        />
                        <p className="text-[11px] text-slate-500">
                          Kunci API dapat diperoleh secara gratis di{" "}
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline font-medium"
                          >
                            Google AI Studio
                          </a>.
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingApiKey(false)}
                            className="text-xs h-8 px-3"
                          >
                            Batal
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveApiKey}
                            className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8 px-4"
                          >
                            Simpan Kunci API
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 9. SECTION: PUSAT BANTUAN & TIKET DUKUNGAN                    */}
              {/* ------------------------------------------------------------- */}
              {activeSection === "bantuan" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <LifeBuoy className="w-5 h-5 text-blue-600" />
                      Pusat Tiket Bantuan & Dukungan Teknis
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Kirim kendala teknis atau permintaan aktivasi fitur langsung ke Super Admin platform CatatBiro.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-4 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <LifeBuoy className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          Punya pertanyaan atau menghadapi kendala di sistem?
                        </div>
                        <div className="text-xs text-slate-500">
                          Tim support Super Admin akan menindaklanjuti laporan Anda dan memberikan solusi melalui notifikasi serta WhatsApp.
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowTicketModal(true)}
                      className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-9 px-5 rounded-xl"
                    >
                      + Buat Tiket Kendala Baru
                    </Button>
                  </div>

                  <div className="pt-2 text-xs text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Sistem terhubung langsung dengan konsol pengawasan Super Admin secara real-time.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* MODAL KONFIRMASI GANTI API KEY (KEAMANAN GANDA)                            */}
        {/* ========================================================================= */}
        <Dialog open={showApiKeyConfirmModal} onOpenChange={setShowApiKeyConfirmModal}>
          <DialogContent className="max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Ubah Kunci Gemini AI?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Pastikan Anda sudah memiliki API Key Google AI Studio aktif agar fitur konsultasi jadwal dan analisis rute AI tidak berhenti berfungsi.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowApiKeyConfirmModal(false)}
                className="flex-1 text-xs h-9 rounded-xl"
              >
                Batal
              </Button>
              <Button
                onClick={() => {
                  setShowApiKeyConfirmModal(false);
                  setIsEditingApiKey(true);
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 rounded-xl"
              >
                Lanjutkan Ubah
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL QR CODE PROFIL BIRO                                                 */}
        {/* ========================================================================= */}
        <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
          <DialogContent className="max-w-xs text-center bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{profile.nama_biro}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Scan QR Code untuk kontak WhatsApp kantor</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `https://wa.me/${(profile.telepon || "").replace(/[^0-9]/g, "")}`
                )}`}
                alt="QR Code"
                className="w-36 h-36 rounded-lg"
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

        {/* ========================================================================= */}
        {/* MODAL STUDIO PEMBERSIH & ROTASI TANDA TANGAN / STEMPEL BASAH              */}
        {/* ========================================================================= */}
        <Dialog open={showImageEditor} onOpenChange={setShowImageEditor}>
          <DialogContent className="w-[95vw] max-w-lg rounded-2xl p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 max-h-[92vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-blue-600" />
                {editingTarget === "ttd"
                  ? "Studio Pembersih Tanda Tangan"
                  : "Studio Pembersih Stempel Basah"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Luruskan tanda tangan yang menceng dan hilangkan latar belakang kertas menjadi transparan murni.
              </DialogDescription>
            </DialogHeader>

            {/* PREVIEW KOTAK TRANSPARANSI DENGAN MOTIF PAPAN CATUR */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">
                  Pratinjau Hasil Bersih (Background Transparan):
                </span>
                <div className="relative rounded-2xl border border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center p-4 bg-[repeating-conic-gradient(#cbd5e1_0%_25%,#f8fafc_0%_50%)] dark:bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)] [background-size:16px_16px] min-h-[170px] max-h-[220px]">
                  {processedPreviewUrl ? (
                    <img
                      src={processedPreviewUrl}
                      alt="Hasil Transparan"
                      className="max-h-[160px] max-w-full object-contain drop-shadow-sm select-none transition-transform duration-150"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sedang memproses transparansi...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* KONTROL ROTASI (UNTUK LURUSKAN YANG MENCENG / MIRING) */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                    Luruskan Posisi ({editorRotation}°)
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Klik tombol untuk memutar bila foto terbalik / menceng
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRotate(-90)}
                    className="h-8 px-2.5 text-xs font-semibold gap-1 rounded-xl"
                    title="Putar 90° ke kiri"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>-90°</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRotate(90)}
                    className="h-8 px-3 text-xs font-bold gap-1 rounded-xl bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shadow-2xs"
                    title="Putar 90° ke kanan"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Putar 90°</span>
                  </Button>
                </div>
              </div>

              {/* SLIDER SENSITIVITAS HAPUS KERTAS */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    Sensitivitas Pembersih Latar Kertas
                  </span>
                  <span className="font-mono text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    {editorThreshold}
                  </span>
                </div>
                <input
                  type="range"
                  min="130"
                  max="240"
                  step="5"
                  value={editorThreshold}
                  onChange={(e) => setEditorThreshold(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Pertahankan Garis Tipis</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Standar (195)</span>
                  <span>Hapus Bayangan Gelap</span>
                </div>
              </div>

              {/* PILIHAN WARNA TINTA */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Warna Tinta yang Diinginkan:
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditorTintColor("black")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      editorTintColor === "black"
                        ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Hitam Pekat
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTintColor("blue")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      editorTintColor === "blue"
                        ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Biru Pulpen
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTintColor("original")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      editorTintColor === "original"
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Warna Asli
                  </button>
                </div>
              </div>
            </div>

            {/* FOOTER MODAL */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowImageEditor(false)}
                className="w-full sm:w-auto text-xs h-9 px-4 rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyProcessedImage}
                disabled={saving || !processedPreviewUrl}
                className="w-full sm:w-auto text-xs h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Gunakan Hasil Bersih & Transparan</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL TIKET SUPPORT KE SUPER ADMIN                                        */}
        {/* ========================================================================= */}
        <CreateSupportTicketModal
          open={showTicketModal}
          onOpenChange={setShowTicketModal}
          profile={profile}
          onTicketCreated={() => {
            toast.success("Laporan Anda berhasil dikirim ke Super Admin!");
            setShowTicketModal(false);
          }}
        />

        {/* BOTTOM NAV UNTUK MOBILE PWA */}
        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default ProfilBiro;
