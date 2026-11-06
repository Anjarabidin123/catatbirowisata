import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LifeBuoy,
  Send,
  Phone,
  AlertTriangle,
  Building2,
  Mail,
  User,
  CheckCircle2,
} from "lucide-react";
import { BiroProfile, getLocalBiroProfile } from "@/utils/biroProfile";
import {
  createSupportTicket,
  TicketCategory,
  TicketPriority,
} from "@/utils/superAdminTickets";
import { getPlatformSettings } from "@/utils/superAdminSettings";
import { getAllTenants, getImpersonatedTenantId } from "@/utils/licenseEntitlement";
import { toast } from "sonner";

interface CreateSupportTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: BiroProfile;
  onTicketCreated?: () => void;
}

export const CreateSupportTicketModal: React.FC<CreateSupportTicketModalProps> = ({
  open,
  onOpenChange,
  profile,
  onTicketCreated,
}) => {
  const settings = getPlatformSettings();
  const [submitting, setSubmitting] = useState(false);

  // Safe fallback profile jika tidak di-pass sebagai prop
  const currentProfile = profile || getLocalBiroProfile() || ({} as BiroProfile);

  // Form Fields
  const leaderName = currentProfile.pimpinan || (currentProfile as any).pemilik || "";
  const [senderName, setSenderName] = useState(leaderName);
  const [senderEmail, setSenderEmail] = useState(currentProfile.email || "");
  const [senderPhone, setSenderPhone] = useState(currentProfile.telepon || "");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("kendala_teknis");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      const activeProf = profile || getLocalBiroProfile() || ({} as BiroProfile);
      const currentLeader = activeProf.pimpinan || (activeProf as any).pemilik || "";
      if (currentLeader) setSenderName(currentLeader);
      if (activeProf.email) setSenderEmail(activeProf.email);
      if (activeProf.telepon) setSenderPhone(activeProf.telepon);
    }
  }, [open, profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Subjek dan rincian kendala wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const activeProf = profile || getLocalBiroProfile() || ({} as BiroProfile);
      const impersonatedId = getImpersonatedTenantId();
      const allTenants = getAllTenants();
      const matched = allTenants.find(
        (t) => t.namaBiro.toLowerCase() === (activeProf.nama_biro || "").toLowerCase()
      );
      const tenantId = impersonatedId || (matched ? matched.id : undefined);

      const ticket = createSupportTicket({
        tenantId,
        tenantName: activeProf.nama_biro || "Biro Wisata",
        senderName: senderName.trim() || leaderName || "Pengguna Biro",
        senderEmail: senderEmail.trim() || activeProf.email || "user@biro.id",
        senderPhone: senderPhone.trim() || activeProf.telepon || undefined,
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
      });

      toast.success(
        `Tiket ${ticket.ticketNumber} berhasil dikirim ke Super Admin! Tim kami akan segera menindaklanjuti.`,
        { duration: 5000 }
      );

      // Reset and close
      setSubject("");
      setDescription("");
      onOpenChange(false);
      if (onTicketCreated) onTicketCreated();
    } catch (err) {
      toast.error("Gagal mengirim tiket bantuan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWaCs = () => {
    const csNumber = settings.csWhatsappNumber.replace(/[^0-9]/g, "");
    const activeProf = profile || getLocalBiroProfile() || ({} as BiroProfile);
    const leader = activeProf.pimpinan || (activeProf as any).pemilik || "Owner";
    const text = encodeURIComponent(
      `Halo Tim Super Admin CatatBiro, saya ${leader} dari ${profile.nama_biro}. Saya ingin berkonsultasi mengenai aplikasi:`
    );
    window.open(`https://wa.me/${csNumber}?text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <span>Laporkan Kendala / Hubungi Bantuan</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Laporan Anda akan langsung dipantau oleh tim Super Admin Master untuk penanganan cepat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Biro Identity Card */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <div>
                <div className="font-bold text-slate-900">{profile.nama_biro}</div>
                <div className="text-[11px] text-slate-500">
                  {profile.pimpinan || (profile as any).pemilik || "Pimpinan"} • {profile.telepon || "No Telepon"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenWaCs}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold flex items-center gap-1.5 transition-colors flex-shrink-0"
              title="Chat langsung dengan Founder via WA"
            >
              <Phone className="w-3 h-3 text-emerald-600" />
              <span>Chat CS WA</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Kategori Laporan</label>
              <Select value={category} onValueChange={(v: TicketCategory) => setCategory(v)}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kendala_teknis">Kendala Teknis / Bug</SelectItem>
                  <SelectItem value="pertanyaan_lisensi">Lisensi & Akun</SelectItem>
                  <SelectItem value="permintaan_fitur">Usulan Fitur Baru</SelectItem>
                  <SelectItem value="tagihan">Konfirmasi Pembayaran</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tingkat Prioritas</label>
              <Select value={priority} onValueChange={(v: TicketPriority) => setPriority(v)}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Rendah (Pertanyaan Umum)</SelectItem>
                  <SelectItem value="medium">Sedang (Normal)</SelectItem>
                  <SelectItem value="high">Tinggi (Fitur Bermasalah)</SelectItem>
                  <SelectItem value="urgent">Urgent (Operasional Terganggu)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Judul / Subjek Kendala</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Contoh: Kesalahan format cetak invoice PDF..."
              className="h-9 text-xs rounded-xl border-slate-300"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Deskripsi Masalah / Pertanyaan Lengkap</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan detail kendala yang dialami, langkah yang dilakukan sebelum error terjadi, atau usulan bantuan yang diinginkan..."
              className="text-xs rounded-xl border-slate-300 min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Nama Pelapor</label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Nama Anda"
                className="h-8 text-xs rounded-xl border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Nomor WhatsApp Aktif</label>
              <Input
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="h-8 text-xs rounded-xl border-slate-300 font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs rounded-xl border-slate-300 text-slate-700"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Mengirim..." : "Kirim Tiket Bantuan"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
