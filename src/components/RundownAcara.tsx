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
    if (!tripId) {
      toast({ title: "Error", description: "ID Trip tidak valid", variant: "destructive" });
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
    return <div className="text-center py-8 font-bold text-slate-500 text-xs">Memuat jadwal acara...</div>;
  }

  const groupedRundown = groupByDay();
  const hasRundown = Object.keys(groupedRundown).length > 0;

  return (
    <div className="space-y-4">
      {/* Header Rundown: Judul Tebal & Action Buttons Tegas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-300/90 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>Rundown Jadwal Kegiatan</span>
          </h2>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
            {tripName || "Trip aktif"}
            {tripDestination ? <> • <span className="capitalize text-slate-900 dark:text-white">{tripDestination}</span></> : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={!hasRundown || exporting}
            className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 px-3.5 shadow-2xs"
          >
            <FileDown className="w-4 h-4" />
            <span>{exporting ? "Membuat PDF..." : "Download PDF"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleShareWA}
            disabled={!hasRundown}
            className="h-9 text-xs rounded-xl font-bold gap-1.5 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 bg-white dark:bg-slate-900 px-3.5 shadow-2xs"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Kirim WA</span>
          </Button>

          {canEditRundown && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowWordImportDialog(true)}
              className="h-9 text-xs rounded-xl font-bold gap-1.5 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:bg-blue-50 bg-white dark:bg-slate-900 px-3.5 shadow-2xs"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Import Word</span>
            </Button>
          )}

          {canEditRundown && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 text-xs rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 px-3.5 shadow-2xs">
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold">Tambah Jadwal Acara {tripName ? `- ${tripName}` : ""}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Hari Ke-</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.hari_ke}
                      onChange={(e) => setFormData({ ...formData, hari_ke: parseInt(e.target.value) })}
                      className="text-xs font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Judul Kegiatan / Rute</Label>
                    <Input
                      value={formData.judul_acara}
                      onChange={(e) => setFormData({ ...formData, judul_acara: e.target.value })}
                      required
                      placeholder="Contoh: Kunjungan Wisata Candi Borobudur"
                      className="text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Jam Mulai</Label>
                      <Input
                        type="time"
                        value={formData.jam_mulai}
                        onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                        required
                        className="text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Jam Selesai</Label>
                      <Input
                        type="time"
                        value={formData.jam_selesai}
                        onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                        required
                        className="text-xs font-semibold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Catatan / Detail Kegiatan (Opsional)</Label>
                    <Textarea
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      placeholder="Informasi dress code, parkir bus, tiket masuk, atau briefing..."
                      className="text-xs"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} className="h-9 text-xs">
                      Batal
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs px-4">
                      Simpan Jadwal
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!hasRundown ? (
        <Card className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-none">
          <CardContent className="py-10 px-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mx-auto text-blue-600 border border-blue-200 dark:border-blue-800 shadow-2xs">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <p className="font-black text-sm text-slate-900 dark:text-white">
                Belum ada jadwal acara untuk trip ini
              </p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                {tripName || "Trip aktif"}{tripDestination ? ` (${tripDestination})` : ""}{tripDate ? ` • ${tripDate}` : ""}
              </p>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Tambahkan kegiatan satu per satu atau gunakan fitur impor otomatis dari file Word rundown.
            </p>
            {canEditRundown && (
              <div className="flex items-center justify-center gap-3 pt-3">
                <Button
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                  className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 shadow-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Tambah Manual
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWordImportDialog(true)}
                  className="h-9 text-xs rounded-xl border-slate-300 font-bold px-4 shadow-2xs"
                >
                  <FileText className="w-4 h-4 mr-1.5 text-blue-600" />
                  Impor Dokumen Word
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedRundown).map(([day, items]) => (
          <Card key={day} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/90 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-black">
                  {day}
                </span>
                <span>Hari Ke-{day}</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {items.length} Agenda
              </span>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl transition-all hover:border-blue-400">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-black inline-flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 text-xs font-black font-mono">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>{item.jam_mulai.substring(0, 5)} - {item.jam_selesai.substring(0, 5)} WIB</span>
                    </div>
                    <p className="font-black text-sm text-slate-900 dark:text-white mt-1.5 break-words">{item.judul_acara}</p>
                    {item.keterangan && (
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line break-words leading-relaxed">
                        {item.keterangan}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {(canInputPettyCash || canSeeFinancials) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-slate-300 rounded-lg hover:bg-slate-200"
                        title="Catat Kas Cepat"
                        onClick={() => {
                          setSelectedRundown(item.id);
                          setTransactionForm({ ...transactionForm, keterangan: item.judul_acara, jenis: "pengeluaran" });
                          setShowTransactionDialog(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                      </Button>
                    )}
                    {canEditRundown && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Hapus Agenda"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Tambah Transaksi Kas Cepat dari Rundown</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTransaction} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Keterangan Biaya / Pembayaran</Label>
              <Input
                value={transactionForm.keterangan}
                onChange={(e) => setTransactionForm({ ...transactionForm, keterangan: e.target.value })}
                required
                placeholder="Contoh: Tiket Masuk Objek Wisata, Parkir Bus"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Jenis Transaksi</Label>
              <Select
                value={canSeeFinancials ? transactionForm.jenis : "pengeluaran"}
                onValueChange={(value) => setTransactionForm({ ...transactionForm, jenis: value })}
                disabled={!canSeeFinancials}
              >
                <SelectTrigger className="text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canSeeFinancials && <SelectItem value="pemasukan">Pemasukan (Uang Diterima)</SelectItem>}
                  <SelectItem value="pengeluaran">Pengeluaran (Operasional Lapangan)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nominal (Rupiah)</Label>
              <RupiahInput
                label=""
                value={transactionForm.jumlah}
                onChange={(value) => setTransactionForm({ ...transactionForm, jumlah: value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowTransactionDialog(false)} className="h-9 text-xs">
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs px-4">
                Simpan Transaksi
              </Button>
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
