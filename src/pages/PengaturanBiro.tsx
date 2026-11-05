import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  Trash2,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Globe,
  CreditCard,
  Landmark,
  ArrowLeft,
  Save,
  FileText,
  Wallet,
  Bus,
  UtensilsCrossed,
  Compass,
  Plus,
  Users,
  CheckCircle2,
  Settings,
  HelpCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  getLocalBiroProfile,
  saveBiroProfile,
  uploadBiroLogo,
  BiroProfile,
} from "@/utils/biroProfile";
import {
  getBiroCmsData,
  saveBiroCmsData,
  resetDefaultKategoriKeuangan,
  BiroCmsData,
  CmsKategoriItem,
  RekananBus,
  RekananResto,
  RekananGuide,
} from "@/utils/biroCmsStore";
import RBACOwnerGuard from "@/components/RBACOwnerGuard";
import { logCrewActivity } from "@/utils/rbacAuditLogger";

const PengaturanBiro = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"identitas" | "dokumen" | "kategori" | "rekanan">("identitas");

  // State Profil Biro
  const [profile, setProfile] = useState<BiroProfile>(getLocalBiroProfile());
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State CMS Dinamis
  const [cmsData, setCmsData] = useState<BiroCmsData>(getBiroCmsData());

  // Modal Tambah Kategori
  const [showAddKatModal, setShowAddKatModal] = useState(false);
  const [newKatNama, setNewKatNama] = useState("");
  const [newKatJenis, setNewKatJenis] = useState<"pemasukan" | "pengeluaran">("pengeluaran");
  const [newKatDeskripsi, setNewKatDeskripsi] = useState("");

  // Modal Tambah Rekanan Bus
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [newBus, setNewBus] = useState({ namaPO: "", kontakPerson: "", telepon: "", alamatGarasi: "", catatanArmada: "" });

  // Modal Tambah Rekanan Resto
  const [showAddRestoModal, setShowAddRestoModal] = useState(false);
  const [newResto, setNewResto] = useState({ namaResto: "", lokasiRute: "", kontakPerson: "", telepon: "", hargaPerPax: 30000, menuFavorit: "" });

  useEffect(() => {
    setProfile(getLocalBiroProfile());
    setCmsData(getBiroCmsData());
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran logo maksimal 2 MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const logoUrl = await uploadBiroLogo(file);
      setProfile((prev) => ({ ...prev, logo_url: logoUrl }));
      toast.success("Logo resmi berhasil diunggah!");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setProfile((prev) => ({ ...prev, logo_url: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Logo dihapus. Klik Simpan untuk memperbarui.");
  };

  // Simpan Seluruh Pengaturan CMS & Profil
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      // 1. Simpan Profil Biro
      await saveBiroProfile(profile);

      // 2. Simpan Pengaturan CMS
      saveBiroCmsData(cmsData);

      logCrewActivity({
        kategori: "keamanan_rbac",
        aksi: "Pembaruan CMS & Profil Biro",
        detail: `Memperbarui konfigurasi CMS biro (${profile.nama_biro}), format dokumen & master data rekanan.`,
        status: "sukses",
      });

      toast.success("Seluruh pengaturan CMS & profil biro berhasil disimpan!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan perubahan");
    } finally {
      setLoading(false);
    }
  };

  // Handler CMS Kategori
  const handleAddKategori = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKatNama.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }

    const newItem: CmsKategoriItem = {
      id: `kat-${Date.now()}`,
      nama: newKatNama.trim(),
      jenis: newKatJenis,
      deskripsi: newKatDeskripsi.trim() || undefined,
      isDefault: false,
    };

    const updatedList = [...cmsData.kategoriKeuangan, newItem];
    const newCMS = saveBiroCmsData({ kategoriKeuangan: updatedList });
    setCmsData(newCMS);
    setShowAddKatModal(false);
    setNewKatNama("");
    setNewKatDeskripsi("");
    toast.success(`Kategori "${newItem.nama}" berhasil ditambahkan!`);
  };

  const handleDeleteKategori = (id: string, nama: string) => {
    if (!window.confirm(`Hapus kategori pos kas "${nama}"?`)) return;
    const updatedList = cmsData.kategoriKeuangan.filter((k) => k.id !== id);
    const newCMS = saveBiroCmsData({ kategoriKeuangan: updatedList });
    setCmsData(newCMS);
    toast.success(`Kategori "${nama}" telah dihapus.`);
  };

  // Handler CMS Rekanan Bus
  const handleAddBus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBus.namaPO.trim() || !newBus.telepon.trim()) {
      toast.error("Nama PO Bus dan Nomor Telepon wajib diisi");
      return;
    }
    const newBusItem: RekananBus = {
      id: `bus-${Date.now()}`,
      namaPO: newBus.namaPO.trim(),
      kontakPerson: newBus.kontakPerson.trim() || "Mandor Armada",
      telepon: newBus.telepon.trim(),
      alamatGarasi: newBus.alamatGarasi.trim() || undefined,
      catatanArmada: newBus.catatanArmada.trim() || undefined,
    };
    const updated = saveBiroCmsData({ rekananBus: [...cmsData.rekananBus, newBusItem] });
    setCmsData(updated);
    setShowAddBusModal(false);
    setNewBus({ namaPO: "", kontakPerson: "", telepon: "", alamatGarasi: "", catatanArmada: "" });
    toast.success(`PO Bus "${newBusItem.namaPO}" berhasil ditambahkan ke database rekanan.`);
  };

  const handleDeleteBus = (id: string, nama: string) => {
    if (!window.confirm(`Hapus PO "${nama}" dari daftar rekanan?`)) return;
    const updated = saveBiroCmsData({ rekananBus: cmsData.rekananBus.filter((b) => b.id !== id) });
    setCmsData(updated);
    toast.success(`PO Bus "${nama}" dihapus.`);
  };

  // Handler CMS Rekanan Resto
  const handleAddResto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResto.namaResto.trim() || !newResto.telepon.trim()) {
      toast.error("Nama Resto dan Telepon wajib diisi");
      return;
    }
    const newRestoItem: RekananResto = {
      id: `resto-${Date.now()}`,
      namaResto: newResto.namaResto.trim(),
      lokasiRute: newResto.lokasiRute.trim() || "Jalur Wisata",
      kontakPerson: newResto.kontakPerson.trim() || "Bagian Reservasi",
      telepon: newResto.telepon.trim(),
      hargaPerPax: Number(newResto.hargaPerPax) || 30000,
      menuFavorit: newResto.menuFavorit.trim() || undefined,
    };
    const updated = saveBiroCmsData({ rekananResto: [...cmsData.rekananResto, newRestoItem] });
    setCmsData(updated);
    setShowAddRestoModal(false);
    setNewResto({ namaResto: "", lokasiRute: "", kontakPerson: "", telepon: "", hargaPerPax: 30000, menuFavorit: "" });
    toast.success(`Resto "${newRestoItem.namaResto}" berhasil ditambahkan ke database rekanan.`);
  };

  const handleDeleteResto = (id: string, nama: string) => {
    if (!window.confirm(`Hapus "${nama}" dari daftar resto rekanan?`)) return;
    const updated = saveBiroCmsData({ rekananResto: cmsData.rekananResto.filter((r) => r.id !== id) });
    setCmsData(updated);
    toast.success(`Resto "${nama}" dihapus.`);
  };

  return (
    <AuthGuard>
      <RBACOwnerGuard
        ruleId="rule_pengaturan_biro"
        pageTitle="Pusat Kontrol CMS Biro"
        reason="Halaman CMS ini dikhususkan bagi Pemilik Biro untuk mengatur identitas resmi, kop surat, dokumen PDF, kategori kas, dan rekanan bus."
      >
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-12 lg:pl-64 font-sans text-slate-900 dark:text-slate-100">
          <div className="max-w-6xl mx-auto p-3 sm:p-5 lg:p-8 space-y-5">
            {/* Header Bersih */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/dashboard")}
                  className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  title="Kembali ke Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    <span>Pusat Kontrol CMS & Profil Biro</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Kelola identitas resmi, format dokumen PDF, kategori kas akuntansi, dan master data rekanan armada.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  type="button"
                  onClick={() => navigate("/manajemen-kru")}
                  variant="outline"
                  className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-1.5"
                >
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Kru & RBAC</span>
                </Button>

                <Button
                  onClick={() => handleSaveAll()}
                  disabled={loading}
                  className="h-9 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Pengaturan</span>
                </Button>
              </div>
            </div>

            {/* Segmented Tab Bar CMS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "identitas" as const, label: "Identitas & Bank", icon: Building2 },
                { id: "dokumen" as const, label: "CMS Dokumen & PDF", icon: FileText },
                { id: "kategori" as const, label: `Pos Keuangan (${cmsData.kategoriKeuangan.length})`, icon: Wallet },
                { id: "rekanan" as const, label: `Master Rekanan (${cmsData.rekananBus.length + cmsData.rekananResto.length})`, icon: Bus },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* =========================================================
                TAB 1: IDENTITAS RESMI & REKENING BANK
            ========================================================= */}
            {activeTab === "identitas" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Identitas Biro & Logo */}
                <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Identitas Resmi & Logo Biro</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Logo dan nama resmi yang dicetak pada kop surat, rundown acara, kwitansi, dan invoice.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Logo Section */}
                    <div>
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Logo Resmi Biro
                      </Label>
                      <div className="mt-2 flex items-center gap-4">
                        {profile.logo_url ? (
                          <div className="relative w-20 h-20 rounded-2xl border-2 border-blue-500/30 overflow-hidden bg-white shadow-xs flex items-center justify-center p-1.5 flex-shrink-0">
                            <img
                              src={profile.logo_url}
                              alt="Logo Biro"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/pwa-icon.svg";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 flex-shrink-0">
                            <ImageIcon className="w-6 h-6 stroke-1 mb-1" />
                            <span className="text-[10px] font-medium">Belum ada</span>
                          </div>
                        )}

                        <div className="flex-1 space-y-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingLogo}
                              className="h-8 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 gap-1.5"
                            >
                              {uploadingLogo ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5 text-blue-600" />
                              )}
                              <span>{uploadingLogo ? "Mengunggah..." : "Ganti Logo"}</span>
                            </Button>

                            {profile.logo_url && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={handleRemoveLogo}
                                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </Button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Format PNG/JPEG transparan, maks 2 MB. Disarankan rasio 1:1.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Nama Biro */}
                    <div className="space-y-1.5">
                      <Label htmlFor="nama_biro" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Nama Resmi Biro Wisata *
                      </Label>
                      <Input
                        id="nama_biro"
                        value={profile.nama_biro}
                        onChange={(e) => setProfile({ ...profile, nama_biro: e.target.value })}
                        placeholder="Contoh: Catat Biro Wisata"
                        required
                        className="h-10 text-xs sm:text-sm rounded-xl font-bold"
                      />
                    </div>

                    {/* Slogan */}
                    <div className="space-y-1.5">
                      <Label htmlFor="slogan" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Slogan / Tagline Biro
                      </Label>
                      <Input
                        id="slogan"
                        value={profile.slogan}
                        onChange={(e) => setProfile({ ...profile, slogan: e.target.value })}
                        placeholder="Contoh: Biro Perjalanan Wisata & Sewa Bus Pariwisata"
                        className="h-10 text-xs sm:text-sm rounded-xl"
                      />
                    </div>

                    {/* Pimpinan */}
                    <div className="space-y-1.5">
                      <Label htmlFor="pimpinan" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Nama Pimpinan / Direktur Utama (Penandatangan Dokumen)
                      </Label>
                      <Input
                        id="pimpinan"
                        value={profile.pimpinan || ""}
                        onChange={(e) => setProfile({ ...profile, pimpinan: e.target.value })}
                        placeholder="Contoh: H. Anjar Abidin, S.E."
                        className="h-10 text-xs sm:text-sm rounded-xl font-semibold"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Kontak, Alamat, & Rekening Bank */}
                <div className="space-y-4">
                  <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                    <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                      <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span>Kontak Kantor & Alamat</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5 space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="alamat" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Alamat Lengkap Kantor
                        </Label>
                        <Textarea
                          id="alamat"
                          value={profile.alamat || ""}
                          onChange={(e) => setProfile({ ...profile, alamat: e.target.value })}
                          rows={2}
                          placeholder="Jl. Raya Demak - Kudus KM 4, Demak, Jawa Tengah"
                          className="text-xs rounded-xl"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="telepon" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Nomor Telepon / WA
                          </Label>
                          <Input
                            id="telepon"
                            value={profile.telepon || ""}
                            onChange={(e) => setProfile({ ...profile, telepon: e.target.value })}
                            placeholder="0812-2578-9000"
                            className="h-9 text-xs rounded-xl"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Email Resmi
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={profile.email || ""}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            placeholder="info@birowisata.id"
                            className="h-9 text-xs rounded-xl"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                    <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                      <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Landmark className="w-4 h-4 text-blue-600" />
                        <span>Rekening Bank Resmi Pelunasan</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Bank</Label>
                          <Input
                            value={profile.nama_bank || ""}
                            onChange={(e) => setProfile({ ...profile, nama_bank: e.target.value })}
                            placeholder="Mandiri / BCA"
                            className="h-9 text-xs rounded-xl font-bold"
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nomor Rekening</Label>
                          <Input
                            value={profile.nomor_rekening || ""}
                            onChange={(e) => setProfile({ ...profile, nomor_rekening: e.target.value })}
                            placeholder="136-00-1234567-8"
                            className="h-9 text-xs rounded-xl font-mono font-bold"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Atas Nama (A.N.) Rekening</Label>
                        <Input
                          value={profile.atas_nama_rekening || ""}
                          onChange={(e) => setProfile({ ...profile, atas_nama_rekening: e.target.value })}
                          placeholder="Catat Biro Wisata"
                          className="h-9 text-xs rounded-xl font-semibold"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 2: CMS DOKUMEN & PENGESAHAN PDF
            ========================================================= */}
            {activeTab === "dokumen" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Format Penomoran & Catatan Dokumen</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Konfigurasikan format nomor surat resmi dan catatan kaki yang tercetak pada laporan keuangan dan invoice.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Format Pola Nomor Surat / Kwitansi
                      </Label>
                      <Input
                        value={cmsData.dokumen.formatNomorSurat}
                        onChange={(e) =>
                          setCmsData({
                            ...cmsData,
                            dokumen: { ...cmsData.dokumen, formatNomorSurat: e.target.value },
                          })
                        }
                        placeholder="Contoh: CBW/KEU/{YYYY}/{MM}/{NO}"
                        className="h-10 text-xs sm:text-sm font-mono font-bold rounded-xl"
                      />
                      <p className="text-[11px] text-slate-500">
                        Variabel otomatis: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{YYYY}"}</code> (tahun), <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{MM}"}</code> (bulan), <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{NO}"}</code> (urutan).
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Catatan Kaki Laporan Keuangan (Footer PDF)
                      </Label>
                      <Textarea
                        value={cmsData.dokumen.footerTeksLaporan}
                        onChange={(e) =>
                          setCmsData({
                            ...cmsData,
                            dokumen: { ...cmsData.dokumen, footerTeksLaporan: e.target.value },
                          })
                        }
                        rows={2}
                        className="text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Ketentuan & Syarat Kwitansi / Invoice
                      </Label>
                      <Textarea
                        value={cmsData.dokumen.syaratKwitansi}
                        onChange={(e) =>
                          setCmsData({
                            ...cmsData,
                            dokumen: { ...cmsData.dokumen, syaratKwitansi: e.target.value },
                          })
                        }
                        rows={2}
                        className="text-xs rounded-xl"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Pejabat Penandatangan Laporan Keuangan</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Tanda tangan resmi laporan keuangan kantor kini mutlak dilakukan oleh Bagian Keuangan dan Pimpinan Biro (bebas dari penanda Tour Leader).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>Format Pengesahan Ganda (Dual Signatures)</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                        Sisi kiri ditandatangani oleh <strong>Bagian Keuangan & Kasir</strong> sebagai pembuat rekap biaya, dan sisi kanan disahkan oleh <strong>Pimpinan Biro / Direktur</strong>.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Nama Pejabat Bagian Keuangan (Kiri)
                      </Label>
                      <Input
                        value={cmsData.dokumen.namaBagianKeuangan}
                        onChange={(e) =>
                          setCmsData({
                            ...cmsData,
                            dokumen: { ...cmsData.dokumen, namaBagianKeuangan: e.target.value },
                          })
                        }
                        placeholder="Contoh: Staff Keuangan & Kasir"
                        className="h-10 text-xs sm:text-sm rounded-xl font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Jabatan Bagian Keuangan
                      </Label>
                      <Input
                        value={cmsData.dokumen.jabatanBagianKeuangan}
                        onChange={(e) =>
                          setCmsData({
                            ...cmsData,
                            dokumen: { ...cmsData.dokumen, jabatanBagianKeuangan: e.target.value },
                          })
                        }
                        placeholder="Contoh: Bagian Administrasi & Keuangan"
                        className="h-10 text-xs sm:text-sm rounded-xl font-semibold"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Tampilkan Area Stempel Dokumen
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Beri ruang lingkaran stempel basah resmi di samping tanda tangan
                        </span>
                      </div>
                      <Switch
                        checked={cmsData.dokumen.tampilkanStempelDigital}
                        onCheckedChange={(val) =>
                          setCmsData({
                            ...cmsData,
                            dokumen: { ...cmsData.dokumen, tampilkanStempelDigital: val },
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* =========================================================
                TAB 3: CMS KATEGORI KAS DINAMIS
            ========================================================= */}
            {activeTab === "kategori" && (
              <div className="space-y-4">
                {/* Banner Penjelasan Alur Integrasi Kategori */}
                <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-100 flex items-start gap-3 shadow-2xs">
                  <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-blue-950 dark:text-blue-100">
                      💡 Di mana kategori ini digunakan?
                    </p>
                    <p className="text-xs text-blue-800/90 dark:text-blue-200 leading-relaxed">
                      Setiap pos pengeluaran dan pos pemasukan di bawah ini otomatis terhubung sebagai{" "}
                      <strong>tombol pilihan cepat</strong> saat Anda atau kru mencatat kas di menu{" "}
                      <strong>Keuangan (+ Tambah Transaksi)</strong>, <strong>Posko Kas Lapangan (Petty Cash)</strong>, dan{" "}
                      <strong>Buku Kas Trip</strong>. Anda bebas menghapus atau menambahkan pos sesuai sistem akuntansi biro Anda.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Manajemen Kategori Keuangan (Dinamis & Bebas Diatur)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kelola pos pengeluaran dan pos pemasukan kustom yang sesuai dengan alur operasional biro Anda.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Kembalikan daftar kategori kas ke pilihan standar biro?")) {
                          const reset = resetDefaultKategoriKeuangan();
                          setCmsData(reset);
                          toast.success("Daftar kategori berhasil direset ke standar.");
                        }
                      }}
                      className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      title="Kembalikan ke kategori default biro"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset Standar</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowAddKatModal(true)}
                      className="h-9 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Kategori Baru</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kolom Pengeluaran */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                        Pos Pengeluaran (Beban Operasional)
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {cmsData.kategoriKeuangan.filter((k) => k.jenis === "pengeluaran").length} Pos
                      </span>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {cmsData.kategoriKeuangan
                        .filter((k) => k.jenis === "pengeluaran")
                        .map((kat) => (
                          <div
                            key={kat.id}
                            className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-2 hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {kat.nama}
                              </div>
                              {kat.deskripsi && (
                                <p className="text-[10px] text-slate-500 truncate">{kat.deskripsi}</p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteKategori(kat.id, kat.nama)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                              title={`Hapus kategori "${kat.nama}"`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Kolom Pemasukan */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        Pos Pemasukan (Omset & Pendapatan)
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {cmsData.kategoriKeuangan.filter((k) => k.jenis === "pemasukan").length} Pos
                      </span>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {cmsData.kategoriKeuangan
                        .filter((k) => k.jenis === "pemasukan")
                        .map((kat) => (
                          <div
                            key={kat.id}
                            className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-2 hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {kat.nama}
                              </div>
                              {kat.deskripsi && (
                                <p className="text-[10px] text-slate-500 truncate">{kat.deskripsi}</p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteKategori(kat.id, kat.nama)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                              title={`Hapus kategori "${kat.nama}"`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 4: MASTER DATA REKANAN (PO BUS & RUMAH MAKAN)
            ========================================================= */}
            {activeTab === "rekanan" && (
              <div className="space-y-5">
                {/* Bagian PO Bus Pariwisata */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Bus className="w-4 h-4 text-blue-600" />
                        <span>Database Rekanan PO Bus Pariwisata ({cmsData.rekananBus.length})</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Kontak mandor garasi bus pariwisata rekanan untuk kemudahan sewa bus cepat.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowAddBusModal(true)}
                      className="h-8 px-3 rounded-xl text-xs font-semibold bg-blue-600 text-white gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah PO Bus</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cmsData.rekananBus.map((bus) => (
                      <div
                        key={bus.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {bus.namaPO}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleDeleteBus(bus.id, bus.namaPO)}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                              title="Hapus Rekanan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            PIC: {bus.kontakPerson} {bus.alamatGarasi ? `• ${bus.alamatGarasi}` : ""}
                          </p>
                          {bus.catatanArmada && (
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-1">
                              {bus.catatanArmada}
                            </p>
                          )}
                        </div>

                        <a
                          href={`https://wa.me/${bus.telepon.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 w-full h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Hubungi {bus.telepon}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bagian Rumah Makan & Restoran */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                        <span>Database Rumah Makan & Restoran Langganan ({cmsData.rekananResto.length})</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Kontak pemesanan prasmanan dan transit rombongan bus.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowAddRestoModal(true)}
                      className="h-8 px-3 rounded-xl text-xs font-semibold bg-amber-600 text-white gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Restoran</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cmsData.rekananResto.map((resto) => (
                      <div
                        key={resto.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {resto.namaResto}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleDeleteResto(resto.id, resto.namaResto)}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                              title="Hapus Rekanan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {resto.lokasiRute} • PIC: {resto.kontakPerson}
                          </p>
                          {resto.menuFavorit && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-1">
                              {resto.menuFavorit}
                            </p>
                          )}
                          {resto.hargaPerPax && resto.hargaPerPax > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
                              Est. Rp {resto.hargaPerPax.toLocaleString("id-ID")} / pax
                            </span>
                          )}
                        </div>

                        <a
                          href={`https://wa.me/${resto.telepon.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 w-full h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Pesan Prasmanan ({resto.telepon})</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <BottomNav />

        {/* Modal Tambah Kategori Kas */}
        <Dialog open={showAddKatModal} onOpenChange={setShowAddKatModal}>
          <DialogContent className="sm:max-w-md rounded-2xl p-5">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Tambah Pos Kategori Kas</DialogTitle>
              <DialogDescription className="text-xs">
                Buat kategori baru untuk pencatatan buku kas masuk atau beban operasional.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddKategori} className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Jenis Transaksi *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewKatJenis("pengeluaran")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      newKatJenis === "pengeluaran"
                        ? "bg-rose-50 text-rose-700 border-rose-300"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    Pengeluaran (Beban)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewKatJenis("pemasukan")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      newKatJenis === "pemasukan"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    Pemasukan (Omset)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama Kategori *</Label>
                <Input
                  required
                  placeholder="Contoh: Sewa Kapal & Perahu"
                  value={newKatNama}
                  onChange={(e) => setNewKatNama(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Deskripsi Singkat</Label>
                <Input
                  placeholder="Contoh: Penyeberangan pulau atau river cruise"
                  value={newKatDeskripsi}
                  onChange={(e) => setNewKatDeskripsi(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddKatModal(false)}
                  className="h-9 text-xs rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Simpan Kategori
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Tambah PO Bus */}
        <Dialog open={showAddBusModal} onOpenChange={setShowAddBusModal}>
          <DialogContent className="sm:max-w-md rounded-2xl p-5">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Tambah Rekanan PO Bus</DialogTitle>
              <DialogDescription className="text-xs">
                Simpan kontak garasi dan mandor PO bus rekanan untuk sewa bus pariwisata.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddBus} className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama PO Bus *</Label>
                <Input
                  required
                  placeholder="Contoh: PO Surya Kencana Pariwisata"
                  value={newBus.namaPO}
                  onChange={(e) => setNewBus({ ...newBus, namaPO: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nama Mandor / PIC</Label>
                  <Input
                    placeholder="Mas Hendra"
                    value={newBus.kontakPerson}
                    onChange={(e) => setNewBus({ ...newBus, kontakPerson: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nomor Telepon / WA *</Label>
                  <Input
                    required
                    placeholder="0812-xxxx-xxxx"
                    value={newBus.telepon}
                    onChange={(e) => setNewBus({ ...newBus, telepon: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Alamat Garasi</Label>
                <Input
                  placeholder="Contoh: Kudus / Semarang"
                  value={newBus.alamatGarasi}
                  onChange={(e) => setNewBus({ ...newBus, alamatGarasi: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Catatan Armada & Kapasitas</Label>
                <Input
                  placeholder="Contoh: HDD 50 Seat, SHD 48 Seat, Medium 33 Seat"
                  value={newBus.catatanArmada}
                  onChange={(e) => setNewBus({ ...newBus, catatanArmada: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddBusModal(false)}
                  className="h-9 text-xs rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Simpan Rekanan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Tambah Resto */}
        <Dialog open={showAddRestoModal} onOpenChange={setShowAddRestoModal}>
          <DialogContent className="sm:max-w-md rounded-2xl p-5">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Tambah Rumah Makan Rekanan</DialogTitle>
              <DialogDescription className="text-xs">
                Simpan kontak bagian reservasi restoran untuk pesanan prasmanan bus.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddResto} className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama Rumah Makan / Resto *</Label>
                <Input
                  required
                  placeholder="Contoh: RM Bale Raos"
                  value={newResto.namaResto}
                  onChange={(e) => setNewResto({ ...newResto, namaResto: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Lokasi / Jalur Rute</Label>
                  <Input
                    placeholder="Contoh: Jalur Tol Bawen"
                    value={newResto.lokasiRute}
                    onChange={(e) => setNewResto({ ...newResto, lokasiRute: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nomor WA Reservasi *</Label>
                  <Input
                    required
                    placeholder="0812-xxxx-xxxx"
                    value={newResto.telepon}
                    onChange={(e) => setNewResto({ ...newResto, telepon: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Kontak PIC / Kasir</Label>
                  <Input
                    placeholder="Ibu Wati"
                    value={newResto.kontakPerson}
                    onChange={(e) => setNewResto({ ...newResto, kontakPerson: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Perkiraan Harga / Pax</Label>
                  <Input
                    type="number"
                    value={newResto.hargaPerPax}
                    onChange={(e) => setNewResto({ ...newResto, hargaPerPax: Number(e.target.value) })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Menu Favorit & Fasilitas</Label>
                <Input
                  placeholder="Contoh: Prasmanan Ayam Bakar, Parkir 10 Bus, Mushola Luas"
                  value={newResto.menuFavorit}
                  onChange={(e) => setNewResto({ ...newResto, menuFavorit: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddRestoModal(false)}
                  className="h-9 text-xs rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Simpan Resto
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </RBACOwnerGuard>
    </AuthGuard>
  );
};

export default PengaturanBiro;
