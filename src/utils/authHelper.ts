import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

let inMemoryUser: User | null = null;
let inMemorySession: Session | null = null;
let isInitialized = false;

// Hidrasi sinkron dari localStorage saat modul pertama kali di-load
if (typeof window !== "undefined" && window.localStorage) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") && key.endsWith("-auth-token"))) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed?.access_token) {
            inMemorySession = parsed as Session;
            if (parsed.user) {
              inMemoryUser = parsed.user as User;
            }
            break;
          }
        }
      }
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
}

/**
 * Cek ketersediaan sesi auth secara sinkron tanpa jeda event loop
 */
export const getInitialSessionSync = (): boolean => {
  return inMemorySession !== null;
};

export const getActiveUserSync = (): User | null => {
  return inMemoryUser;
};

/**
 * Inisialisasi listener auth agar perubahan sesi langsung memperbarui cache memori
 */
export const initAuthListener = () => {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  try {
    supabase.auth.onAuthStateChange((_event, session) => {
      inMemorySession = session;
      inMemoryUser = session?.user || null;
    });
  } catch (e) {
    console.warn("[authHelper] Gagal menginisialisasi listener auth:", e);
  }
};

initAuthListener();

/**
 * Mengambil active user secara instan ("satset"):
 * 1. Cek cache in-memory (<0.01ms)
 * 2. Cek getSession() dari localStorage tanpa network roundtrip (<0.1ms)
 * 3. Fallback ke getUser() hanya jika sesi kosong
 */
export const getActiveUser = async (): Promise<User | null> => {
  if (inMemoryUser) return inMemoryUser;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      inMemorySession = session;
      inMemoryUser = session.user;
      return session.user;
    }
  } catch (e) {
    // Ignore and proceed to fallback
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      inMemoryUser = user;
      return user;
    }
  } catch (e) {
    console.warn("[authHelper] Gagal mengambil user dari Supabase:", e);
  }

  return null;
};

/**
 * Mengambil active session secara instan dari cache lokal
 */
export const getActiveSession = async (): Promise<Session | null> => {
  if (inMemorySession) return inMemorySession;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      inMemorySession = session;
      inMemoryUser = session.user;
      return session;
    }
  } catch (e) {
    console.warn("[authHelper] Gagal mengambil session:", e);
  }

  return null;
};

/**
 * Mengosongkan cache in-memory saat logout
 */
export const clearAuthCache = () => {
  inMemoryUser = null;
  inMemorySession = null;
};
