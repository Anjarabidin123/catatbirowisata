import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  Trash2,
  Check,
  Key,
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

interface PengaturanBiroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PengaturanBiroDialog = ({
  open,
  onOpenChange,
}: PengaturanBiroDialogProps) => {
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
    if (open) {
      const current = getLocalBiroProfile();
      setProfile(current);
      setTempApiKey(current.gemini_api_key || DEFAULT_GEMINI_API_KEY);
      setIsKeyUnlocked(false);
      setShowSecurityWarning(false);
      setHasConfirmedReplacement(false);
      setShowKeyText(false);
    }
  }, [open]);

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

  // Layer 1 -> Layer 2: Memicu dialog peringatan keamanan sebelum buka kunci
  const handleRequestUnlockKey = () => {
    setHasConfirmedReplacement(false);
    setShowSecurityWarning(true);
  };

  // Layer 2 -> Layer 3: Pengguna menyetujui peringatan keamanan
  const handleConfirmUnlock = () => {
    if (!hasConfirmedReplacement) {
      toast.error("Silakan centang persetujuan bahwa Anda memahami risikonya.");
      return;
    }
    setShowSecurityWarning(false);
    setIsKeyUnlocked(true);
    toast.warning("Kunci API dibuka. Hati-hati saat mengedit kunci!");
  };

  // Layer 3: Tes validitas API key baru atau yang sedang aktif
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

  // Reset ke Default Sistem (Safety net)
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.nama_biro.trim()) {
      toast.error("Nama biro wisata tidak boleh kosong");
      return;
    }

    // Pastikan API key tersimpan dengan aman
    const finalApiKey = isKeyUnlocked
      ? (tempApiKey.trim() || DEFAULT_GEMINI_API_KEY)
      : (profile.gemini_api_key?.trim() || DEFAULT_GEMINI_API_KEY);

    setLoading(true);

    // Pengamanan Berlapis: Jika pengguna memasukkan kunci kustom baru, verifikasi langsung ke server Google AI
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
      toast.success("Pengaturan profil & API Key biro berhasil disimpan!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan pengaturan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDefaultKeyActive = isUsingDefaultGeminiApiKey();
  const currentKeyString = profile.gemini_api_key || DEFAULT_GEMINI_API_KEY;
  const maskedKey = currentKeyString.length > 12
    ? `${currentKeyString.slice(0, 5)}••••••••••••••••••••${currentKeyString.slice(-4)}`
    : "••••••••••••••••";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                <Building2 className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Pengaturan Biro & AI
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Kelola identitas biro wisata serta keamanan integrasi Google Gemini AI.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Logo Biro Upload Section */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Logo Biro Wisata
              </Label>

              <div className="mt-2 flex items-center gap-3">
                {profile.logo_url ? (
                  <div className="relative w-14 h-14 rounded-2xl border-2 border-blue-500/30 overflow-hidden bg-white shadow-sm flex items-center justify-center p-1 group flex-shrink-0">
                    <img
                      src={profile.logo_url}
                      alt="Logo Biro"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Hapus Logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 bg-slate-50 dark:bg-slate-800/50 transition-colors flex-shrink-0"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                      Unggah
                    </span>
                  </div>
                )}

                <div className="flex-1 space-y-1">
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
                    className="h-7 text-xs rounded-xl font-medium border-slate-200 dark:border-slate-700"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    {uploadingLogo
                      ? "Mengunggah..."
                      : profile.logo_url
                      ? "Ganti Logo"
                      : "Pilih File Logo"}
                  </Button>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    PNG, JPG atau SVG. Maks 2 MB. Disarankan transparan.
                  </p>
                </div>
              </div>
            </div>

            {/* Nama Biro Wisata */}
            <div className="space-y-1">
              <Label
                htmlFor="nama_biro"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Nama Biro Wisata
              </Label>
              <Input
                id="nama_biro"
                value={profile.nama_biro}
                onChange={(e) =>
                  setProfile({ ...profile, nama_biro: e.target.value })
                }
                placeholder="Contoh: Malika Tour & Travel"
                required
                className="h-9 text-xs sm:text-sm rounded-xl font-medium"
              />
            </div>

            {/* Slogan */}
            <div className="space-y-1">
              <Label
                htmlFor="slogan"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Slogan / Tagline
              </Label>
              <Input
                id="slogan"
                value={profile.slogan}
                onChange={(e) =>
                  setProfile({ ...profile, slogan: e.target.value })
                }
                placeholder="Contoh: Sahabat Perjalanan Wisata Anda"
                className="h-9 text-xs sm:text-sm rounded-xl"
              />
            </div>

            {/* ========================================================= */}
            {/* KEAMANAN BERLAPIS: GOOGLE GEMINI API KEY                   */}
            {/* ========================================================= */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Google Gemini AI API Key
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      isDefaultKeyActive
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>{isDefaultKeyActive ? "Sistem Default" : "Kustom"}</span>
                  </span>
                </div>
              </div>

              {!isKeyUnlocked ? (
                /* LAYER 1: READ-ONLY & TERLINDUNGI */
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300 select-none">
                        {maskedKey}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Aktif
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Kunci dilindungi untuk mencegah perubahan tidak sengaja. Asisten AI berjalan otomatis dengan model Google Gemini.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestKey(currentKeyString)}
                      disabled={testingKey}
                      className="h-8 text-xs rounded-xl flex-1 border-slate-200 dark:border-slate-700 font-semibold"
                    >
                      {testingKey ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          <span>Menguji...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 mr-1 text-amber-500" />
                          <span>Tes Koneksi</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRequestUnlockKey}
                      className="h-8 text-xs rounded-xl flex-1 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <Unlock className="w-3 h-3 mr-1 text-blue-600" />
                      <span>Ubah Kunci API</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* LAYER 3: MODE EDIT AKTIF SETELAH KONFIRMASI */
                <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-2.5">
                  <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
                    <span className="text-[11px] font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Mode Edit Kunci API Terbuka</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowKeyText(!showKeyText)}
                      className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                    >
                      {showKeyText ? (
                        <>
                          <EyeOff className="w-3 h-3" /> Sembunyikan
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" /> Tampilkan
                        </>
                      )}
                    </button>
                  </div>

                  <Input
                    type={showKeyText ? "text" : "password"}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Masukkan API Key Google Gemini..."
                    className="h-9 text-xs rounded-xl font-mono bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700"
                  />

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestKey(tempApiKey)}
                      disabled={testingKey || !tempApiKey.trim()}
                      className="h-7 text-[11px] rounded-lg border-amber-300 dark:border-amber-700 font-semibold text-amber-900 dark:text-amber-200"
                    >
                      {testingKey ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Zap className="w-3 h-3 mr-1 text-amber-600" />
                      )}
                      <span>Tes Key Baru</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetToDefaultKey}
                      className="h-7 text-[11px] rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600"
                    >
                      <RotateCcw className="w-3 h-3 mr-1 text-slate-400" />
                      <span>Reset ke Bawaan</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelKeyEdit}
                      className="h-7 text-[11px] rounded-lg ml-auto text-slate-500 hover:text-slate-700"
                    >
                      <span>Batal Ubah</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Simpan Form */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-xl h-9 text-xs"
              >
                Tutup
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 text-xs font-semibold shadow-md shadow-blue-500/20"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                {loading ? "Menyimpan..." : "Simpan Pengaturan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* LAYER 2: DIALOG PERINGATAN KEAMANAN SEBELUM EDIT API KEY  */}
      {/* ========================================================= */}
      <AlertDialog
        open={showSecurityWarning}
        onOpenChange={setShowSecurityWarning}
      >
        <AlertDialogContent className="sm:max-w-md rounded-3xl p-5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 shadow-2xl">
          <AlertDialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Peringatan Keamanan Kunci AI
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400 space-y-2 text-left leading-relaxed">
              <p>
                Fitur <strong>Asisten AI & Konsultan Rute</strong> memerlukan Google Gemini API Key yang aktif. Jika kunci diubah sembarangan atau terhapus, fitur konsultasi AI otomatis tidak dapat digunakan.
              </p>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-[11px] font-medium space-y-1.5">
                <p className="font-bold">Konfirmasi Pengamanan Developer:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Yakin ingin mengubah atau mengedit API Key ini?</li>
                  <li>Apakah Anda sudah mendapatkan API Key pengganti yang aktif dan valid?</li>
                </ul>
                <p className="text-[10px] text-amber-800 dark:text-amber-300 italic pt-0.5">
                  Pengamanan berlapis ini dipasang developer untuk melindungi sistem agar pengguna awam tidak sengaja menghapus atau merusak kunci AI.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Konfirmasi Checkbox */}
          <div className="flex items-start gap-2 pt-2 pb-1">
            <Checkbox
              id="confirm-replacement"
              checked={hasConfirmedReplacement}
              onCheckedChange={(v) => setHasConfirmedReplacement(Boolean(v))}
              className="mt-0.5 rounded-md border-amber-400"
            />
            <label
              htmlFor="confirm-replacement"
              className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight cursor-pointer select-none"
            >
              Saya yakin dan sudah menyiapkan API Key pengganti yang aktif dari Google AI Studio.
            </label>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              onClick={() => setShowSecurityWarning(false)}
              className="rounded-xl h-9 text-xs font-medium"
            >
              Batal (Tetap Pakai Kunci Sekarang)
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnlock}
              disabled={!hasConfirmedReplacement}
              className="rounded-xl h-9 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ya, Buka Kunci Pengeditan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
