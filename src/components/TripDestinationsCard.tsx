import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DestinationNote {
  destinasi_1: string;
  destinasi_2?: string;
  destinasi_3?: string;
  destinasi_4?: string;
  destinasi_5?: string;
  destinasi_6?: string;
}

interface TripDestinationsCardProps {
  tripId: string;
  tripName: string;
}

export const TripDestinationsCard = ({ tripId, tripName }: TripDestinationsCardProps) => {
  const [note, setNote] = useState<DestinationNote>({ destinasi_1: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<DestinationNote>({ destinasi_1: "" });

  useEffect(() => {
    loadNote();

    // Realtime subscription for trip destination notes
    const channel = supabase
      .channel(`trip-destination-notes-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_destination_notes", filter: `trip_id=eq.${tripId}` },
        () => loadNote()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const loadNote = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trip_destination_notes")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setNote({
          destinasi_1: data.destinasi_1 || "",
          destinasi_2: data.destinasi_2 || "",
          destinasi_3: data.destinasi_3 || "",
          destinasi_4: data.destinasi_4 || "",
          destinasi_5: data.destinasi_5 || "",
          destinasi_6: data.destinasi_6 || "",
        });
        setFormData({
          destinasi_1: data.destinasi_1 || "",
          destinasi_2: data.destinasi_2 || "",
          destinasi_3: data.destinasi_3 || "",
          destinasi_4: data.destinasi_4 || "",
          destinasi_5: data.destinasi_5 || "",
          destinasi_6: data.destinasi_6 || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading note:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: existing } = await supabase
        .from("trip_destination_notes")
        .select("id")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("trip_destination_notes")
          .update({
            destinasi_1: formData.destinasi_1,
            destinasi_2: formData.destinasi_2 || null,
            destinasi_3: formData.destinasi_3 || null,
            destinasi_4: formData.destinasi_4 || null,
            destinasi_5: formData.destinasi_5 || null,
            destinasi_6: formData.destinasi_6 || null,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("trip_destination_notes").insert({
          trip_id: tripId,
          user_id: user.id,
          destinasi_1: formData.destinasi_1,
          destinasi_2: formData.destinasi_2 || null,
          destinasi_3: formData.destinasi_3 || null,
          destinasi_4: formData.destinasi_4 || null,
          destinasi_5: formData.destinasi_5 || null,
          destinasi_6: formData.destinasi_6 || null,
        });

        if (error) throw error;
      }

      toast.success("Catatan destinasi berhasil disimpan");
      setDialogOpen(false);
      loadNote();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menyimpan catatan destinasi");
    }
  };

  const destinasiArray = [
    note.destinasi_1,
    note.destinasi_2,
    note.destinasi_3,
    note.destinasi_4,
    note.destinasi_5,
    note.destinasi_6,
  ].filter(Boolean);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Catatan Destinasi</h3>
          <p className="text-sm text-muted-foreground">
            {destinasiArray.length > 0
              ? `${destinasiArray.length} destinasi tercatat`
              : "Belum ada catatan destinasi"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Daftar Destinasi</h4>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Catatan Destinasi</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label>Destinasi 1 (Wajib)</Label>
                  <Input
                    value={formData.destinasi_1}
                    onChange={(e) =>
                      setFormData({ ...formData, destinasi_1: e.target.value })
                    }
                    placeholder="Nama destinasi"
                    required
                  />
                </div>

                {[2, 3, 4, 5, 6].map((num) => (
                  <div key={num}>
                    <Label>Destinasi {num} (Opsional)</Label>
                    <Input
                      value={formData[`destinasi_${num}` as keyof DestinationNote] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [`destinasi_${num}`]: e.target.value,
                        })
                      }
                      placeholder="Nama destinasi"
                    />
                  </div>
                ))}

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
        ) : destinasiArray.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Belum ada destinasi tercatat
          </p>
        ) : (
          <div className="space-y-2">
            {destinasiArray.map((dest, idx) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground">
                  Destinasi {idx + 1}
                </span>
                <p className="text-sm font-medium mt-1">{dest}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
