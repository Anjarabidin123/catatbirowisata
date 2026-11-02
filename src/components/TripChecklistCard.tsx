import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  FileText,
  Package,
  Bus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { logCrewActivity } from "@/utils/rbacAuditLogger";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  category: "admin" | "logistik" | "armada";
  label: string;
  detail: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // 1. Dokumen & Administrasi
  {
    id: "surat_jalan",
    category: "admin",
    label: "Surat Jalan & Kontrak Sewa Bus",
    detail: "Pastikan fisik surat jalan dan izin trayek wisata aktif",
  },
  {
    id: "manifest_peserta",
    category: "admin",
    label: "Manifest Data Penumpang & Asuransi",
    detail: "Daftar nama, nomor kontak darurat, dan manifest terverifikasi",
  },
  {
    id: "voucher_hotel",
    category: "admin",
    label: "Voucher Hotel / Penginapan",
    detail: "Konfirmasi ulang rooming list dan jam check-in",
  },
  {
    id: "tiket_wisata",
    category: "admin",
    label: "Tiket Masuk Objek Wisata",
    detail: "E-ticket atau konfirmasi reservasi rombongan siap",
  },
  {
    id: "banner_bus",
    category: "admin",
    label: "Spanduk / Banner Bus Rombongan",
    detail: "Banner depan kaca dan samping bus terpasang rapi",
  },

  // 2. Logistik & Medis
  {
    id: "p3k_obat",
    category: "logistik",
    label: "Kotak P3K & Obat Mabuk Perjalanan",
    detail: "Antimo, tolak angin, plester, minyak kayu putih, kantong plastik",
  },
  {
    id: "snack_air",
    category: "logistik",
    label: "Air Mineral & Snack Box Peserta",
    detail: "Jumlah cup/dus air mineral sesuai kuota rombongan",
  },
  {
    id: "trashbag",
    category: "logistik",
    label: "Plastik Sampah (Trashbag) Bus",
    detail: "Dipasang di setiap baris atau pintu bus agar kabin tetap bersih",
  },
  {
    id: "mic_audio",
    category: "logistik",
    label: "Mic Wireless & Audio Guide TL",
    detail: "Baterai terisi penuh untuk pemandu dan ice breaking",
  },
  {
    id: "payung_biro",
    category: "logistik",
    label: "Payung Biro Wisata",
    detail: "Antisipasi cuaca panas/hujan saat turun bus di lokasi",
  },

  // 3. Armada & Personel
  {
    id: "briefing_driver",
    category: "armada",
    label: "Briefing Driver & Kernet",
    detail: "Sosialisasi rute, estimasi rest area, dan contact TL aktif",
  },
  {
    id: "cek_kabin_ac",
    category: "armada",
    label: "Cek Kebersihan Kabin & Dingin AC",
    detail: "Kabin harum, jok bersih, kisi AC berfungsi merata",
  },
  {
    id: "tag_koper",
    category: "armada",
    label: "Tag Label Koper Bagasi",
    detail: "Identitas koper per peserta agar tidak tertukar saat bongkar",
  },
  {
    id: "pic_destinasi",
    category: "armada",
    label: "Konfirmasi Kontak Person (PIC) Destinasi",
    detail: "Koordinasi parkir bus dan jam kedatangan di rumah makan / objek",
  },
];

interface TripChecklistCardProps {
  tripId: string;
  tripName?: string;
}

export const TripChecklistCard: React.FC<TripChecklistCardProps> = ({
  tripId,
  tripName,
}) => {
  const { hasPermission } = useRole();
  const canUpdateChecklist = hasPermission("rule_checklist_14");
  const noteTitle = `[CHECKLIST] trip_${tripId}`;
  const localKey = `trip_checklist_${tripId}`;

  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Load status dari Supabase notes / local storage saat tripId berubah
  useEffect(() => {
    // Segera inisialisasi status checklist trip yang baru dari local storage
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        setCheckedIds(JSON.parse(saved));
      } else {
        setCheckedIds([]);
      }
    } catch {
      setCheckedIds([]);
    }

    const loadChecklist = async () => {
      try {
        const user = await getActiveUser();
        if (!user || !tripId) return;

        const { data } = await supabase
          .from("notes")
          .select("konten")
          .eq("trip_id", tripId)
          .eq("judul", noteTitle)
          .maybeSingle();

        if (data && data.konten) {
          const parsed = JSON.parse(data.konten);
          if (Array.isArray(parsed)) {
            setCheckedIds(parsed);
            localStorage.setItem(localKey, JSON.stringify(parsed));
          }
        }
      } catch (e) {
        console.warn("Error loading checklist from notes:", e);
      }
    };

    loadChecklist();
  }, [tripId, noteTitle, localKey]);

  // Simpan update ke localStorage & Supabase notes
  const saveChecklist = async (updated: string[]) => {
    setCheckedIds(updated);
    try {
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {}

    try {
      const user = await getActiveUser();
      if (!user || !tripId) return;

      const { data: existing } = await supabase
        .from("notes")
        .select("id")
        .eq("trip_id", tripId)
        .eq("judul", noteTitle)
        .maybeSingle();

      const jsonStr = JSON.stringify(updated);

      if (existing) {
        await supabase
          .from("notes")
          .update({ konten: jsonStr })
          .eq("id", existing.id);
      } else {
        await supabase.from("notes").insert({
          trip_id: tripId,
          user_id: user.id,
          judul: noteTitle,
          konten: jsonStr,
        });
      }
    } catch (e) {
      console.warn("Error syncing checklist to notes:", e);
    }
  };

  const handleToggle = (id: string) => {
    if (!canUpdateChecklist) {
      toast.error("Izin Checklist Operasional dinonaktifkan oleh Pemilik Biro");
      return;
    }
    const isCurrentlyChecked = checkedIds.includes(id);
    const updated = isCurrentlyChecked
      ? checkedIds.filter((item) => item !== id)
      : [...checkedIds, id];

    const targetItem = DEFAULT_CHECKLIST.find((it) => it.id === id);
    logCrewActivity({
      kategori: "checklist_armada",
      aksi: isCurrentlyChecked
        ? "Membatalkan Item Checklist Keberangkatan"
        : "Menyelesaikan Item Checklist Keberangkatan",
      detail: `${isCurrentlyChecked ? "Uncheck" : "Centang selesai"}: ${
        targetItem?.label || id
      } (Progres: ${updated.length}/${DEFAULT_CHECKLIST.length} poin)`,
      tripName,
    });

    saveChecklist(updated);
    if (!isCurrentlyChecked && updated.length === DEFAULT_CHECKLIST.length) {
      toast.success("Luar biasa! Seluruh 14 item checklist operasional telah terpenuhi!");
    }
  };

  const completedCount = checkedIds.length;
  const totalCount = DEFAULT_CHECKLIST.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const categories = [
    { id: "admin", label: "Dokumen & Administrasi", icon: FileText, color: "text-blue-600" },
    { id: "logistik", label: "Logistik & Medis", icon: Package, color: "text-purple-600" },
    { id: "armada", label: "Armada & Personel", icon: Bus, color: "text-emerald-600" },
  ];

  return (
    <Card className="p-4 sm:p-5 rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
      {/* Header & Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Checklist Operasional Keberangkatan
              </h3>
              <p className="text-[10px] text-slate-500">
                Standar 14 poin kesiapan Tour Leader & Kru Lapangan
              </p>
            </div>
          </div>

          <Badge
            className={`text-[10px] px-2 py-0.5 font-bold ${
              progressPercent === 100
                ? "bg-emerald-500 text-white"
                : progressPercent > 50
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {completedCount} / {totalCount} Selesai ({progressPercent}%)
          </Badge>
        </div>

        <div className="mt-2.5">
          <Progress value={progressPercent} className="h-2 rounded-full" />
        </div>
      </div>

      {/* Daftar Item per Kategori */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const items = DEFAULT_CHECKLIST.filter((it) => it.category === cat.id);
          const CatIcon = cat.icon;
          const catDone = items.filter((it) => checkedIds.includes(it.id)).length;

          return (
            <div key={cat.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CatIcon className={`w-3.5 h-3.5 ${cat.color}`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {cat.label}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {catDone}/{items.length}
                </span>
              </div>

              <div className="space-y-1.5 pl-1">
                {items.map((item) => {
                  const isChecked = checkedIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggle(item.id)}
                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? "bg-slate-50 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 opacity-80"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggle(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 rounded-md"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-semibold ${
                            isChecked
                              ? "line-through text-slate-400 dark:text-slate-500"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {item.label}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default TripChecklistCard;
