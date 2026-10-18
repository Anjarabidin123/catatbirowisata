import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, Pencil, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { RupiahInput } from "./RupiahInput";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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
  
  // Form state
  const [jenis, setJenis] = useState<"pemasukan" | "pengeluaran">("pengeluaran");
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [hasCashback, setHasCashback] = useState(false);
  const [cashback, setCashback] = useState("");
  const [hargaSatuan, setHargaSatuan] = useState("");
  const [jumlahItem, setJumlahItem] = useState("");
  const [useCalculator, setUseCalculator] = useState(false);

  useEffect(() => {
    loadFinancialData();
    loadTripData();

    const channel = supabase
      .channel(`keuangan-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "keuangan", filter: `trip_id=eq.${tripId}` },
        () => loadFinancialData()
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trips")
        .select("budget_estimasi")
        .eq("id", tripId)
        .eq("user_id", user.id)
        .single();

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

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("keuangan")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error("Error loading financial data:", error);
      toast.error("Gagal memuat data keuangan");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const unformatRupiah = (formatted: string): number => {
        return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
      };

      if (editingItem) {
        const { error } = await supabase
          .from("keuangan")
          .update({
            jenis,
            jumlah: unformatRupiah(jumlah),
            keterangan,
            cashback: hasCashback ? unformatRupiah(cashback) : null,
            harga_satuan: useCalculator && hargaSatuan ? unformatRupiah(hargaSatuan) : null,
            jumlah_item: useCalculator && jumlahItem ? Number(jumlahItem) : null,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Data keuangan berhasil diperbarui");
      } else {
        const { error } = await supabase.from("keuangan").insert({
          trip_id: tripId,
          user_id: user.id,
          jenis,
          jumlah: unformatRupiah(jumlah),
          keterangan,
          cashback: hasCashback ? unformatRupiah(cashback) : null,
          harga_satuan: useCalculator && hargaSatuan ? unformatRupiah(hargaSatuan) : null,
          jumlah_item: useCalculator && jumlahItem ? Number(jumlahItem) : null,
          tanggal: new Date().toISOString(),
        });

        if (error) throw error;
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
    setJenis("pengeluaran");
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
    if (!confirm("Hapus data ini?")) return;

    try {
      const { error } = await supabase.from("keuangan").delete().eq("id", id);
      if (error) throw error;
      toast.success("Data berhasil dihapus");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus data");
    }
  };

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
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="gradient-primary text-white"
          size="sm"
        >
          <Plus className="w-3 h-3 mr-1" />
          Tambah
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm mb-3">Belum ada data keuangan</p>
          <Button onClick={() => {
            resetForm();
            setDialogOpen(true);
          }} className="gradient-primary text-white" size="sm">
            <Plus className="w-3 h-3 mr-1" />
            Tambah Data
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

          <Card className="overflow-hidden">
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
