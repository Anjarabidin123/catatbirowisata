import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import AuthGuard from "@/components/AuthGuard";
import { RBACOwnerGuard } from "@/components/RBACOwnerGuard";
import { logCrewActivity, assignTripToMultipleCrewDB } from "@/utils/rbacAuditLogger";
import { useRole } from "@/contexts/RoleContext";
import { getCurrentEntitlements } from "@/utils/licenseEntitlement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormField from "@/components/FormField";
import { RupiahInput } from "@/components/RupiahInput";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, Bus, Calendar, MapPin, User, Users, Plus } from "lucide-react";
import { AddCrewDialog } from "@/components/AddCrewDialog";
import { toast } from "sonner";

const NewTrip = () => {
  const navigate = useNavigate();
  const { crewList } = useRole();
  const [loading, setLoading] = useState(false);
  const [showAddCrewModal, setShowAddCrewModal] = useState(false);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [budgetFormatted, setBudgetFormatted] = useState("");
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);
  const location = useLocation();
  const defaultDateFromState = (location.state as any)?.defaultDate || "";
  const [formData, setFormData] = useState({
    nama_trip: "",
    tanggal: defaultDateFromState,
    tanggal_selesai: defaultDateFromState,
    tujuan: "",
    jumlah_bus: "1",
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
      const user = await getActiveUser();
      if (!user) throw new Error("User not authenticated");

      // Verifikasi Kuota Trip Aktif Granular (Feature Gating)
      const entitlements = getCurrentEntitlements();
      const { count: currentTripCount } = await supabase
        .from("trips")
        .select("*", { count: "exact", head: true });

      if (typeof currentTripCount === "number" && currentTripCount >= entitlements.maxActiveTrips) {
        toast.error(
          `Batas kuota trip aktif (${entitlements.maxActiveTrips} trip) telah tercapai untuk biro ini. Hubungi Super Admin / Founder untuk menambah kuota.`
        );
        setLoading(false);
        return;
      }

      const budgetNumber = budgetFormatted ? Number(budgetFormatted.replace(/\./g, "").replace(/,/g, ".")) : null;
      const busCount = parseInt(formData.jumlah_bus, 10) || 1;
      const vehicleDisplay = formData.nama_kendaraan
        ? (busCount > 1 ? `${busCount} Bus • ${formData.nama_kendaraan}` : formData.nama_kendaraan)
        : (busCount > 1 ? `${busCount} Unit Bus` : null);

      const noteText = [
        busCount > 1 ? `Jumlah Armada: ${busCount} Bus` : null,
        formData.catatan
      ].filter(Boolean).join(" • ");

      const { data, error } = await supabase
        .from("trips")
        .insert({
          nama_trip: formData.nama_trip,
          tanggal: formData.tanggal,
          tanggal_selesai: formData.tanggal_selesai || null,
          tujuan: formData.tujuan,
          catatan: noteText || null,
          nama_kendaraan: vehicleDisplay,
          jumlah_penumpang: formData.jumlah_penumpang ? parseInt(formData.jumlah_penumpang) : null,
          budget_estimasi: budgetNumber,
          nomor_polisi: formData.nomor_polisi?.toUpperCase() || null,
          nama_driver: formData.nama_driver || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Tugaskan kru / TL terpilih ke trip baru ini
      if (data && selectedCrewIds.length > 0) {
        await assignTripToMultipleCrewDB(data.id, data.nama_trip, selectedCrewIds);
      }

      logCrewActivity({
        kategori: "operasional_trip",
        aksi: "Membuat Jadwal Trip Baru",
        detail: `Menambahkan trip baru "${formData.nama_trip}" (${busCount} Bus) tujuan ${formData.tujuan} (${formData.tanggal})`,
        tripName: formData.nama_trip,
      });

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
      <RBACOwnerGuard
        pageTitle="Pembuatan Jadwal Trip Baru"
        reason="Hanya Pemilik Biro (Owner) atau pengguna dengan hak akses manajemen trip yang dapat membuat jadwal keberangkatan baru."
        ruleId="rule_hapus_buat_trip"
      >
      <div className="min-h-screen bg-background pb-20 safe-top lg:pl-64">
        <div className="max-w-lg lg:max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
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
                    placeholder="Contoh: Study Tour SMPN 1 Bali, Gathering PT Maju"
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tujuan" className="flex items-center gap-2">
                      Tujuan / Destinasi <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <div className="mt-1 space-y-1.5">
                    <Input
                      id="tujuan"
                      value={formData.tujuan}
                      onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
                      placeholder="Contoh: Bali, Yogyakarta, Bromo & Malang..."
                      required
                      className="border-2 rounded-xl"
                    />
                  </div>
                </div>

                {/* Input Bawa Berapa Bis */}
                <div>
                  <Label htmlFor="jumlah_bus" className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-primary" />
                    Jumlah Armada Bus <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="jumlah_bus"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.jumlah_bus}
                    onChange={(e) => setFormData({ ...formData, jumlah_bus: e.target.value })}
                    placeholder="Berapa bus yang dibawa (contoh: 1, 2, atau 3)"
                    required
                    className="mt-1 border-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Bawa berapa bis untuk rombongan ini (default: 1 bus)
                  </p>
                </div>
              </div>
            </div>

            {/* Detail Kendaraan (Collapsible) */}
            <Collapsible open={showVehicleDetails} onOpenChange={setShowVehicleDetails}>
              <div className="ios-card p-5">
                <CollapsibleTrigger className="w-full flex items-center justify-between group">
                  <h3 className="font-semibold text-sm text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                    <Bus className="w-4 h-4" />
                    Detail Merek & Armada Kendaraan <span className="text-xs bg-muted px-2 py-0.5 rounded-full ml-2">Opsional</span>
                  </h3>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showVehicleDetails ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-4 mt-4">
                  <FormField
                    label="Merek / PO Bus"
                    value={formData.nama_kendaraan}
                    onChange={(value) => setFormData({ ...formData, nama_kendaraan: value })}
                    placeholder="Contoh: PO Subur Jaya SHD, PO Haryanto"
                    helpText="Merek atau nama PO bus rekanan (bisa dikosongkan jika belum ada)"
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
                    label="Nama Kru / Catatan Driver"
                    value={formData.nama_driver}
                    onChange={(value) => setFormData({ ...formData, nama_driver: value })}
                    type="textarea"
                    rows={3}
                    placeholder={"Contoh:\nPak Joko (Driver 1)\nPak Agus (Driver 2)\nMas Budi (Tour Leader)"}
                    helpText="Simpan nama kru (driver, TL, co-driver) untuk koordinasi. Tekan Enter untuk menambah baris kru baru."
                    icon={<Users className="w-4 h-4" />}
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

            {/* Atur Penugasan Tour Leader & Kru Bertugas */}
            <div className="ios-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-sm">
                    Hak Akses Tour Leader & Kru Bertugas
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddCrewModal(true)}
                    className="h-7 px-2 text-[11px] font-semibold text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 gap-1 rounded-lg"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Tambah TL Baru</span>
                  </Button>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {selectedCrewIds.length} kru dipilih
                </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Pilih siapa saja kru yang berhak mengakses trip ini. Kru yang tidak dipilih tidak akan melihat trip ini di akun mereka.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-44 overflow-y-auto">
                {crewList.map((crew) => {
                  const isChecked = selectedCrewIds.includes(crew.id);
                  return (
                    <label
                      key={crew.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700 font-semibold text-blue-900 dark:text-blue-200"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
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
                        className="rounded text-blue-600 w-4 h-4"
                      />
                      <div className="truncate">
                        <div className="font-bold">{crew.nama}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {crew.jabatan}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

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
        <AddCrewDialog
          open={showAddCrewModal}
          onOpenChange={setShowAddCrewModal}
          defaultJabatan="Tour Leader"
          defaultTripName={formData.nama_trip || "Trip Baru"}
          onCrewAdded={(newCrew) => {
            setSelectedCrewIds((prev) => [...prev, newCrew.id]);
          }}
        />
      </RBACOwnerGuard>
    </AuthGuard>
  );
};

export default NewTrip;