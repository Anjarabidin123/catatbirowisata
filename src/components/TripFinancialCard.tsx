import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RupiahInput } from "./RupiahInput";

interface FinancialNote {
  id: string;
  keterangan: string;
  jumlah: number;
  jenis: "pemasukan" | "pengeluaran";
  cashback?: number;
}

interface TripFinancialCardProps {
  tripId: string;
  tripName: string;
}

export const TripFinancialCard = ({ tripId, tripName }: TripFinancialCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState<FinancialNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [jenis, setJenis] = useState<"pemasukan" | "pengeluaran">("pengeluaran");
  const [cashback, setCashback] = useState("");
  const [hasCashback, setHasCashback] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadNotes();
    }
  }, [isExpanded, tripId]);

  const loadNotes = async () => {
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
      setNotes(data || []);
    } catch (error: any) {
      console.error("Error loading notes:", error);
      toast.error("Gagal memuat catatan keuangan");
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

      const { error } = await supabase.from("keuangan").insert({
        trip_id: tripId,
        user_id: user.id,
        jenis,
        jumlah: unformatRupiah(jumlah),
        keterangan,
        cashback: hasCashback ? unformatRupiah(cashback) : null,
        tanggal: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Catatan keuangan berhasil ditambahkan");
      setDialogOpen(false);
      resetForm();
      loadNotes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menambahkan catatan keuangan");
    }
  };

  const resetForm = () => {
    setKeterangan("");
    setJumlah("");
    setJenis("pengeluaran");
    setCashback("");
    setHasCashback(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan ini?")) return;

    try {
      const { error } = await supabase
        .from("keuangan")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Catatan berhasil dihapus");
      loadNotes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus catatan");
    }
  };

  const totalPemasukan = notes
    .filter((n) => n.jenis === "pemasukan")
    .reduce((sum, n) => sum + Number(n.jumlah), 0);

  const totalPengeluaran = notes
    .filter((n) => n.jenis === "pengeluaran")
    .reduce((sum, n) => sum + Number(n.jumlah), 0);

  const totalCashback = notes.reduce((sum, n) => sum + (Number(n.cashback) || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran;

  return (
    <Card className="p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="font-semibold">{tripName}</h3>
          <p className="text-sm text-muted-foreground">
            Klik untuk melihat detail keuangan
          </p>
        </div>
        {isExpanded ? <ChevronUp /> : <ChevronDown />}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Catatan Keuangan</h4>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-white">
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Catatan Keuangan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Jenis</Label>
                    <Select value={jenis} onValueChange={(v: any) => setJenis(v)}>
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
                    <Label>Keterangan</Label>
                    <Textarea
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Contoh: Kasih uang ke kepala sekolah"
                      required
                    />
                  </div>

                  <RupiahInput
                    label="Jumlah"
                    value={jumlah}
                    onChange={setJumlah}
                    required
                  />

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hasCashback"
                      checked={hasCashback}
                      onChange={(e) => setHasCashback(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="hasCashback">Ada Cashback?</Label>
                  </div>

                  {hasCashback && (
                    <RupiahInput
                      label="Cashback"
                      value={cashback}
                      onChange={setCashback}
                    />
                  )}

                  <Button type="submit" className="w-full gradient-primary text-white">
                    Simpan
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
            </div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada catatan keuangan
            </p>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          note.jenis === "pemasukan"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {note.jenis}
                      </span>
                      {note.cashback && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          💰 Cashback
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1">{note.keterangan}</p>
                    <p className="text-sm font-semibold mt-1">
                      {formatRupiah(Number(note.jumlah))}
                    </p>
                    {note.cashback && (
                      <p className="text-xs text-muted-foreground">
                        Cashback: {formatRupiah(Number(note.cashback))}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Pemasukan:</span>
              <span className="font-semibold text-green-600">
                {formatRupiah(totalPemasukan)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Pengeluaran:</span>
              <span className="font-semibold text-red-600">
                {formatRupiah(totalPengeluaran)}
              </span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Saldo:</span>
              <span className={saldo >= 0 ? "text-green-600" : "text-red-600"}>
                {formatRupiah(saldo)}
              </span>
            </div>
            {totalCashback > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t">
                <span>Total Cashback:</span>
                <span className="font-semibold text-blue-600">
                  {formatRupiah(totalCashback)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
