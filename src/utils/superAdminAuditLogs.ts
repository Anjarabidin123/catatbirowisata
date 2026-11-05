/**
 * Audit Logs & Activity Tracker Engine untuk Super Admin
 * Terinspirasi dari modul AuditLogs di sistem enterprise (Pondok Cahaya Tasbih).
 */

export type AuditActionType =
  | "OVERRIDE_FEATURE"
  | "CREATE_TENANT"
  | "UPDATE_TENANT"
  | "DELETE_TENANT"
  | "STATUS_CHANGE"
  | "REVOKE_DEVICE"
  | "BILLING_RECORD"
  | "LOGIN_ROOT";

export interface SuperAdminAuditLog {
  id: string;
  createdAt: string;
  adminEmail: string;
  action: AuditActionType;
  tableName: string;
  recordId: string;
  tenantId?: string;
  tenantName?: string;
  description: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

const AUDIT_STORAGE_KEY = "catatbiro_super_admin_audit_logs_v1";

const DEFAULT_AUDIT_LOGS: SuperAdminAuditLog[] = [
  {
    id: "audit_001",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 mins ago
    adminEmail: "anjarbdn@gmail.com",
    action: "OVERRIDE_FEATURE",
    tableName: "feature_entitlements",
    recordId: "tenant_001",
    tenantId: "tenant_001",
    tenantName: "Berkah Wisata Religi",
    description: "Super Admin mengaktifkan override Mode Desktop untuk Biro Paket Starter",
    oldData: { canUseDesktopMode: false, maxActiveTrips: 5, maxCrewMembers: 2 },
    newData: { canUseDesktopMode: true, maxActiveTrips: 15, maxCrewMembers: 5 },
    ipAddress: "182.253.163.90",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
  },
  {
    id: "audit_002",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    adminEmail: "anjarbdn@gmail.com",
    action: "BILLING_RECORD",
    tableName: "tenant_invoices",
    recordId: "inv_2026_099",
    tenantId: "tenant_002",
    tenantName: "Nusantara Tour & Travel",
    description: "Konfirmasi pembayaran lunas Paket Pro Sekali Bayar + Domain Rp 2.250.000",
    oldData: { statusBayar: "pending", nominal: 2250000 },
    newData: { statusBayar: "lunas", nominal: 2250000, tanggalBayar: "2026-11-05" },
    ipAddress: "182.253.163.90",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
  },
  {
    id: "audit_003",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    adminEmail: "anjarbdn@gmail.com",
    action: "REVOKE_DEVICE",
    tableName: "tenant_registered_devices",
    recordId: "dev_sec_884",
    tenantId: "tenant_003",
    tenantName: "Garuda Prima Kencana Tour",
    description: "Super Admin memutus sesi perangkat mencurigakan (Xiaomi Redmi 9 / IP Cirebon)",
    oldData: { status: "active", deviceName: "Xiaomi Redmi 9", ip: "114.125.78.12" },
    newData: { status: "revoked", revokedReason: "Sesi diputus manual oleh Super Admin" },
    ipAddress: "182.253.163.90",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
  },
  {
    id: "audit_004",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
    adminEmail: "anjarbdn@gmail.com",
    action: "CREATE_TENANT",
    tableName: "tenants",
    recordId: "tenant_003",
    tenantId: "tenant_003",
    tenantName: "Garuda Prima Kencana Tour",
    description: "Pendaftaran tenant baru Paket Enterprise SaaS Bulanan (Kartika Sari)",
    oldData: null,
    newData: { namaBiro: "Garuda Prima Kencana Tour", tier: "enterprise", paymentModel: "subscription" },
    ipAddress: "182.253.163.90",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
  },
  {
    id: "audit_005",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    adminEmail: "anjarbdn@gmail.com",
    action: "LOGIN_ROOT",
    tableName: "super_admin_whitelist",
    recordId: "anjarbdn@gmail.com",
    description: "Autentikasi Root Super Admin Founder berhasil diverifikasi",
    oldData: null,
    newData: { email: "anjarbdn@gmail.com", role: "founder_super_admin", accessLevel: "full_bypass" },
    ipAddress: "182.253.163.90",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
  },
];

export function getAuditLogs(): SuperAdminAuditLog[] {
  if (typeof window === "undefined") return DEFAULT_AUDIT_LOGS;
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Failed to parse audit logs from storage", err);
  }
  return DEFAULT_AUDIT_LOGS;
}

export function saveAuditLogs(logs: SuperAdminAuditLog[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
    window.dispatchEvent(new Event("catatbiro-audit-updated"));
  } catch (err) {
    console.warn("Failed to persist audit logs", err);
  }
}

export function logAuditEvent(
  data: Omit<SuperAdminAuditLog, "id" | "createdAt" | "adminEmail"> & { adminEmail?: string }
): SuperAdminAuditLog {
  const currentLogs = getAuditLogs();
  const newLog: SuperAdminAuditLog = {
    id: "audit_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString(),
    adminEmail: data.adminEmail || "anjarbdn@gmail.com",
    action: data.action,
    tableName: data.tableName,
    recordId: data.recordId,
    tenantId: data.tenantId,
    tenantName: data.tenantName,
    description: data.description,
    oldData: data.oldData,
    newData: data.newData,
    ipAddress: data.ipAddress || "182.253.163.90",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Antigravity Cloud Worker",
  };

  const nextLogs = [newLog, ...currentLogs].slice(0, 500); // Batasi 500 log terakhir
  saveAuditLogs(nextLogs);
  return newLog;
}

export function clearAuditLogs(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUDIT_STORAGE_KEY);
  window.dispatchEvent(new Event("catatbiro-audit-updated"));
}

export function exportAuditLogsToCsv(logs: SuperAdminAuditLog[]): void {
  if (typeof window === "undefined" || logs.length === 0) return;
  
  const headers = ["ID", "Waktu (UTC)", "Admin", "Aksi", "Tabel", "Biro / Tenant", "Deskripsi", "IP Address"];
  const rows = logs.map((log) => [
    log.id,
    log.createdAt,
    log.adminEmail,
    log.action,
    log.tableName,
    `"${(log.tenantName || "-").replace(/"/g, '""')}"`,
    `"${log.description.replace(/"/g, '""')}"`,
    log.ipAddress || "-",
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `audit_log_catatbiro_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
