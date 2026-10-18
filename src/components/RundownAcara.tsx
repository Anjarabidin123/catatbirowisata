import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Clock, Trash2, Pencil, Sparkles, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RupiahInput } from "./RupiahInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RundownItem {
  id: string;
  hari_ke: number;
  judul_acara: string;
  jam_mulai: string;
  jam_selesai: string;
  keterangan: string | null;
}

interface RundownAcaraProps {
  tripId: string;
  tripName?: string;
  tripDestination?: string;
  tripDate?: string;
  onOpenAIForTrip?: () => void;
}

export const RundownAcara = ({
  tripId,
  tripName,
  tripDestination,
  tripDate,
  onOpenAIForTrip,
}: RundownAcaraProps) => {
  const [rundown, setRundown] = useState<RundownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedRundown, setSelectedRundown] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    hari_ke: 1,
    judul_acara: "",
    jam_mulai: "",
    jam_selesai: "",
    keterangan: "",
  });

  const [transactionForm, setTransactionForm] = useState({
    keterangan: "",
    jenis: "pengeluaran",
    jumlah: "",
  });

  useEffect(() => {
    loadRundown();
    const channel = supabase
      .channel(`rundown-changes-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rundown_acara",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          loadRundown();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const loadRundown = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from("rundown_acara")
      .select("*")
      .eq("trip_id", tripId)
      .eq("user_id", user.user.id)
      .order("hari_ke", { ascending: true })
      .order("jam_mulai", { ascending: true });

    if (error) {
      console.error("Error loading rundown:", error);
    } else {
      setRundown(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("rundown_acara").insert({
      trip_id: tripId,
      user_id: user.user.id,
      ...formData,
    });

    if (error) {
      toast({ title: "Error", description: "Gagal menambahkan jadwal", variant: "destructive" });
    } else {
      toast({
        title: "Berhasil",
        description: tripName
          ? `Jadwal "${formData.judul_acara}" ditambahkan ke trip ${tripName}`
          : "Jadwal berhasil ditambahkan",
      });
      setShowAddDialog(false);
      setFormData({ hari_ke: 1, judul_acara: "", jam_mulai: "", jam_selesai: "", keterangan: "" });
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("rundown_acara").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Gagal menghapus jadwal", variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Jadwal berhasil dihapus" });
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission
    setLoading(true);
    
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setLoading(false);
      return;
    }

    // Convert formatted string to number
    const jumlahNumber = Number(transactionForm.jumlah.replace(/\./g, "").replace(/,/g, ".")) || 0;

    const { error } = await supabase.from("keuangan").insert({
      trip_id: tripId,
      user_id: user.user.id,
      keterangan: transactionForm.keterangan,
      jenis: transactionForm.jenis,
      jumlah: jumlahNumber,
    });

    if (error) {
      toast({ title: "Error", description: "Gagal menambahkan transaksi", variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Transaksi berhasil ditambahkan" });
      setShowTransactionDialog(false);
      setTransactionForm({ keterangan: "", jenis: "pengeluaran", jumlah: "" });
    }
    setLoading(false);
  };

  const groupByDay = () => {
    const grouped: { [key: number]: RundownItem[] } = {};
    rundown.forEach((item) => {
      if (!grouped[item.hari_ke]) {
        grouped[item.hari_ke] = [];
      }
      grouped[item.hari_ke].push(item);
    });
    return grouped;
  };

  if (loading) {
    return <div className="text-center py-8">Memuat jadwal...</div>;
  }

  const groupedRundown = groupByDay();

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Rundown Acara</span>
            </h2>
            {tripName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/90 dark:border-blue-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Trip: {tripName}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Jadwal operasional rombongan <span className="font-semibold text-slate-700 dark:text-slate-300">{tripName || "aktif"}</span>{tripDestination ? <> tujuan <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">{tripDestination}</span></> : ""}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenAIForTrip && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenAIForTrip}
              className="h-8 text-xs rounded-xl border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 font-semibold shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-600" />
              AI Rundown
            </Button>
          )}

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Tambah
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Jadwal Acara {tripName ? `- ${tripName}` : ""}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Hari Ke-</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.hari_ke}
                    onChange={(e) => setFormData({ ...formData, hari_ke: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label>Judul Acara</Label>
                  <Input
                    value={formData.judul_acara}
                    onChange={(e) => setFormData({ ...formData, judul_acara: e.target.value })}
                    required
                    placeholder="Contoh: Berkunjung ke Museum"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Jam Mulai</Label>
                    <Input
                      type="time"
                      value={formData.jam_mulai}
                      onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Jam Selesai</Label>
                    <Input
                      type="time"
                      value={formData.jam_selesai}
                      onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Keterangan (Opsional)</Label>
                  <Textarea
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    placeholder="Detail tambahan acara..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Batal
                  </Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {Object.keys(groupedRundown).length === 0 ? (
        <Card className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-none">
          <CardContent className="py-6 px-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mx-auto text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Belum ada jadwal acara untuk trip ini
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Rundown terhubung ke trip: <span className="font-semibold text-blue-600 dark:text-blue-400">{tripName || "Aktif"}</span>{tripDestination ? ` (${tripDestination})` : ""}{tripDate ? ` • ${tripDate}` : ""}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Tambahkan kegiatan manual atau gunakan Asisten AI untuk menyusun jadwal otomatis.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Tambah Manual
              </Button>
              {onOpenAIForTrip && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenAIForTrip}
                  className="h-8 text-xs rounded-xl border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold px-3 hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  Susun via AI
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedRundown).map(([day, items]) => (
          <Card key={day} className="p-2.5">
            <h3 className="text-xs font-bold mb-2">Hari {day}</h3>
            <div className="space-y-1.5">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-2 p-2 bg-background border rounded text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-primary font-medium">
                      {item.jam_mulai.substring(0, 5)} - {item.jam_selesai.substring(0, 5)}
                    </p>
                    <p className="font-semibold text-sm truncate mt-0.5">{item.judul_acara}</p>
                    {item.keterangan && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{item.keterangan}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setSelectedRundown(item.id);
                        setTransactionForm({ ...transactionForm, keterangan: item.judul_acara });
                        setShowTransactionDialog(true);
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Transaksi Cepat</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div>
              <Label>Keterangan</Label>
              <Input
                value={transactionForm.keterangan}
                onChange={(e) => setTransactionForm({ ...transactionForm, keterangan: e.target.value })}
                required
                placeholder="Contoh: Bayar tiket masuk"
              />
            </div>
            <div>
              <Label>Jenis</Label>
              <Select
                value={transactionForm.jenis}
                onValueChange={(value) => setTransactionForm({ ...transactionForm, jenis: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pemasukan">Pemasukan</SelectItem>
                  <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jumlah</Label>
              <RupiahInput
                label=""
                value={transactionForm.jumlah}
                onChange={(value) => setTransactionForm({ ...transactionForm, jumlah: value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowTransactionDialog(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
