/**
 * Modul Konfigurasi Platform SaaS (Platform Settings & Maintenance Mode)
 * Menyimpan data kontak CS Founder, link panduan, dan sakelar Emergency Maintenance.
 */

import { logAuditEvent } from "./superAdminAuditLogs";

export interface PlatformSettings {
  platformName: string;
  csWhatsappNumber: string;
  csEmail: string;
  docsUrl: string;
  youtubeTutorialUrl: string;
  emergencyMaintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt?: string;
  updatedBy?: string;
}

const SETTINGS_STORAGE_KEY = "catatbiro_platform_settings_v1";

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: "CatatBiro Wisata SaaS Enterprise",
  csWhatsappNumber: "6285876543210",
  csEmail: "anjarbdn@gmail.com",
  docsUrl: "https://catatbiro.id/panduan",
  youtubeTutorialUrl: "https://www.youtube.com/@catatbiro",
  emergencyMaintenanceMode: false,
  maintenanceMessage: "Platform sedang dalam peningkatan infrastruktur server. Semua data tersimpan aman.",
  updatedAt: new Date().toISOString(),
  updatedBy: "anjarbdn@gmail.com",
};

export function getPlatformSettings(): PlatformSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn("Failed to parse platform settings from storage", err);
  }
  return DEFAULT_SETTINGS;
}

export function savePlatformSettings(updates: Partial<PlatformSettings>): PlatformSettings {
  const current = getPlatformSettings();
  const next: PlatformSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: "anjarbdn@gmail.com",
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("catatbiro-platform-settings-updated", { detail: next }));
    } catch (err) {
      console.warn("Failed to persist platform settings", err);
    }
  }

  logAuditEvent({
    action: "UPDATE_TENANT",
    tableName: "system_platform_settings",
    recordId: "global_settings",
    description: `Super Admin memperbarui konfigurasi platform SaaS (Emergency Mode: ${next.emergencyMaintenanceMode ? "AKTIF" : "NONAKTIF"})`,
    oldData: current as unknown as Record<string, unknown>,
    newData: next as unknown as Record<string, unknown>,
  });

  return next;
}

export function resetPlatformSettings(): PlatformSettings {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("catatbiro-platform-settings-updated", { detail: DEFAULT_SETTINGS }));
  }
  return DEFAULT_SETTINGS;
}
