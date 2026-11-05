import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Send,
  Copy,
  Bus,
  Coffee,
  Utensils,
  MapPin,
  Luggage,
} from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { logCrewActivity } from "@/utils/rbacAuditLogger";
import { useRole } from "@/contexts/RoleContext";

interface TripInfo {
  nama_trip?: string;
  tujuan?: string;
  nama_driver?: string | null;
  nomor_polisi?: string | null;
  nama_kendaraan?: string | null;
}

interface WhatsAppBroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripInfo?: TripInfo;
}

export const WhatsAppBroadcastModal: React.FC<WhatsAppBroadcastModalProps> = ({
  open,
  onOpenChange,
  tripInfo,
}) => {
  const { hasPermission } = useRole();
  const canBroadcast = hasPermission("rule_broadcast_wa");
  const tripName = tripInfo?.nama_trip || "Tour Wisata";
  const driverName = tripInfo?.nama_driver || "Pak Supir";
  const platBus = tripInfo?.nomor_polisi || "Bus Pariwisata";
  const destination = tripInfo?.tujuan || "Destinasi";

  // Template-template siap pakai khas Biro Wisata Indonesia
  const TEMPLATES = [
    {
      id: "standby",
      title: "Bus Standby & Titik Kumpul",
      icon: Bus,
      tag: "Keberangkatan",
      generate: () =>
        `📢 *PEMBERITAHUAN KEBERANGKATAN TOUR*\n\n` +
        `Kepada Yth. Seluruh Peserta *${tripName}*,\n\n` +
        `Armada Bus Pariwisata (${platBus}) saat ini telah STANDBY di titik kumpul.\n` +
        `👨‍✈️ Driver: *${driverName}*\n` +
        `📍 Posisi Bus: Area parkir utama titik kumpul\n\n` +
        `Mohon peserta segera merapat, menaikkan bagasi koper, dan menempati kursi masing-masing. Bus akan segera diberangkatkan sesuai jadwal.\n\n` +
        `Salam hangat,\n*Tim Tour Leader & Kru Lapangan*`,
    },
    {
      id: "restarea",
      title: "Rest Area & Waktu Istirahat",
      icon: Coffee,
      tag: "Di Perjalanan",
      generate: () =>
        `☕ *INFO REST AREA & ISTIRAHAT*\n\n` +
        `Halo Bapak/Ibu Peserta *${tripName}*,\n\n` +
        `Kita telah tiba di Rest Area untuk istirahat, toilet, dan ibadah sholat.\n` +
        `⏱️ *Waktu Istirahat:* 30 Menit\n` +
        `🚌 *Bus Berangkat Kembali:* Tepat 30 menit dari sekarang\n\n` +
        `⚠️ *PENTING:*\n` +
        `- Harap hafalkan posisi parkir bus (${platBus})\n` +
        `- Barang berharga (dompet/HP/kamera) mohon dibawa serta\n` +
        `- Harap kembali ke bus 5 menit sebelum keberangkatan\n\n` +
        `Selamat beristirahat!`,
    },
    {
      id: "resto",
      title: "Makan Bersama di Resto",
      icon: Utensils,
      tag: "Kuliner",
      generate: () =>
        `🍽️ *INFO MAKAN BERSAMA ROMBONGAN*\n\n` +
        `Selamat siang/malam Bapak/Ibu Peserta *${tripName}*,\n\n` +
        `Kita telah tiba di lokasi Transit & Rumah Makan.\n` +
        `📍 *Meja Khusus Rombongan:* Sudah disiapkan di hall utama\n` +
        `🍲 *Sistem:* Prasmanan / Box Rombongan\n\n` +
        `Silakan menikmati hidangan dengan tertib. Toilet dan musholla tersedia di sebelah kanan resto.\n\n` +
        `Selamat menikmati sajian khas nusantara!`,
    },
    {
      id: "destinasi",
      title: "Tiba di Objek Wisata",
      icon: MapPin,
      tag: "Destinasi",
      generate: () =>
        `🎉 *KITA TELAH TIBA DI ${destination.toUpperCase()}!*\n\n` +
        `Peserta *${tripName}* yang berbahagia,\n\n` +
        `Kita telah sampai di kawasan wisata *${destination}*.\n` +
        `🎫 *Tiket Masuk:* Dikoordinir langsung oleh Tour Leader\n` +
        `📸 *Foto Bersama:* Dilaksanakan di depan gapura utama sebelum free time\n` +
        `⏰ *Waktu Kumpul Kembali di Bus:* Sesuai instruksi TL di lokasi\n\n` +
        `Harap selalu memperhatikan rombongan dan patuhi aturan pengelola wisata.\nSelamat berlibur & have fun!`,
    },
    {
      id: "bagasi",
      title: "Cek Bagasi / Check-out",
      icon: Luggage,
      tag: "Check-out / Pulang",
      generate: () =>
        `🧳 *PENGINGAT CEK BARANG BAWAAN & BAGASI*\n\n` +
        `Pemberitahuan kepada seluruh peserta *${tripName}*,\n\n` +
        `Menjelang persiapan check-out / kepulangan, mohon periksa kembali barang berharga Anda:\n` +
        `✅ Dompet & identitas (KTP/kartu)\n` +
        `✅ Smartphone, charger & powerbank di kamar/kursi\n` +
        `✅ Koper, tas jinjing, dan kantong oleh-oleh\n\n` +
        `Pastikan tidak ada barang yang tertinggal di laci hotel maupun di bawah kursi bus.\n\n` +
        `Terima kasih atas kerjasamanya! 🙏`,
    },
  ];

  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [messageText, setMessageText] = useState(TEMPLATES[0].generate());

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplate(id);
    const tmpl = TEMPLATES.find((t) => t.id === id);
    if (tmpl) {
      setMessageText(tmpl.generate());
    }
  };

  const handleCopy = async () => {
    if (!canBroadcast) {
      toast.error("Izin Broadcast WhatsApp dinonaktifkan oleh Pemilik Biro");
      return;
    }
    try {
      await navigator.clipboard.writeText(messageText);
      toast.success("Teks broadcast berhasil disalin ke clipboard!");
    } catch {
      toast.error("Gagal menyalin teks");
    }
  };

  const handleSendWhatsApp = () => {
    if (!canBroadcast) {
      toast.error("Izin Broadcast WhatsApp dinonaktifkan oleh Pemilik Biro");
      return;
    }
    const activeTmpl = TEMPLATES.find((t) => t.id === selectedTemplate);
    logCrewActivity({
      kategori: "operasional_trip",
      aksi: "Mengirim Broadcast WhatsApp Rombongan",
      detail: `Mengirim pengumuman '${activeTmpl?.title || "Pengumuman Rombongan"}' ke peserta trip ${tripName}`,
      tripName,
    });
    const encoded = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/?text=${encoded}`;
    const waNativeUrl = `whatsapp://send?text=${encoded}`;

    if (Capacitor.isNativePlatform()) {
      try {
        window.location.href = waNativeUrl;
      } catch {
        window.open(waUrl, "_blank");
      }
    } else {
      window.open(waUrl, "_blank");
    }
    toast.success("Membuka WhatsApp...");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Broadcast WhatsApp Lapangan
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Kirim pengumuman resmi ke grup wisatawan dengan 1 kali klik
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Pemilihan Template Siap Pakai */}
        <div className="mt-3">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
            Pilih Template Siap Pakai
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon;
              const isActive = selectedTemplate === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 shadow-xs ring-1 ring-emerald-500"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-emerald-600" : "text-slate-400"
                      }`}
                    />
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                      {tmpl.tag}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {tmpl.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor Teks Pesan */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Pratinjau & Edit Pesan
            </Label>
            <span className="text-[10px] text-slate-400">
              Bisa langsung Anda edit sebelum dikirim
            </span>
          </div>

          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={8}
            className="text-xs font-sans rounded-2xl leading-relaxed resize-none p-3.5 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-700 font-semibold gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Salin Pesan</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSendWhatsApp}
            className="h-9 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm shadow-emerald-600/30"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim ke WhatsApp</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppBroadcastModal;
