/**
 * Modul Pusat Tiket Bantuan & Laporan Kendala (Support Tickets)
 * Menghubungkan pelaporan kendala/bug dari biro klien ke dashboard Super Admin.
 */

import { logAuditEvent } from "./superAdminAuditLogs";

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketCategory =
  | "kendala_teknis"
  | "pertanyaan_lisensi"
  | "permintaan_fitur"
  | "tagihan"
  | "lainnya";

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  tenantId?: string;
  tenantName: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  adminNotes?: string;
  resolutionReply?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

const TICKETS_STORAGE_KEY = "catatbiro_support_tickets_v1";

const DEFAULT_TICKETS: SupportTicket[] = [
  {
    id: "tkt_001",
    ticketNumber: "TKT-2026-001",
    tenantId: "tenant_001",
    tenantName: "Berkah Wisata Religi",
    senderName: "H. Ridwan Mansyur",
    senderEmail: "ridwan@berkahwisata.id",
    senderPhone: "0812-3456-7890",
    subject: "Kendala sinkronisasi kursus manifest bus 50 seat",
    category: "kendala_teknis",
    priority: "high",
    status: "open",
    description: "Saat menyimpan susunan denah kursi 50-seat bus rombongan ziarah Wali Songo, nama penumpang nomor 42 terpotong jika menggunakan karakter aksara khusus.",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 90 mins ago
  },
  {
    id: "tkt_002",
    ticketNumber: "TKT-2026-002",
    tenantId: "tenant_002",
    tenantName: "Nusantara Tour & Travel",
    senderName: "Budi Santoso",
    senderEmail: "budi@nusantaratour.com",
    senderPhone: "0819-8765-4321",
    subject: "Permintaan aktivasi domain kustom nusantaratour.com",
    category: "pertanyaan_lisensi",
    priority: "medium",
    status: "in_progress",
    description: "Kami sudah mengarahkan A Record domain nusantaratour.com ke IP VPS 103.186.201.44. Mohon bantuan Super Admin untuk mengaktifkan sertifikat SSL Cloudflare.",
    adminNotes: "DNS propagation sedang dicek via dig/whois",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
  },
  {
    id: "tkt_003",
    ticketNumber: "TKT-2026-003",
    tenantId: "tenant_003",
    tenantName: "Garuda Prima Kencana Tour",
    senderName: "Kartika Sari",
    senderEmail: "kartika@garudaprima.com",
    senderPhone: "0821-1122-3344",
    subject: "Format kop surat invoice PDF sudah berhasil diunggah",
    category: "permintaan_fitur",
    priority: "low",
    status: "resolved",
    description: "Apakah bisa ditambahkan QR Code pembayaran rekening biro langsung di lembar kwitansi?",
    resolutionReply: "Fitur QRIS / Rekening otomatis sudah aktif di menu Pengaturan Biro > Identitas & Bank. Anda dapat mengisi nomor rekening & nama bank tujuan.",
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    resolvedBy: "anjarbdn@gmail.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export function getSupportTickets(): SupportTicket[] {
  if (typeof window === "undefined") return DEFAULT_TICKETS;
  try {
    const raw = localStorage.getItem(TICKETS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Failed to parse tickets from storage", err);
  }
  return DEFAULT_TICKETS;
}

export function saveSupportTickets(tickets: SupportTicket[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    window.dispatchEvent(new CustomEvent("catatbiro-tickets-updated", { detail: tickets }));
  } catch (err) {
    console.warn("Failed to persist tickets", err);
  }
}

export function createSupportTicket(
  data: Omit<SupportTicket, "id" | "ticketNumber" | "status" | "createdAt" | "updatedAt">
): SupportTicket {
  const tickets = getSupportTickets();
  const ticketCount = tickets.length + 1;
  const seq = String(ticketCount).padStart(3, "0");
  const year = new Date().getFullYear();

  const newTicket: SupportTicket = {
    ...data,
    id: "tkt_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    ticketNumber: `TKT-${year}-${seq}`,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const next = [newTicket, ...tickets];
  saveSupportTickets(next);

  logAuditEvent({
    action: "CREATE_TENANT",
    tableName: "support_tickets",
    recordId: newTicket.id,
    tenantId: newTicket.tenantId,
    tenantName: newTicket.tenantName,
    description: `Biro "${newTicket.tenantName}" mengirim tiket bantuan baru: "${newTicket.subject}"`,
    newData: newTicket as unknown as Record<string, unknown>,
  });

  return newTicket;
}

export function updateTicketStatus(
  id: string,
  status: TicketStatus,
  resolutionReply?: string,
  adminNotes?: string
): SupportTicket | null {
  const tickets = getSupportTickets();
  const index = tickets.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const old = { ...tickets[index] };
  const updated: SupportTicket = {
    ...old,
    status,
    adminNotes: adminNotes !== undefined ? adminNotes : old.adminNotes,
    resolutionReply: resolutionReply !== undefined ? resolutionReply : old.resolutionReply,
    resolvedAt: status === "resolved" ? (old.resolvedAt || new Date().toISOString()) : old.resolvedAt,
    resolvedBy: status === "resolved" ? (old.resolvedBy || "anjarbdn@gmail.com") : old.resolvedBy,
    updatedAt: new Date().toISOString(),
  };

  tickets[index] = updated;
  saveSupportTickets(tickets);

  logAuditEvent({
    action: "UPDATE_TENANT",
    tableName: "support_tickets",
    recordId: id,
    tenantId: updated.tenantId,
    tenantName: updated.tenantName,
    description: `Super Admin memperbarui status tiket ${updated.ticketNumber} menjadi [${status.toUpperCase()}]`,
    oldData: old as unknown as Record<string, unknown>,
    newData: updated as unknown as Record<string, unknown>,
  });

  return updated;
}

export function deleteSupportTicket(id: string): boolean {
  const tickets = getSupportTickets();
  const target = tickets.find((t) => t.id === id);
  if (!target) return false;

  const next = tickets.filter((t) => t.id !== id);
  saveSupportTickets(next);

  logAuditEvent({
    action: "DELETE_TENANT",
    tableName: "support_tickets",
    recordId: id,
    tenantId: target.tenantId,
    tenantName: target.tenantName,
    description: `Super Admin menghapus tiket ${target.ticketNumber}: "${target.subject}"`,
    oldData: target as unknown as Record<string, unknown>,
  });

  return true;
}

export function resetDefaultTickets(): void {
  saveSupportTickets(DEFAULT_TICKETS);
}
