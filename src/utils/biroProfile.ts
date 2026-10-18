import { supabase } from "@/integrations/supabase/client";

export interface BiroProfile {
  nama_biro: string;
  slogan: string;
  logo_url: string | null;
  gemini_api_key?: string;
}

const decodeSafeKey = (encoded: string): string => {
  try {
    return atob(encoded);
  } catch {
    return "";
  }
};

export const DEFAULT_GEMINI_API_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) ||
  decodeSafeKey("QVEuQWI4Uk42S3pVOUhPVFRYT3RpTWx5MXZZcXJnendLUFhwS1lxWHNFR1R2SnhscmRRbnc=");

const DEFAULT_PROFILE: BiroProfile = {
  nama_biro: "Biro Wisata",
  slogan: "Pesona Wisata Nusantara",
  logo_url: null,
  gemini_api_key: DEFAULT_GEMINI_API_KEY,
};

const STORAGE_KEY = "app_biro_profile_v1";

/**
 * Mendapatkan profil biro tersimpan (dari localStorage untuk respons instan)
 */
export function getLocalBiroProfile(): BiroProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        gemini_api_key: parsed.gemini_api_key || DEFAULT_GEMINI_API_KEY,
      };
    }
  } catch (e) {
    console.error("Error reading biro profile from storage:", e);
  }
  return DEFAULT_PROFILE;
}

/**
 * Mengambil API key aktif (custom dari user atau default sistem)
 */
export function getActiveGeminiApiKey(): string {
  const profile = getLocalBiroProfile();
  if (profile.gemini_api_key && profile.gemini_api_key.trim().length > 10) {
    return profile.gemini_api_key.trim();
  }
  return DEFAULT_GEMINI_API_KEY;
}

/**
 * Memeriksa apakah user sedang memakai default API key atau custom
 */
export function isUsingDefaultGeminiApiKey(): boolean {
  const profile = getLocalBiroProfile();
  return (
    !profile.gemini_api_key ||
    profile.gemini_api_key.trim() === DEFAULT_GEMINI_API_KEY.trim()
  );
}

/**
 * Mengambil profil biro dari Supabase User Metadata dan menyinkronkan ke cache
 */
export async function fetchBiroProfile(): Promise<BiroProfile> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.user_metadata) {
      const meta = user.user_metadata;
      const profile: BiroProfile = {
        nama_biro: meta.nama_biro || DEFAULT_PROFILE.nama_biro,
        slogan: meta.slogan || DEFAULT_PROFILE.slogan,
        logo_url: meta.logo_url || null,
        gemini_api_key: meta.gemini_api_key || DEFAULT_GEMINI_API_KEY,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return profile;
    }
  } catch (err) {
    console.error("Error fetching biro profile from Supabase:", err);
  }
  return getLocalBiroProfile();
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

  // Simpan ke localStorage terlebih dahulu
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Sync ke Supabase auth metadata
  try {
    await supabase.auth.updateUser({
      data: {
        nama_biro: updated.nama_biro,
        slogan: updated.slogan,
        logo_url: updated.logo_url,
        gemini_api_key: updated.gemini_api_key,
      },
    });
  } catch (err) {
    console.warn("Gagal menyinkronkan profil ke Supabase:", err);
  }

  // Pancarkan event agar komponen lain langsung re-render
  window.dispatchEvent(new CustomEvent("biro-profile-updated", { detail: updated }));

  return updated;
}

/**
 * Upload logo biro ke Supabase Storage (bucket: trip-media)
 */
export async function uploadBiroLogo(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Pengguna belum login");

  const ext = file.name.split(".").pop() || "png";
  const fileName = `logos/${user.id}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("trip-media")
    .upload(fileName, file, {
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    // Jika storage bermasalah, konversi ke Base64 sebagai fallback instan
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }

  const { data: { publicUrl } } = supabase.storage
    .from("trip-media")
    .getPublicUrl(fileName);

  return publicUrl;
}
