import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  ChevronDown,
  Pencil,
  Eye,
  Wallet,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { RupiahInput } from "./RupiahInput";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { logCrewActivity } from "@/utils/rbacAuditLogger";
import { getBiroCmsData } from "@/utils/biroCmsStore";

interface FinancialItem {
  id: string;
  jenis: "pemasukan" | "pengeluaran";
  keterangan: string;
  jumlah: number;
  cashback?: number | null;
  tanggal: string;
}

interface TripFinancialTabProps {
  tripId: string;
}

interface EditingItem {
  id: string;
  jenis: "pemasukan" | "pengeluaran";
  keterangan: string;
  jumlah: number;
  cashback?: number | null;
}

export const TripFinancialTab = ({ tripId }: TripFinancialTabProps) => {
  const [items, setItems] = useState<FinancialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tripData, setTripData] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | undefined>();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterJenis, setFilterJenis] = useState<"semua" | "pemasukan" | "pengeluaran">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const isLocalActionRef = useRef<boolean>(false);
  
  // Form state
  const [jenis, setJenis] = useState<"pemasukan" | "pengeluaran">("pengeluaran");
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [hasCashback, setHasCashback] = useState(false);
  const [cashback, setCashback] = useState("");
  const [hargaSatuan, setHargaSatuan] = useState("");
  const [jumlahItem, setJumlahItem] = useState("");
  const [useCalculator, setUseCalculator] = useState(false);

  const cmsCategories = useMemo(() => {
    const cms = getBiroCmsData();
    return cms.kategoriKeuangan.filter((k) => k.jenis === jenis);
  }, [jenis]);

  const handleSelectCategory = (katName: string) => {
    if (!keterangan.trim()) {
      setKeterangan(`[${katName}] `);
      return;
    }
    const regex = /^\[.*?\]\s*/;
    if (regex.test(keterangan)) {
      setKeterangan(keterangan.replace(regex, `[${katName}] `));
    } else {
      setKeterangan(`[${katName}] ${keterangan}`);
    }
  };

  useEffect(() => {
    loadFinancialData();
    loadTripData();

    const channel = supabase
      .channel(`keuangan-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "keuangan", filter: `trip_id=eq.${tripId}` },
        () => {
          if (isLocalActionRef.current) return;
          loadFinancialData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  useEffect(() => {
    if (useCalculator && hargaSatuan && jumlahItem) {
      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };
      const satuan = unformatRupiah(hargaSatuan);
      const qty = Number(jumlahItem) || 0;
      const total = satuan * qty;
      
      const formatRupiah = (angka: number) => {
        return angka.toLocaleString("id-ID");
      };
      
      setJumlah(formatRupiah(total));
    }
  }, [hargaSatuan, jumlahItem, useCalculator]);

  const loadTripData = async () => {
    try {
      const user = await getActiveUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trips")
        .select("budget_estimasi")
        .eq("id", tripId)

        .maybeSingle();

      if (error) {
        // Handle missing column gracefully
        if (error.code === "42703") {
          console.warn("Column budget_dp not found, skipping...");
        } else {
          throw error;
        }
      } else {
        setTripData(data);
      }
    } catch (error: any) {
      console.error("Error loading trip data:", error);
    }
  };

  const loadFinancialData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const user = await getActiveUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("keuangan")
        .select("*")
        .eq("trip_id", tripId)

        .order("tanggal", { ascending: false });

      if (error) throw error;
      const rawList = (data || []) as FinancialItem[];
      const orderKey = `catatbiro_financial_order_${tripId}`;
      const savedOrderRaw = localStorage.getItem(orderKey);
      if (savedOrderRaw) {
        try {
          const savedOrder: string[] = JSON.parse(savedOrderRaw);
          rawList.sort((a, b) => {
            const indexA = savedOrder.indexOf(a.id);
            const indexB = savedOrder.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime();
          });
        } catch (e) {
          console.warn("Gagal parse custom order:", e);
        }
      }
      setItems(rawList);
    } catch (error: any) {
      console.error("Error loading financial data:", error);
      toast.error("Gagal memuat data keuangan");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    isLocalActionRef.current = true;
    setTimeout(() => { isLocalActionRef.current = false; }, 2000);
    
    try {
      const user = await getActiveUser();
      if (!user) throw new Error("User not authenticated");

      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };

      const parsedJumlah = unformatRupiah(jumlah);

      if (editingItem) {
        const { error } = await supabase
          .from("keuangan")
          .update({
            jenis,
            jumlah: parsedJumlah,
            keterangan,
            cashback: hasCashback ? unformatRupiah(cashback) : null,
            harga_satuan: useCalculator && hargaSatuan ? unformatRupiah(hargaSatuan) : null,
            jumlah_item: useCalculator && jumlahItem ? Number(jumlahItem) : null,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        logCrewActivity({
          actionType: "petty_cash",
          actionTitle: `Memperbarui Transaksi Buku Kas (${jenis})`,
          actionDetail: `Mengubah data ${jenis} "${keterangan}" sebesar Rp ${parsedJumlah.toLocaleString("id-ID")}`,
        });
        toast.success("Data keuangan berhasil diperbarui");
      } else {
        const { error } = await supabase.from("keuangan").insert({
          trip_id: tripId,
          user_id: user.id,
          jenis,
          jumlah: parsedJumlah,
          keterangan,
          cashback: hasCashback ? unformatRupiah(cashback) : null,
          harga_satuan: useCalculator && hargaSatuan ? unformatRupiah(hargaSatuan) : null,
          jumlah_item: useCalculator && jumlahItem ? Number(jumlahItem) : null,
          tanggal: new Date().toISOString(),
        });

        if (error) throw error;
        logCrewActivity({
          actionType: "petty_cash",
          actionTitle: `Menambahkan Transaksi Buku Kas (${jenis})`,
          actionDetail: `Menambahkan ${jenis} "${keterangan}" sebesar Rp ${parsedJumlah.toLocaleString("id-ID")}`,
        });
        toast.success("Data keuangan berhasil ditambahkan");
      }

      resetForm();
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(editingItem ? "Gagal memperbarui data keuangan" : "Gagal menambahkan data keuangan");
    }
  };

  const resetForm = () => {
    setEditingItem(undefined);
    setJenis(filterJenis === "pemasukan" ? "pemasukan" : "pengeluaran");
    setKeterangan("");
    setJumlah("");
    setHasCashback(false);
    setCashback("");
    setHargaSatuan("");
    setJumlahItem("");
    setUseCalculator(false);
  };

  const handleEdit = (item: FinancialItem) => {
    setEditingItem(item);
    setJenis(item.jenis);
    setKeterangan(item.keterangan);
    setJumlah(item.jumlah.toLocaleString("id-ID"));
    setHasCashback(!!item.cashback);
    setCashback(item.cashback ? item.cashback.toLocaleString("id-ID") : "");
    setUseCalculator(false);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!confirm(`Hapus transaksi "${target?.keterangan || "ini"}"?`)) return;

    isLocalActionRef.current = true;
    setTimeout(() => { isLocalActionRef.current = false; }, 2000);

    try {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        const orderKey = `catatbiro_financial_order_${tripId}`;
        localStorage.setItem(orderKey, JSON.stringify(next.map((i) => i.id)));
        return next;
      });

      const { error } = await supabase.from("keuangan").delete().eq("id", id);
      if (error) throw error;
      logCrewActivity({
        actionType: "petty_cash",
        actionTitle: "Menghapus Transaksi Buku Kas",
        actionDetail: `Menghapus data keuangan "${target?.keterangan || id}"`,
      });
      toast.success("Data berhasil dihapus");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus data");
      loadFinancialData(true);
    }
  };

  const handleMoveItem = async (itemId: string, direction: "up" | "down") => {
    const currentDisplayedIndex = displayedItems.findIndex((it) => it.id === itemId);
    if (currentDisplayedIndex === -1) return;

    const targetDisplayedIndex = direction === "up" ? currentDisplayedIndex - 1 : currentDisplayedIndex + 1;
    if (targetDisplayedIndex < 0 || targetDisplayedIndex >= displayedItems.length) return;

    const currentItem = displayedItems[currentDisplayedIndex];
    const targetItem = displayedItems[targetDisplayedIndex];

    const currentIdxInAll = items.findIndex((it) => it.id === currentItem.id);
    const targetIdxInAll = items.findIndex((it) => it.id === targetItem.id);
    if (currentIdxInAll === -1 || targetIdxInAll === -1) return;

    // Swap positions
    const newItems = [...items];
    newItems[currentIdxInAll] = targetItem;
    newItems[targetIdxInAll] = currentItem;

    setItems(newItems);
    const orderKey = `catatbiro_financial_order_${tripId}`;
    localStorage.setItem(orderKey, JSON.stringify(newItems.map((it) => it.id)));


  };

  const handleJumpToOrder = (itemId: string, currentNum: number, maxNum: number) => {
    const currentItem = displayedItems[currentNum - 1];
    if (!currentItem) return;

    const input = prompt(
      `Pindahkan item #${currentNum} ("${currentItem.keterangan}") ke nomor urut berapa? (1 - ${maxNum}):`,
      String(currentNum)
    );
    if (!input) return;
    const targetNum = parseInt(input.trim(), 10);
    if (isNaN(targetNum) || targetNum < 1 || targetNum > maxNum) {
      toast.error(`Nomor urut tidak valid. Masukkan angka antara 1 sampai ${maxNum}.`);
      return;
    }
    if (targetNum === currentNum) return;

    const targetItem = displayedItems[targetNum - 1];
    if (!targetItem) return;

    const currentIdxInAll = items.findIndex((it) => it.id === currentItem.id);
    const targetIdxInAll = items.findIndex((it) => it.id === targetItem.id);
    if (currentIdxInAll === -1 || targetIdxInAll === -1) return;

    const newItems = [...items];
    const [removed] = newItems.splice(currentIdxInAll, 1);
    newItems.splice(targetIdxInAll, 0, removed);

    setItems(newItems);
    const orderKey = `catatbiro_financial_order_${tripId}`;
    localStorage.setItem(orderKey, JSON.stringify(newItems.map((it) => it.id)));
    toast.success(`"${currentItem.keterangan}" dipindahkan ke nomor urut #${targetNum}!`);
  };

  /* old delete removed
    if (!confirm("Hapus data ini?")) return;

    const target = items.find((i) => i.id === id);

    try {
      const { error } = await supabase.from("keuangan").delete().eq("id", id);
      if (error) throw error;
      logCrewActivity({
        actionType: "petty_cash",
        actionTitle: "Menghapus Transaksi Buku Kas",
        actionDetail: `Menghapus data keuangan "${target?.keterangan || id}"`,
      });
      toast.success("Data berhasil dihapus");
    } catch (error: any) {
      console.error("Error:", error);
// toast.error("Gagal menghapus data");
    }
  };

  */

  const totalPemasukan = useMemo(() => 
    items.filter(i => i.jenis === "pemasukan").reduce((sum, i) => sum + Number(i.jumlah), 0),
    [items]
  );
  
  const totalPengeluaran = useMemo(() =>
    items.filter(i => i.jenis === "pengeluaran").reduce((sum, i) => sum + Number(i.jumlah), 0),
    [items]
  );
  
  const totalCashback = useMemo(() =>
    items.reduce((sum, i) => sum + (Number(i.cashback) || 0), 0),
    [items]
  );
  
  const saldo = useMemo(() => totalPemasukan - totalPengeluaran, [totalPemasukan, totalPengeluaran]);
  const budgetTotal = Number(tripData?.budget_estimasi) || 0;
  const sisaBudget = budgetTotal - totalPengeluaran;
  const totalSaldo = saldo + totalCashback;

  const totalPemasukanCount = useMemo(
    () => items.filter((i) => i.jenis === "pemasukan").length,
    [items]
  );
  
  const totalPengeluaranCount = useMemo(
    () => items.filter((i) => i.jenis === "pengeluaran").length,
    [items]
  );

  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      if (filterJenis === "pemasukan" && item.jenis !== "pemasukan") return false;
      if (filterJenis === "pengeluaran" && item.jenis !== "pengeluaran") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKet = item.keterangan?.toLowerCase().includes(q);
        const matchJumlah = String(item.jumlah).includes(q);
        if (!matchKet && !matchJumlah) return false;
      }
      return true;
    });
  }, [items, filterJenis, searchQuery]);

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Keuangan</h2>
        {items.length > 0 && (
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="gradient-primary text-white"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Tambah Transaksi
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mx-auto text-blue-600">
            <Wallet className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Belum Ada Transaksi Keuangan</h4>
            <p className="text-muted-foreground text-xs mt-0.5">Catat pemasukan atau pengeluaran operasional trip ini</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="gradient-primary text-white text-xs font-bold rounded-xl"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Catat Transaksi Pertama
          </Button>
        </Card>
      ) : (
        <>
          {budgetTotal > 0 && (
            <Card className="p-3 bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-semibold">{formatRupiah(budgetTotal)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t">
                  <span className="text-muted-foreground">Sisa:</span>
                  <span className={`font-bold ${sisaBudget >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatRupiah(sisaBudget)}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* OLD TABLE COMMENTED OUT
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold">Keterangan</th>
                    <th className="text-right p-2 font-semibold whitespace-nowrap">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isExpanded = expandedItems.has(item.id);
                    const itemColor = item.jenis === "pemasukan" ? "text-green-600" : "text-red-600";
                    return (
                      <>
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="p-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-start gap-1.5">
                                <span className={`line-clamp-2 ${itemColor} font-medium`}>{item.keterangan}</span>
                                {item.cashback && (
                                  <Eye className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
                                )}
                              </div>
                              <button
                                onClick={() => toggleItem(item.id)}
                                className="self-start hover:bg-muted rounded p-0.5 transition-colors"
                              >
                                <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </td>
                          <td className={`p-2 text-right font-semibold whitespace-nowrap ${itemColor}`}>
                            {formatRupiah(Number(item.jumlah))}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${item.id}-detail`} className="border-b last:border-0">
                            <td colSpan={2} className="p-0">
                              <div className="bg-muted/30 p-2 space-y-1.5">
                                {item.cashback && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Cashback:</span>
                                    <span className="text-blue-600 font-semibold">{formatRupiah(Number(item.cashback))}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Waktu:</span>
                                  <span>{format(new Date(item.tanggal), "dd MMM yyyy, HH:mm", { locale: id })}</span>
                                </div>
                                <div className="flex gap-1.5 justify-end pt-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(item)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Pencil className="w-3 h-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(item.id)}
                                    className="h-6 px-2 text-xs text-destructive hover:text-destructive/80"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Hapus
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          */}

          {/* Filter Bar & Quick Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilterJenis("semua")}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  filterJenis === "semua"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Semua ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterJenis("pemasukan")}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  filterJenis === "pemasukan"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Pemasukan ({totalPemasukanCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterJenis("pengeluaran")}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  filterJenis === "pengeluaran"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Pengeluaran ({totalPengeluaranCount})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi..."
                className="h-8.5 pl-8.5 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <Card className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="text-center p-2.5 font-black w-14 sm:w-16">No / Urut</th>
                    <th className="text-left p-2.5 font-bold">Keterangan</th>
                    <th className="text-right p-2.5 font-bold whitespace-nowrap">Jumlah</th>
                    <th className="text-center p-2.5 font-bold w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {displayedItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                        Tidak ada transaksi yang cocok dengan filter{" "}
                        {filterJenis !== "semua" ? `"${filterJenis}"` : ""}
                      </td>
                    </tr>
                  ) : (
                    displayedItems.map((item, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === displayedItems.length - 1;
                      const itemColor =
                        item.jenis === "pemasukan"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400";
                      const displayNum = idx + 1;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Kolom Nomor Urut & Tombol Naik/Turun */}
                          <td className="p-2 sm:p-2.5 align-middle text-center">
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => handleMoveItem(item.id, "up")}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
                                title="Pindahkan ke atas (Naikkan urutan)"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleJumpToOrder(item.id, displayNum, displayedItems.length)}
                                className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 font-black text-[11px] text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                                title="Klik untuk ubah nomor urut langsung"
                              >
                                {displayNum}
                              </button>

                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => handleMoveItem(item.id, "down")}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
                                title="Pindahkan ke bawah (Turunkan urutan)"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Kolom Keterangan */}
                          <td className="p-2 sm:p-2.5 align-middle">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-bold text-xs sm:text-sm ${itemColor}`}>
                                  {item.keterangan}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1.5 py-0 h-4 font-black border-0 ${
                                    item.jenis === "pemasukan"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  }`}
                                >
                                  {item.jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran"}
                                </Badge>
                                {item.cashback && (
                                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                                    +CB: {formatRupiah(Number(item.cashback))}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                                <span>
                                  {format(new Date(item.tanggal), "dd MMM yyyy, HH:mm", { locale: id })}
                                </span>
                                {(item as any).harga_satuan && (item as any).jumlah_item && (
                                  <span>
                                    • @{formatRupiah((item as any).harga_satuan)} x {(item as any).jumlah_item}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Kolom Jumlah */}
                          <td className={`p-2 sm:p-2.5 text-right font-black text-xs sm:text-sm whitespace-nowrap align-middle ${itemColor}`}>
                            {formatRupiah(Number(item.jumlah))}
                          </td>

                          {/* Kolom Aksi Langsung: Edit & Hapus */}
                          <td className="p-2 sm:p-2.5 text-center align-middle whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(item)}
                                className="h-7 w-7 p-0 rounded-lg hover:bg-blue-100 hover:text-blue-700 text-slate-500"
                                title="Edit Transaksi"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(item.id)}
                                className="h-7 w-7 p-0 rounded-lg hover:bg-rose-100 hover:text-rose-700 text-slate-500"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-3 bg-muted/50">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>Pemasukan:</span>
                <span className="font-semibold text-green-600">{formatRupiah(totalPemasukan)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pengeluaran:</span>
                <span className="font-semibold text-red-600">{formatRupiah(totalPengeluaran)}</span>
              </div>
              
              <div className="border-t pt-1.5 space-y-1.5">
                <div className="flex justify-between">
                  <span>Sisa Saldo:</span>
                  <span className={`font-semibold ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatRupiah(saldo)}
                  </span>
                </div>
                {totalCashback > 0 && (
                  <div className="flex justify-between">
                    <span>Cashback:</span>
                    <span className="font-semibold text-blue-600">{formatRupiah(totalCashback)}</span>
                  </div>
                )}
              </div>
              
              <Collapsible>
                <div className="border-t pt-1.5">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex justify-between items-center font-bold text-sm hover:opacity-80 transition-opacity">
                      <span>Total Saldo:</span>
                      <div className="flex items-center gap-2">
                        <span className={totalSaldo >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatRupiah(totalSaldo)}
                        </span>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                  <div className="pt-2 text-xs text-muted-foreground text-center">
                    <p>Sisa Saldo + Cashback</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base">{editingItem ? "Edit Data Keuangan" : "Tambah Data Keuangan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-sm">Jenis</Label>
              <Select value={jenis} onValueChange={(v: any) => setJenis(v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pemasukan">Pemasukan</SelectItem>
                  <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              {cmsCategories.length > 0 && (
                <div className="space-y-1 mb-2">
                  <Label className="text-xs font-semibold text-slate-500">Pilihan Cepat Pos Kategori (CMS):</Label>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {cmsCategories.map((kat) => (
                      <button
                        key={kat.id}
                        type="button"
                        onClick={() => handleSelectCategory(kat.nama)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        {kat.nama}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Label className="text-sm">Keterangan</Label>
              <Textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Tiket masuk 60 orang @ Rp50.000"
                required
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useCalculator"
                checked={useCalculator}
                onChange={(e) => setUseCalculator(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="useCalculator" className="text-xs">Gunakan Kalkulator</Label>
            </div>

            {useCalculator ? (
              <div className="space-y-2">
                <RupiahInput 
                  label="Harga Satuan" 
                  value={hargaSatuan} 
                  onChange={setHargaSatuan} 
                  placeholder="50000"
                  required 
                />
                <div>
                  <Label className="text-sm">Jumlah Item</Label>
                  <input
                    type="number"
                    value={jumlahItem}
                    onChange={(e) => setJumlahItem(e.target.value)}
                    placeholder="60"
                    required
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <Label className="text-xs text-muted-foreground">Total:</Label>
                  <p className="text-sm font-bold text-primary">{jumlah ? `Rp ${jumlah}` : "Rp 0"}</p>
                </div>
              </div>
            ) : (
              <RupiahInput label="Jumlah" value={jumlah} onChange={setJumlah} required />
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasCashback"
                checked={hasCashback}
                onChange={(e) => setHasCashback(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="hasCashback" className="text-sm">Ada Cashback?</Label>
            </div>

            {hasCashback && (
              <RupiahInput label="Cashback" value={cashback} onChange={setCashback} />
            )}

            <Button type="submit" className="w-full gradient-primary text-white">
              Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
