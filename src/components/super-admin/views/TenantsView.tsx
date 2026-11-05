import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  TenantRecord,
  LicenseTier,
  PaymentModel,
  createTenant,
  deleteTenant,
  impersonateTenant,
} from "@/utils/licenseEntitlement";
import {
  Building2,
  Search,
  Plus,
  Sliders,
  LogIn,
  MessageSquare,
  Globe,
  Trash2,
  Monitor,
  Smartphone,
  Sparkles,
  FileCheck2,
  Users,
  Compass,
  AlertTriangle,
  ExternalLink,
  Phone,
  Mail,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface TenantsViewProps {
  tenants: TenantRecord[];
  onOpenFeatureModal: (tenant: TenantRecord) => void;
  onRefresh: () => void;
}

export const TenantsView: React.FC<TenantsViewProps> = ({
  tenants,
  onOpenFeatureModal,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal Tambah Biro Baru
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBiroForm, setNewBiroForm] = useState({
    namaBiro: "",
    slugBiro: "",
    ownerNama: "",
    ownerEmail: "",
    ownerPhone: "",
    tier: "starter" as LicenseTier,
    paymentModel: "lifetime" as PaymentModel,
    nominalBayar: 750000,
    hasWebsite: false,
    domainName: "",
    catatan: "",
  });

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (tierFilter !== "all" && t.tier !== tierFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.namaBiro.toLowerCase().includes(q) ||
          t.ownerNama.toLowerCase().includes(q) ||
          t.ownerEmail.toLowerCase().includes(q) ||
          t.ownerPhone.includes(q) ||
          (t.domainName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tenants, tierFilter, statusFilter, searchQuery]);

  const handleCreateBiro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBiroForm.namaBiro.trim() || !newBiroForm.ownerNama.trim() || !newBiroForm.ownerPhone.trim()) {
      toast.error("Nama biro, nama pemilik, dan nomor WhatsApp wajib diisi!");
      return;
    }

    const slug =
      newBiroForm.slugBiro.trim() ||
      newBiroForm.namaBiro
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");

    const canDesktop = newBiroForm.tier === "pro" || newBiroForm.tier === "enterprise";
    const canPdf = newBiroForm.tier === "pro" || newBiroForm.tier === "enterprise";
    const canAI = newBiroForm.tier === "pro" || newBiroForm.tier === "enterprise";
    const maxTrips = newBiroForm.tier === "enterprise" ? 9999 : newBiroForm.tier === "pro" ? 30 : 5;
    const maxCrew = newBiroForm.tier === "enterprise" ? 9999 : newBiroForm.tier === "pro" ? 10 : 2;

    createTenant({
      namaBiro: newBiroForm.namaBiro,
      slugBiro: slug,
      ownerNama: newBiroForm.ownerNama,
      ownerEmail: newBiroForm.ownerEmail || `${slug}@catatbiro.com`,
      ownerPhone: newBiroForm.ownerPhone,
      tier: newBiroForm.tier,
      paymentModel: newBiroForm.paymentModel,
      status: "active",
      canUseDesktopMode: canDesktop,
      canExportCleanPdf: canPdf,
      canUseAI: canAI,
      maxActiveTrips: maxTrips,
      maxCrewMembers: maxCrew,
      customBranding: canDesktop,
      hasWebsite: newBiroForm.hasWebsite,
      domainName: newBiroForm.domainName,
      subdomain: `${slug}.catatbiro.id`,
      nominalBayar: Number(newBiroForm.nominalBayar) || 750000,
      tanggalBayar: new Date().toISOString().slice(0, 10),
      catatan: newBiroForm.catatan,
    });

    toast.success(`Biro "${newBiroForm.namaBiro}" berhasil ditambahkan & dicatat ke Audit Trail!`);
    setShowAddModal(false);
    setNewBiroForm({
      namaBiro: "",
      slugBiro: "",
      ownerNama: "",
      ownerEmail: "",
      ownerPhone: "",
      tier: "starter",
      paymentModel: "lifetime",
      nominalBayar: 750000,
      hasWebsite: false,
      domainName: "",
      catatan: "",
    });
    onRefresh();
  };

  const handleImpersonate = (tenant: TenantRecord) => {
    impersonateTenant(tenant.id);
    toast.success(`Mengaktifkan sesi impersonasi sebagai biro "${tenant.namaBiro}"!`);
    navigate("/dashboard");
  };

  const handleDelete = (tenant: TenantRecord) => {
    if (confirm(`Yakin ingin menghapus biro "${tenant.namaBiro}"? Tindakan ini akan dicatat di log audit.`)) {
      deleteTenant(tenant.id);
      toast.success(`Biro "${tenant.namaBiro}" berhasil dihapus`);
      onRefresh();
    }
  };

  const handleWhatsAppChat = (tenant: TenantRecord) => {
    const cleanPhone = tenant.ownerPhone.replace(/[^0-9]/g, "");
    const formatted = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
    const msg = `Halo ${tenant.ownerNama} (${tenant.namaBiro}), ini Mas Anjar (Founder CatatBiro). Bagaimana pengalaman operasional biro Anda hari ini? Ada fitur atau bantuan yang perlu disesuaikan? 😊`;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari biro, nama pemilik, email, no HP, atau domain..."
              className="pl-9 bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl placeholder:text-slate-400"
            />
          </div>

          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[140px] bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl">
              <SelectValue placeholder="Semua Paket" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 text-slate-900">
              <SelectItem value="all">Semua Paket</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 text-slate-900">
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Daftarkan Biro Baru
        </Button>
      </div>

      {/* Tenants Table & Cards */}
      <div className="space-y-3">
        {filteredTenants.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2 shadow-xs">
            <Building2 className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-sm font-medium">Tidak ada biro wisata yang cocok dengan pencarian</p>
          </div>
        ) : (
          filteredTenants.map((t) => (
            <Card
              key={t.id}
              className="bg-white border-slate-200 hover:border-slate-300 p-5 rounded-2xl transition-all shadow-xs"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Info Utama Biro */}
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      {t.namaBiro}
                    </h3>

                    <Badge
                      className={`text-xs uppercase font-mono px-2 py-0.5 ${
                        t.tier === "enterprise"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : t.tier === "pro"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {t.tier} Tier
                    </Badge>

                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        t.status === "active"
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                          : "border-rose-200 text-rose-700 bg-rose-50"
                      }`}
                    >
                      {t.status.toUpperCase()}
                    </Badge>

                    <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200 bg-slate-50">
                      {t.paymentModel === "lifetime" ? "Sekali Bayar" : "Langganan SaaS"}
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Pemilik:</span>
                      <strong className="text-slate-900 font-semibold">{t.ownerNama}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-slate-700">{t.ownerPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-slate-700">{t.ownerEmail}</span>
                    </div>
                    {t.domainName && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <a
                          href={`https://${t.domainName}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-mono font-medium"
                        >
                          {t.domainName} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Feature Status Badges */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md border flex items-center gap-1 font-medium ${
                        t.canUseDesktopMode
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      <Monitor className="w-3 h-3" />
                      {t.canUseDesktopMode ? "Mode PC: Aktif" : "Mode PC: Kunci"}
                    </span>

                    <span className="text-[11px] px-2 py-0.5 rounded-md border bg-cyan-50 text-cyan-700 border-cyan-200 font-mono font-medium">
                      Trip: {t.maxActiveTrips >= 9000 ? "∞ Unlimited" : `${t.maxActiveTrips} Kuota`}
                    </span>

                    <span className="text-[11px] px-2 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200 font-mono font-medium">
                      Kru: {t.maxCrewMembers >= 9000 ? "∞ Unlimited" : `${t.maxCrewMembers} Kru`}
                    </span>

                    {t.canUseAI && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 font-medium">
                        <Sparkles className="w-3 h-3" /> AI
                      </span>
                    )}

                    {t.canExportCleanPdf && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 font-medium">
                        <FileCheck2 className="w-3 h-3" /> PDF Bersih
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end justify-end">
                  <Button
                    size="sm"
                    onClick={() => onOpenFeatureModal(t)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Atur Fitur (A-Z)
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleImpersonate(t)}
                      className="border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs h-8 px-2.5 rounded-xl flex items-center gap-1 shadow-xs"
                      title="Masuk ke aplikasi sebagai biro ini (Impersonate)"
                    >
                      <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                      Impersonate
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWhatsAppChat(t)}
                      className="border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs h-8 px-2.5 rounded-xl flex items-center gap-1 shadow-xs"
                      title="Kirim pesan WhatsApp ke pemilik biro"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      WhatsApp
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(t)}
                      className="border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs h-8 w-8 p-0 rounded-xl shadow-xs"
                      title="Hapus tenant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal Tambah Biro Baru */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900 max-h-[90vh] flex flex-col p-6 rounded-2xl shadow-xl">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Pendaftaran Klien Biro Wisata Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registrasi tenant baru langsung terhubung ke database dan audit trail.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBiro} className="space-y-4 py-3 overflow-y-auto text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-medium">Nama Biro Wisata *</Label>
                <Input
                  required
                  value={newBiroForm.namaBiro}
                  onChange={(e) => setNewBiroForm({ ...newBiroForm, namaBiro: e.target.value })}
                  placeholder="Misal: Cahaya Tasbih Tour & Travel"
                  className="bg-white border-slate-300 text-slate-900 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-medium">Slug URL Biro (Opsional)</Label>
                <Input
                  value={newBiroForm.slugBiro}
                  onChange={(e) => setNewBiroForm({ ...newBiroForm, slugBiro: e.target.value })}
                  placeholder="cahaya-tasbih"
                  className="bg-white border-slate-300 text-slate-900 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-medium">Nama Pemilik *</Label>
                <Input
                  required
                  value={newBiroForm.ownerNama}
                  onChange={(e) => setNewBiroForm({ ...newBiroForm, ownerNama: e.target.value })}
                  placeholder="H. Anjar / Bambang"
                  className="bg-white border-slate-300 text-slate-900 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-medium">No. WhatsApp *</Label>
                <Input
                  required
                  value={newBiroForm.ownerPhone}
                  onChange={(e) => setNewBiroForm({ ...newBiroForm, ownerPhone: e.target.value })}
                  placeholder="0812-3456-7890"
                  className="bg-white border-slate-300 text-slate-900 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-medium">Email Akun</Label>
                <Input
                  type="email"
                  value={newBiroForm.ownerEmail}
                  onChange={(e) => setNewBiroForm({ ...newBiroForm, ownerEmail: e.target.value })}
                  placeholder="owner@biro.id"
                  className="bg-white border-slate-300 text-slate-900 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-medium">Pilihan Paket Lisensi</Label>
                <Select
                  value={newBiroForm.tier}
                  onValueChange={(val: LicenseTier) => {
                    const price = val === "starter" ? 750000 : val === "pro" ? 2250000 : 350000;
                    setNewBiroForm({ ...newBiroForm, tier: val, nominalBayar: price });
                  }}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900 text-xs">
                    <SelectItem value="starter">Starter (Sekali Bayar Murah)</SelectItem>
                    <SelectItem value="pro">Pro (Sekali Bayar Standar)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (SaaS Bulanan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-medium">Model Pembayaran</Label>
                <Select
                  value={newBiroForm.paymentModel}
                  onValueChange={(val: PaymentModel) => setNewBiroForm({ ...newBiroForm, paymentModel: val })}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900 text-xs">
                    <SelectItem value="lifetime">Sekali Bayar (Lifetime)</SelectItem>
                    <SelectItem value="subscription">Langganan SaaS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-medium">Nominal Bayar (Rp)</Label>
                <Input
                  type="number"
                  value={newBiroForm.nominalBayar}
                  onChange={(e) => setNewBiroForm({ ...newBiroForm, nominalBayar: parseInt(e.target.value) || 0 })}
                  className="bg-white border-slate-300 text-slate-900 text-xs font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Termasuk Website Promosi (.com / .id)?
                </Label>
                <input
                  type="checkbox"
                  checked={newBiroForm.hasWebsite}
                  onChange={(e) => setNewBiroForm({ ...newBiroForm, hasWebsite: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300"
                />
              </div>
              {newBiroForm.hasWebsite && (
                <Input
                  value={newBiroForm.domainName}
                  onChange={(e) => setNewBiroForm({ ...newBiroForm, domainName: e.target.value })}
                  placeholder="Nama domain yang dibeli, misal: berkahwisata.com"
                  className="bg-white border-slate-300 text-slate-900 text-xs font-mono"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="text-xs border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              >
                Simpan & Daftarkan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
