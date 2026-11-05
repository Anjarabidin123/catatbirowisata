/**
 * Modul Backup & Ekspor Basis Data Global (Database Backup Engine)
 * Menyediakan ekspor 1-klik seluruh entitas sistem ke file JSON.
 */

import { getAllTenants, saveTenants, TenantRecord } from "./licenseEntitlement";
import { getAuditLogs, saveAuditLogs, logAuditEvent, SuperAdminAuditLog } from "./superAdminAuditLogs";
import { getAllDevices, saveDevices, TenantDeviceSession } from "./superAdminDevices";
import { getBroadcasts, saveBroadcasts, SystemBroadcast } from "./superAdminBroadcasts";
import { getSupportTickets, saveSupportTickets, SupportTicket } from "./superAdminTickets";
import { getPlatformSettings, savePlatformSettings, PlatformSettings } from "./superAdminSettings";
import { Capacitor } from "@capacitor/core";

export interface BackupPayload {
  version: string;
  exportedAt: string;
  exportedBy: string;
  meta: {
    tenantsCount: number;
    auditLogsCount: number;
    devicesCount: number;
    broadcastsCount: number;
    ticketsCount: number;
    totalRecords: number;
  };
  data: {
    tenants: TenantRecord[];
    auditLogs: SuperAdminAuditLog[];
    devices: TenantDeviceSession[];
    broadcasts: SystemBroadcast[];
    tickets: SupportTicket[];
    platformSettings: PlatformSettings;
  };
}

export interface BackupHistoryRecord {
  id: string;
  timestamp: string;
  fileName: string;
  fileSizeBytes: number;
  totalRecords: number;
  downloadedBy: string;
}

const BACKUP_HISTORY_STORAGE_KEY = "catatbiro_backup_history_v1";

export function getBackupHistory(): BackupHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BACKUP_HISTORY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to parse backup history", err);
  }
  return [
    {
      id: "bkh_001",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      fileName: `catatbiro-backup-${new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString().replace(/[:.]/g, "-")}.json`,
      fileSizeBytes: 42100,
      totalRecords: 18,
      downloadedBy: "anjarbdn@gmail.com",
    },
  ];
}

export function saveBackupHistory(history: BackupHistoryRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BACKUP_HISTORY_STORAGE_KEY, JSON.stringify(history));
    window.dispatchEvent(new Event("catatbiro-backup-history-updated"));
  } catch (err) {
    console.warn("Failed to save backup history", err);
  }
}

export function generateFullBackupPayload(): BackupPayload {
  const tenants = getAllTenants();
  const auditLogs = getAuditLogs();
  const devices = getAllDevices();
  const broadcasts = getBroadcasts();
  const tickets = getSupportTickets();
  const platformSettings = getPlatformSettings();

  const totalRecords =
    tenants.length +
    auditLogs.length +
    devices.length +
    broadcasts.length +
    tickets.length +
    1;

  return {
    version: "2.4.0-enterprise",
    exportedAt: new Date().toISOString(),
    exportedBy: "anjarbdn@gmail.com",
    meta: {
      tenantsCount: tenants.length,
      auditLogsCount: auditLogs.length,
      devicesCount: devices.length,
      broadcastsCount: broadcasts.length,
      ticketsCount: tickets.length,
      totalRecords,
    },
    data: {
      tenants,
      auditLogs,
      devices,
      broadcasts,
      tickets,
      platformSettings,
    },
  };
}

export async function triggerDownloadBackup(): Promise<{ fileName: string; sizeBytes: number; totalRecords: number }> {
  const payload = generateFullBackupPayload();
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
  const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `catatbiro-backup-${timestampStr}.json`;

  if (typeof window !== "undefined") {
    if (Capacitor.isNativePlatform()) {
      try {
        const [{ Filesystem, Directory }, { Share }] = await Promise.all([
          import("@capacitor/filesystem"),
          import("@capacitor/share"),
        ]);
        const written = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
        });
        await Share.share({
          title: fileName,
          text: `Backup Database CatatBiro (${payload.meta.totalRecords} entitas)`,
          url: written.uri,
          dialogTitle: "Simpan / Bagikan Backup JSON",
        });
      } catch (nativeErr) {
        console.warn("Capacitor native export failed, fallback to browser", nativeErr);
        downloadViaBrowser(blob, fileName);
      }
    } else {
      downloadViaBrowser(blob, fileName);
    }

    // Save record to history
    const history = getBackupHistory();
    const newRecord: BackupHistoryRecord = {
      id: "bkh_" + Date.now(),
      timestamp: new Date().toISOString(),
      fileName,
      fileSizeBytes: blob.size,
      totalRecords: payload.meta.totalRecords,
      downloadedBy: "anjarbdn@gmail.com",
    };
    saveBackupHistory([newRecord, ...history].slice(0, 30));

    logAuditEvent({
      action: "BILLING_RECORD",
      tableName: "database_backup",
      recordId: newRecord.id,
      description: `Super Admin mengunduh full system database backup: "${fileName}" (${payload.meta.totalRecords} entitas)`,
      newData: {
        fileName,
        sizeBytes: blob.size,
        totalRecords: payload.meta.totalRecords,
      },
    });
  }

  return {
    fileName,
    sizeBytes: blob.size,
    totalRecords: payload.meta.totalRecords,
  };
}

function downloadViaBrowser(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function restoreBackupPayload(payload: any): { success: boolean; restoredRecords: number; error?: string } {
  try {
    if (!payload || typeof payload !== "object") {
      return { success: false, restoredRecords: 0, error: "Format berkas cadangan JSON tidak valid." };
    }
    const data = payload.data || payload;
    let count = 0;

    if (Array.isArray(data.tenants)) {
      saveTenants(data.tenants);
      count += data.tenants.length;
    }
    if (Array.isArray(data.auditLogs)) {
      saveAuditLogs(data.auditLogs);
      count += data.auditLogs.length;
    }
    if (Array.isArray(data.devices)) {
      saveDevices(data.devices);
      count += data.devices.length;
    }
    if (Array.isArray(data.broadcasts)) {
      saveBroadcasts(data.broadcasts);
      count += data.broadcasts.length;
    }
    if (Array.isArray(data.tickets)) {
      saveSupportTickets(data.tickets);
      count += data.tickets.length;
    }
    if (data.platformSettings && typeof data.platformSettings === "object") {
      savePlatformSettings(data.platformSettings);
      count += 1;
    }

    if (count === 0) {
      return { success: false, restoredRecords: 0, error: "Tidak ada entitas data yang dapat dipulihkan dari berkas ini." };
    }

    logAuditEvent({
      action: "UPDATE_TENANT",
      tableName: "database_backup",
      recordId: "restore_" + Date.now(),
      description: `Super Admin memulihkan data sistem dari berkas cadangan (${count} entitas dipulihkan).`,
    });

    return { success: true, restoredRecords: count };
  } catch (err: any) {
    return { success: false, restoredRecords: 0, error: err.message || "Gagal memproses berkas pemulihan." };
  }
}
