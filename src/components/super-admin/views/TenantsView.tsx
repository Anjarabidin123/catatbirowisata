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
  Sparkles,
  FileCheck2,
  Users,
  Compass,
  Phone,
  Mail,
  CheckCircle2,
  CreditCard,
  LayoutList,
  LayoutGrid,
  Info,
  Calendar,
  Lock,
  Check,
  ShieldCheck,
  ExternalLink,
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
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

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

  // KPI Summary Metrics
  const metrics = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((t) => t.status === "active").length;
    const lifetime = tenants.filter((t) => t.paymentModel === "lifetime").length;
    const subscription = tenants.filter((t) => t.paymentModel === "subscription").length;
    return { total, active, lifetime, subscription };
  }, [tenants]);

  // Filter Data Tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (tierFilter !== "all" && t.tier !== tierFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (paymentFilter !== "all" && t.paymentModel !== paymentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.namaBiro.toLowerCase().includes(q) ||
          t.slugBiro.toLowerCase().includes(q) ||
          t.ownerNama.toLowerCase().includes(q) ||
          t.ownerEmail.toLowerCase().includes(q) ||
          t.ownerPhone.includes(q) ||
          (t.domainName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tenants, tierFilter, statusFilter, paymentFilter, searchQuery]);

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
    if (confirm(`Yakin ingin menghapus biro "${tenant.namaBiro}"? Tindakan ini akan menghapus data di Supabase & dicatat di log audit.`)) {
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
      {/* 1. Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-slate-200 shadow-xs flex items-center gap-3.5 rounded-2xl">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Biro</p>
            <p className="text-xl font-extrabold text-slate-900">{metrics.total}</p>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs flex items-center gap-3.5 rounded-2xl">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Biro Aktif</p>
            <p className="text-xl font-extrabold text-emerald-700">{metrics.active}</p>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs flex items-center gap-3.5 rounded-2xl">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Sekali Bayar</p>
            <p className="text-xl font-extrabold text-amber-800">{metrics.lifetime}</p>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs flex items-center gap-3.5 rounded-2xl">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Langganan SaaS</p>
            <p className="text-xl font-extrabold text-purple-800">{metrics.subscription}</p>
          </div>
        </Card>
      </div>

      {/* 2. Guidance Banner: Client Directory vs Feature Gating */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 rounded-2xl border border-blue-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              Direktori Master Data Klien & Hubungan Pelanggan
              <Badge variant="outline" className="text-[10px] bg-white text-indigo-700 border-indigo-200 font-normal">
                Master Data
              </Badge>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Halaman ini difokuskan untuk <strong>kelola identitas biro</strong>, kontak langsung pemilik via WhatsApp 1-klik, status akun, dan <strong>sesi impersonasi (masuk biro)</strong>. Untuk mengubah sakelar batas fitur operasional (Mode Desktop PC, AI Asisten, PDF Bersih, Kuota Trip & Kru), silakan akses menu <strong>Feature Gating A-Z</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Filter & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        {/* Search & Filter Group */}
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari biro, nama pemilik, WA, email, domain..."
              className="pl-9 bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl placeholder:text-slate-400 focus-visible:ring-indigo-500"
            />
          </div>

          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[130px] bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl">
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
            <SelectTrigger className="w-[125px] bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl">
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

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[145px] bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl">
              <SelectValue placeholder="Model Bayar" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 text-slate-900">
              <SelectItem value="all">Semua Model Bayar</SelectItem>
              <SelectItem value="lifetime">Sekali Bayar (Lifetime)</SelectItem>
              <SelectItem value="subscription">Langganan SaaS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle & Add Button */}
        <div className="flex items-center gap-2">
          {/* Switcher Tampilan */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                viewMode === "table"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Tampilan Tabel Master Data Kompak"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                viewMode === "card"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Tampilan Kartu Profil Biro"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kartu</span>
            </button>
          </div>

          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Daftarkan Biro
          </Button>
        </div>
      </div>

      {/* 4. Main Content: Table View (Default) or Card View */}
      {filteredTenants.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2 shadow-xs">
          <Building2 className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">Tidak ada biro wisata yang cocok dengan pencarian</p>
          <p className="text-xs text-slate-500">Ubah filter atau gunakan kata kunci lain.</p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW (Default: Compact Enterprise Table) */
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Biro Wisata</th>
                  <th className="py-3.5 px-4">Pemilik & WhatsApp</th>
                  <th className="py-3.5 px-3">Paket & Lisensi</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Hak Akses Ringkas</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Biro Wisata */}
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        {t.namaBiro}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <span className="text-slate-600">{t.slugBiro || t.id}</span>
                        {t.hasWebsite && t.domainName && (
                          <span className="inline-flex items-center gap-0.5 text-blue-600 font-sans">
                            <Globe className="w-3 h-3" />
                            {t.domainName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Pemilik & WhatsApp */}
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="font-semibold text-slate-900">{t.ownerNama}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* WhatsApp Clickable Direct Link */}
                        <button
                          type="button"
                          onClick={() => handleWhatsAppChat(t)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-medium font-mono transition-colors"
                          title="Buka Chat WhatsApp Pemilik Biro"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          {t.ownerPhone}
                        </button>
                        <span className="text-[11px] text-slate-500 font-mono hidden xl:inline">
                          {t.ownerEmail}
                        </span>
                      </div>
                    </td>

                    {/* Paket & Lisensi */}
                    <td className="py-3.5 px-3 space-y-1">
                      <div>
                        <Badge
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 ${
                            t.tier === "enterprise"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : t.tier === "pro"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {t.tier} Tier
                        </Badge>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {t.paymentModel === "lifetime" ? "Sekali Bayar" : "Langganan SaaS"}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 ${
                          t.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : t.status === "trial"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {t.status}
                      </Badge>
                    </td>

                    {/* Hak Akses Ringkas */}
                    <td className="py-3.5 px-3 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            t.canUseDesktopMode
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                          title={t.canUseDesktopMode ? "Mode Desktop PC: Aktif" : "Mode Desktop PC: Terkunci"}
                        >
                          <Monitor className="w-3 h-3" />
                          {t.canUseDesktopMode ? "Desktop" : "Mobile Only"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 font-mono">
                          {t.maxActiveTrips >= 9000 ? "∞ Trip" : `${t.maxActiveTrips} Trip`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono">
                          {t.maxCrewMembers >= 9000 ? "∞ Kru" : `${t.maxCrewMembers} Kru`}
                        </span>
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleImpersonate(t)}
                          className="h-7 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs rounded-lg shadow-xs flex items-center gap-1"
                          title="Masuk ke aplikasi sebagai biro ini (Impersonate)"
                        >
                          <LogIn className="w-3 h-3 text-indigo-600" />
                          <span className="hidden sm:inline">Masuk</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => onOpenFeatureModal(t)}
                          className="h-7 px-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs rounded-lg shadow-xs flex items-center gap-1"
                          title="Buka Modal Hak Akses & Fitur A-Z"
                        >
                          <Sliders className="w-3 h-3 text-amber-600" />
                          <span className="hidden md:inline">Atur Fitur</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleWhatsAppChat(t)}
                          className="h-7 w-7 p-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg shadow-xs"
                          title="Kirim Pesan WhatsApp Langsung"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleDelete(t)}
                          className="h-7 w-7 p-0 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg shadow-xs"
                          title="Hapus Klien Biro Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD VIEW */
        <div className="space-y-3">
          {filteredTenants.map((t) => (
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
          ))}
        </div>
      )}

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
