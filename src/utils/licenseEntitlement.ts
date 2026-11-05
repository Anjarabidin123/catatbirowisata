/**
 * Modul Lisensi, Feature Gating (Tier Entitlements), dan Sandbox Simulator
 * Digunakan untuk mengatur batasan fitur biro wisata dan mode tester Super Admin.
 */

import { supabase } from "@/integrations/supabase/client";
import { getActiveUserSync } from "./authHelper";

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
  canUseDesktopMode: boolean;
  canExportCleanPdf: boolean;
  canUseAI: boolean;
  maxActiveTrips: number;
  maxCrewMembers: number;
  customBranding: boolean;
  hasWebsite: boolean;
  domainName?: string;
  domainExpiredAt?: string;
  hostingExpiredAt?: string;
  nominalBayar: number;
  tanggalBayar: string;
  tanggalJatuhTempo?: string;
  catatan?: string;
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
}

const PERSPECTIVE_STORAGE_KEY = "catatbiro_tester_perspective_v1";
const TENANTS_STORAGE_KEY = "catatbiro_tenants_store_v1";

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
    nominalBayar: 750000,
    tanggalBayar: "2026-10-15",
    catatan: "Paket Murah Sekali Bayar (Mobile Only)",
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
    domainExpiredAt: "2027-10-15",
    hostingExpiredAt: "2027-10-15",
    nominalBayar: 2250000,
    tanggalBayar: "2026-10-20",
    tanggalJatuhTempo: "2027-10-20",
    catatan: "Paket Pro Sekali Bayar + Website Promosi Tahunan",
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
    domainExpiredAt: "2027-11-01",
    hostingExpiredAt: "2027-11-01",
    nominalBayar: 350000,
    tanggalBayar: "2026-11-01",
    tanggalJatuhTempo: "2026-12-01",
    catatan: "Paket Enterprise Langganan Bulanan + Domain VPS",
  },
];

/**
 * Cek apakah user saat ini adalah Super Admin (Founder)
 */
export function isSuperAdminUser(): boolean {
  if (typeof window === "undefined") return false;
  const user = getActiveUserSync();
  const currentEmail = user?.email?.toLowerCase() || "";
  
  // Jika sedang login dengan anjarbdn@gmail.com
  if (currentEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // Fallback dev mode / local override jika disimpan di session
  try {
    const override = localStorage.getItem("catatbiro_is_superadmin_override");
    if (override === "true") return true;
  } catch {}

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
  } catch {}
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
  } catch {}
}

/**
 * Evaluasi Hak Akses Fitur (Entitlements) yang Sedang Aktif
 */
export function getCurrentEntitlements(): EntitlementState {
  const isSuper = isSuperAdminUser();
  const perspective = getActivePerspective();

  // 1. Jika Super Admin memilih mode 'super_admin' asli -> semua fitur terbuka 100%
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
    };
  }

  // 2. Jika Super Admin sedang mensimulasikan 'starter' (Paket Murah)
  if (perspective === "starter") {
    return {
      isSuperAdmin: isSuper,
      activePerspective: "starter",
      tier: "starter",
      canUseDesktopMode: false, // Desktop Mode Terkunci Overlay!
      canExportCleanPdf: false, // Ada Watermark di PDF
      canUseAI: false, // AI dinonaktifkan
      maxActiveTrips: 5,
      maxCrewMembers: 2,
      customBranding: false,
      hasWebsite: false,
    };
  }

  // 3. Jika Super Admin sedang mensimulasikan 'pro' (Paket Standar)
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
    };
  }

  // 4. Jika Super Admin sedang mensimulasikan 'enterprise'
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
    };
  }

  // 5. Default akun umum: Ambil dari konfigurasi tenant lokal atau fallback ke Pro
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
  } catch {}

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
  } catch {}
  return DEFAULT_TENANTS;
}

/**
 * Simpan atau perbarui data tenant di database lokal / Supabase
 */
export function saveTenants(tenants: TenantRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(tenants));
    window.dispatchEvent(new Event("catatbiro-tenants-updated"));
  } catch {}
}

/**
 * Tambah tenant baru (pembelian lisensi baru)
 */
export function createTenant(data: Omit<TenantRecord, "id">): TenantRecord {
  const all = getAllTenants();
  const newTenant: TenantRecord = {
    ...data,
    id: "tenant_" + Date.now(),
  };
  saveTenants([newTenant, ...all]);
  return newTenant;
}

/**
 * Perbarui status & fitur tenant tertentu
 */
export function updateTenant(id: string, updates: Partial<TenantRecord>): void {
  const all = getAllTenants();
  const next = all.map((t) => (t.id === id ? { ...t, ...updates } : t));
  saveTenants(next);
}

/**
 * Hapus tenant
 */
export function deleteTenant(id: string): void {
  const all = getAllTenants();
  const next = all.filter((t) => t.id !== id);
  saveTenants(next);
}
