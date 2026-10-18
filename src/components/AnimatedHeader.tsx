import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { PengaturanBiroDialog } from "./PengaturanBiroDialog";
import { getLocalBiroProfile, fetchBiroProfile, BiroProfile } from "@/utils/biroProfile";

export const AnimatedHeader = () => {
  const [showPengaturan, setShowPengaturan] = useState(false);
  const [profile, setProfile] = useState<BiroProfile>(getLocalBiroProfile());

  useEffect(() => {
    // Muat data awal dan sinkronkan dengan Supabase
    fetchBiroProfile().then(setProfile);

    // Dengar event saat profil diubah di Pengaturan
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setProfile(e.detail);
      }
    };

    window.addEventListener("biro-profile-updated", handleUpdate);
    return () => window.removeEventListener("biro-profile-updated", handleUpdate);
  }, []);

  // Inisial nama biro jika belum ada logo
  const initials = profile.nama_biro
    ? profile.nama_biro
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "BW";

  return (
    <>
      <div className="flex items-center gap-2.5">
        {/* Custom Logo Biro (Dapat diubah di Pengaturan) */}
        {profile.logo_url ? (
          <button
            type="button"
            onClick={() => setShowPengaturan(true)}
            className="w-10 h-10 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex items-center justify-center p-0.5 hover:scale-105 transition-transform"
            title="Klik untuk ganti logo / edit biro"
          >
            <img
              src={profile.logo_url}
              alt={profile.nama_biro}
              className="w-full h-full object-contain"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowPengaturan(true)}
            className="w-9 h-9 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-black text-xs tracking-wider shadow-sm hover:bg-blue-600 transition-colors"
            title="Klik untuk atur logo & nama biro"
          >
            {initials}
          </button>
        )}

        {/* Nama & Slogan Biro Wisata (Dinamis dari Pengaturan) */}
        <div 
          onClick={() => setShowPengaturan(true)}
          className="cursor-pointer group select-none"
          title="Klik untuk ubah nama biro"
        >
          <div className="flex items-center gap-1.5">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate max-w-[170px] sm:max-w-[220px]">
              {profile.nama_biro}
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Biro
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="truncate max-w-[180px]">{profile.slogan}</span>
          </div>
        </div>

        {/* Action Button: Pengaturan */}
        <button
          onClick={() => setShowPengaturan(true)}
          className="ml-0.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-blue-600"
          title="Pengaturan Logo & Nama Biro"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Dialog Pengaturan Profil Biro */}
      <PengaturanBiroDialog open={showPengaturan} onOpenChange={setShowPengaturan} />
    </>
  );
};
