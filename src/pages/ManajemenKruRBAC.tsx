import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import RBACOwnerGuard from "@/components/RBACOwnerGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";
import {
  CrewMember,
  DeviceSession,
  CrewActivityLog,
  RBACPermissionRule,
  CrewJabatan,
  DeviceType,
  ActivityCategory,
  getCrewMembers,
  getDeviceSessions,
  getActivityLogs,
  getRBACPermissionRules,
  fetchCrewMembersDB,
  addCrewMemberDB,
  updateCrewMemberDB,
  deleteCrewMemberDB,
  fetchDeviceSessionsDB,
  toggleDeviceSessionStatusDB,
  fetchActivityLogsDB,
  fetchRBACPermissionRulesDB,
  toggleKruPermissionRuleDB,
  subscribeToRBACRealtime,
  fetchAllTripsDB,
  assignCrewToTripsDB,
  toggleCrewAccountStatusDB,
} from "@/utils/rbacAuditLogger";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Users,
  Smartphone,
  Laptop,
  Tablet,
  Plus,
  Search,
  Trash2,
  Power,
  RefreshCw,
  UserCheck,
  Eye,
  Database,
  MapPin,
  Compass,
  CheckSquare,
  Square,
  Calendar,
  Bus,
  Check,
  Copy,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Edit,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";

const JABATAN_LIST: CrewJabatan[] = [
  "Tour Leader",
  "Driver Utama",
  "Co-Driver / Kernet",
  "Koordinator Lapangan",
  "Staf Operasional",
];

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  keuangan_lapangan: "Kas Saku Lapangan",
  checklist_armada: "Checklist & Armada",
  manifest_kursi: "Manifest Kursi Bus",
  operasional_trip: "Operasional Trip",
  catatan_htm: "Catatan & Rundown",
  login_device: "Login & Perangkat",
  keamanan_rbac: "Hak Akses & Sistem",
};

const DeviceIcon: React.FC<{ type: DeviceType; className?: string }> = ({
  type,
  className = "w-4 h-4",
}) => {
  if (type === "Smartphone") return <Smartphone className={className} />;
  if (type === "Tablet") return <Tablet className={className} />;
  return <Laptop className={className} />;
};

interface TripOption {
  id: string;
  nama_trip: string;
  tanggal: string;
  tujuan: string;
  nama_driver?: string | null;
  nama_kendaraan?: string | null;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "KR";
};

const ManajemenKruRBAC: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "kru";

  const { currentDevice, setRole, switchActiveCrew } = useRole();

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>(() => getCrewMembers());
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>(() => getDeviceSessions());
  const [activityLogs, setActivityLogs] = useState<CrewActivityLog[]>(() => getActivityLogs());
  const [rbacRules, setRbacRules] = useState<RBACPermissionRule[]>(() => getRBACPermissionRules());
  const [tripsList, setTripsList] = useState<TripOption[]>([]);
  const [isLoadingDB, setIsLoadingDB] = useState<boolean>(false);

  // Filter Log & Kru
  const [selectedCrewFilter, setSelectedCrewFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [searchLogQuery, setSearchLogQuery] = useState<string>("");
  const [searchCrewQuery, setSearchCrewQuery] = useState<string>("");

  // Modal Tambah / Edit Kru
  const [showAddCrewModal, setShowAddCrewModal] = useState(false);
  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);

  // Modal Penugasan Trip (RBAC Trip Level)
  const [assigningCrew, setAssigningCrew] = useState<CrewMember | null>(null);
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [tripSearchQuery, setTripSearchQuery] = useState<string>("");

  // Modal Info SQL
  const [showMigrationInfo, setShowMigrationInfo] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);

  const [newCrewForm, setNewCrewForm] = useState({
    nama: "",
    jabatan: "Tour Leader" as CrewJabatan,
    telepon: "",
    email: "",
    assignedTrip: "Standby Operasional",
  });

  const loadAllDataFromDB = async () => {
    setIsLoadingDB(true);
    try {
      const [members, sessions, logs, rules, trips] = await Promise.all([
        fetchCrewMembersDB(),
        fetchDeviceSessionsDB(),
        fetchActivityLogsDB(),
        fetchRBACPermissionRulesDB(),
        fetchAllTripsDB(),
      ]);
      setCrewMembers(members);
      setDeviceSessions(sessions);
      setActivityLogs(logs);
      setRbacRules(rules);
      setTripsList(trips);
    } catch (err) {
      console.warn("Gagal sinkron data RBAC dari database:", err);
      setCrewMembers(getCrewMembers());
      setDeviceSessions(getDeviceSessions());
      setActivityLogs(getActivityLogs());
      setRbacRules(getRBACPermissionRules());
    } finally {
      setIsLoadingDB(false);
    }
  };

  useEffect(() => {
    loadAllDataFromDB();

    const handleAuditUpdate = () => {
      setCrewMembers(getCrewMembers());
      setDeviceSessions(getDeviceSessions());
      setActivityLogs(getActivityLogs());
      setRbacRules(getRBACPermissionRules());
    };
    window.addEventListener("rbac-audit-updated", handleAuditUpdate);

    // Berlangganan Realtime Supabase
    const unsubscribeRealtime = subscribeToRBACRealtime(() => {
      loadAllDataFromDB();
    });

    return () => {
      window.removeEventListener("rbac-audit-updated", handleAuditUpdate);
      unsubscribeRealtime();
    };
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["kru", "penugasan", "devices", "aktivitas", "rbac"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val });
  };

  const handleAddCrewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrewForm.nama.trim()) {
      toast.error("Nama kru wajib diisi");
      return;
    }

    try {
      const created = await addCrewMemberDB({
        nama: newCrewForm.nama.trim(),
        jabatan: newCrewForm.jabatan,
        telepon: newCrewForm.telepon.trim() || "0812-0000-0000",
        email:
          newCrewForm.email.trim() ||
          `${newCrewForm.nama.trim().toLowerCase().replace(/\s+/g, ".")}@birowisata.id`,
        assignedTrip: newCrewForm.assignedTrip.trim() || "Standby Operasional",
      });

      await loadAllDataFromDB();
      setShowAddCrewModal(false);
      setNewCrewForm({
        nama: "",
        jabatan: "Tour Leader",
        telepon: "",
        email: "",
        assignedTrip: "Standby Operasional",
      });
      toast.success(`Kru "${created.nama}" berhasil disimpan ke database Supabase`);
    } catch (err) {
      toast.error("Gagal menambahkan kru");
    }
  };

  const handleSaveEditCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCrew) return;
    try {
      await updateCrewMemberDB(editingCrew.id, {
        nama: editingCrew.nama,
        jabatan: editingCrew.jabatan,
        telepon: editingCrew.telepon,
        email: editingCrew.email,
        assignedTrip: editingCrew.assignedTrip,
        assignedTripIds: editingCrew.assignedTripIds,
        status: editingCrew.status,
      });
      await loadAllDataFromDB();
      setEditingCrew(null);
      toast.success("Data kru berhasil diperbarui di database");
    } catch (err) {
      toast.error("Gagal memperbarui data kru");
    }
  };

  const handleDeleteCrew = async (crew: CrewMember) => {
    if (!window.confirm(`Hapus kru "${crew.nama}" dari daftar personel dan database?`)) return;
    try {
      await deleteCrewMemberDB(crew.id);
      await loadAllDataFromDB();
      toast.success(`Kru ${crew.nama} telah dihapus dari database`);
    } catch (err) {
      toast.error("Gagal menghapus kru");
    }
  };

  const handleToggleAccountStatus = async (crew: CrewMember) => {
    const isCurrentlyDisabled = crew.status === "nonaktif";
    const confirmMsg = isCurrentlyDisabled
      ? `Aktifkan kembali akun untuk ${crew.nama}? Kru ini akan dapat login dan bertugas kembali.`
      : `Nonaktifkan akun untuk ${crew.nama}? Seluruh sesi perangkat akan diputus dan kru tidak dapat mengakses sistem.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const isNowActive = await toggleCrewAccountStatusDB(crew.id);
      await loadAllDataFromDB();
      if (isNowActive) {
        toast.success(`Akun ${crew.nama} telah diaktifkan kembali.`);
      } else {
        toast.warning(`Akun ${crew.nama} berhasil dinonaktifkan (akses diblokir).`);
      }
    } catch (err) {
      toast.error("Gagal mengubah status akun kru");
    }
  };

  const handleOpenAssignModal = (crew: CrewMember) => {
    setAssigningCrew(crew);
    setSelectedTripIds(crew.assignedTripIds || []);
    setTripSearchQuery("");
  };

  const handleToggleTripSelection = (tripId: string) => {
    setSelectedTripIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    );
  };

  const handleSelectAllTrips = () => {
    setSelectedTripIds(tripsList.map((t) => t.id));
  };

  const handleClearAllTrips = () => {
    setSelectedTripIds([]);
  };

  const handleSaveTripAssignments = async () => {
    if (!assigningCrew) return;
    try {
      const selectedNames = tripsList
        .filter((t) => selectedTripIds.includes(t.id))
        .map((t) => t.nama_trip);

      await assignCrewToTripsDB(assigningCrew.id, selectedTripIds, selectedNames);
      await loadAllDataFromDB();
      setAssigningCrew(null);
      toast.success(
        `Hak akses ${selectedTripIds.length} trip untuk ${assigningCrew.nama} berhasil disimpan ke database!`
      );
    } catch (err) {
      toast.error("Gagal menyimpan penugasan trip");
    }
  };

  const handleToggleSession = async (sess: DeviceSession) => {
    try {
      await toggleDeviceSessionStatusDB(sess.id);
      await loadAllDataFromDB();
      if (sess.isActive) {
        toast.warning(`Sesi perangkat ${sess.deviceName} (${sess.crewName}) telah diputus (Force Logout).`);
      } else {
        toast.success(`Akses perangkat ${sess.deviceName} (${sess.crewName}) dipulihkan.`);
      }
    } catch (err) {
      toast.error("Gagal memperbarui status sesi perangkat");
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      const updated = await toggleKruPermissionRuleDB(ruleId);
      setRbacRules(updated);
      toast.success("Aturan hak akses kru berhasil disimpan ke database");
    } catch (err) {
      toast.error("Gagal memperbarui aturan di database");
    }
  };

  const handleInspectCrewActivity = (crewId: string, crewName: string) => {
    setSelectedCrewFilter(crewId);
    handleTabChange("aktivitas");
    toast.info(`Menampilkan riwayat aktivitas: ${crewName}`);
  };

  const handleSimulateAsCrew = (crew: CrewMember) => {
    switchActiveCrew(crew.id);
    setRole("kru");
    navigate("/dashboard");
  };

  const filteredCrew = useMemo(() => {
    if (!searchCrewQuery.trim()) return crewMembers;
    const q = searchCrewQuery.toLowerCase();
    return crewMembers.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        c.jabatan.toLowerCase().includes(q) ||
        c.assignedTrip.toLowerCase().includes(q) ||
        c.kodeKru.toLowerCase().includes(q) ||
        c.currentDevice.deviceName.toLowerCase().includes(q)
    );
  }, [crewMembers, searchCrewQuery]);

  const filteredTripsForModal = useMemo(() => {
    if (!tripSearchQuery.trim()) return tripsList;
    const q = tripSearchQuery.toLowerCase();
    return tripsList.filter(
      (t) =>
        t.nama_trip.toLowerCase().includes(q) ||
        t.tujuan.toLowerCase().includes(q) ||
        (t.nama_driver || "").toLowerCase().includes(q) ||
        (t.nama_kendaraan || "").toLowerCase().includes(q)
    );
  }, [tripsList, tripSearchQuery]);

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      if (selectedCrewFilter !== "all" && log.crewId !== selectedCrewFilter) {
        return false;
      }
      if (selectedCategoryFilter !== "all" && log.kategori !== selectedCategoryFilter) {
        return false;
      }
      if (searchLogQuery.trim()) {
        const q = searchLogQuery.toLowerCase();
        const match =
          log.crewName.toLowerCase().includes(q) ||
          log.aksi.toLowerCase().includes(q) ||
          log.detail.toLowerCase().includes(q) ||
          log.deviceUsed.toLowerCase().includes(q) ||
          (log.tripName || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activityLogs, selectedCrewFilter, selectedCategoryFilter, searchLogQuery]);

  const activeCrewCount = crewMembers.filter((c) => c.status !== "nonaktif").length;
  const activeDevicesCount = deviceSessions.filter((d) => d.isActive).length;

  return (
    <AuthGuard>
      <RBACOwnerGuard
        ruleId="rule_manajemen_kru"
        pageTitle="Manajemen Kru, Perangkat Login & Hak Akses"
        reason="Halaman ini khusus untuk Pemilik Biro guna melihat daftar personel kru, perangkat login, penugasan trip per TL, dan batasan hak akses."
      >
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-12 lg:pl-64 font-sans text-slate-900 dark:text-slate-100">
          <div className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 space-y-5">
            {/* Header Bersih & Responsif */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Manajemen Kru & Hak Akses
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Database Live
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Kelola kru lapangan, batasi trip per Tour Leader (TL), kontrol sesi login, dan pantau audit trail.
                </p>
              </div>

              {/* Action Buttons: Grid di Mobile, Flex di Desktop */}
              <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMigrationInfo(true)}
                  className="h-9 px-2 sm:px-3 rounded-xl text-xs font-medium border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-1 sm:gap-1.5"
                >
                  <Database className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  <span>Info SQL</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAllDataFromDB}
                  disabled={isLoadingDB}
                  className="h-9 px-2 sm:px-3 rounded-xl text-xs font-medium border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-1 sm:gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-400 ${
                      isLoadingDB ? "animate-spin" : ""
                    }`}
                  />
                  <span>{isLoadingDB ? "Sinkron..." : "Muat Ulang"}</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAddCrewModal(true)}
                  className="h-9 px-2.5 sm:px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1 sm:gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kru</span>
                </Button>
              </div>
            </div>

            {/* Ringkasan Statistik Responsif */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 block truncate">
                  Total Personel Kru
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {crewMembers.length}
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {activeCrewCount} aktif
                  </span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 block truncate">
                  Sesi Perangkat
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {activeDevicesCount}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-500">
                    / {deviceSessions.length} login
                  </span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 block truncate">
                  Trip di Database
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {tripsList.length}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-500">jadwal trip</span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 block truncate">
                  Modul Khusus Pemilik
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {rbacRules.filter((r) => !r.aksesKru).length}
                  </span>
                  <span className="text-[10px] sm:text-xs text-amber-600 font-semibold">Terkunci</span>
                </div>
              </div>
            </div>

            {/* Navigasi Tab Segmented Touch-Friendly */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "kru", label: `Kru (${crewMembers.length})` },
                { id: "penugasan", label: `Akses Trip (${tripsList.length})` },
                { id: "devices", label: `Perangkat (${deviceSessions.length})` },
                { id: "aktivitas", label: `Log Aktivitas (${activityLogs.length})` },
                { id: "rbac", label: "Matriks RBAC" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* =========================================================
                TAB 1: DAFTAR KRU & STATUS AKUN (RESPONSIF MOBILE & DESKTOP)
            ========================================================= */}
            {activeTab === "kru" && (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Daftar Personel Kru Lapangan
                    </h2>
                    <p className="text-xs text-slate-500">
                      Tentukan hak akses trip per TL, aktifkan/nonaktifkan akun, dan kelola penugasan.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={searchCrewQuery}
                      onChange={(e) => setSearchCrewQuery(e.target.value)}
                      placeholder="Cari nama, jabatan, atau trip..."
                      className="pl-8 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                {/* --- MOBILE VIEW: KARTU KRU RESPONSIVE (block md:hidden) --- */}
                <div className="block md:hidden space-y-3">
                  {filteredCrew.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      Tidak ada personel kru yang sesuai dengan pencarian.
                    </div>
                  ) : (
                    filteredCrew.map((crew) => {
                      const crewLogsCount = activityLogs.filter((l) => l.crewId === crew.id).length;
                      const assignedCount = crew.assignedTripIds?.length || 0;
                      const isNonaktif = crew.status === "nonaktif";

                      return (
                        <div
                          key={crew.id}
                          className={`p-4 rounded-2xl border transition-all space-y-3 shadow-2xs ${
                            isNonaktif
                              ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900"
                              : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800"
                          }`}
                        >
                          {/* Header Kru Card */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                  isNonaktif
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                }`}
                              >
                                {getInitials(crew.nama)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {crew.nama}
                                  </h3>
                                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                                    {crew.kodeKru}
                                  </span>
                                </div>
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                  {crew.jabatan}
                                </div>
                              </div>
                            </div>

                            {/* Status Akun Pill */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${
                                isNonaktif
                                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                                  : crew.status === "bertugas"
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                              }`}
                            >
                              {isNonaktif ? "Nonaktif" : crew.status === "bertugas" ? "Bertugas" : "Aktif"}
                            </span>
                          </div>

                          {/* Info Kontak & Perangkat */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-[10px] text-slate-400 block font-medium">Kontak HP / WA</span>
                              <a
                                href={`https://wa.me/${crew.telepon.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-blue-600 dark:text-blue-400 truncate block hover:underline"
                              >
                                {crew.telepon}
                              </a>
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-[10px] text-slate-400 block font-medium">Perangkat Login</span>
                              <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 truncate">
                                <DeviceIcon type={crew.currentDevice.deviceType} className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{crew.currentDevice.deviceName}</span>
                              </div>
                            </div>
                          </div>

                          {/* Trip yang Diizinkan */}
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 block">
                                Hak Akses Trip (RBAC TL)
                              </span>
                              <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate font-medium">
                                {crew.assignedTrip}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAssignModal(crew)}
                              className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-blue-300 bg-white text-blue-700 dark:bg-slate-900 dark:text-blue-300 gap-1 flex-shrink-0"
                            >
                              <Compass className="w-3.5 h-3.5" />
                              <span>{assignedCount > 0 ? `${assignedCount} Trip` : "Atur Trip"}</span>
                            </Button>
                          </div>

                          {/* Tombol Aksi Lengkap Mobile */}
                          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInspectCrewActivity(crew.id, crew.nama)}
                                className="h-7 px-2 text-[10px] font-semibold rounded-lg"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Log ({crewLogsCount})
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isNonaktif}
                                onClick={() => handleSimulateAsCrew(crew)}
                                className="h-7 px-2 text-[10px] font-semibold rounded-lg text-emerald-700 border-emerald-200 dark:text-emerald-300"
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Mode Kru
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingCrew(crew)}
                                className="h-7 px-2 text-[10px] font-semibold rounded-lg text-slate-600"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleToggleAccountStatus(crew)}
                                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                                  isNonaktif
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {isNonaktif ? "Buka Blokir" : "Nonaktifkan"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCrew(crew)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                                title="Hapus Kru"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* --- DESKTOP VIEW: TABEL KRU LENGKAP (hidden md:block) --- */}
                <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold">
                          <th className="py-3 px-4">Nama & Kode Kru</th>
                          <th className="py-3 px-4">Jabatan & Kontak</th>
                          <th className="py-3 px-4">Trip yang Diizinkan (RBAC TL)</th>
                          <th className="py-3 px-4">Perangkat Login</th>
                          <th className="py-3 px-4">Status Akun</th>
                          <th className="py-3 px-4 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filteredCrew.map((crew) => {
                          const crewLogsCount = activityLogs.filter((l) => l.crewId === crew.id).length;
                          const assignedCount = crew.assignedTripIds?.length || 0;
                          const isNonaktif = crew.status === "nonaktif";

                          return (
                            <tr
                              key={crew.id}
                              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                                isNonaktif ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{crew.nama}</span>
                                  {isNonaktif && (
                                    <span className="text-[10px] font-bold text-rose-600 uppercase">
                                      [Nonaktif]
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {crew.kodeKru} • {crew.email}
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {crew.jabatan}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {crew.telepon}
                                </div>
                              </td>

                              {/* Penugasan Trip per TL */}
                              <td className="py-3.5 px-4">
                                <div className="space-y-1 max-w-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                                      {crew.assignedTrip}
                                    </span>
                                    {assignedCount > 0 && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                        {assignedCount} Trip
                                      </span>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenAssignModal(crew)}
                                    className="h-6 px-2 text-[10px] font-semibold rounded-lg text-blue-700 border-blue-200 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-800"
                                  >
                                    <Compass className="w-3 h-3 mr-1" />
                                    Atur Akses Trip
                                  </Button>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                                  <DeviceIcon
                                    type={crew.currentDevice.deviceType}
                                    className="w-3.5 h-3.5 text-slate-500"
                                  />
                                  <span>{crew.currentDevice.deviceName}</span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {crew.currentDevice.os} •{" "}
                                  {formatDistanceToNow(new Date(crew.lastActive), {
                                    addSuffix: true,
                                    locale: localeId,
                                  })}
                                </div>
                              </td>

                              {/* Status Akun */}
                              <td className="py-3.5 px-4">
                                <div className="space-y-1">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      isNonaktif
                                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                                        : crew.status === "bertugas"
                                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                    }`}
                                  >
                                    {isNonaktif
                                      ? "Dinonaktifkan"
                                      : crew.status === "bertugas"
                                      ? "Bertugas"
                                      : "Aktif"}
                                  </span>
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleAccountStatus(crew)}
                                      className={`text-[10px] font-semibold underline transition-colors ${
                                        isNonaktif
                                          ? "text-emerald-600 hover:text-emerald-800"
                                          : "text-rose-600 hover:text-rose-800"
                                      }`}
                                    >
                                      {isNonaktif ? "Aktifkan Akun" : "Nonaktifkan"}
                                    </button>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleInspectCrewActivity(crew.id, crew.nama)}
                                    className="h-7 px-2.5 text-[11px] font-medium rounded-lg border-slate-200 dark:border-slate-700"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Log ({crewLogsCount})
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isNonaktif}
                                    onClick={() => handleSimulateAsCrew(crew)}
                                    className="h-7 px-2.5 text-[11px] font-medium rounded-lg border-slate-200 dark:border-slate-700 text-emerald-700"
                                    title={isNonaktif ? "Akun dinonaktifkan" : "Buka mode kru"}
                                  >
                                    <UserCheck className="w-3 h-3 mr-1" />
                                    Mode Kru
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingCrew(crew)}
                                    className="h-7 px-2 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                                  >
                                    Edit
                                  </Button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCrew(crew)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                                    title="Hapus Kru"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 2: MATRIKS PENUGASAN TRIP & KRU (RBAC TRIP LEVEL)
            ========================================================= */}
            {activeTab === "penugasan" && (
              <div className="space-y-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Compass className="w-4 h-4 text-blue-600" />
                      <span>Matriks Hak Akses & Penugasan Trip</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tour Leader (TL) hanya dapat melihat dan mengelola trip yang ditugaskan kepada mereka.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {tripsList.map((trip) => {
                    const assignedCrewForTrip = crewMembers.filter((c) => {
                      if (c.assignedTripIds && c.assignedTripIds.includes(trip.id)) return true;
                      if (
                        c.assignedTrip &&
                        c.assignedTrip !== "Belum Ditugaskan" &&
                        c.assignedTrip !== "Standby Operasional" &&
                        (trip.nama_trip.toLowerCase().includes(c.assignedTrip.toLowerCase()) ||
                          c.assignedTrip.toLowerCase().includes(trip.nama_trip.toLowerCase()))
                      )
                        return true;
                      return false;
                    });

                    return (
                      <div
                        key={trip.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-2xs hover:border-blue-400 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                              {trip.nama_trip}
                            </h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 whitespace-nowrap">
                              {trip.tanggal}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">Tujuan: {trip.tujuan}</span>
                          </p>

                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                              <span>TL / Kru yang Berhak Akses:</span>
                              <span className="text-blue-600 font-bold">
                                {assignedCrewForTrip.length} Orang
                              </span>
                            </div>

                            {assignedCrewForTrip.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {assignedCrewForTrip.map((c) => (
                                  <span
                                    key={c.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs"
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        c.status === "nonaktif" ? "bg-rose-500" : "bg-emerald-500"
                                      }`}
                                    />
                                    <span>{c.nama}</span>
                                    <span className="text-[9px] text-slate-400">({c.jabatan})</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                                Belum ada TL yang ditugaskan ke trip ini.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] text-slate-400 truncate">
                            {trip.nama_kendaraan || "Armada Bus"}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTabChange("kru")}
                            className="h-7 text-xs font-semibold rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            Atur di Kru
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 3: PERANGKAT LOGIN (RESPONSIF MOBILE & DESKTOP)
            ========================================================= */}
            {activeTab === "devices" && (
              <div className="space-y-4">
                {/* Perangkat Aktif Saat Ini Card */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <DeviceIcon type={currentDevice.deviceType} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        Perangkat Anda Saat Ini: {currentDevice.deviceName}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Sesi Aktif
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      OS: {currentDevice.os} • Browser: {currentDevice.browser} • Resolusi: {currentDevice.resolution}
                    </p>
                  </div>
                </div>

                {/* --- MOBILE VIEW: KARTU PERANGKAT (block md:hidden) --- */}
                <div className="block md:hidden space-y-3">
                  {deviceSessions.map((sess) => (
                    <div
                      key={sess.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 shadow-2xs ${
                        sess.isCurrentDevice
                          ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 flex-shrink-0">
                            <DeviceIcon type={sess.deviceType} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {sess.deviceName}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {sess.crewName} • {sess.jabatan}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                            sess.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
                          }`}
                        >
                          {sess.isActive ? "Aktif Terhubung" : "Sesi Terputus"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">OS & Browser</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                            {sess.os} • {sess.browser}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Terakhir Aktif</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                            {formatDistanceToNow(new Date(sess.lastActive), {
                              addSuffix: true,
                              locale: localeId,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <Button
                          size="sm"
                          variant={sess.isActive ? "outline" : "default"}
                          onClick={() => handleToggleSession(sess)}
                          className={`w-full h-8 text-xs font-semibold rounded-xl gap-1.5 ${
                            sess.isActive
                              ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{sess.isActive ? "Putus Sesi (Force Logout)" : "Pulihkan Akses Perangkat"}</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* --- DESKTOP VIEW: TABEL PERANGKAT (hidden md:block) --- */}
                <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Daftar Perangkat yang Digunakan Login oleh Kru
                    </h2>
                    <p className="text-xs text-slate-500">
                      Putus sesi perangkat sewaktu-waktu apabila HP kru hilang atau kru telah selesai bertugas.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold">
                          <th className="py-3 px-4">Nama Kru / Personel</th>
                          <th className="py-3 px-4">Model & Tipe Perangkat</th>
                          <th className="py-3 px-4">OS & Web Browser</th>
                          <th className="py-3 px-4">Lokasi / Jaringan</th>
                          <th className="py-3 px-4">Waktu Terakhir Aktif</th>
                          <th className="py-3 px-4">Status Sesi</th>
                          <th className="py-3 px-4 text-right">Kontrol</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {deviceSessions.map((sess) => (
                          <tr
                            key={sess.id}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                              sess.isCurrentDevice ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{sess.crewName}</span>
                                {sess.isCurrentDevice && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    Ini Perangkat Anda
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">{sess.jabatan}</div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                                <DeviceIcon type={sess.deviceType} className="w-3.5 h-3.5 text-slate-500" />
                                <span>{sess.deviceName}</span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {sess.deviceType} ({sess.resolution})
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              <div>{sess.os}</div>
                              <div className="text-[11px] text-slate-500">{sess.browser}</div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                              {sess.locationHint}
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              <div>
                                {formatDistanceToNow(new Date(sess.lastActive), {
                                  addSuffix: true,
                                  locale: localeId,
                                daylight: false,
                                })}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Login: {format(new Date(sess.loginTime), "dd MMM, HH:mm", { locale: localeId })}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  sess.isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                                }`}
                              >
                                {sess.isActive ? "Aktif Terhubung" : "Sesi Diputus"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <Button
                                size="sm"
                                variant={sess.isActive ? "outline" : "default"}
                                onClick={() => handleToggleSession(sess)}
                                className={`h-7 px-2.5 text-[11px] font-medium rounded-lg gap-1 ${
                                  sess.isActive
                                    ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                }`}
                              >
                                <Power className="w-3 h-3" />
                                <span>{sess.isActive ? "Putus Sesi" : "Pulihkan"}</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 4: RIWAYAT AKTIVITAS KRU (RESPONSIF MOBILE & DESKTOP)
            ========================================================= */}
            {activeTab === "aktivitas" && (
              <div className="space-y-3">
                {/* Filters */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Log Aktivitas Operasional & Keamanan Kru
                    </h2>
                    <p className="text-xs text-slate-500">
                      Audit trail otomatis setiap tindakan kru di lapangan (kas saku, checklist armada, manifest kursi).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        value={searchLogQuery}
                        onChange={(e) => setSearchLogQuery(e.target.value)}
                        placeholder="Cari aksi, detail, atau trip..."
                        className="pl-8 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    <Select value={selectedCrewFilter} onValueChange={setSelectedCrewFilter}>
                      <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Semua Personel Kru" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">
                          Semua Personel Kru
                        </SelectItem>
                        {crewMembers.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.nama} ({c.jabatan})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                      <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Semua Kategori Aktivitas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">
                          Semua Kategori Aktivitas
                        </SelectItem>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* --- MOBILE VIEW: KARTU TIMELINE AKTIVITAS (block md:hidden) --- */}
                <div className="block md:hidden space-y-2.5">
                  {filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      Tidak ada riwayat aktivitas yang cocok dengan filter.
                    </div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {CATEGORY_LABELS[log.kategori] || log.kategori}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {format(new Date(log.timestamp), "dd MMM, HH:mm", { locale: localeId })}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {log.aksi}
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {log.detail}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                          <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {log.crewName} ({log.jabatan})
                          </div>
                          <div className="truncate text-slate-400">
                            {log.tripName || log.deviceUsed}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* --- DESKTOP VIEW: TABEL LOG (hidden md:block) --- */}
                <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold">
                          <th className="py-3 px-4">Waktu</th>
                          <th className="py-3 px-4">Personel Kru</th>
                          <th className="py-3 px-4">Kategori & Tindakan</th>
                          <th className="py-3 px-4">Rincian Operasional</th>
                          <th className="py-3 px-4">Trip</th>
                          <th className="py-3 px-4">Perangkat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filteredLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                              Tidak ada riwayat aktivitas yang cocok dengan filter.
                            </td>
                          </tr>
                        ) : (
                          filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {format(new Date(log.timestamp), "HH:mm:ss")}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {format(new Date(log.timestamp), "dd MMM yyyy", { locale: localeId })}
                                </div>
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {log.crewName}
                                </div>
                                <div className="text-[11px] text-slate-500">{log.jabatan}</div>
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-0.5">
                                  {CATEGORY_LABELS[log.kategori] || log.kategori}
                                </span>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {log.aksi}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-sm">
                                {log.detail}
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                {log.tripName || "-"}
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                                {log.deviceUsed}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 5: MATRIKS ATURAN RBAC (RESPONSIF MOBILE & DESKTOP)
            ========================================================= */}
            {activeTab === "rbac" && (
              <div className="space-y-3">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Matriks Kebijakan Hak Akses Kru vs Pemilik Biro
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aktifkan atau batasi modul apa saja yang dapat dibuka oleh kru di lapangan. Data finansial sensitif secara default terkunci bagi kru.
                  </p>
                </div>

                {/* --- MOBILE VIEW: KARTU ATURAN RBAC (block md:hidden) --- */}
                <div className="block md:hidden space-y-3">
                  {rbacRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border mb-1.5 ${
                              rule.kategori === "Finansial & Rahasia Dapur"
                                ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                                : rule.kategori === "Manajemen & Kontrol"
                                ? "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
                                : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                            }`}
                          >
                            {rule.kategori}
                          </span>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                            {rule.modul}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                            {rule.fitur}
                          </p>
                        </div>

                        {/* Switch Akses Kru */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Switch
                            checked={rule.aksesKru}
                            onCheckedChange={() => handleToggleRule(rule.id)}
                          />
                          <span
                            className={`text-[9px] font-bold ${
                              rule.aksesKru ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            {rule.aksesKru ? "Kru Dibolehkan" : "Khusus Pemilik"}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
                        {rule.deskripsi}
                      </p>
                    </div>
                  ))}
                </div>

                {/* --- DESKTOP VIEW: TABEL MATRIKS (hidden md:block) --- */}
                <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold">
                          <th className="py-3 px-4">Modul & Fitur Aplikasi</th>
                          <th className="py-3 px-4">Kategori Modul</th>
                          <th className="py-3 px-4 text-center">Akses Pemilik</th>
                          <th className="py-3 px-4 text-center">Akses Kru Lapangan</th>
                          <th className="py-3 px-4">Keterangan Akses Kru</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {rbacRules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {rule.modul}
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                {rule.fitur}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {rule.deskripsi}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  rule.kategori === "Finansial & Rahasia Dapur"
                                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                    : rule.kategori === "Manajemen & Kontrol"
                                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                }`}
                              >
                                {rule.kategori}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Penuh
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center">
                                <Switch
                                  checked={rule.aksesKru}
                                  onCheckedChange={() => handleToggleRule(rule.id)}
                                />
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[11px] font-medium ${
                                  rule.aksesKru
                                    ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                                    : "text-slate-500 italic"
                                }`}
                              >
                                {rule.keteranganKru}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <BottomNav />

        {/* Modal Atur Hak Akses Trip per Kru (RBAC TL) */}
        <Dialog open={Boolean(assigningCrew)} onOpenChange={(open) => !open && setAssigningCrew(null)}>
          <DialogContent className="w-[95vw] sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <Compass className="w-5 h-5 text-blue-600" />
                <span>Atur Hak Akses Trip: {assigningCrew?.nama}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pilih trip yang boleh dilihat dan dikelola oleh <strong>{assigningCrew?.nama} ({assigningCrew?.jabatan})</strong>. Trip yang tidak dicentang akan otomatis disembunyikan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={tripSearchQuery}
                    onChange={(e) => setTripSearchQuery(e.target.value)}
                    placeholder="Cari trip atau kota..."
                    className="pl-8 h-8 text-xs rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={handleSelectAllTrips}
                    className="h-8 text-[11px] px-2.5 rounded-xl"
                  >
                    Pilih Semua
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={handleClearAllTrips}
                    className="h-8 text-[11px] px-2.5 rounded-xl text-slate-500"
                  >
                    Kosongkan
                  </Button>
                </div>
              </div>

              <div className="max-h-64 sm:max-h-72 overflow-y-auto space-y-2 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
                {filteredTripsForModal.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Tidak ada jadwal trip yang ditemukan.
                  </div>
                ) : (
                  filteredTripsForModal.map((trip) => {
                    const isChecked = selectedTripIds.includes(trip.id);
                    return (
                      <div
                        key={trip.id}
                        onClick={() => handleToggleTripSelection(trip.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked
                            ? "bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            type="button"
                            className="mt-0.5 text-blue-600 focus:outline-hidden"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {trip.nama_trip}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                {trip.tanggal}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                {trip.tujuan}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isChecked && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 whitespace-nowrap">
                            Diizinkan
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500">
                  {selectedTripIds.length} dari {tripsList.length} trip dipilih
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAssigningCrew(null)}
                    className="h-8 text-xs rounded-xl"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveTripAssignments}
                    className="h-8 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Simpan Akses Trip
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Tambah Kru Baru */}
        <Dialog open={showAddCrewModal} onOpenChange={setShowAddCrewModal}>
          <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Tambah Personel Kru Baru
              </DialogTitle>
              <DialogDescription className="text-xs">
                Daftarkan kru lapangan baru ke database Supabase.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddCrewSubmit} className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama Lengkap Kru *</Label>
                <Input
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={newCrewForm.nama}
                  onChange={(e) =>
                    setNewCrewForm({ ...newCrewForm, nama: e.target.value })
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Jabatan Lapangan *</Label>
                  <Select
                    value={newCrewForm.jabatan}
                    onValueChange={(val: CrewJabatan) =>
                      setNewCrewForm({ ...newCrewForm, jabatan: val })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JABATAN_LIST.map((j) => (
                        <SelectItem key={j} value={j} className="text-xs">
                          {j}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nomor Telepon / WA</Label>
                  <Input
                    placeholder="0812-xxxx-xxxx"
                    value={newCrewForm.telepon}
                    onChange={(e) =>
                      setNewCrewForm({ ...newCrewForm, telepon: e.target.value })
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email Login Kru (Opsional)</Label>
                <Input
                  type="email"
                  placeholder="kru@birowisata.id"
                  value={newCrewForm.email}
                  onChange={(e) =>
                    setNewCrewForm({ ...newCrewForm, email: e.target.value })
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Penugasan Trip Awal</Label>
                <Input
                  placeholder="Contoh: Paket Bromo Sunrise / Standby"
                  value={newCrewForm.assignedTrip}
                  onChange={(e) =>
                    setNewCrewForm({ ...newCrewForm, assignedTrip: e.target.value })
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddCrewModal(false)}
                  className="h-9 text-xs rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Simpan Kru ke Database
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Edit Kru */}
        <Dialog open={Boolean(editingCrew)} onOpenChange={(open) => !open && setEditingCrew(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Edit Data Personel Kru
              </DialogTitle>
              <DialogDescription className="text-xs">
                Perbarui identitas, kontak, atau status tugas kru di lapangan.
              </DialogDescription>
            </DialogHeader>

            {editingCrew && (
              <form onSubmit={handleSaveEditCrew} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nama Lengkap Kru</Label>
                  <Input
                    value={editingCrew.nama}
                    onChange={(e) =>
                      setEditingCrew({ ...editingCrew, nama: e.target.value })
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Jabatan</Label>
                    <Select
                      value={editingCrew.jabatan}
                      onValueChange={(val: CrewJabatan) =>
                        setEditingCrew({ ...editingCrew, jabatan: val })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JABATAN_LIST.map((j) => (
                          <SelectItem key={j} value={j} className="text-xs">
                            {j}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Status Tugas</Label>
                    <Select
                      value={editingCrew.status}
                      onValueChange={(val: any) =>
                        setEditingCrew({ ...editingCrew, status: val })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bertugas" className="text-xs">
                          Sedang Bertugas
                        </SelectItem>
                        <SelectItem value="online" className="text-xs">
                          Online (Standby)
                        </SelectItem>
                        <SelectItem value="offline" className="text-xs">
                          Offline / Libur
                        </SelectItem>
                        <SelectItem value="nonaktif" className="text-xs">
                          Akun Dinonaktifkan
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Trip yang Ditugaskan</Label>
                  <Input
                    value={editingCrew.assignedTrip}
                    onChange={(e) =>
                      setEditingCrew({ ...editingCrew, assignedTrip: e.target.value })
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nomor Telepon / WA</Label>
                  <Input
                    value={editingCrew.telepon}
                    onChange={(e) =>
                      setEditingCrew({ ...editingCrew, telepon: e.target.value })
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCrew(null)}
                    className="h-9 text-xs rounded-xl"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="h-9 text-xs rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Simpan Perubahan
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Info File Migrasi SQL Supabase */}
        <Dialog open={showMigrationInfo} onOpenChange={setShowMigrationInfo}>
          <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                File Migrasi Database Supabase (RBAC & Kru)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Skema tabel database telah aktif dan terhubung secara langsung (Live Sync) pada database Supabase.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] break-all">
                supabase/migrations/20261030093000_rbac_manajemen_kru_audit.sql
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Tabel aktif mencakup <strong>crew_members</strong> (penugasan trip & status akun),{" "}
                <strong>crew_device_sessions</strong> (pelacakan login & force logout),{" "}
                <strong>crew_activity_logs</strong> (audit trail operasional), dan{" "}
                <strong>rbac_permission_rules</strong> (kebijakan hak akses modul per biro).
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      "supabase/migrations/20261030093000_rbac_manajemen_kru_audit.sql"
                    );
                    setCopiedMigration(true);
                    toast.success("Path file migrasi disalin");
                    setTimeout(() => setCopiedMigration(false), 2000);
                  }}
                  className="h-8 text-xs rounded-xl gap-1.5"
                >
                  {copiedMigration ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Salin Path File</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowMigrationInfo(false)}
                  className="h-8 text-xs rounded-xl bg-slate-900 text-white"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </RBACOwnerGuard>
    </AuthGuard>
  );
};

export default ManajemenKruRBAC;
