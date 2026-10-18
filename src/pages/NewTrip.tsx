import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthGuard from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormField from "@/components/FormField";
import { RupiahInput } from "@/components/RupiahInput";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, Bus, Calendar, MapPin, User } from "lucide-react";
import { toast } from "sonner";

const NewTrip = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [budgetFormatted, setBudgetFormatted] = useState("");
  const [formData, setFormData] = useState({
    nama_trip: "",
    tanggal: "",
    tanggal_selesai: "",
    tujuan: "",
    catatan: "",
    nama_kendaraan: "",
    jumlah_penumpang: "",
    nomor_polisi: "",
    nama_driver: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    console.log("Submitting trip:", formData);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const budgetNumber = budgetFormatted ? Number(budgetFormatted.replace(/\./g, "").replace(/,/g, ".")) : null;

      const { data, error } = await supabase
        .from("trips")
        .insert({
          nama_trip: formData.nama_trip,
          tanggal: formData.tanggal,
          tanggal_selesai: formData.tanggal_selesai || null,
          tujuan: formData.tujuan,
          catatan: formData.catatan || null,
          nama_kendaraan: formData.nama_kendaraan || null,
          jumlah_penumpang: formData.jumlah_penumpang ? parseInt(formData.jumlah_penumpang) : null,
          budget_estimasi: budgetNumber,
          nomor_polisi: formData.nomor_polisi?.toUpperCase() || null,
          nama_driver: formData.nama_driver || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Trip berhasil ditambahkan!");
      
      // Navigate to trip detail page with planning tab
      if (data) {
        navigate(`/trips/${data.id}`, { state: { activeTab: 'planning' } });
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal menambahkan trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top">
        <div className="max-w-lg mx-auto p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/trips")}
            className="mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <h1 className="text-2xl font-bold mb-2">Tambah Trip Baru</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Isi informasi trip. Field dengan tanda <span className="text-destructive">*</span> wajib diisi
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Informasi Wajib */}
            <div className="ios-card p-5">
              <h3 className="font-semibold text-sm text-primary mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Informasi Wajib
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nama_trip" className="flex items-center gap-2">
                    Nama Trip <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nama_trip"
                    value={formData.nama_trip}
                    onChange={(e) => setFormData({ ...formData, nama_trip: e.target.value })}
                    placeholder="Contoh: Trip Jakarta - Bandung"
                    required
                    className="mt-1 border-2"
                  />
                </div>

                <div>
                  <Label htmlFor="tanggal" className="flex items-center gap-2">
                    Tanggal Mulai <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    required
                    className="mt-1 border-2"
                  />
                </div>

                <div>
                  <Label htmlFor="tanggal_selesai" className="flex items-center gap-2">
                    Tanggal Selesai <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Opsional</span>
                  </Label>
                  <Input
                    id="tanggal_selesai"
                    type="date"
                    value={formData.tanggal_selesai}
                    onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                    className="mt-1 border-2"
                  />
                </div>

                <div>
                  <Label htmlFor="tujuan" className="flex items-center gap-2">
                    Tujuan <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tujuan"
                    value={formData.tujuan}
                    onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
                    placeholder="Contoh: Bandung"
                    required
                    className="mt-1 border-2"
                  />
                </div>
              </div>
            </div>

            {/* Detail Kendaraan (Collapsible) */}
            <Collapsible open={showVehicleDetails} onOpenChange={setShowVehicleDetails}>
              <div className="ios-card p-5">
                <CollapsibleTrigger className="w-full flex items-center justify-between group">
                  <h3 className="font-semibold text-sm text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                    <Bus className="w-4 h-4" />
                    Detail Kendaraan <span className="text-xs bg-muted px-2 py-0.5 rounded-full ml-2">Opsional</span>
                  </h3>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showVehicleDetails ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-4 mt-4">
                  <FormField
                    label="Nama Kendaraan/Bus"
                    value={formData.nama_kendaraan}
                    onChange={(value) => setFormData({ ...formData, nama_kendaraan: value })}
                    placeholder="Contoh: Bus Pariwisata Eka"
                    helpText="Simpan nama kendaraan untuk referensi cepat"
                    icon={<Bus className="w-4 h-4" />}
                  />

                  <div>
                    <Label htmlFor="nomor_polisi">Nomor Polisi</Label>
                    <Input
                      id="nomor_polisi"
                      value={formData.nomor_polisi}
                      onChange={(e) => setFormData({ ...formData, nomor_polisi: e.target.value.toUpperCase() })}
                      placeholder="B 1234 ABC"
                      style={{ textTransform: 'uppercase' }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Berguna untuk dokumentasi dan laporan</p>
                  </div>

                  <FormField
                    label="Nama Driver"
                    value={formData.nama_driver}
                    onChange={(value) => setFormData({ ...formData, nama_driver: value })}
                    placeholder="Contoh: Budi Santoso"
                    helpText="Simpan nama driver untuk koordinasi"
                    icon={<User className="w-4 h-4" />}
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Informasi Tambahan (Collapsible) */}
            <Collapsible open={showAdditionalInfo} onOpenChange={setShowAdditionalInfo}>
              <div className="ios-card p-5">
                <CollapsibleTrigger className="w-full flex items-center justify-between group">
                  <h3 className="font-semibold text-sm text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Informasi Tambahan <span className="text-xs bg-muted px-2 py-0.5 rounded-full ml-2">Opsional</span>
                  </h3>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdditionalInfo ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-4 mt-4">
                  <FormField
                    label="Jumlah Penumpang"
                    value={formData.jumlah_penumpang}
                    onChange={(value) => setFormData({ ...formData, jumlah_penumpang: value })}
                    type="number"
                    placeholder="Contoh: 40"
                    helpText="Membantu perencanaan kapasitas dan biaya per orang"
                  />

                  <RupiahInput
                    label="Budget Estimasi"
                    value={budgetFormatted}
                    onChange={setBudgetFormatted}
                    placeholder="0"
                    id="budget_estimasi"
                  />
                  <p className="text-xs text-muted-foreground -mt-3">Untuk tracking budget vs pengeluaran aktual</p>

                  <FormField
                    label="Catatan"
                    value={formData.catatan}
                    onChange={(value) => setFormData({ ...formData, catatan: value })}
                    type="textarea"
                    placeholder="Tambahkan catatan trip..."
                    rows={3}
                    helpText="Catatan khusus atau informasi penting lainnya"
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>

            <Button
              type="submit"
              className="w-full gradient-primary text-white font-semibold"
              disabled={loading}
            >
              {loading ? "Menyimpan..." : "Simpan Trip"}
            </Button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
};

export default NewTrip;
