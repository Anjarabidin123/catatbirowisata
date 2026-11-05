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
  
  // Jika sedang login dengan anjarbdn@gmail.com -> Bypass mutlak root
  if (currentEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // Fallback dev mode / local override jika disimpan di session
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

  // 6. Default akun umum: Ambil dari custom tier lokal jika ada
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
  if (typeof window === "undefined") return DEFAULT_TENANTS;
  try {
    const saved = localStorage.getItem(TENANTS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.warn("Failed to parse tenants", err);
  }
  return DEFAULT_TENANTS;
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
