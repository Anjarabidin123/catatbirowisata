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

/**
 * Logout aman: HANYA bersihkan token sesi Supabase dan cache auth in-memory.
 * JANGAN PERNAH menghapus konfigurasi tenant Super Admin, audit logs, target omset,
 * profil biro, atau lisensi lokal!
 */
export const safeLogout = async () => {
  try {
    await supabase.auth.signOut().catch(() => {});
  } finally {
    clearAuthCache();
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const preserveKeys = new Set([
          "catatbiro_tenants_store_v1",
          "catatbiro_super_admin_audit_logs_v1",
          "catatbiro_platform_settings_v1",
          "catatbiro_monthly_goals_v1",
          "catatbiro_is_superadmin_override",
          "catatbiro_downloaded_pdfs_v1",
          "catatbiro_custom_tier",
          "catatbiro_support_tickets_v1",
          "catatbiro_system_broadcasts_v1",
          "app_biro_profile_v1",
          "catatbiro_cms_data_v1",
          "app_remembered_email",
          "vite-ui-theme",
        ]);

        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || preserveKeys.has(key)) continue;

          // Hapus token sesi Supabase dan state transient saja
          if (
            (key.startsWith("sb-") && key.endsWith("-auth-token")) ||
            key === "active_trip_id" ||
            key === "catatbiro_impersonated_tenant_id_v1" ||
            key === "catatbiro_cached_trips"
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn("safeLogout storage cleanup warning:", e);
      }
    }
  }
};
