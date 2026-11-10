import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTripFull } from "@/utils/tripManager";

interface DeleteTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: {
    id: string;
    nama_trip: string;
    tujuan?: string | null;
    tanggal?: string | null;
  } | null;
  onSuccess?: () => void;
}

export const DeleteTripDialog: React.FC<DeleteTripDialogProps> = ({
  open,
  onOpenChange,
  trip,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  if (!trip) return null;

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteTripFull(trip.id, trip.nama_trip);
    setLoading(false);

    if (result.success) {
      toast.success(`Trip "${trip.nama_trip}" berhasil dihapus.`);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } else {
      toast.error(`Gagal menghapus trip: ${result.error || "Terjadi kesalahan"}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
            <Trash2 className="w-6 h-6" />
          </div>

          <DialogTitle className="text-center text-lg font-bold text-slate-900 dark:text-white">
            Hapus Trip Ini?
          </DialogTitle>

          <DialogDescription className="text-center text-xs text-slate-500 dark:text-slate-400">
            Apakah Anda yakin ingin menghapus data perjalanan ini?
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="text-xs font-black text-slate-900 dark:text-white truncate">
            {trip.nama_trip}
          </div>
          {trip.tujuan && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>Tujuan:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                {trip.tujuan}
              </span>
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-[11px] text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <b>Peringatan:</b> Seluruh data rundown acara, manifest kursi bus, catatan harga, dan dokumen terkait trip ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        <DialogFooter className="mt-4 flex flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none h-9 text-xs font-semibold rounded-xl border-slate-300 dark:border-slate-700"
          >
            Batal
          </Button>

          <Button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="flex-1 sm:flex-none h-9 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Permanen</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
