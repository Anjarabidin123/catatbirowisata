import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCheck, Users, Plus, Phone, Mail, Compass } from "lucide-react";
import { toast } from "sonner";
import { CrewJabatan, CrewMember, addCrewMemberDB } from "@/utils/rbacAuditLogger";
import { useRole } from "@/contexts/RoleContext";
import { getCurrentEntitlements } from "@/utils/licenseEntitlement";

interface AddCrewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultJabatan?: CrewJabatan;
  defaultTripName?: string;
  defaultTripId?: string;
  onCrewAdded?: (newCrew: CrewMember) => void;
}

const JABATAN_OPTIONS: CrewJabatan[] = [
  "Tour Leader",
  "Driver Utama",
  "Co-Driver / Kernet",
  "Koordinator Lapangan",
  "Staf Operasional",
];

export const AddCrewDialog: React.FC<AddCrewDialogProps> = ({
  open,
  onOpenChange,
  defaultJabatan = "Koordinator Lapangan",
  defaultTripName = "Standby Operasional",
  defaultTripId,
  onCrewAdded,
}) => {
  const { refreshCrewList, crewList } = useRole();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    jabatan: defaultJabatan,
    telepon: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      toast.error("Nama personel wajib diisi");
      return;
    }

    const entitlements = getCurrentEntitlements();
    if (crewList.length >= entitlements.maxCrewMembers) {
      toast.error(
        `Batas kuota kru (${entitlements.maxCrewMembers} personel) telah tercapai untuk biro ini. Hubungi Super Admin untuk penambahan kuota.`
      );
      return;
    }

    setLoading(true);
    try {
      const assignedIds = defaultTripId ? [defaultTripId] : [];
      const created = await addCrewMemberDB({
        nama: form.nama.trim(),
        jabatan: form.jabatan,
        telepon: form.telepon.trim() || "0812-0000-0000",
        email:
          form.email.trim() ||
          `${form.nama.trim().toLowerCase().replace(/\s+/g, ".")}@birowisata.id`,
        assignedTrip: defaultTripName,
        assignedTripIds: assignedIds,
      });

      refreshCrewList();
      toast.success(
        `${created.jabatan} "${created.nama}" berhasil ditambahkan ke database!`
      );
      if (onCrewAdded) {
        onCrewAdded(created);
      }
      setForm({
        nama: "",
        jabatan: defaultJabatan,
        telepon: "",
        email: "",
      });
      onOpenChange(false);
    } catch (err: any) {
      console.error("Gagal menambahkan kru:", err);
      toast.error("Gagal menambahkan personel: " + (err.message || "Kesalahan sistem"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span>Tambah Personel Kru Baru</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Data personel akan langsung tersimpan di database Supabase dan dapat ditugaskan ke jadwal trip.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Nama Lengkap Personel *</Label>
            <Input
              required
              placeholder="Contoh: Mas Budi Santoso"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="h-9 text-xs rounded-xl"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Jabatan Lapangan *</Label>
              <Select
                value={form.jabatan}
                onValueChange={(val: CrewJabatan) => setForm({ ...form, jabatan: val })}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JABATAN_OPTIONS.map((j) => (
                    <SelectItem key={j} value={j} className="text-xs">
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>No. WhatsApp</span>
              </Label>
              <Input
                placeholder="0812-xxxx-xxxx"
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>Email Akun (Opsional)</span>
            </Label>
            <Input
              type="email"
              placeholder="kru@birowisata.id"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-9 text-xs rounded-xl"
            />
            <p className="text-[10px] text-muted-foreground">
              Jika dikosongkan, email otomatis dibuat dari nama personel.
            </p>
          </div>

          {defaultTripName && defaultTripName !== "Standby Operasional" && (
            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Personel ini akan otomatis ditugaskan untuk trip: <strong>{defaultTripName}</strong>
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="h-8 text-xs font-semibold rounded-xl gradient-primary text-white"
            >
              {loading ? "Menyimpan..." : "Simpan Personel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
