/**
 * Modul Manajemen Sesi & Perangkat Terdaftar (Device Security)
 * Terinspirasi dari modul DeviceManagement di sistem enterprise (Pondok Cahaya Tasbih).
 */

import { logAuditEvent } from "./superAdminAuditLogs";

export type DeviceType = "desktop" | "mobile" | "tablet";
export type DeviceStatus = "active" | "revoked" | "idle";

export interface TenantDeviceSession {
  id: string;
  tenantId: string;
  tenantName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string; // 'Pemilik Biro' | 'Tour Leader' | 'Sopir Bus' | 'Finance'
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  browser: string;
  os: string;
  ipAddress: string;
  locationCity: string;
  lastActiveAt: string;
  status: DeviceStatus;
  createdAt: string;
}

const DEVICES_STORAGE_KEY = "catatbiro_devices_store_v1";

const DEFAULT_DEVICES: TenantDeviceSession[] = [
  {
    id: "dev_001",
    tenantId: "tenant_001",
    tenantName: "Berkah Wisata Religi",
    userId: "usr_ridwan_01",
    userName: "H. Ridwan Mansyur",
    userEmail: "ridwan@berkahwisata.id",
    userRole: "Pemilik Biro",
    deviceId: "FINGERPRINT_A9821_SAMSUNG",
    deviceName: "Samsung Galaxy S24 Ultra",
    deviceType: "mobile",
    browser: "Chrome Mobile 123.0",
    os: "Android 14",
    ipAddress: "182.253.163.90",
    locationCity: "Semarang, Jawa Tengah",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    status: "active",
    createdAt: "2026-10-15T08:30:00Z",
  },
  {
    id: "dev_002",
    tenantId: "tenant_001",
    tenantName: "Berkah Wisata Religi",
    userId: "usr_kru_budi",
    userName: "Budi Santoso",
    userEmail: "budi.driver@gmail.com",
    userRole: "Sopir Bus 1",
    deviceId: "FINGERPRINT_B2291_OPPO",
    deviceName: "Oppo Reno 10 Pro",
    deviceType: "mobile",
    browser: "Chrome Mobile 122.0",
    os: "Android 13",
    ipAddress: "114.125.45.67",
    locationCity: "Yogyakarta",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    status: "active",
    createdAt: "2026-10-18T10:15:00Z",
  },
  {
    id: "dev_003",
    tenantId: "tenant_002",
    tenantName: "Nusantara Tour & Travel",
    userId: "usr_bambang_02",
    userName: "Bambang Sudarsono",
    userEmail: "bambang@nusantaratour.com",
    userRole: "Pemilik Biro",
    deviceId: "FINGERPRINT_C4402_MACBOOK",
    deviceName: "MacBook Pro 16-inch M3 Max",
    deviceType: "desktop",
    browser: "Chrome 124.0 (Desktop)",
    os: "macOS Sonoma 14.4",
    ipAddress: "103.28.14.99",
    locationCity: "Surabaya, Jawa Timur",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    status: "active",
    createdAt: "2026-10-20T14:00:00Z",
  },
  {
    id: "dev_004",
    tenantId: "tenant_002",
    tenantName: "Nusantara Tour & Travel",
    userId: "usr_tl_maya",
    userName: "Maya Anggraeni",
    userEmail: "maya@nusantaratour.com",
    userRole: "Tour Leader",
    deviceId: "FINGERPRINT_D8819_IPHONE",
    deviceName: "iPhone 15 Pro Max",
    deviceType: "mobile",
    browser: "Safari Mobile 17.4",
    os: "iOS 17.4.1",
    ipAddress: "103.28.14.99",
    locationCity: "Surabaya, Jawa Timur",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: "active",
    createdAt: "2026-10-22T09:20:00Z",
  },
  {
    id: "dev_005",
    tenantId: "tenant_003",
    tenantName: "Garuda Prima Kencana Tour",
    userId: "usr_kartika_03",
    userName: "Kartika Sari",
    userEmail: "kartika@garudaprima.co.id",
    userRole: "Pemilik Biro",
    deviceId: "FINGERPRINT_E5510_DELL",
    deviceName: "Dell XPS 15 (Workstation)",
    deviceType: "desktop",
    browser: "Edge 124.0 (Desktop)",
    os: "Windows 11 Pro 64-bit",
    ipAddress: "36.88.210.14",
    locationCity: "Jakarta Pusat, DKI Jakarta",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    status: "active",
    createdAt: "2026-11-01T11:10:00Z",
  },
  {
    id: "dev_006",
    tenantId: "tenant_003",
    tenantName: "Garuda Prima Kencana Tour",
    userId: "usr_suspect_device",
    userName: "Anonim / Unknown Sesi",
    userEmail: "kru3@garudaprima.co.id",
    userRole: "Kru Lapangan",
    deviceId: "FINGERPRINT_Z9999_SUSPECT",
    deviceName: "Xiaomi Redmi 9",
    deviceType: "mobile",
    browser: "Unknown Browser",
    os: "Android 10",
    ipAddress: "114.125.78.12",
    locationCity: "Cirebon, Jawa Barat",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    status: "revoked",
    createdAt: "2026-11-03T16:40:00Z",
  },
];

export function getAllDevices(): TenantDeviceSession[] {
  if (typeof window === "undefined") return DEFAULT_DEVICES;
  try {
    const raw = localStorage.getItem(DEVICES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to parse devices from storage", err);
  }
  return DEFAULT_DEVICES;
}

export function saveDevices(devices: TenantDeviceSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(devices));
    window.dispatchEvent(new Event("catatbiro-devices-updated"));
  } catch (err) {
    console.warn("Failed to persist devices to storage", err);
  }
}

export function revokeDeviceSession(id: string, reason = "Diputus manual oleh Super Admin"): void {
  const devices = getAllDevices();
  const target = devices.find((d) => d.id === id);
  if (!target) return;

  const updated = devices.map((d) =>
    d.id === id ? { ...d, status: "revoked" as DeviceStatus, lastActiveAt: new Date().toISOString() } : d
  );
  saveDevices(updated);

  logAuditEvent({
    action: "REVOKE_DEVICE",
    tableName: "tenant_registered_devices",
    recordId: target.deviceId,
    tenantId: target.tenantId,
    tenantName: target.tenantName,
    description: `Super Admin memutus sesi perangkat [${target.deviceName}] milik ${target.userName} (${target.userEmail}) - Alasan: ${reason}`,
    oldData: { status: target.status, deviceId: target.deviceId, deviceName: target.deviceName },
    newData: { status: "revoked", revokedReason: reason },
  });
}

export function revokeAllTenantDevices(tenantId: string, tenantName: string): void {
  const devices = getAllDevices();
  const updated = devices.map((d) =>
    d.tenantId === tenantId ? { ...d, status: "revoked" as DeviceStatus, lastActiveAt: new Date().toISOString() } : d
  );
  saveDevices(updated);

  logAuditEvent({
    action: "REVOKE_DEVICE",
    tableName: "tenant_registered_devices",
    recordId: tenantId,
    tenantId,
    tenantName,
    description: `Super Admin melakukan KILL SWITCH: memutus seluruh sesi login perangkat untuk biro [${tenantName}]`,
    oldData: { tenantId, action: "mass_revoke" },
    newData: { status: "all_sessions_revoked" },
  });
}

export function resetDefaultDevices(): void {
  saveDevices(DEFAULT_DEVICES);
}
