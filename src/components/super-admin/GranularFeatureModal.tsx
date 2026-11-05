import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TenantRecord,
  LicenseTier,
  PaymentModel,
  updateTenant,
} from "@/utils/licenseEntitlement";
import {
  Sliders,
  Monitor,
  Sparkles,
  FileCheck2,
  Users,
  Compass,
  Palette,
  Globe,
  CreditCard,
  ShieldAlert,
  Save,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface GranularFeatureModalProps {
  tenant: TenantRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export const GranularFeatureModal: React.FC<GranularFeatureModalProps> = ({
  tenant,
  open,
  onOpenChange,
  onSaved,
}) => {
  const [formData, setFormData] = useState<Partial<TenantRecord>>({});

  useEffect(() => {
    if (tenant) {
      setFormData({
        canUseDesktopMode: tenant.canUseDesktopMode,
        maxActiveTrips: tenant.maxActiveTrips,
        maxCrewMembers: tenant.maxCrewMembers,
        canUseAI: tenant.canUseAI,
        canExportCleanPdf: tenant.canExportCleanPdf,
        customBranding: tenant.customBranding,
        canUseAdvancedRbac: tenant.canUseAdvancedRbac ?? true,
        tier: tenant.tier,
        paymentModel: tenant.paymentModel,
        status: tenant.status,
        hasWebsite: tenant.hasWebsite,
        domainName: tenant.domainName || "",
        subdomain: tenant.subdomain || `${tenant.slugBiro}.catatbiro.id`,
        vpsIp: tenant.vpsIp || "103.186.201.44",
        domainExpiredAt: tenant.domainExpiredAt || "",
        hostingExpiredAt: tenant.hostingExpiredAt || "",
        websiteStatus: tenant.websiteStatus || "active",
        nominalBayar: tenant.nominalBayar,
        tanggalBayar: tenant.tanggalBayar,
        tanggalJatuhTempo: tenant.tanggalJatuhTempo || "",
        catatan: tenant.catatan || "",
      });
    }
  }, [tenant]);

  if (!tenant) return null;

  const handleSave = () => {
    try {
      updateTenant(tenant.id, {
        ...formData,
        maxActiveTrips: Number(formData.maxActiveTrips) || 5,
        maxCrewMembers: Number(formData.maxCrewMembers) || 2,
        nominalBayar: Number(formData.nominalBayar) || 0,
      });
      toast.success(`Hak akses fitur untuk "${tenant.namaBiro}" berhasil diperbarui & dicatat ke Audit Trail!`);
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (e) {
      toast.error("Gagal memperbarui konfigurasi fitur");
    }
  };

  const applyTierDefaults = (tier: LicenseTier) => {
    if (tier === "starter") {
      setFormData((prev) => ({
        ...prev,
        tier: "starter",
        canUseDesktopMode: false,
        canExportCleanPdf: false,
        canUseAI: false,
        maxActiveTrips: 5,
        maxCrewMembers: 2,
        customBranding: false,
      }));
    } else if (tier === "pro") {
      setFormData((prev) => ({
        ...prev,
        tier: "pro",
        canUseDesktopMode: true,
        canExportCleanPdf: true,
        canUseAI: true,
        maxActiveTrips: 30,
        maxCrewMembers: 10,
        customBranding: true,
      }));
    } else if (tier === "enterprise") {
      setFormData((prev) => ({
        ...prev,
        tier: "enterprise",
        canUseDesktopMode: true,
        canExportCleanPdf: true,
        canUseAI: true,
        maxActiveTrips: 9999,
        maxCrewMembers: 9999,
        customBranding: true,
        hasWebsite: true,
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0d1322] border-slate-800 text-slate-100 max-h-[90vh] flex flex-col p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  Pusat Kontrol Fitur & Gating A sampai Z
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Biro: <span className="font-semibold text-slate-200">{tenant.namaBiro}</span> • Pemilik: {tenant.ownerNama} ({tenant.ownerPhone})
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-slate-800/80 border-slate-700 text-slate-300">
                ID: {tenant.id}
              </Badge>
              <Badge className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs uppercase font-mono">
                {formData.tier} Tier
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1 text-sm">
          
          {/* Quick Preset Buttons */}
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200">Preset Dasar:</span> Terapkan template lisensi bawaan, lalu kustomisasi sesuka Anda.
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyTierDefaults("starter")}
                className="text-xs h-7 border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300"
              >
                Reset Starter
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyTierDefaults("pro")}
                className="text-xs h-7 border-blue-800/60 bg-blue-950/40 hover:bg-blue-900 text-blue-300"
              >
                Reset Pro
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyTierDefaults("enterprise")}
                className="text-xs h-7 border-purple-800/60 bg-purple-950/40 hover:bg-purple-900 text-purple-300"
              >
                Reset Enterprise
              </Button>
            </div>
          </div>

          {/* Section 1: MODE DESKTOP OVERRIDE (Fitur Spesial Permintaan User) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border-2 border-amber-500/40 space-y-3 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-amber-400" />
                  <Label htmlFor="desktop-mode-switch" className="text-sm font-bold text-white cursor-pointer">
                    Hak Akses Mode Desktop (Laptop / PC Eksekutif)
                  </Label>
                  {formData.canUseDesktopMode ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[11px]">
                      TERBUKA PENUH (Bypass)
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[11px]">
                      TERKUNCI OVERLAY
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  Sakelar ini memberikan wewenang penuh kepada Super Admin. Anda dapat mengaktifkan Mode Desktop di laptop bahkan jika biro ini hanya membeli 
                  <strong className="text-amber-300"> Paket Murah Sekali Bayar (Starter)</strong>. Layar Bento KPI tidak akan pernah terkunci oleh overlay upgrade.
                </p>
              </div>

              <Switch
                id="desktop-mode-switch"
                checked={!!formData.canUseDesktopMode}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, canUseDesktopMode: checked }))}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </div>

          {/* Section 2: KUOTA FLEKSIBEL (TRIP & KRU) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kuota Trip Aktif */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <Label className="text-xs font-semibold text-slate-200">
                    Batas Kuota Trip Aktif
                  </Label>
                </div>
                <span className="font-mono text-xs text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {formData.maxActiveTrips && formData.maxActiveTrips >= 9000 ? "Unlimited (Tanpa Batas)" : `${formData.maxActiveTrips} Trip`}
                </span>
              </div>
              <Input
                type="number"
                min={1}
                value={formData.maxActiveTrips || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxActiveTrips: parseInt(e.target.value) || 0 }))}
                className="bg-slate-950 border-slate-700 text-slate-100 font-mono text-sm"
                placeholder="Misal: 5, 10, 30, atau 9999"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 15, 30, 50, 100, 9999].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, maxActiveTrips: val }))}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      formData.maxActiveTrips === val
                        ? "bg-cyan-600 text-white border-cyan-500"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {val === 9999 ? "∞ Unlimited" : `${val} Trip`}
                  </button>
                ))}
              </div>
            </div>

            {/* Kuota Personel Kru */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <Label className="text-xs font-semibold text-slate-200">
                    Batas Kuota Personel Kru
                  </Label>
                </div>
                <span className="font-mono text-xs text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                  {formData.maxCrewMembers && formData.maxCrewMembers >= 9000 ? "Unlimited (Tanpa Batas)" : `${formData.maxCrewMembers} Kru`}
                </span>
              </div>
              <Input
                type="number"
                min={1}
                value={formData.maxCrewMembers || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxCrewMembers: parseInt(e.target.value) || 0 }))}
                className="bg-slate-950 border-slate-700 text-slate-100 font-mono text-sm"
                placeholder="Misal: 2, 5, 10, atau 9999"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {[2, 5, 10, 25, 50, 9999].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, maxCrewMembers: val }))}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      formData.maxCrewMembers === val
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {val === 9999 ? "∞ Unlimited" : `${val} Kru`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: FITUR PREMIUM & AI */}
          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Fitur Tambahan & Kecerdasan Buatan (AI)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Asisten AI */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Asisten AI Wisata (Gemini)
                  </Label>
                  <p className="text-[11px] text-slate-400">Generator rundown & rekomendasi otomatis</p>
                </div>
                <Switch
                  checked={!!formData.canUseAI}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, canUseAI: checked }))}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              {/* PDF Tanpa Watermark */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                    Ekspor PDF Tanpa Watermark
                  </Label>
                  <p className="text-[11px] text-slate-400">Kop surat resmi biro tanpa cap CatatBiro</p>
                </div>
                <Switch
                  checked={!!formData.canExportCleanPdf}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, canExportCleanPdf: checked }))}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>

              {/* Custom Branding */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer">
                    <Palette className="w-3.5 h-3.5 text-rose-400" />
                    Custom Branding & Logo Sendiri
                  </Label>
                  <p className="text-[11px] text-slate-400">Gunakan logo dan warna tema biro sendiri</p>
                </div>
                <Switch
                  checked={!!formData.customBranding}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, customBranding: checked }))}
                  className="data-[state=checked]:bg-rose-500"
                />
              </div>

              {/* RBAC Matriks */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    Manajemen Kru & RBAC Lanjutan
                  </Label>
                  <p className="text-[11px] text-slate-400">Pengaturan akses granular per kru lapangan</p>
                </div>
                <Switch
                  checked={!!formData.canUseAdvancedRbac}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, canUseAdvancedRbac: checked }))}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: MODEL PENAGIHAN & STATUS AKUN */}
          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Paket Lisensi, Status Akun & Penagihan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Tier Lisensi</Label>
                <Select
                  value={formData.tier || "starter"}
                  onValueChange={(val: LicenseTier) => setFormData((prev) => ({ ...prev, tier: val }))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="starter">Starter (Paket Murah)</SelectItem>
                    <SelectItem value="pro">Pro (Paket Standar)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (SaaS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Model Pembayaran</Label>
                <Select
                  value={formData.paymentModel || "lifetime"}
                  onValueChange={(val: PaymentModel) => setFormData((prev) => ({ ...prev, paymentModel: val }))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="lifetime">Sekali Bayar (Lifetime Deal)</SelectItem>
                    <SelectItem value="subscription">Langganan Berkala (SaaS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Status Akun</Label>
                <Select
                  value={formData.status || "active"}
                  onValueChange={(val: any) => setFormData((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="active">Aktif (Normal)</SelectItem>
                    <SelectItem value="trial">Masa Trial (Percobaan)</SelectItem>
                    <SelectItem value="suspended">Ditangguhkan (Suspended)</SelectItem>
                    <SelectItem value="expired">Kadaluarsa (Expired)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Nominal Pembayaran (Rp)</Label>
                <Input
                  type="number"
                  value={formData.nominalBayar || 0}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nominalBayar: parseInt(e.target.value) || 0 }))}
                  className="bg-slate-950 border-slate-700 text-slate-200 font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Tanggal Bayar</Label>
                <Input
                  type="date"
                  value={formData.tanggalBayar || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tanggalBayar: e.target.value }))}
                  className="bg-slate-950 border-slate-700 text-slate-200 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Tanggal Jatuh Tempo</Label>
                <Input
                  type="date"
                  value={formData.tanggalJatuhTempo || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tanggalJatuhTempo: e.target.value }))}
                  className="bg-slate-950 border-slate-700 text-slate-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 5: WEBSITE PROMOSI, DOMAIN & VPS */}
          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                Layanan Website Promosi, Domain & Hosting VPS
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status Paket Website:</span>
                <Switch
                  checked={!!formData.hasWebsite}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, hasWebsite: checked }))}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>

            {formData.hasWebsite && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Domain Kustom Utama</Label>
                    <Input
                      value={formData.domainName || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, domainName: e.target.value }))}
                      placeholder="contoh: berkahwisata.id"
                      className="bg-slate-950 border-slate-700 text-slate-200 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Subdomain Sistem</Label>
                    <Input
                      value={formData.subdomain || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, subdomain: e.target.value }))}
                      placeholder="contoh: berkah.catatbiro.id"
                      className="bg-slate-950 border-slate-700 text-slate-200 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">IP Node VPS</Label>
                    <Input
                      value={formData.vpsIp || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, vpsIp: e.target.value }))}
                      placeholder="103.186.201.44"
                      className="bg-slate-950 border-slate-700 text-slate-200 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Kadaluarsa Domain</Label>
                    <Input
                      type="date"
                      value={formData.domainExpiredAt || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, domainExpiredAt: e.target.value }))}
                      className="bg-slate-950 border-slate-700 text-slate-200 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Kadaluarsa VPS Hosting</Label>
                    <Input
                      type="date"
                      value={formData.hostingExpiredAt || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, hostingExpiredAt: e.target.value }))}
                      className="bg-slate-950 border-slate-700 text-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 6: CATATAN FOUNDER */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">
              Catatan Rahasia Super Admin / Founder
            </Label>
            <Textarea
              value={formData.catatan || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, catatan: e.target.value }))}
              placeholder="Catatan khusus, nomor perjanjian, kesepakatan via WhatsApp, atau catatan pembayaran..."
              className="bg-slate-950 border-slate-800 text-slate-200 text-xs min-h-[70px]"
            />
          </div>

        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 hidden sm:block">
            Semua perubahan akan diverifikasi dan dicatat ke tabel <code className="text-slate-400 font-mono">super_admin_audit_logs</code>.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <Save className="w-4 h-4" />
              Simpan Konfigurasi & Terapkan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
