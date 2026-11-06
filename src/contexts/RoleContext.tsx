import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { getLocalBiroProfile } from "@/utils/biroProfile";
import {
  ActiveCrewIdentity,
  CrewMember,
  DetectedDeviceInfo,
  RBACPermissionRule,
  detectCurrentDevice,
  getActiveCrewIdentity,
  getCrewMembers,
  getRBACPermissionRules,
  isCrewSessionRevoked,
  isCrewAccountDisabled,
  logCrewActivity,
  registerCurrentDeviceLogin,
  restoreCrewAccess,
  setActiveCrewIdentity,
  fetchCrewMembersDB,
  fetchRBACPermissionRulesDB,
  subscribeToRBACRealtime,
} from "@/utils/rbacAuditLogger";
import { toast } from "sonner";
import { ShieldAlert, Power, ShieldCheck, UserCheck, UserX } from "lucide-react";

export type UserRole = "pemilik" | "kru";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => Promise<void>;
  toggleRole: () => Promise<void>;
  isPemilik: boolean;
  isKru: boolean;
  roleName: string;
  roleDescription: string;
  activeCrew: ActiveCrewIdentity;
  activeCrewMember?: CrewMember;
  switchActiveCrew: (crewId: string) => void;
  crewList: CrewMember[];
  currentDevice: DetectedDeviceInfo;
  refreshCrewList: () => void;
  rbacRules: RBACPermissionRule[];
  hasPermission: (ruleId: string) => boolean;
  isTripAllowedForActiveCrew: (trip: { id: string; nama_trip: string; nama_driver?: string | null }) => boolean;
  isSessionRevoked: boolean;
  isAccountDisabled: boolean;
  restoreActiveCrewSession: () => void;
}

const STORAGE_KEY = "app_user_role";

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) as UserRole | null;
      if (saved === "pemilik" || saved === "kru") return saved;
    }
    return "pemilik";
  });

  const [activeCrew, setActiveCrew] = useState<ActiveCrewIdentity>(() => getActiveCrewIdentity());
  const [crewList, setCrewList] = useState<CrewMember[]>(() => getCrewMembers());
  const [rbacRules, setRbacRules] = useState<RBACPermissionRule[]>(() => getRBACPermissionRules());
  const [currentDevice] = useState<DetectedDeviceInfo>(() => detectCurrentDevice());
  const [isSessionRevoked, setIsSessionRevoked] = useState<boolean>(() =>
    isCrewSessionRevoked(getActiveCrewIdentity().crewId)
  );
  const [isAccountDisabled, setIsAccountDisabled] = useState<boolean>(() =>
    isCrewAccountDisabled(getActiveCrewIdentity().crewId)
  );

  const refreshCrewList = () => {
    const currentIdentity = getActiveCrewIdentity();
    const members = getCrewMembers();
    setCrewList(members);
    setActiveCrew(currentIdentity);
    setRbacRules(getRBACPermissionRules());
    setIsSessionRevoked(isCrewSessionRevoked(currentIdentity.crewId));
    setIsAccountDisabled(isCrewAccountDisabled(currentIdentity.crewId));
  };

  // Muat data dari Supabase database & dengarkan Realtime update
  useEffect(() => {
    let isMounted = true;

    const loadRealtimeDB = async () => {
      try {
        const [members, rules] = await Promise.all([
          fetchCrewMembersDB(),
          fetchRBACPermissionRulesDB(),
        ]);
        if (isMounted) {
          setCrewList(members);
          setRbacRules(rules);
          const currentIdentity = getActiveCrewIdentity();
          setIsSessionRevoked(isCrewSessionRevoked(currentIdentity.crewId));
          setIsAccountDisabled(isCrewAccountDisabled(currentIdentity.crewId));
        }
      } catch (err) {
        console.warn("[RoleContext] Gagal sinkron ke database:", err);
      }
    };

    loadRealtimeDB();

    const handleAuditUpdate = () => {
      refreshCrewList();
    };
    window.addEventListener("rbac-audit-updated", handleAuditUpdate);

    // Supabase Realtime Channel
    const unsubscribeRealtime = subscribeToRBACRealtime(() => {
      loadRealtimeDB();
    });

    return () => {
      isMounted = false;
      window.removeEventListener("rbac-audit-updated", handleAuditUpdate);
      unsubscribeRealtime();
    };
  }, []);

  // Sinkronisasi dari Supabase user_metadata saat inisialisasi dan saat auth state berubah
  useEffect(() => {
    const initRoleFromAuth = async () => {
      try {
        const user = await getActiveUser();
        if (user?.user_metadata?.role) {
          const metaRole = user.user_metadata.role as UserRole;
          if (metaRole === "pemilik" || metaRole === "kru") {
            setRoleState(metaRole);
            if (typeof localStorage !== "undefined") {
              localStorage.setItem(STORAGE_KEY, metaRole);
            }
          }
        }
      } catch (err) {
        console.warn("Gagal membaca role dari Supabase auth:", err);
      }
    };

    initRoleFromAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const metaRole = session?.user?.user_metadata?.role as UserRole;
      if (metaRole === "pemilik" || metaRole === "kru") {
        setRoleState(metaRole);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(STORAGE_KEY, metaRole);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const switchActiveCrew = (crewId: string) => {
    const allCrew = getCrewMembers();
    const found = allCrew.find((c) => c.id === crewId);
    if (!found) return;

    const newIdentity: ActiveCrewIdentity = {
      crewId: found.id,
      nama: found.nama,
      jabatan: found.jabatan,
      kodeKru: found.kodeKru,
    };

    setActiveCrew(newIdentity);
    setActiveCrewIdentity(newIdentity);

    registerCurrentDeviceLogin({
      role: "kru",
      crewId: found.id,
      crewName: found.nama,
      jabatan: found.jabatan,
    });

    const revoked = isCrewSessionRevoked(found.id);
    const disabled = found.status === "nonaktif";
    setIsSessionRevoked(revoked);
    setIsAccountDisabled(disabled);

    logCrewActivity({
      kategori: "login_device",
      aksi: `Beralih Personel Kru Aktif: ${found.nama}`,
      detail: `Sesi perangkat ${currentDevice.deviceName} digunakan oleh ${found.nama} (${found.jabatan}) untuk trip "${found.assignedTrip}"`,
      tripName: found.assignedTrip,
      status: disabled || revoked ? "peringatan" : "sukses",
      customActor: {
        crewId: found.id,
        crewName: found.nama,
        jabatan: found.jabatan,
        role: "kru",
      },
    });

    if (disabled) {
      toast.error(`Akun ${found.nama} sedang dinonaktifkan oleh Pemilik Biro.`);
    } else if (revoked) {
      toast.error(`Sesi perangkat ${found.nama} sedang diputus (Force Logout) oleh Pemilik Biro.`);
    } else {
      toast.success(`Bertugas sebagai: ${found.nama} (${found.jabatan})`);
    }
  };

  const restoreActiveCrewSession = () => {
    restoreCrewAccess(activeCrew.crewId);
    setIsSessionRevoked(false);
    setIsAccountDisabled(false);
    toast.success(`Akses perangkat untuk ${activeCrew.nama} telah dipulihkan!`);
  };

  const setRole = async (newRole: UserRole) => {
    setRoleState(newRole);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newRole);
    }

    const profile = getLocalBiroProfile();
    const crewIdentity = getActiveCrewIdentity();

    if (newRole === "pemilik") {
      registerCurrentDeviceLogin({
        role: "pemilik",
        crewId: "owner_primary",
        crewName: profile.pimpinan || "Pemilik Biro Utama",
        jabatan: "Pemilik Biro / Direktur",
      });
      logCrewActivity({
        kategori: "keamanan_rbac",
        aksi: "Mengaktifkan Mode Pemilik Biro (Owner)",
        detail: `Akses kontrol penuh diaktifkan pada perangkat ${currentDevice.deviceName} (${currentDevice.os})`,
        customActor: {
          crewId: "owner_primary",
          crewName: profile.pimpinan || "Pemilik Biro",
          jabatan: "Pemilik Biro",
          role: "pemilik",
        },
      });
    } else {
      registerCurrentDeviceLogin({
        role: "kru",
        crewId: crewIdentity.crewId,
        crewName: crewIdentity.nama,
        jabatan: crewIdentity.jabatan,
      });
      setIsSessionRevoked(isCrewSessionRevoked(crewIdentity.crewId));
      setIsAccountDisabled(isCrewAccountDisabled(crewIdentity.crewId));
      logCrewActivity({
        kategori: "login_device",
        aksi: `Masuk Mode Kru Lapangan (${crewIdentity.nama})`,
        detail: `${crewIdentity.nama} (${crewIdentity.jabatan}) aktif menggunakan perangkat ${currentDevice.deviceName}`,
        customActor: {
          crewId: crewIdentity.crewId,
          crewName: crewIdentity.nama,
          jabatan: crewIdentity.jabatan,
          role: "kru",
        },
      });
    }

    try {
      const user = await getActiveUser();
      if (user) {
        await supabase.auth.updateUser({
          data: { role: newRole },
        });
      }

    } catch (err) {
      console.warn("Gagal menyinkronkan role ke Supabase:", err);
    }
  };

  const toggleRole = async () => {
    const nextRole: UserRole = role === "pemilik" ? "kru" : "pemilik";
    await setRole(nextRole);
  };

  const isPemilik = role === "pemilik";
  const isKru = role === "kru";

  const hasPermission = (ruleId: string): boolean => {
    if (isPemilik) return true;
    if (isSessionRevoked || isAccountDisabled) return false;
    const rule = rbacRules.find((r) => r.id === ruleId);
    if (!rule) return false;
    return Boolean(rule.aksesKru);
  };

  const activeCrewMember = crewList.find((c) => c.id === activeCrew.crewId);

  /**
   * Logika Penyaringan Hak Akses Trip:
   * 1. Pemilik Biro melihat SEMUA trip tanpa batasan.
   * 2. Kru Lapangan (Tour Leader) HANYA melihat trip yang secara spesifik ditugaskan oleh Pemilik.
   *    Jika biro punya 6 TL dan hanya 3 TL yang ditugaskan ke trip tertentu, maka 3 TL lainnya
   *    TIDAK AKAN melihat trip tersebut di Dashboard maupun Daftar Trips!
   */
  const isTripAllowedForActiveCrew = (trip: {
    id: string;
    nama_trip: string;
    nama_driver?: string | null;
  }): boolean => {
    if (isPemilik) return true;
    if (!activeCrewMember) return true;

    // 1. Cek kecocokan berdasarkan ID Trip yang ditugaskan
    if (activeCrewMember.assignedTripIds && activeCrewMember.assignedTripIds.length > 0) {
      if (activeCrewMember.assignedTripIds.includes(trip.id)) {
        return true;
      }
    }

    // 2. Cek kecocokan berdasarkan Nama Trip yang ditugaskan
    if (
      activeCrewMember.assignedTrip &&
      activeCrewMember.assignedTrip !== "Belum Ditugaskan" &&
      activeCrewMember.assignedTrip !== "Standby Operasional"
    ) {
      const assignedNames = activeCrewMember.assignedTrip
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const tripName = trip.nama_trip.toLowerCase();

      if (
        assignedNames.some(
          (name) => tripName.includes(name) || name.includes(tripName)
        )
      ) {
        return true;
      }
    }

    // 3. Cek apakah nama kru tertulis pada driver/kru di data trip
    if (
      trip.nama_driver &&
      trip.nama_driver.toLowerCase().includes(activeCrew.nama.toLowerCase())
    ) {
      return true;
    }

    return false;
  };

  const roleName = isPemilik ? "Pemilik Biro" : `Kru (${activeCrew.jabatan})`;
  const roleDescription = isPemilik
    ? "Akses kontrol penuh: keuangan biro, laba/rugi, monitor kru & device, invoice resmi"
    : `Petugas: ${activeCrew.nama} • Fokus rundown, petty cash TL, manifest kursi & checklist`;

  const isBlocked = isKru && (isSessionRevoked || isAccountDisabled);

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        toggleRole,
        isPemilik,
        isKru,
        roleName,
        roleDescription,
        activeCrew,
        activeCrewMember,
        switchActiveCrew,
        crewList,
        currentDevice,
        refreshCrewList,
        rbacRules,
        hasPermission,
        isTripAllowedForActiveCrew,
        isSessionRevoked: isKru && isSessionRevoked,
        isAccountDisabled: isKru && isAccountDisabled,
        restoreActiveCrewSession,
      }}
    >
      {/* Proteksi Real-Time: Sesi Diputus / Akun Dinonaktifkan oleh Pemilik Biro */}
      {isBlocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                isAccountDisabled
                  ? "bg-rose-100 dark:bg-rose-950/70 text-rose-600"
                  : "bg-amber-100 dark:bg-amber-950/70 text-amber-600"
              }`}
            >
              {isAccountDisabled ? <UserX className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
            </div>

            <div className="space-y-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  isAccountDisabled
                    ? "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900 dark:text-rose-200"
                    : "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900 dark:text-amber-200"
                }`}
              >
                <Power className="w-3 h-3" />
                {isAccountDisabled ? "Akun Dinonaktifkan" : "Sesi Perangkat Diputus"}
              </span>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isAccountDisabled
                  ? `Akun ${activeCrew.nama} Sedang Dinonaktifkan`
                  : `Akses Kru ${activeCrew.nama} Diputus Sementara`}
              </h2>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isAccountDisabled
                  ? `Pemilik Biro telah menonaktifkan status akun untuk ${activeCrew.nama} (${activeCrew.jabatan}). Seluruh akses menu, jadwal trip, dan operasional terkunci hingga akun diaktifkan kembali di panel pemilik.`
                  : `Pemilik Biro telah memutus sesi login pada perangkat ${currentDevice.deviceName} untuk ${activeCrew.nama}. Hubungi pemilik untuk menyambungkan kembali sesi.`}
              </p>
            </div>

            {crewList.filter((c) => c.status !== "nonaktif").length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-left space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Beralih ke Personel Kru Lain yang Aktif:
                </label>
                <select
                  value={activeCrew.crewId}
                  onChange={(e) => switchActiveCrew(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {crewList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama} ({c.jabatan}) {c.status === "nonaktif" ? "— [AKUN NONAKTIF]" : "— [AKTIF]"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {!isAccountDisabled && (
                <button
                  type="button"
                  onClick={restoreActiveCrewSession}
                  className="flex-1 h-9 px-3 rounded-lg text-xs font-semibold border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
                >
                  Pulihkan Sesi Kru Ini
                </button>
              )}
              <button
                type="button"
                onClick={() => setRole("pemilik")}
                className="flex-1 h-9 px-3 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Masuk Mode Pemilik Biro</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
};
