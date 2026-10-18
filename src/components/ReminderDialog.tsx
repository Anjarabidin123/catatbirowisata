import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Check, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Reminder {
  id: string;
  judul: string;
  keterangan: string | null;
  tanggal_waktu: string;
  is_done: boolean;
  trip_id: string | null;
  trips?: { nama_trip: string } | null;
}

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReminderDialog = ({ open, onOpenChange }: ReminderDialogProps) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    judul: "",
    keterangan: "",
    tanggal: "",
    waktu: "",
    trip_id: "",
  });

  useEffect(() => {
    // Load reminders on mount and when dialog opens
    loadReminders();
    if (open) {
      loadTrips();
    }

    // Realtime subscription for reminders
    const channel = supabase
      .channel("reminders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminders" },
        () => loadReminders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open]);

  useEffect(() => {
    // Check for due reminders every minute
    const checkReminders = () => {
      const now = new Date();
      reminders.forEach((reminder) => {
        if (!reminder.is_done) {
          const reminderTime = new Date(reminder.tanggal_waktu);
          const diffMinutes = Math.floor((reminderTime.getTime() - now.getTime()) / 60000);

          // Notify 5 minutes before or if time has passed
          if (diffMinutes <= 5 && diffMinutes >= -1) {
            if (Notification.permission === "granted") {
              new Notification("🔔 Pengingat Malika Tour", {
                body: `${reminder.judul}${reminder.trips ? ` - ${reminder.trips.nama_trip}` : ""}`,
                icon: "/favicon.ico",
                tag: reminder.id, // Prevent duplicate notifications
              });
            }
          }
        }
      });
    };

    if (reminders.length > 0) {
      checkReminders();
      const interval = setInterval(checkReminders, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [reminders]);

  const loadReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("reminders")
        .select(`*, trips (nama_trip)`)
        .eq("user_id", user.id)
        .order("tanggal_waktu", { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error: any) {
      console.error("Error loading reminders:", error);
    }
  };

  const loadTrips = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trips")
        .select("id, nama_trip")
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error: any) {
      console.error("Error loading trips:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const tanggalWaktu = `${formData.tanggal}T${formData.waktu}:00`;

      const { error } = await supabase.from("reminders").insert({
        user_id: user.id,
        judul: formData.judul,
        keterangan: formData.keterangan || null,
        tanggal_waktu: tanggalWaktu,
        trip_id: formData.trip_id || null,
      });

      if (error) throw error;

      toast.success("Reminder berhasil ditambahkan!");
      setFormData({ judul: "", keterangan: "", tanggal: "", waktu: "", trip_id: "" });
      setShowForm(false);
      loadReminders();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menambahkan reminder");
    } finally {
      setLoading(false);
    }
  };

  const toggleDone = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("reminders")
        .update({ is_done: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      loadReminders();
      toast.success(currentStatus ? "Reminder dibuka kembali" : "Reminder selesai!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal mengupdate reminder");
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
      loadReminders();
      toast.success("Reminder dihapus!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus reminder");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Reminder
          </DialogTitle>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            <Button
              onClick={() => setShowForm(true)}
              className="w-full gradient-primary text-white"
            >
              + Tambah Reminder
            </Button>

            {reminders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Belum ada reminder
              </p>
            ) : (
              <div className="space-y-2">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`ios-card p-3 ${reminder.is_done ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className={`font-medium ${reminder.is_done ? "line-through" : ""}`}>
                          {reminder.judul}
                        </h4>
                        {reminder.keterangan && (
                          <p className="text-sm text-muted-foreground">
                            {reminder.keterangan}
                          </p>
                        )}
                        {reminder.trips && (
                          <p className="text-xs text-primary mt-1">
                            📍 {reminder.trips.nama_trip}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(reminder.tanggal_waktu), "dd MMM yyyy, HH:mm", {
                            locale: id,
                          })}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleDone(reminder.id, reminder.is_done)}
                          className="h-8 w-8"
                        >
                          <Check
                            className={`w-4 h-4 ${
                              reminder.is_done ? "text-green-600" : "text-muted-foreground"
                            }`}
                          />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteReminder(reminder.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="judul">Judul Reminder</Label>
              <Input
                id="judul"
                value={formData.judul}
                onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                placeholder="Contoh: Bayar sopir"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="trip">Trip (Opsional)</Label>
              <Select value={formData.trip_id || undefined} onValueChange={(value) => setFormData({ ...formData, trip_id: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih trip (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {trip.nama_trip}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tanggal">Tanggal</Label>
                <Input
                  id="tanggal"
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="waktu">Waktu</Label>
                <Input
                  id="waktu"
                  type="time"
                  value={formData.waktu}
                  onChange={(e) => setFormData({ ...formData, waktu: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="keterangan">
                Keterangan <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-2">Opsional</span>
              </Label>
              <Textarea
                id="keterangan"
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                placeholder="Detail reminder..."
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">💡 Tambahkan detail atau instruksi khusus untuk reminder ini</p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 gradient-primary text-white"
              >
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
