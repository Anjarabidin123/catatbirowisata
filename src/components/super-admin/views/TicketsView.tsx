import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LifeBuoy,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  Send,
  Trash2,
  Filter,
  User,
  ExternalLink,
} from "lucide-react";
import {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  getSupportTickets,
  updateTicketStatus,
  deleteSupportTicket,
} from "@/utils/superAdminTickets";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface TicketsViewProps {
  onRefresh: () => void;
}

export const TicketsView: React.FC<TicketsViewProps> = ({ onRefresh }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>(getSupportTickets);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // Reply Modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [adminNotesText, setAdminNotesText] = useState("");
  const [modalStatus, setModalStatus] = useState<TicketStatus>("in_progress");

  const refreshLocal = () => {
    setTickets(getSupportTickets());
    onRefresh();
  };

  const handleOpenReply = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.resolutionReply || "");
    setAdminNotesText(ticket.adminNotes || "");
    setModalStatus(ticket.status === "open" ? "in_progress" : ticket.status);
  };

  const handleSaveReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    updateTicketStatus(
      selectedTicket.id,
      modalStatus,
      replyText.trim() || undefined,
      adminNotesText.trim() || undefined
    );

    toast.success(`Tiket ${selectedTicket.ticketNumber} berhasil diperbarui!`);
    setSelectedTicket(null);
    refreshLocal();
  };

  const handleDelete = (id: string, number: string) => {
    if (confirm(`Hapus tiket ${number}?`)) {
      deleteSupportTicket(id);
      toast.success(`Tiket ${number} telah dihapus`);
      refreshLocal();
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
        t.tenantName.toLowerCase().includes(search.toLowerCase()) ||
        t.senderName.toLowerCase().includes(search.toLowerCase()) ||
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchPriority = priorityFilter === "ALL" || t.priority === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved").length;

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold">URGENT</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300 font-bold">TINGGI</Badge>;
      case "medium":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold">SEDANG</Badge>;
      case "low":
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-medium">RENDAH</Badge>;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "open":
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            Menunggu
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Diproses
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Selesai
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <LifeBuoy className="w-6 h-6 text-indigo-600" />
            <span>Pusat Tiket Bantuan & Laporan Kendala</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring seluruh kendala operasional, laporan bug, dan permohonan bantuan dari pengguna biro wisata.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <Badge className="bg-rose-500 text-white font-bold text-xs px-3 py-1 animate-pulse">
              {urgentCount} Tiket Butuh Tindakan Cepat
            </Badge>
          )}
        </div>
      </div>

      {/* Metric Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tiket Masuk</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">{tickets.length}</div>
            <p className="text-xs text-slate-500 mt-0.5">Seluruh riwayat tiket</p>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tiket Terbuka (Open)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-600">{openCount}</div>
            <p className="text-xs text-slate-500 mt-0.5">Menunggu respon Founder</p>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sedang Ditangani</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-600">{inProgressCount}</div>
            <p className="text-xs text-slate-500 mt-0.5">Dalam tahap investigasi/perbaikan</p>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Terselesaikan (Resolved)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-600">{resolvedCount}</div>
            <p className="text-xs text-slate-500 mt-0.5">Solusi berhasil diberikan</p>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor tiket, nama biro, pelapor, atau subjek kendala..."
            className="pl-9 h-9 text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 w-36">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="open">Menunggu (Open)</SelectItem>
              <SelectItem value="in_progress">Diproses</SelectItem>
              <SelectItem value="resolved">Selesai</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 w-36">
              <SelectValue placeholder="Semua Prioritas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Prioritas</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">Tinggi</SelectItem>
              <SelectItem value="medium">Sedang</SelectItem>
              <SelectItem value="low">Rendah</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ticket Cards List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            Tidak ada tiket bantuan yang ditemukan.
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className={`p-4 rounded-2xl border transition-all ${
                ticket.status === "open"
                  ? "bg-white border-rose-200 shadow-sm"
                  : ticket.status === "in_progress"
                  ? "bg-white border-amber-200 shadow-xs"
                  : "bg-slate-50 border-slate-200 opacity-80"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-extrabold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                      {ticket.ticketNumber}
                    </span>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                    <Badge variant="outline" className="text-[10px] uppercase font-mono text-slate-500">
                      {ticket.category.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                      {ticket.subject}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {ticket.description}
                    </p>
                  </div>

                  {/* Resolution Reply Banner if answered */}
                  {ticket.resolutionReply && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Solusi Resmi dari Super Admin:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-emerald-800/90 pl-5">
                        {ticket.resolutionReply}
                      </p>
                    </div>
                  )}

                  {/* Client Info Bar */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      {ticket.tenantName}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {ticket.senderName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {ticket.senderEmail}
                    </span>
                    {ticket.senderPhone && (
                      <span className="flex items-center gap-1 font-mono text-emerald-700 font-semibold">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        {ticket.senderPhone}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-mono text-slate-400 ml-auto">
                      <Clock className="w-3 h-3" />
                      {format(new Date(ticket.createdAt), "dd MMM yyyy, HH:mm", { locale: id })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end lg:self-center flex-shrink-0">
                  {ticket.senderPhone && (
                    <a
                      href={`https://wa.me/${ticket.senderPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        `Halo ${ticket.senderName} (${ticket.tenantName}), kami dari tim Super Admin CatatBiro menindaklanjuti tiket bantuan Anda [${ticket.ticketNumber}]: ${ticket.subject}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-2.5 rounded-xl text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-semibold transition-colors"
                      title="Hubungi Klien via WhatsApp"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WA Klien</span>
                    </a>
                  )}

                  <Button
                    onClick={() => handleOpenReply(ticket)}
                    className="h-8 px-3 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Tanggapi Solusi</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(ticket.id, ticket.ticketNumber)}
                    className="h-8 px-2 rounded-xl text-xs text-rose-600 hover:text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100"
                    title="Hapus Tiket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Reply Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-indigo-600" />
              <span>Tanggapi Tiket {selectedTicket?.ticketNumber}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Kirimkan jawaban atau panduan penyelesaian kendala langsung kepada pihak biro.
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <form onSubmit={handleSaveReply} className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800">{selectedTicket.subject}</div>
                <div className="text-slate-600">{selectedTicket.description}</div>
                <div className="text-[11px] text-slate-500 font-mono pt-1">
                  Pengirim: {selectedTicket.senderName} ({selectedTicket.tenantName}) • {selectedTicket.senderEmail}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Perbarui Status Penanganan</label>
                <Select value={modalStatus} onValueChange={(v: TicketStatus) => setModalStatus(v)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Menunggu Penanganan (Open)</SelectItem>
                    <SelectItem value="in_progress">Sedang Diproses (In Progress)</SelectItem>
                    <SelectItem value="resolved">Selesai & Berikan Solusi (Resolved)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Teks Jawaban / Solusi untuk Klien</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Jelaskan langkah solusi atau konfirmasi bahwa kendala telah diperbaiki di sistem..."
                  className="text-xs rounded-xl border-slate-300 min-h-[90px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Catatan Internal Super Admin (Hanya untuk Admin)</label>
                <Input
                  value={adminNotesText}
                  onChange={(e) => setAdminNotesText(e.target.value)}
                  placeholder="Contoh: Bug sudah di-commit di hotfix v2.4.1 atau dicek di Supabase table..."
                  className="h-9 text-xs rounded-xl border-slate-300"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedTicket(null)}
                  className="h-9 text-xs rounded-xl border-slate-300 text-slate-700"
                >
                  Tutup
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Simpan Status & Solusi
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
