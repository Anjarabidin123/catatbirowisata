import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Upload, Trash2, Check, Sparkles, Key, Image as ImageIcon } from "lucide-react";
import { getLocalBiroProfile, saveBiroProfile, uploadBiroLogo, BiroProfile } from "@/utils/biroProfile";

interface PengaturanBiroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PengaturanBiroDialog = ({ open, onOpenChange }: PengaturanBiroDialogProps) => {
  const [profile, setProfile] = useState<BiroProfile>(getLocalBiroProfile());
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setProfile(getLocalBiroProfile());
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.nama_biro.trim()) {
      toast.error("Nama biro wisata tidak boleh kosong");
      return;
    }

    setLoading(true);
    try {
      await saveBiroProfile(profile);
      toast.success("Pengaturan profil biro berhasil disimpan!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan pengaturan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
              <Building2 className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-bold">Pengaturan Identitas Biro</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Sesuaikan logo dan nama biro wisata agar muncul resmi di dashboard dan cetakan PDF.
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
                <div className="relative w-16 h-16 rounded-2xl border-2 border-blue-500/30 overflow-hidden bg-white shadow-sm flex items-center justify-center p-1 group">
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
                  className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 bg-slate-50 dark:bg-slate-800/50 transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                  <span className="text-[9px] text-slate-400 font-medium mt-1">Unggah</span>
                </div>
              )}

              <div className="flex-1 space-y-1.5">
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
                  className="h-8 text-xs rounded-xl font-medium border-slate-200 dark:border-slate-700"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  {uploadingLogo ? "Mengunggah..." : profile.logo_url ? "Ganti Logo" : "Pilih File Logo"}
                </Button>
                <p className="text-[10px] text-slate-400">
                  Format PNG, JPG atau SVG. Maks 2 MB. Disarankan background transparan.
                </p>
              </div>
            </div>
          </div>

          {/* Nama Biro Wisata */}
          <div className="space-y-1.5">
            <Label htmlFor="nama_biro" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Biro Wisata
            </Label>
            <Input
              id="nama_biro"
              value={profile.nama_biro}
              onChange={(e) => setProfile({ ...profile, nama_biro: e.target.value })}
              placeholder="Contoh: Malika Tour & Travel"
              required
              className="h-10 text-xs sm:text-sm rounded-xl font-medium"
            />
          </div>

          {/* Slogan / Keterangan Operasional */}
          <div className="space-y-1.5">
            <Label htmlFor="slogan" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Slogan / Keterangan Singkat
            </Label>
            <Input
              id="slogan"
              value={profile.slogan}
              onChange={(e) => setProfile({ ...profile, slogan: e.target.value })}
              placeholder="Contoh: Sahabat Perjalanan Wisata Anda"
              className="h-10 text-xs sm:text-sm rounded-xl"
            />
          </div>

          {/* Gemini API Key (Opsional) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label htmlFor="gemini_key" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>Google Gemini API Key (Opsional)</span>
              </Label>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                Opsional
              </span>
            </div>
            <Input
              id="gemini_key"
              type="password"
              value={profile.gemini_api_key || ""}
              onChange={(e) => setProfile({ ...profile, gemini_api_key: e.target.value })}
              placeholder="AIzaSy..."
              className="h-9 text-xs rounded-xl font-mono"
            />
            <p className="text-[10px] text-slate-500">
              Kosongkan untuk memakai **Engine AI Asisten Bawaan** kami yang 100% akurat tanpa kuota API.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl h-10 text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-xs font-semibold shadow-md shadow-blue-500/20"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {loading ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
