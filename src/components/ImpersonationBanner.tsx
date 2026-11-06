import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, ShieldAlert, ArrowLeft, Building2 } from "lucide-react";
import {
  getImpersonatedTenantId,
  getTenantById,
  stopImpersonation,
} from "@/utils/licenseEntitlement";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const ImpersonationBanner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [impersonatedId, setImpersonatedId] = useState<string | null>(getImpersonatedTenantId);

  useEffect(() => {
    const handleUpdate = () => {
      setImpersonatedId(getImpersonatedTenantId());
    };

    window.addEventListener("catatbiro-entitlement-updated", handleUpdate);
    window.addEventListener("catatbiro-tenants-updated", handleUpdate);

    return () => {
      window.removeEventListener("catatbiro-entitlement-updated", handleUpdate);
      window.removeEventListener("catatbiro-tenants-updated", handleUpdate);
    };
  }, []);

  // Jangan tampilkan jika tidak ada impersonasi atau sedang berada di konsol Super Admin sendiri
  if (!impersonatedId || location.pathname.startsWith("/super-admin")) {
    return null;
  }

  const tenant = getTenantById(impersonatedId);
  const biroName = tenant?.namaBiro || "Biro Mitra";
  const tierName = (tenant?.tier || "Starter").toUpperCase();

  const handleExit = () => {
    stopImpersonation();
    toast.success("Mode simulasi dihentikan. Kembali ke Super Admin.");
    navigate("/super-admin?view=tenants");
  };

  return (
    <aside
      aria-label="Mode Simulasi Impersonasi Biro"
      className="sticky top-0 z-[60] w-full bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-3 sm:px-4 py-2 shadow-md border-b border-amber-600 flex flex-wrap items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-xs">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-black tracking-tight">
            Mode Simulasi: Anda sedang masuk sebagai biro{" "}
            <span className="underline decoration-slate-950 decoration-2 font-black">
              {biroName}
            </span>
          </span>
          <span className="text-[10px] bg-slate-950/20 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
            {tierName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={handleExit}
          className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs h-7 px-3 rounded-lg shadow-sm gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Super Admin</span>
        </Button>
      </div>
    </aside>
  );
};

export default ImpersonationBanner;
