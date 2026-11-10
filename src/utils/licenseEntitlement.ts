/**
 * Modul Lisensi, Feature Gating (Tier Entitlements), dan Sandbox Simulator
 * Digunakan untuk mengatur batasan fitur biro wisata dan mode tester Super Admin.
 */

import { supabase } from "@/integrations/supabase/client";
import { getActiveUserSync } from "./authHelper";
import { logAuditEvent } from "./superAdminAuditLogs";

export const SUPER_ADMIN_EMAIL = "anjarbdn@gmail.com";

export type LicenseTier = "starter" | "pro" | "enterprise";
export type PaymentModel = "lifetime" | "subscription";
export type TesterPerspective = "super_admin" | "starter" | "pro" | "enterprise" | "kru" | "normal";

export interface TenantRecord {
  id: string;
  namaBiro: string;
  slugBiro: string;
  ownerNama: string;
  ownerEmail: string;
  ownerPhone: string;
  tier: LicenseTier;
  paymentModel: PaymentModel;
  status: "active" | "suspended" | "expired" | "trial";
  
  // GRANULAR OVERRIDES (A-Z Kontrol Penuh Super Admin)
  canUseDesktopMode: boolean; // Override Desktop Mode (bahkan jika starter)
  canExportCleanPdf: boolean; // PDF tanpa watermark CatatBiro
  canUseAI: boolean;          // Akses AI Asisten Wisata
  maxActiveTrips: number;     // Angka bebas atau 9999 (Unlimited)
  maxCrewMembers: number;     // Angka bebas atau 9999 (Unlimited)
  customBranding: boolean;    // Custom logo & kop surat
  canUseAdvancedRbac?: boolean;
  canAccessApi?: boolean;
  
  // WEB & HOSTING
  hasWebsite: boolean;
  domainName?: string;
  subdomain?: string;
  vpsIp?: string;
  domainExpiredAt?: string;
  hostingExpiredAt?: string;
  websiteStatus?: "active" | "pending_dns" | "maintenance" | "suspended";
  
  // BILLING & FINANCIAL
  nominalBayar: number;
  tanggalBayar: string;
  tanggalJatuhTempo?: string;
  statusPembayaran?: "lunas" | "pending" | "jatuh_tempo" | "terblokir";
  
  // CATATAN FOUNDER
  catatan?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EntitlementState {
  isSuperAdmin: boolean;
  activePerspective: TesterPerspective;
  tier: LicenseTier;
  canUseDesktopMode: boolean;
  canExportCleanPdf: boolean;
  canUseAI: boolean;
  maxActiveTrips: number;
  maxCrewMembers: number;
  customBranding: boolean;
  hasWebsite: boolean;
  activeTenantName?: string;
  isImpersonating?: boolean;
}

const PERSPECTIVE_STORAGE_KEY = "catatbiro_tester_perspective_v1";
const TENANTS_STORAGE_KEY = "catatbiro_tenants_store_v1";
const IMPERSONATED_TENANT_KEY = "catatbiro_impersonated_tenant_id_v1";

// Mock bawaan data awal tenant untuk demo & pengujian langsung
const DEFAULT_TENANTS: TenantRecord[] = [
  {
    id: "tenant_069",
    namaBiro: "69 Trans & Tour (PT Enam Sembilan Wisata Mandiri)",
    slugBiro: "69-trans",
    ownerNama: "H. Anjar Abidin, S.E.",
    ownerEmail: "anjarbdn@gmail.com",
    ownerPhone: "0812-2578-9000",
    tier: "enterprise",
    paymentModel: "lifetime",
    status: "active",
    canUseDesktopMode: true,
    canExportCleanPdf: true,
    canUseAI: true,
    maxActiveTrips: 9999,
    maxCrewMembers: 9999,
    customBranding: true,
    hasWebsite: true,
    domainName: "69trans.id",
    subdomain: "69trans.catatbiro.id",
    vpsIp: "103.186.201.69",
    domainExpiredAt: "2029-10-01",
    hostingExpiredAt: "2029-10-01",
    websiteStatus: "active",
    nominalBayar: 3500000,
    tanggalBayar: "2026-10-01",
    statusPembayaran: "lunas",
    catatan: "Biro Resmi Utama (PT Enam Sembilan Wisata Mandiri / 69 Trans) - Hak Akses Penuh Enterprise & Founder.",
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z",
  },
  {
    id: "tenant_001",
    namaBiro: "Berkah Wisata Religi",
    slugBiro: "berkah-wisata",
    ownerNama: "H. Ridwan Mansyur",
    ownerEmail: "ridwan@berkahwisata.id",
    ownerPhone: "0812-3456-7890",
    tier: "starter",
    paymentModel: "lifetime",
    status: "active",
    canUseDesktopMode: false,
    canExportCleanPdf: false,
    canUseAI: false,
    maxActiveTrips: 5,
    maxCrewMembers: 2,
    customBranding: false,
    hasWebsite: false,
    subdomain: "berkah.catatbiro.id",
    vpsIp: "103.186.201.44",
    nominalBayar: 750000,
    tanggalBayar: "2026-10-15",
    statusPembayaran: "lunas",
    catatan: "Paket Murah Sekali Bayar (Mobile Only). Kuota 5 trip, 2 kru.",
    createdAt: "2026-10-15T08:00:00Z",
    updatedAt: "2026-10-15T08:00:00Z",
  },
  {
    id: "tenant_002",
    namaBiro: "Nusantara Tour & Travel",
    slugBiro: "nusantara-tour",
    ownerNama: "Bambang Sudarsono",
    ownerEmail: "bambang@nusantaratour.com",
    ownerPhone: "0813-8899-7711",
    tier: "pro",
    paymentModel: "lifetime",
    status: "active",
    canUseDesktopMode: true,
    canExportCleanPdf: true,
    canUseAI: true,
    maxActiveTrips: 30,
    maxCrewMembers: 10,
    customBranding: true,
    hasWebsite: true,
    domainName: "nusantaratour.com",
    subdomain: "nusantara.catatbiro.id",
    vpsIp: "103.186.201.44",
    domainExpiredAt: "2027-10-15",
    hostingExpiredAt: "2027-10-15",
    websiteStatus: "active",
    nominalBayar: 2250000,
    tanggalBayar: "2026-10-20",
    tanggalJatuhTempo: "2027-10-20",
    statusPembayaran: "lunas",
    catatan: "Paket Pro Sekali Bayar + Website Promosi Tahunan (Rp 750.000/thn)",
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
  },
  {
    id: "tenant_003",
    namaBiro: "Garuda Prima Kencana Tour",
    slugBiro: "garuda-prima",
    ownerNama: "Kartika Sari",
    ownerEmail: "kartika@garudaprima.co.id",
    ownerPhone: "0811-2233-4455",
    tier: "enterprise",
    paymentModel: "subscription",
    status: "active",
    canUseDesktopMode: true,
    canExportCleanPdf: true,
    canUseAI: true,
    maxActiveTrips: 9999,
    maxCrewMembers: 9999,
    customBranding: true,
    hasWebsite: true,
    domainName: "garudaprimatour.co.id",
    subdomain: "garudaprima.catatbiro.id",
    vpsIp: "103.186.201.55",
    domainExpiredAt: "2027-11-01",
    hostingExpiredAt: "2027-11-01",
    websiteStatus: "active",
    nominalBayar: 350000,
    tanggalBayar: "2026-11-01",
    tanggalJatuhTempo: "2026-12-01",
    statusPembayaran: "lunas",
    catatan: "Paket Enterprise Langganan Bulanan + Domain VPS Enterprise Dedicated",
    createdAt: "2026-11-01T09:00:00Z",
    updatedAt: "2026-11-01T09:00:00Z",
  },
];

/**
 * Cek apakah user saat ini adalah Super Admin (Founder)
 */
export function isSuperAdminUser(): boolean {
  if (typeof window === "undefined") return false;
  const user = getActiveUserSync();
  const currentEmail = user?.email?.toLowerCase() || "";

  // 1. Jika sedang login dengan email anjarbdn@gmail.com -> Super Admin SAH (Founder)
  if (currentEmail && currentEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // 2. Akses Super Admin di workstation Founder lokal (memungkinkan Mas Anjar mengelola biro walau sedang menguji akun biro)
  try {
    const override = localStorage.getItem("catatbiro_is_superadmin_override");
    if (override === "true") return true;
  } catch (err) {
    console.warn("Storage check failed", err);
  }

  return false;
}

/**
 * Ambil mode perspektif simulasi saat ini (hanya untuk Super Admin)
 */
export function getActivePerspective(): TesterPerspective {
  if (typeof window === "undefined") return "normal";
  try {
    const saved = localStorage.getItem(PERSPECTIVE_STORAGE_KEY) as TesterPerspective;
    if (saved) return saved;
  } catch (err) {
    console.warn("Failed to read perspective", err);
  }
  return "normal";
}

/**
 * Ganti mode perspektif simulasi (Super Admin Tester)
 */
export function setActivePerspective(mode: TesterPerspective): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERSPECTIVE_STORAGE_KEY, mode);
    window.dispatchEvent(new Event("catatbiro-entitlement-updated"));
  } catch (err) {
    console.warn("Failed to write perspective", err);
  }
}

/**
 * Dapatkan ID Tenant yang sedang di-impersonate (simulasi akun biro tertentu)
 */
export function getImpersonatedTenantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(IMPERSONATED_TENANT_KEY);
  } catch (err) {
    console.warn("Failed to get impersonated tenant id", err);
  }
  return null;
}

/**
 * Aktifkan impersonate tenant tertentu (Founder masuk sebagai biro tersebut)
 */
export function impersonateTenant(tenantId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(IMPERSONATED_TENANT_KEY, tenantId);
    localStorage.setItem(PERSPECTIVE_STORAGE_KEY, "normal");
    window.dispatchEvent(new Event("catatbiro-entitlement-updated"));
    
    const tenant = getTenantById(tenantId);
    if (tenant) {
      logAuditEvent({
        action: "STATUS_CHANGE",
        tableName: "tenants",
        recordId: tenantId,
        tenantId,
        tenantName: tenant.namaBiro,
        description: `Founder mengaktifkan mode impersonasi untuk melihat antarmuka biro [${tenant.namaBiro}]`,
      });
    }
  } catch (err) {
    console.warn("Failed to set impersonation", err);
  }
}

/**
 * Hentikan impersonasi tenant dan kembali ke Super Admin
 */
export function stopImpersonation(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(IMPERSONATED_TENANT_KEY);
    localStorage.setItem(PERSPECTIVE_STORAGE_KEY, "super_admin");
    window.dispatchEvent(new Event("catatbiro-entitlement-updated"));
  } catch (err) {
    console.warn("Failed to clear impersonation", err);
  }
}

/**
 * Evaluasi Hak Akses Fitur (Entitlements) yang Sedang Aktif
 */
export function getCurrentEntitlements(): EntitlementState {
  const isSuper = isSuperAdminUser();
  const perspective = getActivePerspective();
  const impersonatedId = getImpersonatedTenantId();

  // 1. Jika sedang meng-impersonate tenant tertentu, gunakan konfigurasi persis dari tenant tersebut!
  if (impersonatedId) {
    const tenant = getTenantById(impersonatedId);
    if (tenant) {
      return {
        isSuperAdmin: isSuper,
        activePerspective: "normal",
        tier: tenant.tier,
        canUseDesktopMode: tenant.canUseDesktopMode, // Respect granular override!
        canExportCleanPdf: tenant.canExportCleanPdf,
        canUseAI: tenant.canUseAI,
        maxActiveTrips: tenant.maxActiveTrips,
        maxCrewMembers: tenant.maxCrewMembers,
        customBranding: tenant.customBranding,
        hasWebsite: tenant.hasWebsite,
        activeTenantName: tenant.namaBiro,
        isImpersonating: true,
      };
    }
  }

  // 2. Jika Super Admin memilih mode 'super_admin' asli -> semua fitur terbuka 100%
  if (isSuper && perspective === "super_admin") {
    return {
      isSuperAdmin: true,
      activePerspective: "super_admin",
      tier: "enterprise",
      canUseDesktopMode: true,
      canExportCleanPdf: true,
      canUseAI: true,
      maxActiveTrips: 9999,
      maxCrewMembers: 9999,
      customBranding: true,
      hasWebsite: true,
      activeTenantName: "CatatBiro Master HQ",
      isImpersonating: false,
    };
  }

  // 3. Simulasi Starter (Paket Murah)
  if (perspective === "starter") {
    return {
      isSuperAdmin: isSuper,
      activePerspective: "starter",
      tier: "starter",
      canUseDesktopMode: false,
      canExportCleanPdf: false,
      canUseAI: false,
      maxActiveTrips: 5,
      maxCrewMembers: 2,
      customBranding: false,
      hasWebsite: false,
      activeTenantName: "Simulasi Starter (Mobile Only)",
      isImpersonating: false,
    };
  }

  // 4. Simulasi Pro
  if (perspective === "pro") {
    return {
      isSuperAdmin: isSuper,
      activePerspective: "pro",
      tier: "pro",
      canUseDesktopMode: true,
      canExportCleanPdf: true,
      canUseAI: true,
      maxActiveTrips: 30,
      maxCrewMembers: 10,
      customBranding: true,
      hasWebsite: true,
      activeTenantName: "Simulasi Pro (Bento Desktop)",
      isImpersonating: false,
    };
  }

  // 5. Simulasi Enterprise
  if (perspective === "enterprise") {
    return {
      isSuperAdmin: isSuper,
      activePerspective: "enterprise",
      tier: "enterprise",
      canUseDesktopMode: true,
      canExportCleanPdf: true,
      canUseAI: true,
      maxActiveTrips: 9999,
      maxCrewMembers: 9999,
      customBranding: true,
      hasWebsite: true,
      activeTenantName: "Simulasi Enterprise (Full SaaS)",
      isImpersonating: false,
    };
  }

  // 6. Pencocokan Otomatis Akun Login & Profil Biro dengan Konfigurasi Super Admin
  const activeUser = getActiveUserSync();
  const currentEmail = activeUser?.email?.toLowerCase().trim() || "";

  let localProfile: { nama_biro?: string; pimpinan?: string; email?: string } | null = null;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = localStorage.getItem("app_biro_profile_v1");
      if (raw) localProfile = JSON.parse(raw);
    } catch {}
  }
  const profBiro = localProfile?.nama_biro?.toLowerCase().trim() || "";
  const profPimpinan = localProfile?.pimpinan?.toLowerCase().trim() || "";
  const profEmail = localProfile?.email?.toLowerCase().trim() || "";

  const all = getAllTenants();
  const matchedTenant = all.find((t) => {
    // A. Cocokkan ID Akun Supabase jika ada
    if (activeUser?.id && (t.id === activeUser.id || (t as any).userId === activeUser.id)) {
      return true;
    }

    // B. Cocokkan Email Login Aktif
    if (currentEmail && t.ownerEmail && t.ownerEmail.toLowerCase().trim() === currentEmail) {
      return true;
    }

    // C. Cocokkan Email dari Profil Biro Lokal
    if (profEmail && t.ownerEmail && t.ownerEmail.toLowerCase().trim() === profEmail) {
      return true;
    }

    // D. Cocokkan Nama Biro
    if (profBiro && t.namaBiro) {
      const tBiro = t.namaBiro.toLowerCase().trim();
      if (tBiro === profBiro) return true;
      if (profBiro.length >= 4 && tBiro.length >= 4) {
        if (tBiro.includes(profBiro) || profBiro.includes(tBiro)) return true;
      }
    }

    // E. Cocokkan Nama Pemilik / Pimpinan
    if (profPimpinan && t.ownerNama) {
      const tOwner = t.ownerNama.toLowerCase().trim();
      if (tOwner === profPimpinan) return true;
      if (profPimpinan.length >= 4 && tOwner.length >= 4) {
        if (tOwner.includes(profPimpinan) || profPimpinan.includes(tOwner)) return true;
      }
    }

    // F. Heuristik Khusus Biro 69 Tour Organizer / Muanafi (jika profil atau akun mengandung 69 / Muanafi)
    const is69Profile =
      /69|enam\s*sembilan|muanafi|munafi/i.test(profBiro) ||
      /muanafi|munafi/i.test(profPimpinan) ||
      /69|munafi/i.test(currentEmail);
    const is69Tenant =
      /69|enam\s*sembilan|muanafi|munafi/i.test(t.namaBiro) ||
      /muanafi|munafi/i.test(t.ownerNama) ||
      /69|munafi/i.test(t.ownerEmail);
    if (is69Profile && is69Tenant) {
      return true;
    }

    return false;
  });

  if (matchedTenant) {
    return {
      isSuperAdmin: isSuper,
      activePerspective: "normal",
      tier: matchedTenant.tier,
      canUseDesktopMode: matchedTenant.canUseDesktopMode,
      canExportCleanPdf: matchedTenant.canExportCleanPdf,
      canUseAI: matchedTenant.canUseAI,
      maxActiveTrips: matchedTenant.maxActiveTrips,
      maxCrewMembers: matchedTenant.maxCrewMembers,
      customBranding: matchedTenant.customBranding,
      hasWebsite: matchedTenant.hasWebsite,
      activeTenantName: matchedTenant.namaBiro,
      isImpersonating: false,
    };
  }

  // 7. Default akun umum: Ambil dari custom tier lokal jika ada
  try {
    const customTier = localStorage.getItem("catatbiro_custom_tier") as LicenseTier;
    if (customTier === "starter") {
      return {
        isSuperAdmin: isSuper,
        activePerspective: "normal",
        tier: "starter",
        canUseDesktopMode: false,
        canExportCleanPdf: false,
        canUseAI: false,
        maxActiveTrips: 5,
        maxCrewMembers: 2,
        customBranding: false,
        hasWebsite: false,
      };
    }
  } catch (err) {
    console.warn("Custom tier check failed", err);
  }

  // Default saat ini (Pro): Semua fitur operasional terbuka
  return {
    isSuperAdmin: isSuper,
    activePerspective: isSuper ? "super_admin" : "normal",
    tier: "pro",
    canUseDesktopMode: true,
    canExportCleanPdf: true,
    canUseAI: true,
    maxActiveTrips: 30,
    maxCrewMembers: 10,
    customBranding: true,
    hasWebsite: true,
    activeTenantName: "Biro Standar (Pro Mode)",
    isImpersonating: false,
  };
}

/**
 * Ambil daftar seluruh tenant dari database lokal / Supabase
 */
export function getAllTenants(): TenantRecord[] {
  let list: TenantRecord[] = DEFAULT_TENANTS;
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(TENANTS_STORAGE_KEY);
      if (saved) {
        list = JSON.parse(saved);
      }
    } catch (err) {
      console.warn("Failed to parse tenants", err);
    }

    // Pastikan tenant_069 (69 Trans & Tour / PT Enam Sembilan) selalu ada di daftar
    const has69 = list.some((t) => t.id === "tenant_069" || /69|enam\s*sembilan/i.test(t.namaBiro));
    if (!has69) {
      list.unshift(DEFAULT_TENANTS[0]);
      try {
        localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }
  }
  return list;
}

/**
 * Sinkronisasi & ambil daftar tenant langsung dari tabel Supabase public.tenants
 */
export async function fetchTenantsFromSupabase(): Promise<TenantRecord[]> {
  try {
    const { data, error } = await supabase
      .from("tenants")
      .select(`
        *,
        feature_entitlements (*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetchTenantsFromSupabase info:", error.message);
      return getAllTenants();
    }

    if (data && data.length > 0) {
      const mapped: TenantRecord[] = data.map((row: any) => {
        const ent = Array.isArray(row.feature_entitlements)
          ? row.feature_entitlements[0]
          : row.feature_entitlements;

        return {
          id: row.id,
          namaBiro: row.nama_biro,
          slugBiro: row.slug_biro || "",
          ownerNama: row.owner_nama,
          ownerEmail: row.owner_email,
          ownerPhone: row.owner_phone || "",
          tier: (row.tier_lisensi as LicenseTier) || "starter",
          paymentModel: (row.payment_model as PaymentModel) || "lifetime",
          status: row.status_akun || "active",
          canUseDesktopMode: ent ? Boolean(ent.can_use_desktop_mode) : false,
          canExportCleanPdf: ent ? Boolean(ent.can_export_pdf_clean) : false,
          canUseAI: ent ? Boolean(ent.can_use_ai_assistant) : false,
          maxActiveTrips: ent ? Number(ent.max_active_trips) || 5 : 5,
          maxCrewMembers: ent ? Number(ent.max_crew_members) || 2 : 2,
          customBranding: ent ? Boolean(ent.custom_branding_enabled) : false,
          hasWebsite: false,
          nominalBayar: 0,
          tanggalBayar: row.created_at ? row.created_at.slice(0, 10) : "",
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });

      saveTenants(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn("fetchTenantsFromSupabase error", err);
  }
  return getAllTenants();
}

/**
 * Ambil single tenant berdasarkan ID
 */
export function getTenantById(id: string): TenantRecord | undefined {
  const all = getAllTenants();
  return all.find((t) => t.id === id);
}

/**
 * Simpan atau perbarui data tenant di database lokal / Supabase
 */
export function saveTenants(tenants: TenantRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(tenants));
    window.dispatchEvent(new Event("catatbiro-tenants-updated"));
    window.dispatchEvent(new Event("catatbiro-entitlement-updated"));
  } catch (err) {
    console.warn("Failed to save tenants", err);
  }
}

/**
 * Tambah tenant baru (pembelian lisensi baru)
 */
export function createTenant(data: Omit<TenantRecord, "id">): TenantRecord {
  const all = getAllTenants();
  const newTenant: TenantRecord = {
    ...data,
    id: "tenant_" + Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveTenants([newTenant, ...all]);

  logAuditEvent({
    action: "CREATE_TENANT",
    tableName: "tenants",
    recordId: newTenant.id,
    tenantId: newTenant.id,
    tenantName: newTenant.namaBiro,
    description: `Super Admin mendaftarkan biro baru [${newTenant.namaBiro}] (Tier: ${newTenant.tier.toUpperCase()}, Pembayaran: ${newTenant.paymentModel})`,
    newData: newTenant,
  });

  return newTenant;
}

/**
 * Sinkronisasi pembaruan tenant langsung ke database Supabase (tenants & feature_entitlements)
 */
export async function updateTenantInSupabase(
  id: string,
  updates: Partial<TenantRecord>
): Promise<boolean> {
  try {
    // 1. Update public.tenants jika ada field profil/lisensi
    const tenantUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.namaBiro !== undefined) tenantUpdates.nama_biro = updates.namaBiro;
    if (updates.slugBiro !== undefined) tenantUpdates.slug_biro = updates.slugBiro;
    if (updates.ownerNama !== undefined) tenantUpdates.owner_nama = updates.ownerNama;
    if (updates.ownerEmail !== undefined) tenantUpdates.owner_email = updates.ownerEmail;
    if (updates.ownerPhone !== undefined) tenantUpdates.owner_phone = updates.ownerPhone;
    if (updates.tier !== undefined) tenantUpdates.tier_lisensi = updates.tier;
    if (updates.paymentModel !== undefined) tenantUpdates.payment_model = updates.paymentModel;
    if (updates.status !== undefined) tenantUpdates.status_akun = updates.status;
    if (updates.catatan !== undefined) tenantUpdates.catatan_internal = updates.catatan;

    if (Object.keys(tenantUpdates).length > 1) {
      const { error: tErr } = await supabase.from("tenants").update(tenantUpdates).eq("id", id);
      if (tErr) console.warn("Supabase update tenants warning:", tErr.message);
    }

    // 2. Update public.feature_entitlements jika ada field hak akses
    const entUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.canUseDesktopMode !== undefined) entUpdates.can_use_desktop_mode = updates.canUseDesktopMode;
    if (updates.canExportCleanPdf !== undefined) entUpdates.can_export_pdf_clean = updates.canExportCleanPdf;
    if (updates.canUseAI !== undefined) entUpdates.can_use_ai_assistant = updates.canUseAI;
    if (updates.canUseAdvancedRbac !== undefined) entUpdates.can_use_advanced_rbac = updates.canUseAdvancedRbac;
    if (updates.maxActiveTrips !== undefined) entUpdates.max_active_trips = updates.maxActiveTrips;
    if (updates.maxCrewMembers !== undefined) entUpdates.max_crew_members = updates.maxCrewMembers;
    if (updates.customBranding !== undefined) entUpdates.custom_branding_enabled = updates.customBranding;

    if (Object.keys(entUpdates).length > 1) {
      // Cek apakah entitas sudah ada di feature_entitlements
      const { data: existingEnt } = await supabase
        .from("feature_entitlements")
        .select("id")
        .eq("tenant_id", id)
        .maybeSingle();

      if (existingEnt && existingEnt.id) {
        const { error: entErr } = await supabase
          .from("feature_entitlements")
          .update(entUpdates)
          .eq("tenant_id", id);
        if (entErr) console.warn("Supabase update feature_entitlements error:", entErr.message);
      } else {
        const { error: entErr } = await supabase
          .from("feature_entitlements")
          .insert({ tenant_id: id, ...entUpdates });
        if (entErr) console.warn("Supabase insert feature_entitlements error:", entErr.message);
      }
    }

    return true;
  } catch (err) {
    console.error("updateTenantInSupabase fatal error:", err);
    return false;
  }
}

/**
 * Hapus tenant dari database Supabase
 */
export async function deleteTenantInSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) console.warn("Supabase delete tenant warning:", error.message);
    return !error;
  } catch (err) {
    console.error("deleteTenantInSupabase fatal error:", err);
    return false;
  }
}

/**
 * Perbarui status & fitur tenant tertentu dengan pencatatan Audit Log otomatis
 */
export function updateTenant(id: string, updates: Partial<TenantRecord>): void {
  const all = getAllTenants();
  const oldTenant = all.find((t) => t.id === id);
  if (!oldTenant) return;

  const nextTenant: TenantRecord = {
    ...oldTenant,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const next = all.map((t) => (t.id === id ? nextTenant : t));
  saveTenants(next);

  // Sinkronisasi asinkron ke Supabase live di background
  updateTenantInSupabase(id, updates).catch((err) => {
    console.warn("Background Supabase sync failed:", err);
  });

  // Deteksi perubahan khusus untuk log deskriptif
  const changesSummary: string[] = [];
  if (updates.canUseDesktopMode !== undefined && updates.canUseDesktopMode !== oldTenant.canUseDesktopMode) {
    changesSummary.push(`Mode Desktop: ${updates.canUseDesktopMode ? "AKTIF (Bypass)" : "NONAKTIF"}`);
  }
  if (updates.maxActiveTrips !== undefined && updates.maxActiveTrips !== oldTenant.maxActiveTrips) {
    changesSummary.push(`Kuota Trip: ${oldTenant.maxActiveTrips} -> ${updates.maxActiveTrips}`);
  }
  if (updates.maxCrewMembers !== undefined && updates.maxCrewMembers !== oldTenant.maxCrewMembers) {
    changesSummary.push(`Kuota Kru: ${oldTenant.maxCrewMembers} -> ${updates.maxCrewMembers}`);
  }
  if (updates.tier !== undefined && updates.tier !== oldTenant.tier) {
    changesSummary.push(`Tier Lisensi: ${oldTenant.tier} -> ${updates.tier}`);
  }
  if (updates.status !== undefined && updates.status !== oldTenant.status) {
    changesSummary.push(`Status Akun: ${oldTenant.status} -> ${updates.status}`);
  }

  const desc =
    changesSummary.length > 0
      ? `Super Admin memperbarui fitur [${oldTenant.namaBiro}]: ${changesSummary.join(", ")}`
      : `Super Admin memperbarui profil data biro [${oldTenant.namaBiro}]`;

  logAuditEvent({
    action: updates.canUseDesktopMode !== undefined || updates.maxActiveTrips !== undefined ? "OVERRIDE_FEATURE" : "UPDATE_TENANT",
    tableName: "tenants",
    recordId: id,
    tenantId: id,
    tenantName: oldTenant.namaBiro,
    description: desc,
    oldData: oldTenant,
    newData: nextTenant,
  });
}

/**
 * Hapus tenant
 */
export function deleteTenant(id: string): void {
  const all = getAllTenants();
  const target = all.find((t) => t.id === id);
  if (!target) return;

  const next = all.filter((t) => t.id !== id);
  saveTenants(next);

  deleteTenantInSupabase(id).catch((err) => {
    console.warn("Background Supabase delete failed:", err);
  });

  logAuditEvent({
    action: "DELETE_TENANT",
    tableName: "tenants",
    recordId: id,
    tenantId: id,
    tenantName: target.namaBiro,
    description: `Super Admin menghapus biro [${target.namaBiro}] (${target.ownerNama})`,
    oldData: target,
  });
}

/**
 * Reset tenant ke mock default
 */
export function resetDefaultTenants(): void {
  saveTenants(DEFAULT_TENANTS);
}
