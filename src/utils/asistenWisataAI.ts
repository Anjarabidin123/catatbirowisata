/**
 * Helper modul konfigurasi Asisten Wisata AI (Google Gemini API Key)
 */

export const GEMINI_API_KEY_STORAGE = "catatbiro_gemini_api_key";

export const getStoredApiKey = (): string => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GEMINI_API_KEY_STORAGE) || "";
};

export const setStoredApiKey = (key: string): void => {
  if (typeof window === "undefined") return;
  if (!key) {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  } else {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
  }
};
