import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RupiahInput } from "@/components/RupiahInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, UserPlus } from "lucide-react";
import { AddCrewDialog } from "./AddCrewDialog";
import { useRole } from "@/contexts/RoleContext";
import { logCrewActivity, assignTripToMultipleCrewDB } from "@/utils/rbacAuditLogger";

interface Trip {
  id: string;
  nama_trip: string;
  tanggal: string;
  tujuan: string;
  nama_kendaraan?: string;
  nomor_polisi?: string;
  nama_driver?: string;
  tanggal_selesai?: string;
  jumlah_penumpang?: number;
  budget_estimasi?: number;
  catatan?: string;
}

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  onSuccess: () => void;
}

export const EditTripDialog = ({ open, onOpenChange, trip, onSuccess }: EditTripDialogProps) => {
  const { hasPermission, crewList, isPemilik } = useRole();
  const canSeeFinancials = hasPermission("rule_buku_kas_laba");
  const [formData, setFormData] = useState({
    nama_trip: "",
    tanggal: "",
    tujuan: "",
    nama_kendaraan: "",
    nomor_polisi: "",
    nama_driver: "",
    tanggal_selesai: "",
    jumlah_penumpang: "",
    budget_estimasi: "",
    catatan: "",
  });
  const [budgetFormatted, setBudgetFormatted] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);
  const [showAddCrewModal, setShowAddCrewModal] = useState(false);

  useEffect(() => {
    if (trip && open) {
      setFormData({
        nama_trip: trip.nama_trip || "",
        tanggal: trip.tanggal || "",
        tujuan: trip.tujuan || "",
        nama_kendaraan: trip.nama_kendaraan || "",
        nomor_polisi: trip.nomor_polisi || "",
        nama_driver: trip.nama_driver || "",
        tanggal_selesai: trip.tanggal_selesai || "",
        jumlah_penumpang: trip.jumlah_penumpang?.toString() || "",
        budget_estimasi: trip.budget_estimasi?.toString() || "",
        catatan: trip.catatan || "",
      });
      setBudgetFormatted(trip.budget_estimasi?.toString() || "");

      // Inisialisasi kru yang ditugaskan ke trip ini
      const initialSelected = crewList
        .filter((c) => {
          if (c.assignedTripIds && c.assignedTripIds.includes(trip.id)) return true;
          if (
            c.assignedTrip &&
            (trip.nama_trip.toLowerCase().includes(c.assignedTrip.toLowerCase()) ||
              c.assignedTrip.toLowerCase().includes(trip.nama_trip.toLowerCase()))
          ) {
            return true;
          }
          return false;
        })
        .map((c) => c.id);
      setSelectedCrewIds(initialSelected);
    }
  }, [trip, open, crewList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const budgetNumber = budgetFormatted ? Number(budgetFormatted.replace(/\./g, "").replace(/,/g, ".")) : null;
      
      const { error } = await supabase
        .from("trips")
        .update({
          nama_trip: formData.nama_trip,
          tanggal: formData.tanggal,
          tujuan: formData.tujuan,
          nama_kendaraan: formData.nama_kendaraan || null,
          nomor_polisi: formData.nomor_polisi?.toUpperCase() || null,
          nama_driver: formData.nama_driver || null,
          tanggal_selesai: formData.tanggal_selesai || null,
          jumlah_penumpang: formData.jumlah_penumpang ? parseInt(formData.jumlah_penumpang) : null,
          budget_estimasi: canSeeFinancials ? budgetNumber : trip.budget_estimasi ?? null,
          catatan: formData.catatan || null,
        })
        .eq("id", trip.id);

      if (error) throw error;

      // Update penugasan kru ke trip ini di database
      if (isPemilik) {
        await assignTripToMultipleCrewDB(trip.id, formData.nama_trip, selectedCrewIds);
      }

      logCrewActivity({
        actionType: "system",
        actionTitle: "Memperbarui Data Trip",
        actionDetail: `Memperbarui detail trip "${formData.nama_trip}" tujuan ${formData.tujuan}`,
        tripName: formData.nama_trip,
      });

      toast.success("Trip berhasil diperbarui");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal memperbarui trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nama_trip">Nama Trip</Label>
            <Input
              id="nama_trip"
              value={formData.nama_trip}
              onChange={(e) => setFormData({ ...formData, nama_trip: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="tanggal">Tanggal Mulai</Label>
            <Input
              id="tanggal"
              type="date"
              value={formData.tanggal}
              onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="tujuan">Tujuan</Label>
            <Input
              id="tujuan"
              value={formData.tujuan}
              onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="nama_kendaraan">Nama Kendaraan (Opsional)</Label>
            <Input
              id="nama_kendaraan"
              value={formData.nama_kendaraan}
              onChange={(e) => setFormData({ ...formData, nama_kendaraan: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="nomor_polisi">Nomor Polisi (Opsional)</Label>
            <Input
              id="nomor_polisi"
              value={formData.nomor_polisi}
              onChange={(e) => setFormData({ ...formData, nomor_polisi: e.target.value.toUpperCase() })}
              placeholder="B 1234 ABC"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div>
            <Label htmlFor="nama_driver" className="flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Nama Kru (Opsional)
            </Label>
            <Textarea
              id="nama_driver"
              value={formData.nama_driver}
              onChange={(e) => setFormData({ ...formData, nama_driver: e.target.value })}
              placeholder={"Contoh:\nPak Joko (Driver 1)\nPak Agus (Driver 2)\nMas Budi (Tour Leader)"}
              rows={3}
              enterKeyHint="enter"
              className="mt-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              💡 Simpan nama kru untuk koordinasi lapangan. Tekan Enter untuk menambah baris kru baru.
            </p>
          </div>

          <div>
            <Label htmlFor="tanggal_selesai">Tanggal Selesai (Opsional)</Label>
            <Input
              id="tanggal_selesai"
              type="date"
              value={formData.tanggal_selesai}
              onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="jumlah_penumpang">Jumlah Penumpang (Opsional)</Label>
            <Input
              id="jumlah_penumpang"
              type="number"
              value={formData.jumlah_penumpang}
              onChange={(e) => setFormData({ ...formData, jumlah_penumpang: e.target.value })}
            />
          </div>

          {canSeeFinancials && (
            <div>
              <RupiahInput
                label="Budget Estimasi (Opsional)"
                value={budgetFormatted}
                onChange={setBudgetFormatted}
                placeholder="0"
                id="budget_estimasi"
              />
            </div>
          )}

          <div>
            <Label htmlFor="catatan">Catatan (Opsional)</Label>
            <Textarea
              id="catatan"
              value={formData.catatan}
              onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
            />
          </div>

          {/* Atur Penugasan Kru / Tour Leader ke Trip Ini */}
          {isPemilik && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Atur Tour Leader & Kru Bertugas
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddCrewModal(true)}
                    className="h-6 px-2 text-[10px] font-semibold text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 gap-1 rounded-md"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ Tambah TL</span>
                  </Button>
                  <span className="text-[11px] text-blue-600 font-semibold">
                  {selectedCrewIds.length} kru dipilih
                </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                {crewList.map((crew) => {
                  const isChecked = selectedCrewIds.includes(crew.id);
                  return (
                    <label
                      key={crew.id}
                      className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-blue-50 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700 font-semibold text-blue-900 dark:text-blue-200"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedCrewIds((prev) =>
                            prev.includes(crew.id)
                              ? prev.filter((id) => id !== crew.id)
                              : [...prev, crew.id]
                          );
                        }}
                        className="rounded text-blue-600 w-3.5 h-3.5"
                      />
                      <div className="truncate">
                        <div>{crew.nama}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {crew.jabatan}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400">
                Hanya kru yang dicentang yang akan melihat trip ini di akun mereka. Kru lain tidak akan dapat mengaksesnya.
              </p>
            </div>
          )}

          <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </form>
        <AddCrewDialog
          open={showAddCrewModal}
          onOpenChange={setShowAddCrewModal}
          defaultJabatan="Tour Leader"
          defaultTripName={formData.nama_trip || trip.nama_trip}
          defaultTripId={trip.id}
          onCrewAdded={(newCrew) => {
            setSelectedCrewIds((prev) => [...prev, newCrew.id]);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
