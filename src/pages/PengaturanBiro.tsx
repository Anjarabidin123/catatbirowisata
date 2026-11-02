import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  Trash2,
  Check,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  RotateCcw,
  Zap,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Globe,
  CreditCard,
  Landmark,
  ArrowLeft,
  Save,
  HelpCircle,
} from "lucide-react";
import {
  getLocalBiroProfile,
  saveBiroProfile,
  uploadBiroLogo,
  BiroProfile,
  DEFAULT_GEMINI_API_KEY,
  isUsingDefaultGeminiApiKey,
} from "@/utils/biroProfile";
import { testGeminiApiKey } from "@/utils/asistenWisataAI";
import RBACOwnerGuard from "@/components/RBACOwnerGuard";
import { logCrewActivity } from "@/utils/rbacAuditLogger";

const PengaturanBiro = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<BiroProfile>(getLocalBiroProfile());
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keamanan Berlapis API Key
  const [isKeyUnlocked, setIsKeyUnlocked] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [hasConfirmedReplacement, setHasConfirmedReplacement] = useState(false);
  const [showKeyText, setShowKeyText] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");

  useEffect(() => {
    const current = getLocalBiroProfile();
    setProfile(current);
    setTempApiKey(current.gemini_api_key || DEFAULT_GEMINI_API_KEY);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran logo maksimal 2 MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const logoUrl = await uploadBiroLogo(file);
      setProfile((prev) => ({ ...prev, logo_url: logoUrl }));
      toast.success("Logo berhasil diunggah!");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setProfile((prev) => ({ ...prev, logo_url: null }));
    toast.info("Logo dihapus dari tampilan");
  };

  // Keamanan API Key: Dialog Peringatan
  const handleRequestUnlockKey = () => {
    setHasConfirmedReplacement(false);
    setShowSecurityWarning(true);
  };

  const handleConfirmUnlock = () => {
    if (!hasConfirmedReplacement) {
      toast.error("Silakan centang persetujuan bahwa Anda memahami risikonya.");
      return;
    }
    setShowSecurityWarning(false);
    setIsKeyUnlocked(true);
    toast.warning("Kunci API dibuka. Hati-hati saat mengedit kunci!");
  };

  const handleTestKey = async (keyToTest: string) => {
    const target = keyToTest.trim() || DEFAULT_GEMINI_API_KEY;
    setTestingKey(true);
    try {
      const res = await testGeminiApiKey(target);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(`Koneksi Gagal: ${res.message}`);
      }
    } catch (err: any) {
      toast.error("Gagal menghubungi server Google AI: " + err.message);
    } finally {
      setTestingKey(false);
    }
  };

  const handleResetToDefaultKey = () => {
    setTempApiKey(DEFAULT_GEMINI_API_KEY);
    setProfile((prev) => ({ ...prev, gemini_api_key: DEFAULT_GEMINI_API_KEY }));
    setIsKeyUnlocked(false);
    toast.info("API Key dikembalikan ke Kunci Bawaan Sistem yang aman.");
  };

  const handleCancelKeyEdit = () => {
    setTempApiKey(profile.gemini_api_key || DEFAULT_GEMINI_API_KEY);
    setIsKeyUnlocked(false);
    toast.info("Perubahan API Key dibatalkan");
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile.nama_biro.trim()) {
      toast.error("Nama biro wisata tidak boleh kosong");
      return;
    }

    const finalApiKey = isKeyUnlocked
      ? tempApiKey.trim() || DEFAULT_GEMINI_API_KEY
      : profile.gemini_api_key?.trim() || DEFAULT_GEMINI_API_KEY;

    setLoading(true);

    if (
      isKeyUnlocked &&
      finalApiKey !== DEFAULT_GEMINI_API_KEY &&
      finalApiKey !== profile.gemini_api_key
    ) {
      try {
        const testRes = await testGeminiApiKey(finalApiKey);
        if (!testRes.success) {
          setLoading(false);
          toast.error(
            `Kunci API Baru Tidak Valid: ${testRes.message}. Penyimpanan dibatalkan demi keamanan fitur AI.`
          );
          return;
        }
      } catch (err: any) {
        setLoading(false);
        toast.error("Gagal memverifikasi API Key baru: " + (err.message || "Koneksi terputus"));
        return;
      }
    }

    const updatedProfile: BiroProfile = {
      ...profile,
      gemini_api_key: finalApiKey,
    };

    try {
      await saveBiroProfile(updatedProfile);
      setProfile(updatedProfile);
      setIsKeyUnlocked(false);
      logCrewActivity({
        kategori: "keamanan_rbac",
        aksi: `Memperbarui Profil & Rekening Biro: ${updatedProfile.nama_biro}`,
        detail: `Bank: ${updatedProfile.nama_bank || "-"} (${updatedProfile.nomor_rekening || "-"}) a.n ${updatedProfile.atas_nama_rekening || "-"}`,
        status: "penting",
      });
      toast.success("Pengaturan profil & rekening biro berhasil disimpan!");
    } catch (err: any) {
      toast.error("Gagal menyimpan pengaturan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDefaultKeyActive = isUsingDefaultGeminiApiKey();
  const currentKeyString = profile.gemini_api_key || DEFAULT_GEMINI_API_KEY;
  const maskedKey =
    currentKeyString.length > 12
      ? `${currentKeyString.slice(0, 5)}••••••••••••••••••••${currentKeyString.slice(-4)}`
      : "••••••••••••••••";

  return (
    <AuthGuard>
      <RBACOwnerGuard
        ruleId="rule_pengaturan_biro"
        pageTitle="Profil Biro, Rekening Bank & Kunci API AI"
        reason="Pengaturan identitas resmi biro, nomor rekening bank pembayaran invoice klien, dan kunci Google Gemini AI hanya boleh diakses oleh Pemilik Biro."
      >
      <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 lg:pl-64 pb-24 lg:pb-12 font-sans text-slate-900 dark:text-slate-100">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="lg:hidden h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Profil & Rekening Biro
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Kelola identitas biro wisata, rekening pembayaran invoice resmi & integrasi Google Gemini AI
                </p>
              </div>
            </div>

            <Button
              onClick={() => handleSave()}
              disabled={loading || uploadingLogo}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 h-10 rounded-xl shadow-md shadow-blue-500/20 gap-2 flex-shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </Button>
          </div>

          {/* Form Content - 2 Columns on Desktop */}
          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Identitas & Logo Biro */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Identitas & Branding Biro
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Logo dan nama resmi yang tercetak pada kop surat, rundown acara & kwitansi pelanggan.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Logo Section */}
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Logo Resmi Biro Wisata
                  </Label>
                  <div className="mt-2 flex items-center gap-4">
                    {profile.logo_url ? (
                      <div className="relative w-20 h-20 rounded-2xl border-2 border-blue-500/30 overflow-hidden bg-white shadow-sm flex items-center justify-center p-1.5 group flex-shrink-0">
                        <img
                          src={profile.logo_url}
                          alt="Logo Biro"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute inset-0 bg-rose-600/85 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus Logo"
                        >
                          <Trash2 className="w-5 h-5 mb-0.5" />
                          <span className="text-[10px] font-bold">Hapus</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/40 bg-slate-50 dark:bg-slate-800/50 transition-all flex-shrink-0"
                      >
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-bold mt-1">
                          Unggah Logo
                        </span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="h-8 text-xs rounded-xl font-bold border-slate-200 dark:border-slate-700"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        {uploadingLogo ? "Mengunggah..." : "Pilih Berkas Logo"}
                      </Button>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Format PNG transparan atau JPG. Ukuran maks 2 MB. Logo akan tampil di kop dokumen resmi & sidebar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nama Biro */}
                <div className="space-y-1.5">
                  <Label htmlFor="nama_biro" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nama Biro Perjalanan Wisata <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="nama_biro"
                    value={profile.nama_biro}
                    onChange={(e) => setProfile({ ...profile, nama_biro: e.target.value })}
                    placeholder="Contoh: Catat Biro Wisata"
                    className="h-10 text-sm font-semibold rounded-xl"
                    required
                  />
                </div>

                {/* Slogan */}
                <div className="space-y-1.5">
                  <Label htmlFor="slogan" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Slogan / Sub-judul Biro
                  </Label>
                  <Input
                    id="slogan"
                    value={profile.slogan}
                    onChange={(e) => setProfile({ ...profile, slogan: e.target.value })}
                    placeholder="Contoh: Biro Perjalanan Wisata & Sewa Bus Pariwisata"
                    className="h-10 text-sm rounded-xl font-medium"
                  />
                </div>

                {/* Nama Pimpinan */}
                <div className="space-y-1.5">
                  <Label htmlFor="pimpinan" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    Nama Pimpinan / Direktur Operasional
                  </Label>
                  <Input
                    id="pimpinan"
                    value={profile.pimpinan || ""}
                    onChange={(e) => setProfile({ ...profile, pimpinan: e.target.value })}
                    placeholder="Contoh: H. Anjar Abidin, S.E."
                    className="h-10 text-sm rounded-xl font-medium"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Kontak & Legalitas Operasional */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Kontak & Legalitas Operasional
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Alamat pool bus, kontak WhatsApp, dan informasi komunikasi biro.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Alamat */}
                <div className="space-y-1.5">
                  <Label htmlFor="alamat" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Alamat Lengkap Kantor & Pool Bus
                  </Label>
                  <Textarea
                    id="alamat"
                    value={profile.alamat || ""}
                    onChange={(e) => setProfile({ ...profile, alamat: e.target.value })}
                    placeholder="Contoh: Jl. Raya Demak - Kudus KM 4, Demak, Jawa Tengah"
                    rows={2}
                    className="text-sm rounded-xl font-medium resize-none"
                  />
                </div>

                {/* Telepon */}
                <div className="space-y-1.5">
                  <Label htmlFor="telepon" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    Nomor Telepon / WhatsApp Resmi
                  </Label>
                  <Input
                    id="telepon"
                    value={profile.telepon || ""}
                    onChange={(e) => setProfile({ ...profile, telepon: e.target.value })}
                    placeholder="Contoh: 0812-2578-9000 / 0857-1234-5678"
                    className="h-10 text-sm rounded-xl font-medium"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    Email Resmi Operasional
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email || ""}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="Contoh: operasional@birowisata.id"
                    className="h-10 text-sm rounded-xl font-medium"
                  />
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    Website / Akun Instagram Biro
                  </Label>
                  <Input
                    id="website"
                    value={profile.website || ""}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    placeholder="Contoh: www.catatbirowisata.id atau @birowisata"
                    className="h-10 text-sm rounded-xl font-medium"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Rekening Bank Pembayaran Invoice */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  Rekening Bank & Pembayaran Invoice
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Data rekening transfer yang otomatis tertera di Kwitansi Resmi & Invoice Penagihan Klien.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 flex items-start gap-2.5">
                  <Landmark className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-900 dark:text-amber-200 leading-snug">
                    Pastikan nomor rekening valid. Rombongan klien akan mentransfer DP atau pelunasan trip ke rekening ini.
                  </p>
                </div>

                {/* Nama Bank */}
                <div className="space-y-1.5">
                  <Label htmlFor="nama_bank" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nama Bank
                  </Label>
                  <Input
                    id="nama_bank"
                    value={profile.nama_bank || ""}
                    onChange={(e) => setProfile({ ...profile, nama_bank: e.target.value })}
                    placeholder="Contoh: Bank BCA / Bank Mandiri / BRI / BNI"
                    className="h-10 text-sm rounded-xl font-semibold"
                  />
                </div>

                {/* Nomor Rekening */}
                <div className="space-y-1.5">
                  <Label htmlFor="nomor_rekening" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nomor Rekening
                  </Label>
                  <Input
                    id="nomor_rekening"
                    value={profile.nomor_rekening || ""}
                    onChange={(e) => setProfile({ ...profile, nomor_rekening: e.target.value })}
                    placeholder="Contoh: 136-00-1234567-8"
                    className="h-10 text-sm rounded-xl font-mono font-bold tracking-wider"
                  />
                </div>

                {/* Atas Nama Rekening */}
                <div className="space-y-1.5">
                  <Label htmlFor="atas_nama_rekening" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Atas Nama Pemilik Rekening (A.N.)
                  </Label>
                  <Input
                    id="atas_nama_rekening"
                    value={profile.atas_nama_rekening || ""}
                    onChange={(e) => setProfile({ ...profile, atas_nama_rekening: e.target.value })}
                    placeholder="Contoh: Catat Biro Wisata atau Nama Pemilik"
                    className="h-10 text-sm rounded-xl font-semibold"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Keamanan & Integrasi Google Gemini AI */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Keamanan & Integrasi Google AI
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-2 py-0.5 border ${
                      isDefaultKeyActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
                    }`}
                  >
                    {isDefaultKeyActive ? "Kunci Sistem Aktif" : "Kunci Mandiri Pengguna"}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Integrasi Google Gemini Flash AI untuk susun rute, rundown bus & resto rombongan.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      Status Kunci Google Gemini API
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {isKeyUnlocked ? "TERBUKA (EDIT MODE)" : "TERKUNCI AMAN"}
                    </span>
                  </div>

                  {!isKeyUnlocked ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400 tracking-wider">
                          {maskedKey}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestKey(currentKeyString)}
                            disabled={testingKey}
                            className="h-7 px-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          >
                            {testingKey ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                            Tes AI
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRequestUnlockKey}
                          className="flex-1 h-8 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          <Unlock className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                          Buka Kunci untuk Ganti API Key
                        </Button>

                        {!isDefaultKeyActive && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetToDefaultKey}
                            className="h-8 text-xs font-bold rounded-xl text-slate-500 hover:text-slate-800"
                            title="Kembalikan ke Kunci Bawaan Sistem"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1.5">
                        <Label htmlFor="apiKeyInput" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Masukkan Google Gemini API Key Baru:
                        </Label>
                        <div className="relative">
                          <Input
                            id="apiKeyInput"
                            type={showKeyText ? "text" : "password"}
                            value={tempApiKey}
                            onChange={(e) => setTempApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="pr-10 h-10 text-xs font-mono font-medium rounded-xl"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeyText(!showKeyText)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleTestKey(tempApiKey)}
                          disabled={testingKey || !tempApiKey.trim()}
                          className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5"
                        >
                          {testingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          Uji Coba Kunci
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResetToDefaultKey}
                          className="h-8 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Gunakan Bawaan Sistem
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelKeyEdit}
                          className="h-8 text-xs font-bold rounded-xl text-slate-500"
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Catatan:</span> Sistem dilengkapi Kunci Bawaan yang aktif secara otomatis. Penggantian kunci hanya diperlukan jika biro Anda ingin kuota dedicated Gemini API dari Google Cloud Console.
                  </p>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Bottom Floating/Fixed Save Bar for Mobile */}
          <div className="lg:hidden fixed bottom-16 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Pengaturan Biro Wisata
            </span>
            <Button
              onClick={() => handleSave()}
              disabled={loading || uploadingLogo}
              size="sm"
              className="bg-blue-600 text-white font-bold rounded-xl px-4 h-9 shadow-sm"
            >
              {loading ? "Menyimpan..." : "Simpan Profil"}
            </Button>
          </div>
        </div>

        <BottomNav />
      </div>

      {/* Layer Keamanan 2: Modal Peringatan Konfirmasi Unlock API Key */}
      <AlertDialog open={showSecurityWarning} onOpenChange={setShowSecurityWarning}>
        <AlertDialogContent className="rounded-3xl max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-base font-extrabold text-slate-900 dark:text-white">
              Peringatan Keamanan Kunci AI
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <p>
                Sistem saat ini sudah terhubung ke mesin Google Gemini AI bawaan yang aman dan stabil untuk menyusun rundown dan konsultasi wisata.
              </p>
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                Jika Anda memasukkan API Key yang salah atau kuotanya habis, fitur Asisten AI di biro Anda tidak akan bisa merespons.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
            <Checkbox
              id="confirmUnlockPage"
              checked={hasConfirmedReplacement}
              onCheckedChange={(checked) => setHasConfirmedReplacement(Boolean(checked))}
              className="mt-0.5 rounded-md"
            />
            <label
              htmlFor="confirmUnlockPage"
              className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none leading-tight"
            >
              Saya memahami risiko ini dan ingin mengubah kunci Google AI secara mandiri.
            </label>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              onClick={() => setShowSecurityWarning(false)}
              className="rounded-xl text-xs font-bold"
            >
              Batalkan
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnlock}
              disabled={!hasConfirmedReplacement}
              className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              Buka Kunci
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />
      </RBACOwnerGuard>
    </AuthGuard>
  );
};

export default PengaturanBiro;
