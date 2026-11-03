import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Percent,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Store,
  Utensils,
  ShoppingBag,
  Bus,
  Coins,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { RupiahInput } from "@/components/RupiahInput";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { useRole } from "@/contexts/RoleContext";
import { logCrewActivity } from "@/utils/rbacAuditLogger";

export interface CashbackItem {
  id: string;
  namaMerchant: string;
  kategori: "Resto" | "Oleh-Oleh" | "Wisata" | "Armada Bus" | "Lainnya";
  nominal: number;
  status: "cair" | "pending";
  catatan?: string;
  tanggal: string;
  syncedToKeuangan?: boolean;
}

interface CashbackTrackerWidgetProps {
  tripId?: string;
  tripName?: string;
}

export const CashbackTrackerWidget: React.FC<CashbackTrackerWidgetProps> = ({
  tripId,
  tripName,
}) => {
  const { isPemilik } = useRole();
  const localKey = tripId ? `cashback_tracker_${tripId}` : "cashback_tracker_general";
  const loadedKeyRef = React.useRef<string | null>(null);

  const [items, setItems] = useState<CashbackItem[]>(() => {
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    if (tripId) return [];
    return [
      {
        id: "cb_demo_1",
        namaMerchant: "Pusat Oleh-Oleh Khas Nusantara",
        kategori: "Oleh-Oleh",
        nominal: 750000,
        status: "cair",
        catatan: "Cashback belanja rombongan 15%",
        tanggal: new Date().toISOString().split("T")[0],
        syncedToKeuangan: true,
      },
      {
        id: "cb_demo_2",
        namaMerchant: "RM Grafika / Pringsewu",
        kategori: "Resto",
        nominal: 450000,
        status: "pending",
        catatan: "Fee makan siang 45 pax",
        tanggal: new Date().toISOString().split("T")[0],
        syncedToKeuangan: false,
      },
    ];
  });

  const [namaMerchant, setNamaMerchant] = useState("");
  const [kategori, setKategori] = useState<any>("Oleh-Oleh");
  const [nominal, setNominal] = useState<number>(0);
  const [status, setStatus] = useState<"cair" | "pending">("cair");
  const [catatan, setCatatan] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Muat data saat localKey / tripId berubah
  useEffect(() => {
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        setItems(JSON.parse(saved));
        loadedKeyRef.current = localKey;
        return;
      }
    } catch {}

    if (tripId) {
      setItems([]);
    } else {
      setItems([
        {
          id: "cb_demo_1",
          namaMerchant: "Pusat Oleh-Oleh Khas Nusantara",
          kategori: "Oleh-Oleh",
          nominal: 750000,
          status: "cair",
          catatan: "Cashback belanja rombongan 15%",
          tanggal: new Date().toISOString().split("T")[0],
          syncedToKeuangan: true,
        },
        {
          id: "cb_demo_2",
          namaMerchant: "RM Grafika / Pringsewu",
          kategori: "Resto",
          nominal: 450000,
          status: "pending",
          catatan: "Fee makan siang 45 pax",
          tanggal: new Date().toISOString().split("T")[0],
          syncedToKeuangan: false,
        },
      ]);
    }
    loadedKeyRef.current = localKey;
  }, [localKey, tripId]);

  // Simpan perubahan ke local storage (hanya jika data trip aktif sudah selesai dimuat)
  useEffect(() => {
    if (loadedKeyRef.current !== localKey) return;
    try {
      localStorage.setItem(localKey, JSON.stringify(items));
    } catch (e) {
      console.warn("Error saving cashback to local:", e);
    }
  }, [items, localKey]);

  const totalCair = items
    .filter((it) => it.status === "cair")
    .reduce((acc, it) => acc + it.nominal, 0);

  const totalPending = items
    .filter((it) => it.status === "pending")
    .reduce((acc, it) => acc + it.nominal, 0);

  const totalKomisi = totalCair + totalPending;

  const handleAddItem = () => {
    if (!namaMerchant.trim()) {
      toast.error("Mohon isi nama toko / resto mitra");
      return;
    }
    if (nominal <= 0) {
      toast.error("Mohon isi nominal komisi");
      return;
    }

    const newItem: CashbackItem = {
      id: "cb_" + Date.now(),
      namaMerchant: namaMerchant.trim(),
      kategori,
      nominal,
      status,
      catatan: catatan.trim() || undefined,
      tanggal: new Date().toISOString().split("T")[0],
      syncedToKeuangan: false,
    };

    setItems((prev) => [newItem, ...prev]);
    logCrewActivity({
      kategori: "keuangan_lapangan",
      aksi: `Catat Komisi / Cashback Mitra: ${newItem.namaMerchant}`,
      detail: `Kategori: ${newItem.kategori} • Nominal: Rp ${newItem.nominal.toLocaleString("id-ID")} • Status: ${newItem.status === "cair" ? "Sudah Cair" : "Pending"}`,
      tripName,
    });
    setNamaMerchant("");
    setNominal(0);
    setCatatan("");
    setShowForm(false);
    toast.success("Catatan komisi / cashback mitra berhasil ditambahkan!");
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.info("Catatan dihapus");
  };

  const handleToggleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const nextStatus = it.status === "cair" ? "pending" : "cair";
          return { ...it, status: nextStatus };
        }
        return it;
      })
    );
    toast.info("Status komisi diperbarui");
  };

  // 1-Click Posting ke Kas Masuk Keuangan Biro
  const handlePostToKeuangan = async (item: CashbackItem) => {
    try {
      const user = await getActiveUser();
      if (!user) {
        toast.error("Sesi tidak valid");
        return;
      }

      const { error } = await supabase.from("keuangan").insert({
        user_id: user.id,
        trip_id: tripId || null,
        keterangan: `[KOMISI/CASHBACK] ${item.namaMerchant} (${item.kategori})${item.catatan ? ` - ${item.catatan}` : ""}`,
        jumlah: item.nominal,
        jenis: "pemasukan",
      });

      if (error) throw error;

      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, syncedToKeuangan: true, status: "cair" } : it))
      );

      logCrewActivity({
        kategori: "keuangan_lapangan",
        aksi: `Bukukan Komisi Mitra ke Kas Masuk: ${item.namaMerchant}`,
        detail: `Nominal: Rp ${item.nominal.toLocaleString("id-ID")}`,
        tripName,
        status: "penting",
      });

      toast.success(`Komisi ${item.namaMerchant} sebesar Rp ${item.nominal.toLocaleString("id-ID")} berhasil dibukukan ke Kas Masuk!`);
    } catch (err: any) {
      console.error("Gagal membukukan komisi:", err);
      toast.error("Gagal membukukan ke keuangan: " + (err.message || "Error"));
    }
  };

  const formatRupiah = (num: number) => {
    return "Rp " + Math.floor(num).toLocaleString("id-ID");
  };

  const getKategoriIcon = (kat: string) => {
    switch (kat) {
      case "Resto":
        return Utensils;
      case "Oleh-Oleh":
        return ShoppingBag;
      case "Armada Bus":
        return Bus;
      default:
        return Store;
    }
  };

  return (
    <Card className="p-4 sm:p-5 rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Pendapatan Komisi & Cashback Mitra</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-700 font-extrabold uppercase">
                Biro & TL
              </span>
            </h3>
            <p className="text-[10px] text-slate-500">
              Pantau fee rujukan dari resto rombongan, pusat belanja oleh-oleh & objek wisata
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="h-8 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white gap-1 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showForm ? "Tutup" : "Catat Komisi"}</span>
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
            Total Potensi
          </span>
          <p className="text-base font-black text-amber-800 dark:text-amber-200 mt-0.5">
            {formatRupiah(totalKomisi)}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
            Sudah Cair
          </span>
          <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
            {formatRupiah(totalCair)}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Menunggu Cair
          </span>
          <p className="text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">
            {formatRupiah(totalPending)}
          </p>
        </div>
      </div>

      {/* Form Input Komisi */}
      {showForm && (
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Form Catat Komisi Mitra
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nama Toko / Resto Mitra *
              </Label>
              <Input
                value={namaMerchant}
                onChange={(e) => setNamaMerchant(e.target.value)}
                placeholder="Contoh: Bakpia Pathok 25 / RM Candisari"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Kategori Mitra
              </Label>
              <Select value={kategori} onValueChange={(val: any) => setKategori(val)}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Oleh-Oleh" className="text-xs">Pusat Oleh-Oleh</SelectItem>
                  <SelectItem value="Resto" className="text-xs">Rumah Makan / Resto</SelectItem>
                  <SelectItem value="Wisata" className="text-xs">Objek Wisata / Atraksi</SelectItem>
                  <SelectItem value="Armada Bus" className="text-xs">Operator Bus</SelectItem>
                  <SelectItem value="Lainnya" className="text-xs">Lain-lain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nominal Komisi (Rp) *
              </Label>
              <RupiahInput
                value={nominal || ""}
                onChange={(val) => setNominal(typeof val === "number" ? val : parseFloat(val) || 0)}
                placeholder="0"
                className="h-9 text-xs font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Status Pencairan
              </Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cair" className="text-xs font-semibold text-emerald-600">
                    Sudah Cair (Diterima)
                  </SelectItem>
                  <SelectItem value="pending" className="text-xs font-semibold text-amber-600">
                    Menunggu Pencairan
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Catatan / Perhitungan (Opsional)
            </Label>
            <Input
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: 15% dari omset belanja Rp 5.000.000"
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="h-8 text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleAddItem}
              className="h-8 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
            >
              Simpan Komisi
            </Button>
          </div>
        </div>
      )}

      {/* List Items */}
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = getKategoriIcon(item.kategori);
          const isCair = item.status === "cair";

          return (
            <div
              key={item.id}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs"
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.namaMerchant}
                    </span>
                    <span className="text-[10px] text-slate-400">• {item.kategori}</span>
                  </div>
                  {item.catatan && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.catatan}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                <div className="text-right">
                  <p className="text-xs font-black text-amber-700 dark:text-amber-400">
                    +{formatRupiah(item.nominal)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item.id)}
                    className="text-[10px] font-bold"
                  >
                    {isCair ? (
                      <span className="text-emerald-600 hover:underline">● Sudah Cair</span>
                    ) : (
                      <span className="text-amber-600 hover:underline">○ Pending</span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {isPemilik && !item.syncedToKeuangan && isCair && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePostToKeuangan(item)}
                      className="h-7 text-[10px] font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-lg px-2"
                      title="Posting ke Kas Masuk Keuangan Biro"
                    >
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      Bukukan
                    </Button>
                  )}
                  {item.syncedToKeuangan && (
                    <Badge className="h-5 text-[9px] bg-emerald-100 text-emerald-700 border-none font-bold">
                      Terbuku
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default CashbackTrackerWidget;
