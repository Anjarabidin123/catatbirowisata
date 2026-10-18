import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

interface Destination {
  id: string;
  nama_destinasi: string;
  deskripsi: string;
  kategori: string;
  lokasi: string;
  durasi_standar: number;
  estimasi_biaya: number;
}

const SelectDestinations = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tripId = location.state?.tripId;
  
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tripId) {
      navigate("/trips");
      return;
    }
    loadDestinations();
  }, [tripId]);

  const loadDestinations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .eq("user_id", user.id)
        .order("nama_destinasi");

      if (error) throw error;
      setDestinations(data || []);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal memuat destinasi");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      toast.error("Pilih minimal 1 destinasi");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const insertData = selected.map((destId, index) => ({
        trip_id: tripId,
        destination_id: destId,
        user_id: user.id,
        hari_ke: 1,
        urutan: index,
      }));

      const { error } = await supabase
        .from("trip_destinations")
        .insert(insertData);

      if (error) throw error;

      toast.success(`${selected.length} destinasi berhasil ditambahkan`);
      navigate(`/trips/${tripId}`, { state: { activeTab: 'planning' } });
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menyimpan destinasi");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryColor = (kategori: string) => {
    const colors: Record<string, string> = {
      wisata: "bg-blue-500/10 text-blue-500",
      kuliner: "bg-orange-500/10 text-orange-500",
      belanja: "bg-purple-500/10 text-purple-500",
      sejarah: "bg-amber-500/10 text-amber-500",
      hiburan: "bg-pink-500/10 text-pink-500",
      religi: "bg-green-500/10 text-green-500",
    };
    return colors[kategori] || "bg-gray-500/10 text-gray-500";
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/trips/${tripId}`)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold">Pilih Destinasi</h1>
            </div>
            <Button
              className="gradient-primary text-white"
              onClick={handleSave}
              disabled={saving || selected.length === 0}
            >
              <Check className="w-4 h-4 mr-2" />
              Simpan ({selected.length})
            </Button>
          </div>

          {destinations.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Belum ada destinasi tersedia
              </p>
              <Button
                onClick={() => navigate("/destinations")}
                className="gradient-primary text-white"
              >
                Buat Destinasi Baru
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {destinations.map((dest) => (
                <Card
                  key={dest.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selected.includes(dest.id) ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => toggleSelection(dest.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selected.includes(dest.id)}
                      onCheckedChange={() => toggleSelection(dest.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{dest.nama_destinasi}</h3>
                        <Badge className={getCategoryColor(dest.kategori)}>
                          {dest.kategori}
                        </Badge>
                      </div>
                      
                      {dest.deskripsi && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {dest.deskripsi}
                        </p>
                      )}

                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {dest.lokasi}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dest.durasi_standar} menit
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default SelectDestinations;