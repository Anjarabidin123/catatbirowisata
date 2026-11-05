import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Crown,
  Building2,
  Users,
  CreditCard,
  Globe,
  Database,
  Search,
  Plus,
  Trash2,
  Edit,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  Monitor,
  Smartphone,
  ShieldCheck,
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  FileCode,
} from "lucide-react";
import {
  isSuperAdminUser,
  SUPER_ADMIN_EMAIL,
  getAllTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  TenantRecord,
  LicenseTier,
  PaymentModel,
  getActivePerspective,
  setActivePerspective,
} from "@/utils/licenseEntitlement";
import { toast } from "sonner";

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isSuper, setIsSuper] = useState(isSuperAdminUser);
  const [tenants, setTenants] = useState<TenantRecord[]>(getAllTenants);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [copiedSql, setCopiedSql] = useState(false);

  // Modal State
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);

  // Form State Tambah / Edit Tenant
  const [form, setForm] = useState({
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

  useEffect(() => {
    setIsSuper(isSuperAdminUser());
    setTenants(getAllTenants());

    const handleUpdate = () => {
      setTenants(getAllTenants());
    };
    window.addEventListener("catatbiro-tenants-updated", handleUpdate);
    return () => {
      window.removeEventListener("catatbiro-tenants-updated", handleUpdate);
    };
  }, []);

  const formatRupiah = (num: number) => {
    return "Rp " + Math.floor(num).toLocaleString("id-ID");
  };

  // Filtered Tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (tierFilter !== "all" && t.tier !== tierFilter) return false;
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
  }, [tenants, tierFilter, searchQuery]);

  // Statistik Ringkasan Eksekutif
  const totalOmsetLisensi = useMemo(() => {
    return tenants.reduce((acc, t) => acc + (t.nominalBayar || 0), 0);
  }, [tenants]);

  const activeWebsites = useMemo(() => {
    return tenants.filter((t) => t.hasWebsite);
  }, [tenants]);

  const expiringWebsites = useMemo(() => {
    // Simulasi website yang perlu perpanjangan
    return tenants.filter((t) => t.hasWebsite && t.domainExpiredAt);
  }, [tenants]);

  // Handle Submit Tambah / Edit Tenant
  const handleSaveTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaBiro.trim() || !form.ownerNama.trim() || !form.ownerPhone.trim()) {
      toast.error("Nama biro, nama pemilik, dan nomor WhatsApp wajib diisi");
      return;
    }

    const canDesktop = form.tier === "pro" || form.tier === "enterprise";
    const canPdf = form.tier === "pro" || form.tier === "enterprise";
    const canAi = form.tier === "pro" || form.tier === "enterprise";
    const maxTrips = form.tier === "starter" ? 5 : form.tier === "pro" ? 30 : 9999;
    const maxCrew = form.tier === "starter" ? 2 : form.tier === "pro" ? 10 : 9999;

    if (editingTenant) {
      updateTenant(editingTenant.id, {
        namaBiro: form.namaBiro.trim(),
        slugBiro: form.slugBiro.trim() || form.namaBiro.toLowerCase().replace(/\s+/g, "-"),
        ownerNama: form.ownerNama.trim(),
        ownerEmail: form.ownerEmail.trim(),
        ownerPhone: form.ownerPhone.trim(),
        tier: form.tier,
        paymentModel: form.paymentModel,
        nominalBayar: Number(form.nominalBayar) || 0,
        hasWebsite: form.hasWebsite,
        domainName: form.hasWebsite ? form.domainName.trim() : undefined,
        canUseDesktopMode: canDesktop,
        canExportCleanPdf: canPdf,
        canUseAI: canAi,
        maxActiveTrips: maxTrips,
        maxCrewMembers: maxCrew,
        catatan: form.catatan.trim(),
      });
      toast.success(`Data biro "${form.namaBiro}" berhasil diperbarui!`);
    } else {
      createTenant({
        namaBiro: form.namaBiro.trim(),
        slugBiro: form.slugBiro.trim() || form.namaBiro.toLowerCase().replace(/\s+/g, "-"),
        ownerNama: form.ownerNama.trim(),
        ownerEmail: form.ownerEmail.trim() || "admin@biro.id",
        ownerPhone: form.ownerPhone.trim(),
        tier: form.tier,
        paymentModel: form.paymentModel,
        status: "active",
        canUseDesktopMode: canDesktop,
        canExportCleanPdf: canPdf,
        canUseAI: canAi,
        maxActiveTrips: maxTrips,
        maxCrewMembers: maxCrew,
        customBranding: form.tier !== "starter",
        hasWebsite: form.hasWebsite,
        domainName: form.hasWebsite ? form.domainName.trim() : undefined,
        domainExpiredAt: form.hasWebsite ? "2027-11-05" : undefined,
        hostingExpiredAt: form.hasWebsite ? "2027-11-05" : undefined,
        nominalBayar: Number(form.nominalBayar) || 0,
        tanggalBayar: new Date().toISOString().split("T")[0],
        catatan: form.catatan.trim(),
      });
      toast.success(`Biro baru "${form.namaBiro}" berhasil didaftarkan!`);
    }

    setShowAddTenantModal(false);
    setEditingTenant(null);
  };

  const handleOpenEdit = (t: TenantRecord) => {
    setEditingTenant(t);
    setForm({
      namaBiro: t.namaBiro,
      slugBiro: t.slugBiro,
      ownerNama: t.ownerNama,
      ownerEmail: t.ownerEmail,
      ownerPhone: t.ownerPhone,
      tier: t.tier,
      paymentModel: t.paymentModel,
      nominalBayar: t.nominalBayar || 0,
      hasWebsite: t.hasWebsite,
      domainName: t.domainName || "",
      catatan: t.catatan || "",
    });
    setShowAddTenantModal(true);
  };

  const handleToggleFeature = (id: string, key: keyof TenantRecord, val: boolean) => {
    updateTenant(id, { [key]: val });
    toast.success("Pengaturan hak akses fitur biro diperbarui");
  };

  const handleDelete = (id: string, nama: string) => {
    if (!confirm(`Hapus biro "${nama}" dari database tenant?`)) return;
    deleteTenant(id);
    toast.info(`Biro "${nama}" telah dihapus`);
  };

  const handleSendWaBill = (t: TenantRecord) => {
    const cleanPhone = t.ownerPhone.replace(/[^0-9]/g, "");
    const waNumber = cleanPhone.startsWith("0") ? "62" + cleanPhone.substring(1) : cleanPhone;
    const msg = `Halo ${t.ownerNama} (${t.namaBiro}), kami dari Tim Manajemen CatatBiro Wisata ingin menginformasikan masa aktif website promosi ${t.domainName || "biro Anda"} akan segera jatuh tempo. Biaya perpanjangan tahunan (Domain + Server VPS) adalah Rp 750.000. Silakan konfirmasi untuk proses perpanjangan. Terima kasih! 🙏`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const sqlMigrationCode = `-- ====================================================================
-- MIGRASI DATABASE: SUPER ADMIN, LISENSI MULTI-TENANT & PENAGIHAN
-- Tanggal: 2026-11-05
-- Penulis: anjarbdn@gmail.com
-- ====================================================================

-- 1. DAFTAR EMAIL WHITELIST SUPER ADMIN
CREATE TABLE IF NOT EXISTS public.super_admin_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.super_admin_whitelist (email, nama, is_active)
VALUES ('anjarbdn@gmail.com', 'Founder & Master Super Admin', true)
ON CONFLICT (email) DO NOTHING;

-- 2. TABEL PROFIL TENANT BIRO WISATA (KLIEN SAAS)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_biro VARCHAR(255) NOT NULL,
    slug_biro VARCHAR(100) UNIQUE,
    owner_nama VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(50) NOT NULL,
    tier_lisensi VARCHAR(50) DEFAULT 'starter', -- 'starter', 'pro', 'enterprise'
    payment_model VARCHAR(50) DEFAULT 'lifetime', -- 'lifetime', 'subscription'
    status_akun VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'expired'
    catatan_internal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL HAK AKSES FITUR (FEATURE ENTITLEMENTS)
CREATE TABLE IF NOT EXISTS public.feature_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    can_use_desktop_mode BOOLEAN DEFAULT false,
    can_export_pdf_clean BOOLEAN DEFAULT false,
    can_use_ai_assistant BOOLEAN DEFAULT false,
    can_use_advanced_rbac BOOLEAN DEFAULT false,
    max_active_trips INT DEFAULT 5,
    max_crew_members INT DEFAULT 2,
    custom_branding_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABEL WEBSITE PROMOSI BIRO (DOMAIN & VPS TRACKER)
CREATE TABLE IF NOT EXISTS public.client_websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain_utama VARCHAR(255),
    subdomain_gratis VARCHAR(100) UNIQUE,
    status_website VARCHAR(50) DEFAULT 'active',
    domain_expired_at DATE,
    hosting_vps_expired_at DATE,
    biaya_perpanjangan_tahunan NUMERIC(15, 2) DEFAULT 750000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.super_admin_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_websites ENABLE ROW LEVEL SECURITY;

-- POLICY: Super admin full access untuk anjarbdn@gmail.com
CREATE POLICY "Super admin full access" ON public.super_admin_whitelist FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
CREATE POLICY "Super admin tenants access" ON public.tenants FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
CREATE POLICY "Super admin entitlements access" ON public.feature_entitlements FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
CREATE POLICY "Super admin websites access" ON public.client_websites FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlMigrationCode);
    setCopiedSql(true);
    toast.success("Skrip SQL berhasil disalin! Buka Supabase > SQL Editor > Paste.");
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 lg:pl-64">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Super Admin */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs rounded-xl text-slate-400 hover:text-white">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  <span>Dashboard App</span>
                </Button>
              </Link>
              <span className="text-slate-600">/</span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-400" />
                <span>Super Admin Central Control</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                Founder Mode
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Kelola seluruh biro wisata rekanan, atur pembatasan tier lisensi (gating), pantau perpanjangan domain/VPS, dan migrasi Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleCopySql}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl text-xs font-semibold border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 gap-1.5"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">SQL Tersalin</span>
                </>
              ) : (
                <>
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Salin Skrip SQL</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditingTenant(null);
                setForm({
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
                setShowAddTenantModal(true);
              }}
              className="h-9 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Daftarkan Biro Baru</span>
            </Button>
          </div>
        </div>

        {/* 4 Kartu KPI Bento Super Admin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Card className="p-4 rounded-2xl bg-slate-900 border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Klien Biro
              </span>
              <p className="text-2xl font-black text-white mt-1">{tenants.length}</p>
              <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">
                {tenants.filter((t) => t.status === "active").length} Biro Aktif Beroperasi
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </Card>

          <Card className="p-4 rounded-2xl bg-slate-900 border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Omset Penjualan Lisensi
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {formatRupiah(totalOmsetLisensi)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Sekali bayar + langganan
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </Card>

          <Card className="p-4 rounded-2xl bg-slate-900 border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Website Promosi Biro
              </span>
              <p className="text-2xl font-black text-white mt-1">{activeWebsites.length}</p>
              <span className="text-[11px] text-blue-400 font-semibold mt-1 block">
                Domain & VPS Tahunan Aktif
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Globe className="w-5 h-5" />
            </div>
          </Card>

          <Card className="p-4 rounded-2xl bg-slate-900 border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Model Penagihan Masa Depan
              </span>
              <p className="text-lg font-black text-amber-400 mt-1">SaaS Hybrid</p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Fase 1: Lifetime • Fase 2: Bulanan
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
          </Card>
        </div>

        {/* Tab Kontrol Master */}
        <Tabs defaultValue="tenants" className="w-full space-y-4">
          <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-2xl inline-flex">
            <TabsTrigger value="tenants" className="rounded-xl text-xs font-semibold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Daftar Biro & Lisensi ({tenants.length})</span>
            </TabsTrigger>
            <TabsTrigger value="websites" className="rounded-xl text-xs font-semibold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              <span>Website Promosi & Domain ({activeWebsites.length})</span>
            </TabsTrigger>
            <TabsTrigger value="sql" className="rounded-xl text-xs font-semibold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950">
              <Database className="w-3.5 h-3.5 mr-1.5" />
              <span>Skrip SQL Supabase</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DAFTAR TENANT & FEATURE GATING */}
          <TabsContent value="tenants" className="space-y-4">
            {/* Filter & Pencarian */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari biro, pemilik, no WA..."
                  className="pl-9 h-9 text-xs rounded-xl bg-slate-900 border-slate-800 text-white"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-900 border-slate-800 w-40 text-slate-200">
                    <SelectValue placeholder="Semua Tier" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="all">Semua Tier</SelectItem>
                    <SelectItem value="starter">Starter (Murah)</SelectItem>
                    <SelectItem value="pro">Pro (Desktop)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (SaaS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* List Tenant Cards */}
            <div className="grid grid-cols-1 gap-3">
              {filteredTenants.map((t) => (
                <Card
                  key={t.id}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-slate-800 hover:border-slate-700 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                        {t.namaBiro.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-white truncate">
                            {t.namaBiro}
                          </h3>
                          <Badge
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.tier === "enterprise"
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                : t.tier === "pro"
                                ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            }`}
                          >
                            {t.tier === "enterprise"
                              ? "Enterprise (SaaS)"
                              : t.tier === "pro"
                              ? "Pro (Desktop Aktif)"
                              : "Starter (Mobile-Only)"}
                          </Badge>
                          <span className="text-[10px] text-slate-400">
                            • {t.paymentModel === "lifetime" ? "Sekali Bayar" : "Langganan Bulanan"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Owner: <strong>{t.ownerNama}</strong> • {t.ownerPhone} • {t.ownerEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-xl">
                        {formatRupiah(t.nominalBayar || 0)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(t)}
                        className="h-8 text-xs rounded-xl border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(t.id, t.namaBiro)}
                        className="h-8 w-8 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Switch Kontrol Hak Akses Fitur (Feature Gating) */}
                  <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                        <Monitor className="w-3.5 h-3.5 text-blue-400" />
                        <span>Mode Desktop PC</span>
                      </span>
                      <Switch
                        checked={t.canUseDesktopMode}
                        onCheckedChange={(val) => handleToggleFeature(t.id, "canUseDesktopMode", val)}
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>PDF Bersih (No WM)</span>
                      </span>
                      <Switch
                        checked={t.canExportCleanPdf}
                        onCheckedChange={(val) => handleToggleFeature(t.id, "canExportCleanPdf", val)}
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Asisten AI Gemini</span>
                      </span>
                      <Switch
                        checked={t.canUseAI}
                        onCheckedChange={(val) => handleToggleFeature(t.id, "canUseAI", val)}
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                        <Globe className="w-3.5 h-3.5 text-purple-400" />
                        <span>Website Promosi</span>
                      </span>
                      <Switch
                        checked={t.hasWebsite}
                        onCheckedChange={(val) => handleToggleFeature(t.id, "hasWebsite", val)}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 2: WEBSITE PROMOSI & JATUH TEMPO VPS */}
          <TabsContent value="websites" className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Pusat Manajemen Domain & Hosting VPS Biro</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Website promosi biro dikenakan biaya perpanjangan tahunan (atau per 3/6 bulan) untuk menutupi biaya domain (`.com`/`.id`) dan server VPS. Anda dapat mengirimkan pesan invoice WhatsApp langsung saat masa aktif mendekati habis.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {activeWebsites.map((t) => (
                <Card
                  key={t.id}
                  className="p-4 rounded-2xl bg-slate-900 border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {t.domainName || `${t.slugBiro}.catatbiro.id`}
                      </span>
                      <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/40">
                        Website Aktif
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      Biro: <strong>{t.namaBiro}</strong> ({t.ownerNama} • {t.ownerPhone})
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Jatuh Tempo Domain: <strong>{t.domainExpiredAt || "2027-10-20"}</strong></span>
                      <span>Biaya Tahunan: <strong className="text-emerald-400">Rp 750.000 / thn</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSendWaBill(t)}
                      className="h-8 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Kirim Tagihan WA</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: SKRIP SQL SUPABASE */}
          <TabsContent value="sql" className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>Skrip DDL SQL Resmi untuk Supabase Editor</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Salin skrip di bawah ini, lalu buka <strong>Supabase Dashboard &gt; SQL Editor</strong> dan jalankan tombol <strong>Run</strong>.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleCopySql}
                  size="sm"
                  className="h-8 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1.5"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? "Tersalin!" : "Salin Skrip SQL"}</span>
                </Button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-96 leading-relaxed select-all">
                {sqlMigrationCode}
              </pre>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal Tambah / Edit Tenant */}
        <Dialog open={showAddTenantModal} onOpenChange={setShowAddTenantModal}>
          <DialogContent className="sm:max-w-lg rounded-2xl bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span>{editingTenant ? "Perbarui Lisensi Biro Klien" : "Daftarkan Biro Klien Baru"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Atur paket lisensi, model penagihan, dan hak akses fitur biro wisata.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveTenant} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Nama Biro Wisata *</Label>
                <Input
                  required
                  placeholder="Contoh: Barokah Wisata Tour"
                  value={form.namaBiro}
                  onChange={(e) => setForm({ ...form, namaBiro: e.target.value })}
                  className="h-9 text-xs rounded-xl bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">Nama Pemilik Biro *</Label>
                  <Input
                    required
                    placeholder="Nama Lengkap Owner"
                    value={form.ownerNama}
                    onChange={(e) => setForm({ ...form, ownerNama: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">No. WhatsApp *</Label>
                  <Input
                    required
                    placeholder="0812-xxxx-xxxx"
                    value={form.ownerPhone}
                    onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">Paket Lisensi *</Label>
                  <Select
                    value={form.tier}
                    onValueChange={(val: LicenseTier) => setForm({ ...form, tier: val })}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-950 border-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="starter">Starter (Mobile-Only)</SelectItem>
                      <SelectItem value="pro">Pro (Desktop + Bento KPI)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (SaaS Bulanan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">Model Pembayaran *</Label>
                  <Select
                    value={form.paymentModel}
                    onValueChange={(val: PaymentModel) => setForm({ ...form, paymentModel: val })}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-950 border-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="lifetime">Sekali Bayar (Lifetime)</SelectItem>
                      <SelectItem value="subscription">Langganan Bulanan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">Nominal Pembayaran (Rp)</Label>
                  <Input
                    type="number"
                    value={form.nominalBayar}
                    onChange={(e) => setForm({ ...form, nominalBayar: Number(e.target.value) })}
                    className="h-9 text-xs rounded-xl bg-slate-950 border-slate-800 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">Website Promosi Biro?</Label>
                  <div className="pt-2 flex items-center gap-2">
                    <Switch
                      checked={form.hasWebsite}
                      onCheckedChange={(val) => setForm({ ...form, hasWebsite: val })}
                    />
                    <span className="text-xs text-slate-300">{form.hasWebsite ? "Ya, Buatkan Website" : "Tidak"}</span>
                  </div>
                </div>
              </div>

              {form.hasWebsite && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">Nama Domain Website</Label>
                  <Input
                    placeholder="Contoh: barokahwisata.com"
                    value={form.domainName}
                    onChange={(e) => setForm({ ...form, domainName: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-slate-950 border-slate-800 text-white font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddTenantModal(false)}
                  className="h-8 text-xs rounded-xl border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  {editingTenant ? "Simpan Perubahan" : "Daftarkan Biro"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
