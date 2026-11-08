import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Plus,
  Trash2,
  RefreshCw,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { RupiahInput } from "@/components/RupiahInput";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { logCrewActivity } from "@/utils/rbacAuditLogger";
import { useRole } from "@/contexts/RoleContext";
import { getBiroCmsData } from "@/utils/biroCmsStore";

interface PettyCashItem {
  id: string;
  keterangan: string;
  kategori: string;
  jumlah: number;
  waktu: string;
  synced: boolean;
}

interface PettyCashTrackerProps {
  tripId: string;
  tripName?: string;
}

export const PettyCashTracker: React.FC<PettyCashTrackerProps> = ({
  tripId,
  tripName,
}) => {
  const { hasPermission } = useRole();
  const canUsePettyCash = hasPermission("rule_petty_cash");
  const storageKey = `petty_cash_data_${tripId}`;
  const loadedTripRef = React.useRef<string | null>(null);

  // Helper filter pos BBM (karena sewa bus biasanya sudah include BBM/solar)
  const isBbmCategoryOrDesc = (kategori: string, keterangan: string) => {
    const text = `${kategori} ${keterangan}`.toLowerCase();
    return (
      (text.includes("bahan bakar") || text.includes("solar bus") || text.includes("kas bbm") || text.includes("bbm")) &&
      !text.includes("non-bbm")
    );
  };

  // Kategori Dinamis dari CMS Biro (tanpa pos BBM)
  const cmsExpenseCategories = useMemo(() => {
    const cms = getBiroCmsData();
    const list = cms.kategoriKeuangan
      .filter((k) => k.jenis === "pengeluaran")
      .filter((k) => !/bahan bakar|solar|bbm/i.test(k.nama));
    if (list.length > 0) return list.map((k) => k.nama);
    return [
      "Saldo Tol & Parkir",
      "Prasmanan & Restoran",
      "Snack Box & Air Mineral",
      "Tiket Masuk & Shuttle Wisata",
      "Honor Sopir & Kru Armada",
      "Honor Kru & Tim Lapangan",
      "Operasional Darurat & P3K",
    ];
  }, []);

  const [modalAwal, setModalAwal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved).modalAwal || 0;
      }
    } catch {}
    return 2000000; // default 2 juta
  });

  const [items, setItems] = useState<PettyCashItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const rawItems = JSON.parse(saved).items || [];
        return rawItems.filter((it: PettyCashItem) => !isBbmCategoryOrDesc(it.kategori || "", it.keterangan || ""));
      }
    } catch {}
    return [];
  });

  const [newItemKet, setNewItemKet] = useState("");
  const [newItemKategori, setNewItemKategori] = useState(() => cmsExpenseCategories[0] || "Saldo Tol & Parkir");
  const [newItemJumlah, setNewItemJumlah] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);

  // Sinkronisasi kategori default jika CMS berubah
  useEffect(() => {
    if (cmsExpenseCategories.length > 0 && !cmsExpenseCategories.includes(newItemKategori)) {
      setNewItemKategori(cmsExpenseCategories[0]);
    }
  }, [cmsExpenseCategories, newItemKategori]);

  // Muat data saat tripId berubah (bersihkan item BBM lama)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setModalAwal(parsed.modalAwal ?? 2000000);
        const filtered = (parsed.items || []).filter(
          (it: PettyCashItem) => !isBbmCategoryOrDesc(it.kategori || "", it.keterangan || "")
        );
        setItems(filtered);
        loadedTripRef.current = tripId;
        return;
      }
    } catch {}

    setModalAwal(2000000);
    setItems([]);
    loadedTripRef.current = tripId;
  }, [tripId, storageKey]);

  // Auto save ke localStorage (hanya setelah data trip terkait selesai dimuat)
  useEffect(() => {
    if (loadedTripRef.current !== tripId) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ modalAwal, items })
      );
    } catch (e) {
      console.warn("Error saving petty cash locally:", e);
    }
  }, [modalAwal, items, storageKey, tripId]);

  const totalPengeluaran = items.reduce((acc, it) => acc + it.jumlah, 0);
  const sisaKasDiTangan = modalAwal - totalPengeluaran;

  const handleAddItem = () => {
    if (!canUsePettyCash) {
      toast.error("Izin akses Petty Cash dinonaktifkan oleh Pemilik Biro");
      return;
    }
    if (!newItemKet.trim()) {
      toast.error("Mohon isi keterangan pengeluaran");
      return;
    }
    if (newItemJumlah <= 0) {
      toast.error("Mohon isi nominal pengeluaran");
      return;
    }

    const item: PettyCashItem = {
      id: "pc_" + Date.now(),
      keterangan: newItemKet.trim(),
      kategori: newItemKategori,
      jumlah: newItemJumlah,
      waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      synced: false,
    };

    setItems((prev) => [item, ...prev]);
    logCrewActivity({
      kategori: "keuangan_lapangan",
      aksi: "Mencatat Pengeluaran Petty Cash",
      detail: `Input biaya lapangan [${newItemKategori}]: ${newItemKet.trim()} sebesar Rp ${newItemJumlah.toLocaleString("id-ID")}`,
      tripName,
    });
    setNewItemKet("");
    setNewItemJumlah(0);
    toast.success("Pengeluaran petty cash dicatat!");
  };

  const handleDeleteItem = (id: string) => {
    if (!canUsePettyCash) {
      toast.error("Izin akses Petty Cash dinonaktifkan oleh Pemilik Biro");
      return;
    }
    const target = items.find((it) => it.id === id);
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (target) {
      logCrewActivity({
        kategori: "keuangan_lapangan",
        aksi: "Menghapus Catatan Petty Cash",
        detail: `Menghapus biaya lapangan [${target.kategori}]: ${target.keterangan} (Rp ${target.jumlah.toLocaleString("id-ID")})`,
        tripName,
        status: "peringatan",
      });
    }
    toast.info("Catatan dihapus");
  };

  // Sinkronisasi item yang belum synced ke tabel keuangan resmi kantor
  const handleSyncToOffice = async () => {
    if (!canUsePettyCash) {
      toast.error("Izin akses Petty Cash dinonaktifkan oleh Pemilik Biro");
      return;
    }
    const unsyncedItems = items.filter((it) => !it.synced);
    if (unsyncedItems.length === 0) {
      toast.info("Semua pengeluaran sudah tersinkronisasi ke kantor");
      return;
    }

    setSyncing(true);
    try {
      const user = await getActiveUser();
      if (!user) {
        toast.error("Sesi tidak valid");
        return;
      }

      let targetTripId = tripId;
      if (!targetTripId) {
        const { data: latestTrip } = await supabase
          .from("trips")
          .select("id")
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false })
          .limit(1)
          .maybeSingle();
        targetTripId = latestTrip?.id || "";
      }

      if (!targetTripId) {
        toast.error("Gagal sinkronisasi: ID trip tidak valid");
        return;
      }

      const inserts = unsyncedItems.map((it) => ({
        trip_id: targetTripId,
        user_id: user.id,
        keterangan: `[${it.kategori}] ${it.keterangan}`,
        jumlah: it.jumlah,
        jenis: "pengeluaran",
      }));

      const { error } = await supabase.from("keuangan").insert(inserts);
      if (error) throw error;

      // Update state local
      setItems((prev) =>
        prev.map((it) => ({ ...it, synced: true }))
      );

      logCrewActivity({
        kategori: "keuangan_lapangan",
        aksi: "Sinkronisasi Petty Cash ke Kantor",
        detail: `Menyinkronkan ${unsyncedItems.length} transaksi pengeluaran lapangan ke buku kas kantor`,
        tripName,
        status: "penting",
      });

      toast.success(
        `${unsyncedItems.length} transaksi petty cash berhasil disinkronkan ke buku kas kantor!`
      );
    } catch (err: any) {
      console.error("Gagal sync petty cash:", err);
      toast.error("Gagal menyinkronkan ke kantor: " + (err.message || "Error"));
    } finally {
      setSyncing(false);
    }
  };

  const formatRupiah = (num: number) => {
    return "Rp " + Math.floor(num).toLocaleString("id-ID");
  };

  return (
    <div className="space-y-4">
      {/* Kartu Ringkasan Uang Saku Operasional */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Modal Kas Awal */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Modal Kas Awal dari Kantor
          </span>
          <RupiahInput
            value={modalAwal || ""}
            onChange={(val) => setModalAwal(typeof val === "number" ? val : Number(String(val).replace(/\./g, "").replace(/,/g, ".")) || 0)}
            className="h-9 font-bold text-slate-900 dark:text-slate-100 rounded-xl"
            placeholder="0"
          />
        </div>

        {/* Total Terpakai */}
        <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
            Total Terpakai di Lapangan
          </span>
          <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatRupiah(totalPengeluaran)}
          </p>
          <span className="text-[10px] text-rose-500">
            {items.length} transaksi operasional
          </span>
        </div>

        {/* Sisa Kas di Tangan */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            Sisa Kas di Tangan Kru
          </span>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatRupiah(sisaKasDiTangan)}
          </p>
          <span className="text-[10px] text-emerald-600">
            {sisaKasDiTangan >= 0 ? "Aman / Cukup" : "Defisit (Perlu Tambahan)"}
          </span>
        </div>
      </div>

      {/* Input Pengeluaran Cepat */}
      <Card className="p-4 rounded-2xl border-slate-200/80 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-blue-600" />
          <span>Tambah Pengeluaran Lapangan (Kategori CMS Biro)</span>
        </h4>

        <div className="space-y-3">
          {/* Pilihan Kategori dari CMS Biro */}
          <div className="flex flex-wrap gap-1.5">
            {cmsExpenseCategories.map((catLabel) => {
              const isSelected = newItemKategori === catLabel;
              return (
                <button
                  key={catLabel}
                  type="button"
                  onClick={() => setNewItemKategori(catLabel)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>{catLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-7">
              <Input
                value={newItemKet}
                onChange={(e) => setNewItemKet(e.target.value)}
                placeholder="Rincian (contoh: Tiket Masuk Wisata / Snack 45 pax)"
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="sm:col-span-3">
              <RupiahInput
                value={newItemJumlah || ""}
                onChange={(val) => setNewItemJumlah(typeof val === "number" ? val : Number(String(val).replace(/\./g, "").replace(/,/g, ".")) || 0)}
                placeholder="Nominal (Rp)"
                className="h-9 text-xs font-semibold rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                onClick={handleAddItem}
                className="w-full h-9 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                Catat
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabel / Daftar Transaksi Lapangan */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Daftar Pengeluaran Lapangan ({items.length})
          </span>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleSyncToOffice}
            disabled={syncing || items.length === 0}
            className="h-7 text-[10px] font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            <span>Sinkron ke Keuangan Kantor</span>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            Belum ada pengeluaran uang saku yang dicatat untuk trip ini.
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.kategori}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.waktu}</span>
                    {item.synced ? (
                      <Badge className="h-4 text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 hover:bg-emerald-100 border-none font-bold">
                        Tersinkron
                      </Badge>
                    ) : (
                      <Badge className="h-4 text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 hover:bg-amber-100 border-none font-bold">
                        Lokal Kru
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {item.keterangan}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    -{formatRupiah(item.jumlah)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PettyCashTracker;
