import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Server,
  FileCode,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { resetDefaultTenants } from "@/utils/licenseEntitlement";
import { resetDefaultDevices } from "@/utils/superAdminDevices";
import { clearAuditLogs } from "@/utils/superAdminAuditLogs";

const SQL_MIGRATION_SCRIPT = `-- ====================================================================
-- MIGRASI DATABASE: SUPER ADMIN, LISENSI MULTI-TENANT & AUDIT SECURITY
-- Platform: SaaS CatatBiro Wisata & Ekosistem Website Biro
-- Author: Founder (anjarbdn@gmail.com) & Antigravity Enterprise Engine
-- ====================================================================

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

CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_biro VARCHAR(255) NOT NULL,
    slug_biro VARCHAR(100) UNIQUE,
    owner_nama VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(50) NOT NULL,
    tier_lisensi VARCHAR(50) DEFAULT 'starter',
    payment_model VARCHAR(50) DEFAULT 'lifetime',
    status_akun VARCHAR(50) DEFAULT 'active',
    catatan_internal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS public.tenant_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    nomor_invoice VARCHAR(100) UNIQUE NOT NULL,
    jenis_layanan VARCHAR(100) NOT NULL,
    nominal NUMERIC(15, 2) NOT NULL,
    tanggal_bayar DATE NOT NULL,
    tanggal_jatuh_tempo DATE,
    metode_pembayaran VARCHAR(100) DEFAULT 'Transfer Bank Manual',
    status_bayar VARCHAR(50) DEFAULT 'lunas',
    bukti_transfer_url TEXT,
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.client_websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain_utama VARCHAR(255),
    subdomain_gratis VARCHAR(100) UNIQUE,
    status_website VARCHAR(50) DEFAULT 'active',
    domain_expired_at DATE,
    hosting_vps_expired_at DATE,
    biaya_perpanjangan_tahunan NUMERIC(15, 2) DEFAULT 750000,
    server_node VARCHAR(100) DEFAULT 'vps-sgp-01',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.super_admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    tenant_name VARCHAR(255),
    description TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tenant_registered_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(100) DEFAULT 'Kru Lapangan',
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'mobile',
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address VARCHAR(100),
    location_city VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.super_admin_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_registered_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access whitelist" ON public.super_admin_whitelist
    FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
CREATE POLICY "Super admin full access tenants" ON public.tenants
    FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
CREATE POLICY "Super admin full access entitlements" ON public.feature_entitlements
    FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
CREATE POLICY "Super admin full access invoices" ON public.tenant_invoices
    FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
CREATE POLICY "Super admin full access client_websites" ON public.client_websites
    FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
CREATE POLICY "Super admin full access audit_logs" ON public.super_admin_audit_logs
    FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
CREATE POLICY "Super admin full access devices" ON public.tenant_registered_devices
    FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
`;

interface DatabaseManagerViewProps {
  onRefresh: () => void;
}

export const DatabaseManagerView: React.FC<DatabaseManagerViewProps> = ({ onRefresh }) => {
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SCRIPT);
    setCopied(true);
    toast.success("Query SQL Migrasi berhasil disalin ke clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleResetAllData = () => {
    if (confirm("Reset seluruh data lokal (tenants, audit logs, devices) ke seed awal demo?")) {
      resetDefaultTenants();
      resetDefaultDevices();
      clearAuditLogs();
      toast.success("Seluruh data seed berhasil di-reset ke kondisi awal");
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="p-6 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Database Schema & Supabase SQL Manager
                </h2>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-mono">
                  Schema v2.4 Active
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Konsol DDL migrasi SQL Supabase untuk tabel lisensi, RLS security policy, audit trail, dan perangkat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleCopySql}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Tersalin!" : "Salin Query SQL"}
            </Button>
            <Button
              onClick={handleResetAllData}
              variant="outline"
              className="text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 h-9 rounded-xl flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Data Seed
            </Button>
          </div>
        </div>
      </div>

      {/* Database Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-900/90 border-slate-800 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Supabase Connection
          </div>
          <div className="text-base font-bold text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Connected (Pooler Active)
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Endpoint: wss://supabase.co</p>
        </Card>

        <Card className="p-4 bg-slate-900/90 border-slate-800 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Tabel Enterprise
          </div>
          <div className="text-base font-bold text-white">
            7 Tabel Terisolasi RLS
          </div>
          <p className="text-[11px] text-slate-500">Row Level Security (anjarbdn@gmail.com bypass)</p>
        </Card>

        <Card className="p-4 bg-slate-900/90 border-slate-800 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Offline Cache Engine
          </div>
          <div className="text-base font-bold text-cyan-400 flex items-center gap-1">
            <Check className="w-4 h-4" /> Local Fallback Ready
          </div>
          <p className="text-[11px] text-slate-500">PWA IndexedDB & Reactive State</p>
        </Card>
      </div>

      {/* SQL Script Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-200 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-400" />
            File: supabase/migrations/20261105_super_admin_and_licensing.sql
          </span>
          <span className="text-slate-500 font-mono">PostgreSQL 15+ Dialect</span>
        </div>

        <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed shadow-inner">
          {SQL_MIGRATION_SCRIPT}
        </pre>
      </div>
    </div>
  );
};
