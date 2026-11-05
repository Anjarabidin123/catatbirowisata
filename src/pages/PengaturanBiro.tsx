import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  Trash2,
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
} from "lucide-react";
import {
  getLocalBiroProfile,
  saveBiroProfile,
  uploadBiroLogo,
  BiroProfile,
} from "@/utils/biroProfile";
import RBACOwnerGuard from "@/components/RBACOwnerGuard";
import { logCrewActivity } from "@/utils/rbacAuditLogger";

const PengaturanBiro = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<BiroProfile>(getLocalBiroProfile());
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const current = getLocalBiroProfile();
    setProfile(current);
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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile.nama_biro.trim()) {
      toast.error("Nama biro wisata tidak boleh kosong");
      return;
    }

    setLoading(true);

    const updatedProfile: BiroProfile = {
      ...profile,
    };

    try {
      await saveBiroProfile(updatedProfile);
      setProfile(updatedProfile);
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

  return (
    <AuthGuard>
      <RBACOwnerGuard
        ruleId="rule_pengaturan_biro"
        pageTitle="Profil Biro & Rekening Bank"
        reason="Pengaturan identitas resmi biro dan nomor rekening bank pembayaran invoice klien hanya boleh diakses oleh Pemilik Biro."
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
                    Kelola identitas biro wisata dan rekening pembayaran invoice resmi
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

            {/* Form Content */}
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
              <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden lg:col-span-2">
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Nama Bank */}
                    <div className="space-y-1.5">
                      <Label htmlFor="nama_bank" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Nama Bank
                      </Label>
                      <Input
                        id="nama_bank"
                        value={profile.nama_bank || ""}
                        onChange={(e) => setProfile({ ...profile, nama_bank: e.target.value })}
                        placeholder="Contoh: Bank BCA / Mandiri / BRI"
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
                        placeholder="Contoh: Catat Biro Wisata"
                        className="h-10 text-sm rounded-xl font-semibold"
                      />
                    </div>
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
      </RBACOwnerGuard>
    </AuthGuard>
  );
};

export default PengaturanBiro;
