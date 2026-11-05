import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Clock, Trash2, Pencil, FileText, FileDown, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RupiahInput } from "./RupiahInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";
import { logCrewActivity } from "@/utils/rbacAuditLogger";
import { exportTripRundownPDF, shareTripRundownWA } from "@/utils/rundownExport";
import { ImportWordRundownDialog } from "./ImportWordRundownDialog";

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
}

export const RundownAcara = ({
  tripId,
  tripName,
  tripDestination,
  tripDate,
}: RundownAcaraProps) => {
  const { hasPermission } = useRole();
  const canEditRundown = hasPermission("rule_rundown_catatan");
  const canSeeFinancials = hasPermission("rule_buku_kas_laba");
  const canInputPettyCash = hasPermission("rule_petty_cash");
  const [rundown, setRundown] = useState<RundownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showWordImportDialog, setShowWordImportDialog] = useState(false);
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
    const user = await getActiveUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("rundown_acara")
      .select("*")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .order("hari_ke", { ascending: true })
      .order("jam_mulai", { ascending: true });

    if (error) {
      console.error("Error loading rundown:", error);
    } else {
      setRundown(data || []);
    }
    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportTripRundownPDF(tripId);
      toast({ title: "Berhasil", description: "PDF rundown siap disimpan" });
    } catch (err: any) {
      console.error("Gagal export rundown:", err);
      toast({
        title: "Gagal membuat PDF",
        description: err?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleShareWA = async () => {
    try {
      await shareTripRundownWA(tripId);
    } catch (err: any) {
      toast({
        title: "Gagal membagikan",
        description: err?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditRundown) {
      toast({
        title: "Akses Dibatasi",
        description: "Anda tidak memiliki izin menambah jadwal rundown acara.",
        variant: "destructive",
      });
      return;
    }
    if (loading) return;
    setLoading(true);

    const user = await getActiveUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("rundown_acara").insert({
      trip_id: tripId,
      user_id: user.id,
      ...formData,
    });

    if (error) {
      toast({ title: "Error", description: "Gagal menambahkan jadwal", variant: "destructive" });
    } else {
      logCrewActivity({
        actionType: "rundown",
        actionTitle: "Menambahkan Jadwal Rundown",
        actionDetail: `Menambahkan jadwal Hari ${formData.hari_ke} (${formData.jam_mulai}-${formData.jam_selesai}): "${formData.judul_acara}"`,
        tripName,
      });
      toast({
        title: "Berhasil",
        description: tripName
          ? `Jadwal "${formData.judul_acara}" ditambahkan ke trip ${tripName}`
          : "Jadwal berhasil ditambahkan",
      });
      setShowAddDialog(false);
      setFormData({ hari_ke: 1, judul_acara: "", jam_mulai: "", jam_selesai: "", keterangan: "" });
      loadRundown();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!canEditRundown) {
      toast({
        title: "Akses Dibatasi",
        description: "Anda tidak memiliki izin menghapus jadwal rundown acara.",
        variant: "destructive",
      });
      return;
    }
    const targetItem = rundown.find((item) => item.id === id);
    // Optimistic UI update
    setRundown((prev) => prev.filter((item) => item.id !== id));
    const { error } = await supabase.from("rundown_acara").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Gagal menghapus jadwal", variant: "destructive" });
      loadRundown();
    } else {
      logCrewActivity({
        actionType: "rundown",
        actionTitle: "Menghapus Jadwal Rundown",
        actionDetail: `Menghapus jadwal "${targetItem?.judul_acara || id}" pada trip ${tripName || "Aktif"}`,
        tripName,
      });
      toast({ title: "Berhasil", description: "Jadwal berhasil dihapus" });
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canInputPettyCash && !canSeeFinancials) {
      toast({
        title: "Akses Dibatasi",
        description: "Anda tidak memiliki izin menginput transaksi pengeluaran.",
        variant: "destructive",
      });
      return;
    }
    if (loading) return; // Prevent double submission
    setLoading(true);

    const user = await getActiveUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Convert formatted string to number
    const jumlahNumber = Number(transactionForm.jumlah.replace(/\./g, "").replace(/,/g, ".")) || 0;
    const effectiveJenis = canSeeFinancials ? transactionForm.jenis : "pengeluaran";

    const { error } = await supabase.from("keuangan").insert({
      trip_id: tripId,
      user_id: user.id,
      keterangan: transactionForm.keterangan,
      jenis: effectiveJenis,
      jumlah: jumlahNumber,
    });

    if (error) {
      toast({ title: "Error", description: "Gagal menambahkan transaksi", variant: "destructive" });
    } else {
      logCrewActivity({
        actionType: "petty_cash",
        actionTitle: `Input Transaksi Cepat Rundown (${effectiveJenis === "pemasukan" ? "Pemasukan" : "Pengeluaran"})`,
        actionDetail: `Mencatat ${effectiveJenis} sebesar Rp ${jumlahNumber.toLocaleString("id-ID")} untuk "${transactionForm.keterangan}"`,
        tripName,
      });
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
  const hasRundown = Object.keys(groupedRundown).length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Rundown Acara</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {tripName || "Trip aktif"}
            {tripDestination ? <> • <span className="capitalize">{tripDestination}</span></> : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={!hasRundown || exporting}
            className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{exporting ? "Membuat PDF..." : "Download PDF"}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleShareWA}
            disabled={!hasRundown}
            className="h-8 text-xs rounded-xl font-semibold gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Kirim WA</span>
          </Button>
          {canEditRundown && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowWordImportDialog(true)}
              className="h-8 text-xs rounded-xl font-semibold gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Import Word</span>
            </Button>
          )}
          {canEditRundown && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl font-semibold">
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
          )}
        </div>
      </div>

      {!hasRundown ? (
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
                {tripName || "Trip aktif"}{tripDestination ? ` (${tripDestination})` : ""}{tripDate ? ` • ${tripDate}` : ""}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Tambahkan kegiatan satu per satu atau impor dari dokumen Word.
            </p>
            {canEditRundown && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                  className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Tambah Manual
                </Button>
              </div>
            )}
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
                    <p className="font-semibold text-sm mt-0.5 break-words">{item.judul_acara}</p>
                    {item.keterangan && (
                      <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-line break-words leading-relaxed">
                        {item.keterangan}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {(canInputPettyCash || canSeeFinancials) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setSelectedRundown(item.id);
                          setTransactionForm({ ...transactionForm, keterangan: item.judul_acara, jenis: "pengeluaran" });
                          setShowTransactionDialog(true);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                    {canEditRundown && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
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
                value={canSeeFinancials ? transactionForm.jenis : "pengeluaran"}
                onValueChange={(value) => setTransactionForm({ ...transactionForm, jenis: value })}
                disabled={!canSeeFinancials}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canSeeFinancials && <SelectItem value="pemasukan">Pemasukan</SelectItem>}
                  <SelectItem value="pengeluaran">Pengeluaran (Operasional Lapangan)</SelectItem>
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

      <ImportWordRundownDialog
        open={showWordImportDialog}
        onOpenChange={setShowWordImportDialog}
        defaultTripId={tripId}
        defaultTripName={tripName}
        onSuccess={loadRundown}
      />
    </div>
  );
};
