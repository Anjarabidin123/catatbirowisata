/**
 * Modul Pengumuman Global (System Broadcasts)
 * Mengizinkan Super Admin menyebarkan pengumuman/notifikasi penting
 * yang tampil di seluruh aplikasi PWA biro klien.
 */

import { logAuditEvent } from "./superAdminAuditLogs";

export type BroadcastType = "info" | "warning" | "success" | "urgent";
export type TargetTierType = "all" | "starter" | "pro" | "enterprise";

export interface SystemBroadcast {
  id: string;
  title: string;
  message: string;
  type: BroadcastType;
  isActive: boolean;
  targetTier?: TargetTierType;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
}

const BROADCASTS_STORAGE_KEY = "catatbiro_system_broadcasts_v1";
const DISMISSED_STORAGE_KEY = "catatbiro_dismissed_broadcasts_v1";

const DEFAULT_BROADCASTS: SystemBroadcast[] = [
  {
    id: "bc_001",
    title: "Pembaruan Sistem v2.4 Rilis",
    message: "Integrasi fitur backup otomatis, manajemen tiket bantuan, dan sinkronisasi manifest bus telah aktif. Laporkan jika menemui kendala.",
    type: "info",
    isActive: true,
    targetTier: "all",
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "bc_002",
    title: "Jadwal Peningkatan Server Cloud Malam Ini",
    message: "Akan dilakukan pemeliharaan database terjadwal pada pukul 23:00 - 23:30 WIB. Aplikasi tetap dapat digunakan secara offline.",
    type: "warning",
    isActive: true,
    targetTier: "all",
    startDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export function getBroadcasts(): SystemBroadcast[] {
  if (typeof window === "undefined") return DEFAULT_BROADCASTS;
  try {
    const raw = localStorage.getItem(BROADCASTS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Failed to parse broadcasts from storage", err);
  }
  return DEFAULT_BROADCASTS;
}

export function saveBroadcasts(broadcasts: SystemBroadcast[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BROADCASTS_STORAGE_KEY, JSON.stringify(broadcasts));
    window.dispatchEvent(new CustomEvent("catatbiro-broadcasts-updated", { detail: broadcasts }));
  } catch (err) {
    console.warn("Failed to persist broadcasts", err);
  }
}

export function getActiveBroadcasts(): SystemBroadcast[] {
  const all = getBroadcasts();
  const now = Date.now();
  return all.filter((b) => {
    if (!b.isActive) return false;
    if (b.startDate) {
      const startTime = new Date(b.startDate).getTime();
      if (!isNaN(startTime) && startTime > now) return false;
    }
    if (b.endDate) {
      const endTime = new Date(b.endDate).getTime();
      if (!isNaN(endTime) && endTime < now) return false;
    }
    return true;
  });
}

export function createBroadcast(
  data: Omit<SystemBroadcast, "id" | "createdAt" | "updatedAt">
): SystemBroadcast {
  const broadcasts = getBroadcasts();
  const newBroadcast: SystemBroadcast = {
    ...data,
    id: "bc_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const next = [newBroadcast, ...broadcasts];
  saveBroadcasts(next);

  logAuditEvent({
    action: "CREATE_TENANT", // Log generic admin action
    tableName: "system_broadcasts",
    recordId: newBroadcast.id,
    description: `Super Admin membuat pengumuman global: "${newBroadcast.title}" (${newBroadcast.type.toUpperCase()})`,
    newData: newBroadcast as unknown as Record<string, unknown>,
  });

  return newBroadcast;
}

export function updateBroadcast(
  id: string,
  updates: Partial<SystemBroadcast>
): SystemBroadcast | null {
  const broadcasts = getBroadcasts();
  const index = broadcasts.findIndex((b) => b.id === id);
  if (index === -1) return null;

  const oldData = { ...broadcasts[index] };
  const updated: SystemBroadcast = {
    ...oldData,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  broadcasts[index] = updated;
  saveBroadcasts(broadcasts);

  logAuditEvent({
    action: "UPDATE_TENANT",
    tableName: "system_broadcasts",
    recordId: id,
    description: `Super Admin memperbarui pengumuman "${updated.title}"`,
    oldData: oldData as unknown as Record<string, unknown>,
    newData: updated as unknown as Record<string, unknown>,
  });

  return updated;
}

export function deleteBroadcast(id: string): boolean {
  const broadcasts = getBroadcasts();
  const target = broadcasts.find((b) => b.id === id);
  if (!target) return false;

  const next = broadcasts.filter((b) => b.id !== id);
  saveBroadcasts(next);

  logAuditEvent({
    action: "DELETE_TENANT",
    tableName: "system_broadcasts",
    recordId: id,
    description: `Super Admin menghapus pengumuman global: "${target.title}"`,
    oldData: target as unknown as Record<string, unknown>,
  });

  return true;
}

export function toggleBroadcastActive(id: string): boolean {
  const broadcasts = getBroadcasts();
  const target = broadcasts.find((b) => b.id === id);
  if (!target) return false;

  const newStatus = !target.isActive;
  updateBroadcast(id, { isActive: newStatus });
  return newStatus;
}

// Dismiss handling for client PWA users
export function getDismissedBroadcastIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to get dismissed broadcasts", err);
  }
  return [];
}

export function isBroadcastDismissed(id: string): boolean {
  const dismissed = getDismissedBroadcastIds();
  return dismissed.includes(id);
}

export function dismissBroadcast(id: string): void {
  const dismissed = getDismissedBroadcastIds();
  if (!dismissed.includes(id)) {
    const next = [...dismissed, id];
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("catatbiro-broadcast-dismissed"));
  }
}

export function resetDismissedBroadcasts(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DISMISSED_STORAGE_KEY);
  window.dispatchEvent(new Event("catatbiro-broadcast-dismissed"));
}

export function resetDefaultBroadcasts(): void {
  saveBroadcasts(DEFAULT_BROADCASTS);
}
