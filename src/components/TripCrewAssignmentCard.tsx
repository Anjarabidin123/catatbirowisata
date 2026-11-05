import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserPlus, Phone, MessageSquare, Compass, ShieldCheck, CheckSquare, Square } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { assignTripToMultipleCrewDB, CrewMember } from "@/utils/rbacAuditLogger";
import { AddCrewDialog } from "./AddCrewDialog";
import { toast } from "sonner";

interface TripCrewAssignmentCardProps {
  tripId: string;
  tripName: string;
}

export const TripCrewAssignmentCard: React.FC<TripCrewAssignmentCardProps> = ({
  tripId,
  tripName,
}) => {
  const { crewList, isPemilik, refreshCrewList } = useRole();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Ambil kru yang ditugaskan ke trip ini
  const assignedCrew = crewList.filter((c) => {
    if (c.assignedTripIds && c.assignedTripIds.includes(tripId)) return true;
    if (
      c.assignedTrip &&
      c.assignedTrip !== "Belum Ditugaskan" &&
      c.assignedTrip !== "Standby Operasional" &&
      (tripName.toLowerCase().includes(c.assignedTrip.toLowerCase()) ||
        c.assignedTrip.toLowerCase().includes(tripName.toLowerCase()))
    ) {
      return true;
    }
    return false;
  });

  const handleOpenAssignModal = () => {
    setSelectedIds(assignedCrew.map((c) => c.id));
    setShowAssignDialog(true);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveAssignments = async () => {
    setSaving(true);
    try {
      await assignTripToMultipleCrewDB(tripId, tripName, selectedIds);
      refreshCrewList();
      toast.success("Penugasan Tour Leader & Kru berhasil diperbarui!");
      setShowAssignDialog(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan penugasan kru: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleCrewCreated = (newCrew: CrewMember) => {
    const nextIds = Array.from(new Set([...assignedCrew.map((c) => c.id), newCrew.id]));
    assignTripToMultipleCrewDB(tripId, tripName, nextIds).then(() => {
      refreshCrewList();
    });
  };

  return (
    <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center border border-blue-200/60 dark:border-blue-800">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Tour Leader & Kru Bertugas</span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {assignedCrew.length} Orang
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Personel lapangan yang memegang kendali trip & kas saku
            </p>
          </div>
        </div>

        {isPemilik && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAssignModal}
              className="h-8 text-xs rounded-xl border-slate-200 dark:border-slate-700 font-medium"
            >
              Atur Kru
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="h-8 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Tambah TL</span>
            </Button>
          </div>
        )}
      </div>

      {assignedCrew.length === 0 ? (
        <div className="py-6 text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
            <Compass className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Belum ada Tour Leader (TL) atau kru yang ditugaskan untuk trip ini.
          </p>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            Kru yang ditugaskan akan dapat mengakses kas saku lapangan, checklist kesiapan bus, dan koordinasi jamaah/wisatawan.
          </p>
          {isPemilik && (
            <div className="pt-2 flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAssignModal}
                className="h-8 text-xs rounded-xl"
              >
                Pilih dari Kru Terdaftar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="h-8 text-xs font-semibold rounded-xl gradient-primary text-white gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Tambah Personel TL Baru</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-3">
          {assignedCrew.map((crew) => {
            const cleanPhone = crew.telepon.replace(/[^0-9]/g, "");
            const waNumber = cleanPhone.startsWith("0") ? "62" + cleanPhone.substring(1) : cleanPhone;

            return (
              <div
                key={crew.id}
                className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-start justify-between gap-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl ${crew.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                    {crew.nama.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {crew.nama}
                    </div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                      {crew.jabatan}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" />
                      <span>{crew.telepon}</span>
                    </div>
                  </div>
                </div>

                {cleanPhone && (
                  <a
                    href={`https://wa.me/${waNumber}?text=Halo%20${encodeURIComponent(crew.nama)},%20koordinasi%20operasional%20trip%20${encodeURIComponent(tripName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shrink-0"
                    title="Kirim pesan WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog Atur Penugasan Kru */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Tugaskan Kru untuk Trip Ini</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Centang personel yang bertugas di <strong>"{tripName}"</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-900">
              {crewList.map((crew) => {
                const isChecked = selectedIds.includes(crew.id);
                return (
                  <div
                    key={crew.id}
                    onClick={() => handleToggleSelect(crew.id)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between gap-2 transition-all ${
                      isChecked
                        ? "bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700 font-semibold text-blue-900 dark:text-blue-200"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold">{crew.nama}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {crew.jabatan} • {crew.telepon}
                        </div>
                      </div>
                    </div>
                    {isChecked && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Bertugas
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAssignDialog(false);
                  setShowAddDialog(true);
                }}
                className="h-8 text-xs rounded-xl text-blue-600 gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Buat TL Baru</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignDialog(false)}
                  className="h-8 text-xs rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving}
                  onClick={handleSaveAssignments}
                  className="h-8 text-xs font-semibold rounded-xl gradient-primary text-white"
                >
                  {saving ? "Menyimpan..." : "Simpan Penugasan"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Tambah TL Baru */}
      <AddCrewDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        defaultJabatan="Tour Leader"
        defaultTripName={tripName}
        defaultTripId={tripId}
        onCrewAdded={handleCrewCreated}
      />
    </Card>
  );
};
