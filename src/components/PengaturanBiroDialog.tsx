import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  Trash2,
  Check,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Globe,
  CreditCard,
  Landmark,
} from "lucide-react";
import {
  getLocalBiroProfile,
  saveBiroProfile,
  uploadBiroLogo,
  BiroProfile,
} from "@/utils/biroProfile";
import { useRole } from "@/contexts/RoleContext";
import { logCrewActivity } from "@/utils/rbacAuditLogger";

interface PengaturanBiroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PengaturanBiroDialog = ({
  open,
  onOpenChange,
}: PengaturanBiroDialogProps) => {
  const { hasPermission } = useRole();
  const canEditBiro = hasPermission("rule_pengaturan_biro");
  const [profile, setProfile] = useState<BiroProfile>(getLocalBiroProfile());
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const current = getLocalBiroProfile();
      setProfile(current);
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
    if (!canEditBiro) {
      toast.error("Akses Dibatasi: Anda tidak memiliki izin mengubah Pengaturan Biro & Rekening Bank.");
      return;
    }
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
        actionType: "system",
        actionTitle: "Memperbarui Pengaturan Biro & Rekening",
        actionDetail: `Menyimpan perubahan identitas biro "${updatedProfile.nama_biro}" (${updatedProfile.nama_bank || "-"} - ${updatedProfile.nomor_rekening || "-"})`,
      });
      toast.success("Pengaturan profil & rekening biro berhasil disimpan!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan pengaturan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
              <Building2 className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold">
              Pengaturan Biro
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Kelola identitas biro wisata dan rekening resmi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Logo Biro Upload Section */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Logo Resmi Biro
            </Label>
            <div className="flex items-center gap-3">
              {profile.logo_url ? (
                <div className="relative w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white shadow-sm flex items-center justify-center p-1 group">
                  <img
                    src={profile.logo_url}
                    alt="Logo Biro"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute inset-0 bg-rose-600/80 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus Logo"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-[9px] font-bold mt-0.5">Hapus</span>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 bg-slate-50 dark:bg-slate-800 transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                  <span className="text-[9px] text-slate-400 font-medium mt-1">
                    Upload
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
                  className="h-8 text-xs rounded-xl font-semibold border-slate-200 dark:border-slate-700"
                >
                  <Upload className="w-3 h-3 mr-1.5 text-blue-600" />
                  {uploadingLogo ? "Mengunggah..." : "Pilih Logo"}
                </Button>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Format PNG/JPG/SVG. Maksimal 2 MB. Akan tampil pada PDF kwitansi & kop dokumen.
                </p>
              </div>
            </div>
          </div>

          {/* Nama Biro */}
          <div className="space-y-1.5">
            <Label htmlFor="nama_biro" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nama Biro Wisata <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="nama_biro"
              value={profile.nama_biro}
              onChange={(e) => setProfile({ ...profile, nama_biro: e.target.value })}
              placeholder="Contoh: Catat Biro Wisata"
              className="h-9 text-xs rounded-xl"
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
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* Nama Pimpinan */}
          <div className="space-y-1.5">
            <Label htmlFor="pimpinan" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              Nama Pimpinan / Direktur
            </Label>
            <Input
              id="pimpinan"
              value={profile.pimpinan || ""}
              onChange={(e) => setProfile({ ...profile, pimpinan: e.target.value })}
              placeholder="Contoh: H. Anjar Abidin, S.E."
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* Alamat */}
          <div className="space-y-1.5">
            <Label htmlFor="alamat" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Alamat Lengkap Kantor & Pool Bus
            </Label>
            <Input
              id="alamat"
              value={profile.alamat || ""}
              onChange={(e) => setProfile({ ...profile, alamat: e.target.value })}
              placeholder="Contoh: Jl. Raya Demak - Kudus KM 4, Demak"
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* Grid Kontak */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="telepon" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                Telepon / WhatsApp
              </Label>
              <Input
                id="telepon"
                value={profile.telepon || ""}
                onChange={(e) => setProfile({ ...profile, telepon: e.target.value })}
                placeholder="0812-2578-9000"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                Email Resmi
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email || ""}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="operasional@birowisata.id"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label htmlFor="website" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              Website / Media Sosial
            </Label>
            <Input
              id="website"
              value={profile.website || ""}
              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              placeholder="www.catatbirowisata.id"
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* Bagian Rekening Bank */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Rekening Pembayaran Invoice & Kwitansi
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <Landmark className="w-3 h-3 flex-shrink-0" />
                <span className="text-[11px] font-semibold">
                  Tampil di kwitansi cetak & penagihan klien
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <Label htmlFor="nama_bank" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Nama Bank (contoh: BCA / Mandiri / BRI)
                  </Label>
                  <Input
                    id="nama_bank"
                    value={profile.nama_bank || ""}
                    onChange={(e) => setProfile({ ...profile, nama_bank: e.target.value })}
                    placeholder="BCA / Mandiri"
                    className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <Label htmlFor="nomor_rekening" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Nomor Rekening
                  </Label>
                  <Input
                    id="nomor_rekening"
                    value={profile.nomor_rekening || ""}
                    onChange={(e) => setProfile({ ...profile, nomor_rekening: e.target.value })}
                    placeholder="Contoh: 136-00-1234567-8"
                    className="h-8 text-xs rounded-xl font-mono bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <Label htmlFor="atas_nama_rekening" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Atas Nama Pemilik Rekening
                  </Label>
                  <Input
                    id="atas_nama_rekening"
                    value={profile.atas_nama_rekening || ""}
                    onChange={(e) => setProfile({ ...profile, atas_nama_rekening: e.target.value })}
                    placeholder="Contoh: Catat Biro Wisata"
                    className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>
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
  );
};
