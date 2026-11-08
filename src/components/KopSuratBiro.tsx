import React from "react";
import { Building2 } from "lucide-react";
import { BiroProfile, formatLegalitasBiro } from "@/utils/biroProfile";

interface KopSuratBiroProps {
  profile?: BiroProfile | null;
  className?: string;
  showContact?: boolean;
  align?: "left" | "center";
}

/**
 * Komponen Kop Surat Resmi Biro Wisata Indonesia
 * Sesuai standar legalitas AHU (Kemenkumham), NIB (OSS/BKPM), dan Alamat Resmi.
 * Menghasilkan tampilan kop surat identik dengan format fisik biro wisata profesional.
 */
export const KopSuratBiro: React.FC<KopSuratBiroProps> = ({
  profile,
  className = "",
  showContact = true,
  align = "left",
}) => {
  if (!profile) return null;

  const legalitasText = formatLegalitasBiro(profile);

  return (
    <div className={`w-full bg-white text-slate-900 ${className}`}>
      {/* Header Kop: Logo di Kiri + Teks Identitas Resmi */}
      <div className="flex items-center gap-3.5 sm:gap-5 pb-3">
        {/* Logo Biro */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center flex-shrink-0 shadow-2xs overflow-hidden">
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              alt={profile.nama_biro}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/pwa-icon.svg";
              }}
            />
          ) : (
            <div className="w-full h-full rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-800 flex items-center justify-center text-white font-black text-xl shadow-inner">
              {profile.nama_biro.charAt(0) || "B"}
            </div>
          )}
        </div>

        {/* Identitas Biro & Legalitas */}
        <div className={`flex-1 min-w-0 ${align === "center" ? "text-center" : "text-left"}`}>
          {/* Baris 1: Nama Biro Wisata (Besar & Tegas) */}
          <h2 className="text-base sm:text-lg lg:text-xl font-black tracking-wide text-slate-950 uppercase leading-snug">
            {profile.nama_biro || "NAMA BIRO WISATA RESMI"}
          </h2>

          {/* Baris 2: Legalitas Resmi (AHU Kemenkumham & NIB OSS) */}
          {legalitasText ? (
            <p className="text-[11px] sm:text-xs font-black text-slate-800 tracking-wider uppercase mt-0.5 leading-tight font-sans">
              {legalitasText}
            </p>
          ) : profile.slogan ? (
            <p className="text-[11px] sm:text-xs font-bold text-slate-700 tracking-wide mt-0.5 uppercase">
              {profile.slogan}
            </p>
          ) : null}

          {/* Baris 3: Alamat Kantor Operasional */}
          {profile.alamat && (
            <p className="text-[10px] sm:text-[11px] text-slate-700 font-medium mt-0.5 leading-tight">
              Alamat : {profile.alamat}
            </p>
          )}

          {/* Baris 4: Kontak Resmi (Telp/WA, Email, Website) */}
          {showContact && (
            <div className="text-[9.5px] sm:text-[10.5px] text-slate-600 font-mono flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {profile.telepon && <span>Telp/WA: {profile.telepon}</span>}
              {profile.email && <span>• Email: {profile.email}</span>}
              {profile.website && <span>• Web: {profile.website}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Garis Ganda Tebal-Tipis Khas Kop Surat Resmi Indonesia */}
      <div className="space-y-[1.5px] my-1">
        <div className="h-[2.5px] bg-slate-950 w-full" />
        <div className="h-[0.75px] bg-slate-950 w-full" />
      </div>
    </div>
  );
};

export default KopSuratBiro;
