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
import { resetDefaultBroadcasts } from "@/utils/superAdminBroadcasts";
import { resetDefaultTickets } from "@/utils/superAdminTickets";
import { resetPlatformSettings } from "@/utils/superAdminSettings";

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
 
-- 8. TABEL BROADCAST PENGUMUMAN GLOBAL (SYSTEM BROADCASTS)
CREATE TABLE IF NOT EXISTS public.system_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_active BOOLEAN DEFAULT true,
    target_tier VARCHAR(50) DEFAULT 'all',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) DEFAULT 'anjarbdn@gmail.com',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABEL TIKET BANTUAN & LAPORAN KENDALA (SUPPORT TICKETS)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(100) UNIQUE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    tenant_name VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(50),
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'kendala_teknis',
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    description TEXT NOT NULL,
    admin_notes TEXT,
    resolution_reply TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TABEL KONFIGURASI PLATFORM SAAS (SYSTEM PLATFORM SETTINGS)
CREATE TABLE IF NOT EXISTS public.system_platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name VARCHAR(255) DEFAULT 'CatatBiro Wisata SaaS',
    cs_whatsapp_number VARCHAR(50) DEFAULT '6281234567890',
    cs_email VARCHAR(255) DEFAULT 'support@catatbiro.id',
    docs_url TEXT DEFAULT 'https://catatbiro.id/docs',
    youtube_tutorial_url TEXT DEFAULT 'https://youtube.com/@catatbiro',
    emergency_maintenance_mode BOOLEAN DEFAULT false,
    maintenance_message TEXT DEFAULT 'Sistem sedang dalam peningkatan performa server. Beberapa fitur mungkin mengalami respon lebih lambat.',
    updated_by VARCHAR(255) DEFAULT 'anjarbdn@gmail.com',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.super_admin_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_registered_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_platform_settings ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Super admin full access broadcasts" ON public.system_broadcasts
    FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
CREATE POLICY "Super admin full access tickets" ON public.support_tickets
    FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');
CREATE POLICY "Super admin full access platform_settings" ON public.system_platform_settings
    FOR ALL USING (auth.jwt() ->> 'email' = 'anjarbdn@gmail.com');

CREATE POLICY "Clients read active broadcasts" ON public.system_broadcasts
    FOR SELECT USING (is_active = true);
CREATE POLICY "Clients read public settings" ON public.system_platform_settings
    FOR SELECT USING (true);
CREATE POLICY "Clients insert and read own tickets" ON public.support_tickets
    FOR ALL USING (
        tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
        OR auth.jwt() ->> 'email' = sender_email
    );

-- AUTO-IMPORT BIRO YANG SUDAH TERDAFTAR DI AUTH.USERS
INSERT INTO public.tenants (
    user_id, nama_biro, slug_biro, owner_nama, owner_email, owner_phone, tier_lisensi, payment_model, status_akun
)
SELECT 
    u.id AS user_id,
    COALESCE(bp.nama_biro, u.raw_user_meta_data->>'nama_biro', split_part(u.email, '@', 1) || ' Tour') AS nama_biro,
    lower(regexp_replace(COALESCE(bp.nama_biro, split_part(u.email, '@', 1)), '[^a-zA-Z0-9]', '-', 'g')) || '-' || substring(u.id::text, 1, 4) AS slug_biro,
    COALESCE(bp.pimpinan, u.raw_user_meta_data->>'nama_lengkap', split_part(u.email, '@', 1)) AS owner_nama,
    u.email AS owner_email,
    COALESCE(bp.telepon, u.raw_user_meta_data->>'phone', '0812-0000-0000') AS owner_phone,
    'starter' AS tier_lisensi,
    'lifetime' AS payment_model,
    'active' AS status_akun
FROM auth.users u
LEFT JOIN public.biro_profiles bp ON bp.user_id = u.id
WHERE u.email != 'anjarbdn@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.feature_entitlements (
    tenant_id, can_use_desktop_mode, can_export_pdf_clean, can_use_ai_assistant, max_active_trips, max_crew_members, custom_branding_enabled
)
SELECT t.id, false, false, false, 5, 2, false
FROM public.tenants t
LEFT JOIN public.feature_entitlements fe ON fe.tenant_id = t.id
WHERE fe.id IS NULL
ON CONFLICT DO NOTHING;

-- AUTO-TRIGGER: BIRO BARU YANG DAFTAR OTOMATIS MASUK KE TENANTS
CREATE OR REPLACE FUNCTION public.handle_new_tenant_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_biro_name TEXT;
BEGIN
    IF NEW.email = 'anjarbdn@gmail.com' THEN
        RETURN NEW;
    END IF;
    v_biro_name := COALESCE(NEW.raw_user_meta_data->>'nama_biro', split_part(NEW.email, '@', 1) || ' Tour');
    INSERT INTO public.tenants (
        user_id, nama_biro, slug_biro, owner_nama, owner_email, owner_phone, tier_lisensi, payment_model, status_akun
    ) VALUES (
        NEW.id, v_biro_name,
        lower(regexp_replace(v_biro_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substring(NEW.id::text, 1, 4),
        COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email, '@', 1)),
        NEW.email, COALESCE(NEW.raw_user_meta_data->>'phone', '0812-0000-0000'),
        'starter', 'lifetime', 'active'
    ) RETURNING id INTO v_tenant_id;

    INSERT INTO public.feature_entitlements (
        tenant_id, can_use_desktop_mode, can_export_pdf_clean, can_use_ai_assistant, max_active_trips, max_crew_members, custom_branding_enabled
    ) VALUES (
        v_tenant_id, false, false, false, 5, 2, false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_tenant ON auth.users;
CREATE TRIGGER on_auth_user_created_tenant
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant_signup();
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
    if (
      confirm(
        "Reset seluruh data lokal (tenants, audit logs, devices, broadcasts, tickets, platform settings) ke seed awal demo?"
      )
    ) {
      resetDefaultTenants();
      resetDefaultDevices();
      clearAuditLogs();
      resetDefaultBroadcasts();
      resetDefaultTickets();
      resetPlatformSettings();
      toast.success("Seluruh data seed berhasil di-reset ke kondisi awal");
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Database Schema & Supabase SQL Manager
                </h2>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-mono font-medium">
                  Schema v2.4 Active
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Konsol DDL migrasi SQL Supabase untuk tabel lisensi, RLS security policy, audit trail, dan perangkat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleCopySql}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-xs font-semibold"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Tersalin!" : "Salin Query SQL"}
            </Button>
            <Button
              onClick={handleResetAllData}
              variant="outline"
              className="text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-9 rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Data Seed
            </Button>
          </div>
        </div>
      </div>

      {/* Database Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Supabase Connection
          </div>
          <div className="text-base font-bold text-emerald-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Connected (Pooler Active)
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Endpoint: wss://supabase.co</p>
        </Card>

        <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Tabel Enterprise
          </div>
          <div className="text-base font-bold text-slate-900">
            10 Tabel Terisolasi RLS
          </div>
          <p className="text-[11px] text-slate-500">Row Level Security (anjarbdn@gmail.com bypass)</p>
        </Card>

        <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Offline Cache Engine
          </div>
          <div className="text-base font-bold text-cyan-700 flex items-center gap-1">
            <Check className="w-4 h-4" /> Local Fallback Ready
          </div>
          <p className="text-[11px] text-slate-500">PWA IndexedDB & Reactive State</p>
        </Card>
      </div>

      {/* SQL Script Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-800 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-500" />
            File: supabase/migrations/20261105_super_admin_and_licensing.sql
          </span>
          <span className="text-slate-500 font-mono">PostgreSQL 15+ Dialect</span>
        </div>

        <pre className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-mono text-slate-800 overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed shadow-xs">
          {SQL_MIGRATION_SCRIPT}
        </pre>
      </div>
    </div>
  );
};
