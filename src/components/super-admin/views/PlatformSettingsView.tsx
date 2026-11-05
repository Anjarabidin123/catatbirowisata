import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  SlidersHorizontal,
  Phone,
  Mail,
  BookOpen,
  Video,
  AlertTriangle,
  ShieldAlert,
  Save,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Crown,
} from "lucide-react";
import {
  PlatformSettings,
  getPlatformSettings,
  savePlatformSettings,
  resetPlatformSettings,
} from "@/utils/superAdminSettings";
import { toast } from "sonner";

interface PlatformSettingsViewProps {
  onRefresh: () => void;
}

export const PlatformSettingsView: React.FC<PlatformSettingsViewProps> = ({ onRefresh }) => {
  const [settings, setSettings] = useState<PlatformSettings>(getPlatformSettings);
  const [saving, setSaving] = useState(false);

  const handleChange = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleEmergency = (val: boolean) => {
    setSettings((prev) => ({ ...prev, emergencyMaintenanceMode: val }));
    savePlatformSettings({ emergencyMaintenanceMode: val });
    toast.success(
      val
        ? "Mode Pemeliharaan Darurat DIAKTIFKAN. Banner pemeliharaan kini tampil di seluruh PWA klien."
        : "Mode Pemeliharaan Darurat Dinonaktifkan."
    );
    onRefresh();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      savePlatformSettings(settings);
      toast.success("Konfigurasi platform SaaS berhasil disimpan!");
      onRefresh();
    } catch (err) {
      toast.error("Gagal menyimpan konfigurasi");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Kembalikan konfigurasi platform ke nilai default bawaan?")) {
      const def = resetPlatformSettings();
      setSettings(def);
      toast.success("Konfigurasi dikembalikan ke default");
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-indigo-600" />
            <span>Pusat Konfigurasi Platform SaaS</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi kontak resmi CS Founder, link panduan, dan kontrol Mode Pemeliharaan Sistem (Emergency Mode).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-9 px-3 rounded-xl text-xs text-slate-600 border-slate-300 bg-white hover:bg-slate-50"
          >
            Reset Default
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Menyimpan..." : "Simpan Konfigurasi"}</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Emergency Maintenance Mode Section */}
        <Card
          className={`p-5 rounded-2xl border-2 transition-all ${
            settings.emergencyMaintenanceMode
              ? "bg-rose-50/60 border-rose-300 shadow-md"
              : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    settings.emergencyMaintenanceMode
                      ? "bg-rose-100 text-rose-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Mode Pemeliharaan Darurat (Emergency Maintenance Mode)
                </h3>
                {settings.emergencyMaintenanceMode && (
                  <Badge className="bg-rose-500 text-white font-bold text-[10px] animate-pulse">
                    SEDANG AKTIF
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                Jika diaktifkan, seluruh pengguna biro klien yang membuka aplikasi PWA akan melihat banner darurat
                di atas dashboard mereka yang menginformasikan pemeliharaan sistem.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Switch
                checked={settings.emergencyMaintenanceMode}
                onCheckedChange={handleToggleEmergency}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Pesan Pengumuman Pemeliharaan</label>
            <Textarea
              value={settings.maintenanceMessage}
              onChange={(e) => handleChange("maintenanceMessage", e.target.value)}
              placeholder="Tuliskan pesan penjelasan kepada seluruh biro klien..."
              className="text-xs rounded-xl border-slate-300 bg-white min-h-[70px]"
            />
          </div>
        </Card>

        {/* Customer Service & Founder Whitelist Contact */}
        <Card className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Kontak Resmi Customer Service & Konsultasi Founder</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Nomor ini digunakan secara otomatis pada tombol bantuan WhatsApp di seluruh aplikasi biro klien.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nomor WhatsApp CS (Internasional 62...)</span>
              </label>
              <Input
                value={settings.csWhatsappNumber}
                onChange={(e) => handleChange("csWhatsappNumber", e.target.value)}
                placeholder="6281234567890"
                className="h-9 text-xs rounded-xl border-slate-300 font-mono"
                required
              />
              <p className="text-[11px] text-slate-400">Gunakan format tanpa tanda tambah atau spasi (contoh: 6281234567890)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Email Dukungan Resmi</span>
              </label>
              <Input
                type="email"
                value={settings.csEmail}
                onChange={(e) => handleChange("csEmail", e.target.value)}
                placeholder="support@catatbiro.id"
                className="h-9 text-xs rounded-xl border-slate-300 font-mono"
                required
              />
            </div>
          </div>
        </Card>

        {/* Documentation & Video Tutorials Links */}
        <Card className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Tautan Edukasi & Dokumentasi Klien</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tautan yang diarahkan saat klien mengklik menu bantuan panduan atau tutorial video di PWA.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>URL Dokumentasi / Knowledge Base</span>
              </label>
              <Input
                value={settings.docsUrl}
                onChange={(e) => handleChange("docsUrl", e.target.value)}
                placeholder="https://catatbiro.id/panduan"
                className="h-9 text-xs rounded-xl border-slate-300 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-rose-600" />
                <span>URL Channel YouTube Tutorial</span>
              </label>
              <Input
                value={settings.youtubeTutorialUrl}
                onChange={(e) => handleChange("youtubeTutorialUrl", e.target.value)}
                placeholder="https://youtube.com/@catatbiro"
                className="h-9 text-xs rounded-xl border-slate-300 font-mono"
              />
            </div>
          </div>
        </Card>

        {/* Platform Identity & Branding */}
        <Card className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-600" />
              <span>Identitas Platform SaaS</span>
            </h3>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Nama Layanan / Aplikasi SaaS</label>
            <Input
              value={settings.platformName}
              onChange={(e) => handleChange("platformName", e.target.value)}
              placeholder="CatatBiro Wisata SaaS Enterprise"
              className="h-9 text-xs rounded-xl border-slate-300"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-mono flex items-center justify-between">
            <span>Versi Build SaaS: 2.4.0-enterprise (Release 2026-11)</span>
            <span>Cluster: ID-SGP-SaaS-01</span>
          </div>
        </Card>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="h-10 px-6 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Menyimpan Konfigurasi..." : "Simpan Seluruh Konfigurasi"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
