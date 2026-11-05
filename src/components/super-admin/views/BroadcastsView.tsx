import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  Plus,
  Search,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertOctagon,
  Trash2,
  Edit,
  Eye,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  SystemBroadcast,
  BroadcastType,
  TargetTierType,
  getBroadcasts,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
  toggleBroadcastActive,
} from "@/utils/superAdminBroadcasts";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface BroadcastsViewProps {
  onRefresh: () => void;
}

export const BroadcastsView: React.FC<BroadcastsViewProps> = ({ onRefresh }) => {
  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>(getBroadcasts);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<SystemBroadcast | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formType, setFormType] = useState<BroadcastType>("info");
  const [formTargetTier, setFormTargetTier] = useState<TargetTierType>("all");
  const [formIsActive, setFormIsActive] = useState(true);

  const refreshLocal = () => {
    setBroadcasts(getBroadcasts());
    onRefresh();
  };

  const handleOpenCreate = () => {
    setEditingBroadcast(null);
    setFormTitle("");
    setFormMessage("");
    setFormType("info");
    setFormTargetTier("all");
    setFormIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (bc: SystemBroadcast) => {
    setEditingBroadcast(bc);
    setFormTitle(bc.title);
    setFormMessage(bc.message);
    setFormType(bc.type);
    setFormTargetTier(bc.targetTier || "all");
    setFormIsActive(bc.isActive);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMessage.trim()) {
      toast.error("Judul dan isi pesan pengumuman wajib diisi");
      return;
    }

    if (editingBroadcast) {
      updateBroadcast(editingBroadcast.id, {
        title: formTitle.trim(),
        message: formMessage.trim(),
        type: formType,
        targetTier: formTargetTier,
        isActive: formIsActive,
      });
      toast.success("Pengumuman berhasil diperbarui!");
    } else {
      createBroadcast({
        title: formTitle.trim(),
        message: formMessage.trim(),
        type: formType,
        targetTier: formTargetTier,
        isActive: formIsActive,
      });
      toast.success("Pengumuman global baru berhasil diterbitkan!");
    }

    setModalOpen(false);
    refreshLocal();
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Hapus pengumuman "${title}"?`)) {
      deleteBroadcast(id);
      toast.success("Pengumuman telah dihapus");
      refreshLocal();
    }
  };

  const handleToggle = (id: string) => {
    toggleBroadcastActive(id);
    refreshLocal();
  };

  const filteredBroadcasts = useMemo(() => {
    return broadcasts.filter((b) => {
      const matchSearch =
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.message.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "ALL" || b.type === filterType;
      return matchSearch && matchType;
    });
  }, [broadcasts, search, filterType]);

  const activeCount = broadcasts.filter((b) => b.isActive).length;
  const urgentCount = broadcasts.filter((b) => b.type === "urgent" && b.isActive).length;

  const getTypeBadge = (type: BroadcastType) => {
    switch (type) {
      case "urgent":
        return {
          icon: AlertOctagon,
          label: "Urgent",
          className: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          label: "Peringatan",
          className: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
        };
      case "success":
        return {
          icon: CheckCircle2,
          label: "Sukses",
          className: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
        };
      case "info":
      default:
        return {
          icon: Info,
          label: "Info",
          className: "bg-indigo-100 text-indigo-800 border-indigo-300 font-bold",
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-indigo-600" />
            <span>Pusat Broadcast Pengumuman Global</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Siarkan pengumuman langsung ke banner atas Dashboard PWA seluruh biro wisata klien secara real-time.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 rounded-xl flex items-center gap-2 shadow-sm font-bold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman Baru</span>
        </Button>
      </div>

      {/* Metric Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pengumuman</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">{broadcasts.length}</div>
            <p className="text-xs text-slate-500 mt-0.5">Tersimpan di sistem</p>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Aktif Mengudara</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
            <p className="text-xs text-slate-500 mt-0.5">Tayang di dashboard biro</p>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Urgent & Kritis</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-600">{urgentCount}</div>
            <p className="text-xs text-slate-500 mt-0.5">Peringatan prioritas tinggi</p>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Target Jangkauan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">100%</div>
            <p className="text-xs text-slate-500 mt-0.5">Seluruh biro terhubung</p>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul atau isi pengumuman..."
            className="pl-9 h-9 text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 w-36">
              <SelectValue placeholder="Semua Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Tipe</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Peringatan</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="success">Sukses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Broadcast List */}
      <div className="space-y-3">
        {filteredBroadcasts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            Belum ada pengumuman yang sesuai dengan filter pencarian.
          </div>
        ) : (
          filteredBroadcasts.map((item) => {
            const badge = getTypeBadge(item.type);
            const Icon = badge.icon;
            return (
              <Card
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  item.isActive
                    ? "bg-white border-slate-200 shadow-xs"
                    : "bg-slate-50/70 border-slate-200 opacity-60"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        item.type === "urgent"
                          ? "bg-rose-100 text-rose-600"
                          : item.type === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : item.type === "success"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-indigo-100 text-indigo-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{item.title}</span>
                        <Badge className={`text-[10px] px-2 py-0.5 rounded border ${badge.className}`}>
                          {badge.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono text-slate-500">
                          Tier: {item.targetTier || "ALL"}
                        </Badge>
                        {item.isActive ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            ● Tayang
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                            Off
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(item.createdAt), "dd MMM yyyy, HH:mm", { locale: id })}
                        </span>
                        <span>ID: {item.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Switch */}
                  <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>{item.isActive ? "Aktif" : "Nonaktif"}</span>
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => handleToggle(item.id)}
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(item)}
                      className="h-8 px-2.5 rounded-xl text-xs text-slate-700 border-slate-300 bg-white hover:bg-slate-50 gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="h-8 px-2 rounded-xl text-xs text-rose-600 hover:text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Live Preview Box */}
      <Card className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-2 border-indigo-700/50 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>Pratinjau Banner di Dashboard Klien PWA</span>
          </div>
          <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded font-mono">
            Client View Simulation
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>PENGUMUMAN RESMI CATATBIRO: Jadwal Peningkatan Server Cloud Malam Ini</span>
          </div>
          <p className="text-[11px] text-slate-200 leading-relaxed pl-6">
            Akan dilakukan pemeliharaan database terjadwal pada pukul 23:00 - 23:30 WIB. Aplikasi tetap dapat digunakan secara offline.
          </p>
        </div>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-indigo-600" />
              <span>{editingBroadcast ? "Edit Pengumuman Global" : "Terbitkan Pengumuman Global"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pengumuman ini akan langsung muncul di baris teratas aplikasi dashboard seluruh biro klien.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Judul Pengumuman</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Contoh: Pembaruan Sistem v2.4 Rilis"
                className="h-9 text-xs rounded-xl border-slate-300"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Isi Pesan Lengkap</label>
              <Textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Tuliskan isi pengumuman atau instruksi untuk klien biro wisata..."
                className="text-xs rounded-xl border-slate-300 min-h-[90px]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tipe / Tingkat Kritis</label>
                <Select value={formType} onValueChange={(v: BroadcastType) => setFormType(v)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info (Biru)</SelectItem>
                    <SelectItem value="warning">Peringatan (Kuning)</SelectItem>
                    <SelectItem value="urgent">Urgent / Darurat (Merah)</SelectItem>
                    <SelectItem value="success">Sukses (Hijau)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Target Lisensi</label>
                <Select value={formTargetTier} onValueChange={(v: TargetTierType) => setFormTargetTier(v)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Biro (All)</SelectItem>
                    <SelectItem value="starter">Paket Starter</SelectItem>
                    <SelectItem value="pro">Paket Pro</SelectItem>
                    <SelectItem value="enterprise">Paket Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800">Status Publikasi Langsung</div>
                <div className="text-[11px] text-slate-500">Aktifkan untuk langsung menayangkan di dashboard biro</div>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="h-9 text-xs rounded-xl border-slate-300 text-slate-700"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="h-9 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {editingBroadcast ? "Simpan Perubahan" : "Terbitkan Sekarang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
