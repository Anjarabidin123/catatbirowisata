-- ====================================================================
-- MIGRASI DATABASE: SUPER ADMIN, LISENSI MULTI-TENANT & PENAGIHAN
-- Tanggal: 2026-11-05
-- Platform: SaaS CatatBiro Wisata & Ekosistem Website Biro
-- Author: Founder (anjarbdn@gmail.com) & Antigravity Enterprise Engine
-- ====================================================================

-- 1. DAFTAR EMAIL WHITELIST SUPER ADMIN
CREATE TABLE IF NOT EXISTS public.super_admin_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daftarkan email master founder
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
    status_akun VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'expired', 'trial'
    catatan_internal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL HAK AKSES FITUR (FEATURE ENTITLEMENTS / TIER GATING)
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

-- 4. TABEL RIWAYAT TRANSAKSI & PENAGIHAN LISENSI
CREATE TABLE IF NOT EXISTS public.tenant_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    nomor_invoice VARCHAR(100) UNIQUE NOT NULL,
    jenis_layanan VARCHAR(100) NOT NULL, -- 'Lisensi Sekali Bayar', 'Langganan Bulanan', 'Perpanjangan Domain & VPS'
    nominal NUMERIC(15, 2) NOT NULL,
    tanggal_bayar DATE NOT NULL,
    tanggal_jatuh_tempo DATE,
    metode_pembayaran VARCHAR(100) DEFAULT 'Transfer Bank Manual',
    status_bayar VARCHAR(50) DEFAULT 'lunas', -- 'lunas', 'menunggu_konfirmasi', 'expired'
    bukti_transfer_url TEXT,
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABEL WEBSITE PROMOSI BIRO (DOMAIN & VPS HOSTING TRACKER)
CREATE TABLE IF NOT EXISTS public.client_websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain_utama VARCHAR(255), -- contoh: berkahwisata.com
    subdomain_gratis VARCHAR(100) UNIQUE, -- contoh: berkah.catatbiro.id
    status_website VARCHAR(50) DEFAULT 'active', -- 'active', 'pending_dns', 'maintenance', 'suspended'
    domain_expired_at DATE,
    hosting_vps_expired_at DATE,
    biaya_perpanjangan_tahunan NUMERIC(15, 2) DEFAULT 750000,
    server_node VARCHAR(100) DEFAULT 'vps-sgp-01',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABEL LOG AUDIT AKTIVITAS SUPER ADMIN (SECURITY & COMPLIANCE)
CREATE TABLE IF NOT EXISTS public.super_admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'OVERRIDE_FEATURE', 'CREATE_TENANT', 'UPDATE_TENANT', 'DELETE_TENANT', 'STATUS_CHANGE', 'REVOKE_DEVICE', 'BILLING_RECORD'
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

-- 7. TABEL MANAJEMEN PERANGKAT & SESI TERDAFTAR (DEVICE MANAGEMENT)
CREATE TABLE IF NOT EXISTS public.tenant_registered_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(100) DEFAULT 'Kru Lapangan',
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'mobile', -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address VARCHAR(100),
    location_city VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'revoked', 'idle'
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.super_admin_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_registered_devices ENABLE ROW LEVEL SECURITY;

-- POLICY SUPER ADMIN (Akses penuh untuk anjarbdn@gmail.com)
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

-- POLICY USER BIRO (Membaca data biro miliknya sendiri)
CREATE POLICY "Owner read own tenant" ON public.tenants
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owner read own entitlements" ON public.feature_entitlements
    FOR SELECT USING (
        tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    );

CREATE POLICY "Owner read own devices" ON public.tenant_registered_devices
    FOR SELECT USING (
        tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    );

