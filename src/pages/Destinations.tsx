import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import DestinationDialog from "@/components/DestinationDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, MapPin, Clock, DollarSign } from "lucide-react";
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

const Destinations = () => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<Destination | undefined>();

  useEffect(() => {
    loadDestinations();

    // Realtime subscription for destinations
    const channel = supabase
      .channel("destinations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "destinations" },
        () => loadDestinations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDestinations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDestinations(data || []);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal memuat destinasi");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (destination: Destination) => {
    setSelectedDestination(destination);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedDestination(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus destinasi ini?")) return;

    try {
      const { error } = await supabase
        .from("destinations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Destinasi berhasil dihapus");
      loadDestinations();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menghapus destinasi");
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

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
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
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold">Destinasi Wisata</h1>
            </div>
            <Button
              className="gradient-primary text-white"
              onClick={handleAdd}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </div>

          {destinations.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Belum ada destinasi</p>
              <Button onClick={handleAdd} className="gradient-primary text-white">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Destinasi
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {destinations.map((dest) => (
                <Card key={dest.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{dest.nama_destinasi}</h3>
                      <Badge className={getCategoryColor(dest.kategori)}>
                        {dest.kategori.charAt(0).toUpperCase() + dest.kategori.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(dest)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(dest.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {dest.deskripsi && (
                    <p className="text-sm text-muted-foreground mb-3">{dest.deskripsi}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {dest.lokasi}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {dest.durasi_standar} menit
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {formatRupiah(dest.estimasi_biaya)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DestinationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          destination={selectedDestination}
          onSuccess={loadDestinations}
        />

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default Destinations;