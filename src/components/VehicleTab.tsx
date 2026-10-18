import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Bus } from "lucide-react";
import { toast } from "sonner";
import { RupiahInput } from "./RupiahInput";

interface Vehicle {
  id: string;
  nama_po: string;
  harga_per_bus: number;
  dp: number;
  jumlah_penumpang_per_bus: number;
  cashback?: number;
}

interface VehicleTabProps {
  tripId: string;
}

export const VehicleTab = ({ tripId }: VehicleTabProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    nama_po: "",
    harga_per_bus: "",
    dp: "",
    jumlah_penumpang_per_bus: "",
    cashback: "",
  });

  useEffect(() => {
    loadVehicles();

    const channel = supabase
      .channel(`vehicles-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_vehicles", filter: `trip_id=eq.${tripId}` },
        () => loadVehicles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const loadVehicles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trip_vehicles")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        // Handle missing table gracefully
        if (error.code === "PGRST205" || error.code === "42P01") {
          console.warn("Table trip_vehicles not found, skipping...");
          setVehicles([]);
        } else {
          throw error;
        }
      } else {
        setVehicles(data || []);
      }
    } catch (error: any) {
      console.error("Error loading vehicles:", error);
      // Don't show toast for missing table
      if (error.code !== "PGRST205" && error.code !== "42P01") {
        toast.error("Gagal memuat data kendaraan");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const vehicleData = {
        trip_id: tripId,
        user_id: user.id,
        nama_po: formData.nama_po,
        harga_per_bus: Number(formData.harga_per_bus.replace(/\./g, "").replace(/,/g, ".")) || 0,
        dp: Number(formData.dp.replace(/\./g, "").replace(/,/g, ".")) || 0,
        jumlah_penumpang_per_bus: Number(formData.jumlah_penumpang_per_bus) || 0,
        cashback: formData.cashback ? Number(formData.cashback.replace(/\./g, "").replace(/,/g, ".")) : null,
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from("trip_vehicles")
          .update(vehicleData)
          .eq("id", editingVehicle.id);

        if (error) throw error;
        toast.success("Kendaraan berhasil diupdate");
      } else {
        const { error } = await supabase
          .from("trip_vehicles")
          .insert(vehicleData);

        if (error) throw error;
        toast.success("Kendaraan berhasil ditambahkan");
      }

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving vehicle:", error);
      toast.error("Gagal menyimpan data kendaraan");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      nama_po: vehicle.nama_po,
      harga_per_bus: vehicle.harga_per_bus.toString(),
      dp: vehicle.dp.toString(),
      jumlah_penumpang_per_bus: vehicle.jumlah_penumpang_per_bus.toString(),
      cashback: vehicle.cashback ? vehicle.cashback.toString() : "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data kendaraan ini?")) return;

    try {
      const { error } = await supabase
        .from("trip_vehicles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Kendaraan berhasil dihapus");
    } catch (error: any) {
      console.error("Error deleting vehicle:", error);
      toast.error("Gagal menghapus kendaraan");
    }
  };

  const resetForm = () => {
    setFormData({
      nama_po: "",
      harga_per_bus: "",
      dp: "",
      jumlah_penumpang_per_bus: "",
      cashback: "",
    });
    setEditingVehicle(null);
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalBuses = vehicles.length;
  const totalCost = vehicles.reduce((sum, v) => sum + v.harga_per_bus, 0);
  const totalDP = vehicles.reduce((sum, v) => sum + v.dp, 0);
  const totalPassengers = vehicles.reduce((sum, v) => sum + v.jumlah_penumpang_per_bus, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kendaraan</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Bus
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVehicle ? "Edit" : "Tambah"} Kendaraan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama PO</Label>
                <Input
                  value={formData.nama_po}
                  onChange={(e) => setFormData({ ...formData, nama_po: e.target.value })}
                  placeholder="Contoh: PO Rosalia Indah"
                  required
                />
              </div>
              <div>
                <Label>Harga per Bus</Label>
                <RupiahInput
                  label=""
                  value={formData.harga_per_bus}
                  onChange={(value) => setFormData({ ...formData, harga_per_bus: value })}
                />
              </div>
              <div>
                <Label>DP (Down Payment)</Label>
                <RupiahInput
                  label=""
                  value={formData.dp}
                  onChange={(value) => setFormData({ ...formData, dp: value })}
                />
              </div>
              <div>
                <Label>Jumlah Penumpang </Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.jumlah_penumpang_per_bus}
                  onChange={(e) => setFormData({ ...formData, jumlah_penumpang_per_bus: e.target.value })}
                  placeholder="Contoh: 200"
                  required
                />
              </div>
              <div>
                <Label>Cashback (opsional)</Label>
                <RupiahInput
                  label=""
                  value={formData.cashback}
                  onChange={(value) => setFormData({ ...formData, cashback: value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  Batal
                </Button>
                <Button type="submit" disabled={loading}>Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      {vehicles.length > 0 && (
        <Card className="p-4 bg-primary/5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Total Bus</p>
              <p className="font-semibold">{totalBuses} unit</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total Penumpang</p>
              <p className="font-semibold">{totalPassengers} orang</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total Harga</p>
              <p className="font-semibold">{formatRupiah(totalCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total DP</p>
              <p className="font-semibold">{formatRupiah(totalDP)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Vehicle List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <Card className="p-8 text-center">
          <Bus className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Belum ada kendaraan</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {vehicles.map((vehicle, index) => (
            <Card key={vehicle.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bus className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">Bus {index + 1}</h3>
                    <p className="text-sm text-muted-foreground">{vehicle.nama_po}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(vehicle)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(vehicle.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/30 rounded">
                  <p className="text-muted-foreground text-[10px]">Harga per Bus</p>
                  <p className="font-semibold text-xs">{formatRupiah(vehicle.harga_per_bus)}</p>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <p className="text-muted-foreground text-[10px]">Penumpang</p>
                  <p className="font-semibold text-xs">{vehicle.jumlah_penumpang_per_bus} orang</p>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <p className="text-muted-foreground text-[10px]">DP</p>
                  <p className="font-semibold text-xs">{formatRupiah(vehicle.dp)}</p>
                </div>
                {vehicle.cashback ? (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <p className="text-muted-foreground text-[10px]">Cashback</p>
                    <p className="font-semibold text-xs text-blue-600">{formatRupiah(vehicle.cashback)}</p>
                  </div>
                ) : (
                  <div className="p-2 bg-muted/30 rounded opacity-50">
                    <p className="text-muted-foreground text-[10px]">Cashback</p>
                    <p className="font-semibold text-xs">-</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
