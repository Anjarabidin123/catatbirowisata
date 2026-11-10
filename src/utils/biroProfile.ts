import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "./authHelper";

export interface BiroProfile {
  nama_biro: string;
  slogan: string;
  logo_url: string | null;
  alamat?: string;
  telepon?: string;
  email?: string;
  website?: string;
  pimpinan?: string;
  nama_bank?: string;
  nomor_rekening?: string;
  atas_nama_rekening?: string;
  // Legalitas Resmi Biro (AHU, NIB, NPWP)
  nomor_ahu?: string; // Contoh: "AHU-0016871-AH.0114 TH 2025"
  nomor_nib?: string; // Contoh: "1604260107228"
  npwp?: string; // Contoh: "01.234.567.8-123.000"
  nama_badan_usaha?: string; // Contoh: "PT ENAM SEMBILAN WISATA MANDIRI"
  // Pengaturan Stempel Resmi & Tanda Tangan
  stempel_mode?: "otomatis" | "custom"; // "otomatis" (vektor stempel bulat) atau "custom" (gambar stempel basah)
  stempel_teks_atas?: string; // Teks atas stempel melingkar (default: nama biro)
  stempel_teks_tengah?: string; // Teks banner tengah (default: "LUNAS")
  stempel_teks_bawah?: string; // Teks bawah stempel (default: "OFFICIAL VERIFIED")
  stempel_warna?: string; // Warna tinta stempel (contoh: "#2563eb", "#7c3aed", "#dc2626", "#059669")
  stempel_custom_image_url?: string | null; // Gambar scan stempel basah PNG transparan
  tanda_tangan_url?: string | null; // Gambar scan coretan tanda tangan pimpinan PNG transparan
  jabatan_penandatangan?: string; // Jabatan pimpinan (default: "Pimpinan / Manajemen Keuangan")
  kota_tanda_tangan?: string; // Kota penandatanganan dokumen (default: "Demak")
}

const DEFAULT_PROFILE: BiroProfile = {
  nama_biro: "69 Trans & Tour",
  slogan: "Biro Perjalanan Wisata & Sewa Bus Pariwisata",
  logo_url: "/pwa-icon.svg",
  alamat: "Jl. Stasiun No. 15, Bintoro, Demak, Jawa Tengah",
  telepon: "0812-2578-9000 / 0857-1234-5678",
  email: "operasional@69trans.id",
  website: "www.69trans.id",
  pimpinan: "H. Anjar Abidin, S.E.",
  nama_bank: "Bank Mandiri / BCA",
  nomor_rekening: "136-00-1234567-8",
  atas_nama_rekening: "PT ENAM SEMBILAN WISATA MANDIRI",
  nomor_ahu: "AHU-0016871-AH.0114 TH 2025",
  nomor_nib: "1604260107228",
  npwp: "01.234.567.8-123.000",
  nama_badan_usaha: "PT ENAM SEMBILAN WISATA MANDIRI",
  stempel_mode: "otomatis",
  stempel_teks_atas: "69 TRANS & TOUR",
  stempel_teks_tengah: "LUNAS",
  stempel_teks_bawah: "OFFICIAL VERIFIED",
  stempel_warna: "#2563eb",
  stempel_custom_image_url: null,
  tanda_tangan_url: null,
  jabatan_penandatangan: "Pimpinan / Manajemen Keuangan",
  kota_tanda_tangan: "Demak",
};

const STORAGE_KEY = "app_biro_profile_v1";

let memoryProfileCache: BiroProfile | null = null;

/**
 * Membersihkan nilai bawaan lama ("Malika Tour & Travel") yang mungkin masih tersimpan di cache/metadata
 */
function sanitizeLegacyProfile(raw: Partial<BiroProfile>): { profile: BiroProfile; wasSanitized: boolean } {
  let wasSanitized = false;

  let namaBiro = raw.nama_biro || DEFAULT_PROFILE.nama_biro;
  if (/malika/i.test(namaBiro) || namaBiro === "Catat Biro Wisata") {
    namaBiro = DEFAULT_PROFILE.nama_biro;
    wasSanitized = true;
  }

  let logoUrl = raw.logo_url !== undefined ? raw.logo_url : DEFAULT_PROFILE.logo_url;
  if (logoUrl && /malika/i.test(logoUrl)) {
    logoUrl = DEFAULT_PROFILE.logo_url;
    wasSanitized = true;
  }

  let email = raw.email || DEFAULT_PROFILE.email;
  if (email && (/malika/i.test(email) || email === "operasional@birowisata.id")) {
    email = DEFAULT_PROFILE.email;
    wasSanitized = true;
  }

  let atasNama = raw.atas_nama_rekening || DEFAULT_PROFILE.atas_nama_rekening;
  if (atasNama && (/malika/i.test(atasNama) || atasNama === "Catat Biro Wisata")) {
    atasNama = DEFAULT_PROFILE.atas_nama_rekening;
    wasSanitized = true;
  }

  const profile: BiroProfile = {
    ...DEFAULT_PROFILE,
    ...raw,
    nama_biro: namaBiro,
    logo_url: logoUrl,
    email,
    atas_nama_rekening: atasNama,
  };

  return { profile, wasSanitized };
}

/**
 * Mendapatkan profil biro tersimpan (dari memory cache atau localStorage untuk respons instan O(1))
 */
export function getLocalBiroProfile(): BiroProfile {
  if (memoryProfileCache) {
    return memoryProfileCache;
  }
  try {
    if (typeof localStorage === "undefined") return DEFAULT_PROFILE;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { profile, wasSanitized } = sanitizeLegacyProfile(parsed);
      memoryProfileCache = profile;
      if (wasSanitized) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      }
      return memoryProfileCache;
    }
  } catch (e) {
    console.error("Error reading biro profile from storage:", e);
  }
  memoryProfileCache = DEFAULT_PROFILE;
  return DEFAULT_PROFILE;
}

/**
 * Mengambil profil biro dari Supabase User Metadata dan menyinkronkan ke cache
 */
export async function fetchBiroProfile(): Promise<BiroProfile> {
  try {
    const user = await getActiveUser();
    if (user && user.user_metadata) {
      const meta = user.user_metadata;
      const current = getLocalBiroProfile();
      // Pertahankan logo_url: jika ada di metadata gunakan itu. Jika meta.logo_url null tapi local ada base64 (data:), pertahankan base64. Jika undefined di meta, gunakan local atau default.
      let logoUrl: string | null = null;
      if (meta.logo_url !== undefined && meta.logo_url !== null) {
        logoUrl = meta.logo_url;
      } else if (meta.logo_url === null) {
        if (current.logo_url && current.logo_url.startsWith("data:")) {
          logoUrl = current.logo_url;
        } else {
          logoUrl = null;
        }
      } else {
        logoUrl = current.logo_url || DEFAULT_PROFILE.logo_url;
      }

      let stempelCustomUrl = meta.stempel_custom_image_url !== undefined ? meta.stempel_custom_image_url : current.stempel_custom_image_url;
      if (meta.stempel_custom_image_url === null && current.stempel_custom_image_url?.startsWith("data:")) {
        stempelCustomUrl = current.stempel_custom_image_url;
      }
      let ttdUrl = meta.tanda_tangan_url !== undefined ? meta.tanda_tangan_url : current.tanda_tangan_url;
      if (meta.tanda_tangan_url === null && current.tanda_tangan_url?.startsWith("data:")) {
        ttdUrl = current.tanda_tangan_url;
      }

      const rawMerged: BiroProfile = {
        nama_biro: meta.nama_biro || DEFAULT_PROFILE.nama_biro,
        slogan: meta.slogan || DEFAULT_PROFILE.slogan,
        alamat: meta.alamat || DEFAULT_PROFILE.alamat,
        telepon: meta.telepon || DEFAULT_PROFILE.telepon,
        email: meta.email || DEFAULT_PROFILE.email,
        website: meta.website || DEFAULT_PROFILE.website,
        pimpinan: meta.pimpinan || DEFAULT_PROFILE.pimpinan,
        logo_url: logoUrl,
        nama_bank: meta.nama_bank || DEFAULT_PROFILE.nama_bank,
        nomor_rekening: meta.nomor_rekening || DEFAULT_PROFILE.nomor_rekening,
        atas_nama_rekening: meta.atas_nama_rekening || DEFAULT_PROFILE.atas_nama_rekening,
        nomor_ahu: meta.nomor_ahu || current.nomor_ahu,
        nomor_nib: meta.nomor_nib || current.nomor_nib,
        npwp: meta.npwp || current.npwp,
        nama_badan_usaha: meta.nama_badan_usaha || current.nama_badan_usaha,
        stempel_mode: meta.stempel_mode || current.stempel_mode || "otomatis",
        stempel_teks_atas: meta.stempel_teks_atas || current.stempel_teks_atas || meta.nama_biro || DEFAULT_PROFILE.nama_biro,
        stempel_teks_tengah: meta.stempel_teks_tengah || current.stempel_teks_tengah || "LUNAS",
        stempel_teks_bawah: meta.stempel_teks_bawah || current.stempel_teks_bawah || "OFFICIAL VERIFIED",
        stempel_warna: meta.stempel_warna || current.stempel_warna || "#2563eb",
        stempel_custom_image_url: stempelCustomUrl,
        tanda_tangan_url: ttdUrl,
        jabatan_penandatangan: meta.jabatan_penandatangan || current.jabatan_penandatangan || "Pimpinan / Manajemen Keuangan",
        kota_tanda_tangan: meta.kota_tanda_tangan || current.kota_tanda_tangan || "Demak",
      };
      const { profile, wasSanitized } = sanitizeLegacyProfile(rawMerged);
      memoryProfileCache = profile;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      }
      if (wasSanitized) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("biro-profile-updated", { detail: profile }));
        }
        supabase.auth
          .updateUser({
            data: {
              nama_biro: profile.nama_biro,
              email: profile.email,
              atas_nama_rekening: profile.atas_nama_rekening,
              logo_url: profile.logo_url && !profile.logo_url.startsWith("data:") ? profile.logo_url : null,
            },
          })
          .catch(() => {});
      }
      return profile;
    }
  } catch (err) {
    console.error("Error fetching biro profile from Supabase:", err);
  }
  return getLocalBiroProfile();
}

/**
 * Mengosongkan cache in-memory profil biro (misal saat logout)
 */
export function clearBiroProfileCache(): void {
  memoryProfileCache = null;
}

/**
 * Menyimpan profil biro ke Supabase dan localStorage
 */
export async function saveBiroProfile(profile: Partial<BiroProfile>): Promise<BiroProfile> {
  const current = getLocalBiroProfile();
  const updated: BiroProfile = {
    ...current,
    ...profile,
  };

  // Update in-memory cache dan simpan ke localStorage
  memoryProfileCache = updated;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // Sync ke Supabase auth metadata (Hanya simpan string ringan; JANGAN simpan base64 besar agar JWT token tidak tembus batas header 431)
  try {
    const logoToSync = updated.logo_url && !updated.logo_url.startsWith("data:") ? updated.logo_url : null;
    const stempelToSync = updated.stempel_custom_image_url && !updated.stempel_custom_image_url.startsWith("data:") ? updated.stempel_custom_image_url : null;
    const ttdToSync = updated.tanda_tangan_url && !updated.tanda_tangan_url.startsWith("data:") ? updated.tanda_tangan_url : null;

    await supabase.auth.updateUser({
      data: {
        nama_biro: updated.nama_biro,
        slogan: updated.slogan,
        alamat: updated.alamat,
        telepon: updated.telepon,
        email: updated.email,
        website: updated.website,
        pimpinan: updated.pimpinan,
        logo_url: logoToSync,
        nama_bank: updated.nama_bank,
        nomor_rekening: updated.nomor_rekening,
        atas_nama_rekening: updated.atas_nama_rekening,
        nomor_ahu: updated.nomor_ahu,
        nomor_nib: updated.nomor_nib,
        npwp: updated.npwp,
        nama_badan_usaha: updated.nama_badan_usaha,
        stempel_mode: updated.stempel_mode,
        stempel_teks_atas: updated.stempel_teks_atas,
        stempel_teks_tengah: updated.stempel_teks_tengah,
        stempel_teks_bawah: updated.stempel_teks_bawah,
        stempel_warna: updated.stempel_warna,
        stempel_custom_image_url: stempelToSync,
        tanda_tangan_url: ttdToSync,
        jabatan_penandatangan: updated.jabatan_penandatangan,
        kota_tanda_tangan: updated.kota_tanda_tangan,
      },
    });
  } catch (err) {
    console.warn("Gagal menyinkronkan profil ke Supabase:", err);
  }

  // Pancarkan event agar komponen lain langsung re-render
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("biro-profile-updated", { detail: updated }));
  }

  return updated;
}

/**
 * Format baris legalitas resmi (AHU & NIB) khas biro pariwisata Indonesia
 * Contoh output: "AHU-0016871-AH.0114 TH 2025 . NIB 1604260107228"
 */
export function formatLegalitasBiro(profile?: Partial<BiroProfile> | null): string {
  if (!profile) return "";
  const parts: string[] = [];

  if (profile.nomor_ahu && profile.nomor_ahu.trim()) {
    const raw = profile.nomor_ahu.trim();
    parts.push(raw.toUpperCase().startsWith("AHU") ? raw : `AHU-${raw}`);
  }

  if (profile.nomor_nib && profile.nomor_nib.trim()) {
    const raw = profile.nomor_nib.trim();
    parts.push(raw.toUpperCase().startsWith("NIB") ? raw : `NIB ${raw}`);
  }

  if (profile.npwp && profile.npwp.trim()) {
    const raw = profile.npwp.trim();
    parts.push(raw.toUpperCase().startsWith("NPWP") ? raw : `NPWP ${raw}`);
  }

  return parts.join(" . ");
}

/**
 * Helper kompresi gambar fallback via Canvas (max 256x256px, quality 0.8)
 */
function compressImageViaCanvas(file: File, maxDim = 256, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || "");
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
          resolve(canvas.toDataURL(mime, quality));
        } else {
          resolve((e.target?.result as string) || "");
        }
      };
      img.onerror = () => {
        resolve((e.target?.result as string) || "");
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

/**
 * Upload logo biro ke Supabase Storage (bucket: trip-media)
 */
export async function uploadBiroLogo(file: File): Promise<string> {
  const user = await getActiveUser();
  if (!user) throw new Error("Pengguna belum login");

  const ext = file.name.split(".").pop() || "png";
  const fileName = `${user.id}/logos/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("trip-media")
    .upload(fileName, file, {
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    // Jika storage bermasalah, kompresi ke Base64 via Canvas (max 256x256, quality 0.8)
    return await compressImageViaCanvas(file);
  }

  const { data: { publicUrl } } = supabase.storage
    .from("trip-media")
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Upload gambar stempel basah biro ke Supabase Storage (bucket: trip-media) atau fallback Canvas
 */
export async function uploadBiroStempel(file: File): Promise<string> {
  const user = await getActiveUser();
  if (!user) throw new Error("Pengguna belum login");

  const ext = file.name.split(".").pop() || "png";
  const fileName = `${user.id}/stempel/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("trip-media")
    .upload(fileName, file, {
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    return await compressImageViaCanvas(file, 400, 0.9);
  }

  const { data: { publicUrl } } = supabase.storage
    .from("trip-media")
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Upload gambar tanda tangan pimpinan ke Supabase Storage (bucket: trip-media) atau fallback Canvas
 */
export async function uploadBiroTtd(file: File): Promise<string> {
  const user = await getActiveUser();
  if (!user) throw new Error("Pengguna belum login");

  const ext = file.name.split(".").pop() || "png";
  const fileName = `${user.id}/ttd/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("trip-media")
    .upload(fileName, file, {
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    return await compressImageViaCanvas(file, 400, 0.9);
  }

  const { data: { publicUrl } } = supabase.storage
    .from("trip-media")
    .getPublicUrl(fileName);

  return publicUrl;
}
