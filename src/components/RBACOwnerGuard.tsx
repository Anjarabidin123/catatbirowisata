import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";

interface RBACOwnerGuardProps {
  children: React.ReactNode;
  pageTitle?: string;
  reason?: string;
  ruleId?: string;
}

export const RBACOwnerGuard: React.FC<RBACOwnerGuardProps> = ({
  children,
  pageTitle = "Halaman Khusus Pemilik Biro",
  reason = "Halaman ini memuat informasi rahasia perusahaan, buku kas utama, rekening bank, atau pusat pengawasan kru yang hanya dapat diakses oleh Pemilik Biro (Owner).",
  ruleId,
}) => {
  const { isPemilik, hasPermission, activeCrew, setRole } = useRole();
  const navigate = useNavigate();

  const isAllowed = isPemilik || (ruleId ? hasPermission(ruleId) : false);

  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 lg:pl-64 pb-24 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 font-extrabold uppercase text-[10px] px-2.5 py-0.5">
            <Lock className="w-3 h-3 mr-1" />
            Proteksi RBAC Aktif
          </Badge>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Akses Dibatasi untuk Kru Lapangan
          </h1>
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            Anda sedang login sebagai: {activeCrew.nama} ({activeCrew.jabatan})
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-left space-y-1.5">
          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
            Modul Terkunci: {pageTitle}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {reason}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="flex-1 h-10 rounded-xl text-xs font-bold border-slate-300 dark:border-slate-700 gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Posko Kru</span>
          </Button>
          <Button
            onClick={() => setRole("pemilik")}
            className="flex-1 h-10 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-md shadow-amber-600/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Masuk Mode Pemilik</span>
          </Button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default RBACOwnerGuard;
