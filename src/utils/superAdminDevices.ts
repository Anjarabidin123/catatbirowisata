/**
 * Modul Manajemen Sesi & Perangkat Terdaftar (Device Security)
 * Terinspirasi dari modul DeviceManagement di sistem enterprise (Pondok Cahaya Tasbih).
 */

import { logAuditEvent } from "./superAdminAuditLogs";
import { getActiveUserSync } from "./authHelper";
import { getLocalBiroProfile } from "./biroProfile";

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
  isCurrentDevice?: boolean;
  isMockData?: boolean;
}

const DEVICES_STORAGE_KEY = "catatbiro_devices_store_v1";

const DEFAULT_DEVICES: TenantDeviceSession[] = [
  {
    id: "dev_069_01",
    tenantId: "tenant_069",
    tenantName: "69 Trans & Tour (PT Enam Sembilan)",
    userId: "usr_anjar_069",
    userName: "H. Anjar Abidin, S.E.",
    userEmail: "anjarbdn@gmail.com",
    userRole: "Pemilik Biro",
    deviceId: "FINGERPRINT_69_WORKSTATION",
    deviceName: "PC Workstation 69 Trans",
    deviceType: "desktop",
    browser: "Edge 124.0 (Desktop)",
    os: "Windows 11 Pro 64-bit",
    ipAddress: "180.252.169.69",
    locationCity: "Demak, Jawa Tengah",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    isMockData: false,
  },
  {
    id: "dev_069_02",
    tenantId: "tenant_069",
    tenantName: "69 Trans & Tour (PT Enam Sembilan)",
    userId: "usr_tl_69",
    userName: "Budi Santoso (TL 69)",
    userEmail: "budi.tl@69trans.id",
    userRole: "Tour Leader",
    deviceId: "FINGERPRINT_69_MOBILE_TL",
    deviceName: "Samsung Galaxy A54 5G",
    deviceType: "mobile",
    browser: "Chrome Mobile 123.0",
    os: "Android 14",
    ipAddress: "114.125.69.10",
    locationCity: "Demak / Semarang",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: "active",
    createdAt: "2026-10-10T09:30:00Z",
    isMockData: false,
  },
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
    isMockData: true,
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
    isMockData: true,
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
    isMockData: true,
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
    isMockData: true,
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
    isMockData: true,
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
    isMockData: true,
  },
];

export function detectCurrentClientDevice(): {
  deviceName: string;
  deviceType: DeviceType;
  browser: string;
  os: string;
  deviceId: string;
} {
  let deviceId = "FINGERPRINT_CURRENT_CLIENT";
  if (typeof window !== "undefined") {
    try {
      let saved = localStorage.getItem("catatbiro_local_device_fingerprint");
      if (!saved) {
        saved = "DEV_REAL_" + Math.random().toString(36).substring(2, 9).toUpperCase();
        localStorage.setItem("catatbiro_local_device_fingerprint", saved);
      }
      deviceId = saved;
    } catch {}
  }

  if (typeof window === "undefined") {
    return {
      deviceName: "PC / Laptop Windows",
      deviceType: "desktop",
      browser: "Chrome (Desktop)",
      os: "Windows 11",
      deviceId,
    };
  }

  const ua = navigator.userAgent || "";
  let deviceType: DeviceType = "desktop";
  let os = "Windows 11 Pro";
  let deviceName = "PC / Laptop";

  if (/Android/i.test(ua)) {
    deviceType = "mobile";
    const modelMatch = ua.match(/;\s*([^;)]+?)\s+Build\//i);
    deviceName = modelMatch ? modelMatch[1].trim() : "Smartphone Android";
    const verMatch = ua.match(/Android\s+([0-9.]+)/i);
    os = verMatch ? `Android ${verMatch[1]}` : "Android OS";
  } else if (/iPhone/i.test(ua)) {
    deviceType = "mobile";
    deviceName = "Apple iPhone";
    const verMatch = ua.match(/OS\s+([0-9_]+)/i);
    os = verMatch ? `iOS ${verMatch[1].replace(/_/g, ".")}` : "iOS";
  } else if (/iPad/i.test(ua)) {
    deviceType = "tablet";
    deviceName = "Apple iPad";
    os = "iPadOS";
  } else if (/Mac OS X/i.test(ua)) {
    deviceType = "desktop";
    deviceName = "MacBook / iMac";
    os = "macOS";
  } else if (/Windows NT 10\.0/i.test(ua)) {
    deviceType = "desktop";
    os = "Windows 10/11 (64-bit)";
    deviceName = "PC / Laptop Windows";
  } else if (/Linux/i.test(ua)) {
    deviceType = "desktop";
    os = "Linux";
    deviceName = "Linux Workstation";
  }

  let browser = "Chrome (Desktop)";
  if (/Edg\/([0-9.]+)/i.test(ua)) {
    const m = ua.match(/Edg\/([0-9]+)/i);
    browser = `Edge ${m ? m[1] : ""}`.trim();
  } else if (/Chrome\/([0-9.]+)/i.test(ua)) {
    const m = ua.match(/Chrome\/([0-9]+)/i);
    browser = `${deviceType === "mobile" ? "Chrome Mobile" : "Chrome"} ${m ? m[1] : ""}`.trim();
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "Safari";
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    const m = ua.match(/Firefox\/([0-9]+)/i);
    browser = `Firefox ${m ? m[1] : ""}`.trim();
  }

  return { deviceName, deviceType, browser, os, deviceId };
}

export function getAllDevices(): TenantDeviceSession[] {
  let list: TenantDeviceSession[] = DEFAULT_DEVICES;

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(DEVICES_STORAGE_KEY);
      if (raw) {
        list = JSON.parse(raw);
      }
    } catch (err) {
      console.warn("Failed to parse devices from storage", err);
    }

    // Auto-detect dan daftarkan perangkat asli pengguna yang sedang aktif saat ini
    try {
      const clientInfo = detectCurrentClientDevice();
      const user = getActiveUserSync();
      const biro = getLocalBiroProfile();
      const biroNama =
        biro.nama_biro && !/catat biro/i.test(biro.nama_biro)
          ? biro.nama_biro
          : "69 Trans & Tour (PT Enam Sembilan)";

      const existingIndex = list.findIndex(
        (d) => d.deviceId === clientInfo.deviceId || d.id === "dev_current_real"
      );

      const realSession: TenantDeviceSession = {
        id: existingIndex >= 0 ? list[existingIndex].id : "dev_current_real",
        tenantId: "tenant_069",
        tenantName: biroNama,
        userId: user?.id || "usr_anjar_069",
        userName: user?.user_metadata?.name || (user?.email === "anjarbdn@gmail.com" ? "H. Anjar Abidin, S.E. (Anda)" : "H. Anjar Abidin, S.E. (Anda)"),
        userEmail: user?.email || "anjarbdn@gmail.com",
        userRole: "Pemilik Biro",
        deviceId: clientInfo.deviceId,
        deviceName: clientInfo.deviceName,
        deviceType: clientInfo.deviceType,
        browser: clientInfo.browser,
        os: clientInfo.os,
        ipAddress: "127.0.0.1 (Perangkat Ini)",
        locationCity: biro.alamat ? biro.alamat.split(",")[1]?.trim() || "Demak / Jawa Tengah" : "Demak, Jawa Tengah",
        lastActiveAt: new Date().toISOString(),
        status: "active",
        createdAt: existingIndex >= 0 ? list[existingIndex].createdAt : new Date().toISOString(),
        isCurrentDevice: true,
        isMockData: false,
      };

      if (existingIndex >= 0) {
        list[existingIndex] = realSession;
      } else {
        list.unshift(realSession);
      }

      // Pastikan armada & kru 69 Trans juga selalu ada jika belum ada
      if (!list.some((d) => d.id === "dev_069_02" || /69 Trans|TL 69/i.test(d.userName))) {
        list.splice(1, 0, DEFAULT_DEVICES[1]); // dev_069_02 (Samsung Galaxy A54 TL 69)
      }

      // Pastikan hanya satu yang bertanda isCurrentDevice
      list = list.map((d) =>
        d.deviceId === clientInfo.deviceId || d.id === "dev_current_real"
          ? { ...d, isCurrentDevice: true }
          : { ...d, isCurrentDevice: false }
      );

      // Simpan ke storage secara aman
      localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Gagal auto-register real device:", e);
    }
  }

  return list;
}

export function clearMockDevices(): void {
  const devices = getAllDevices();
  const realOnly = devices.filter((d) => !d.isMockData);
  saveDevices(realOnly);
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
