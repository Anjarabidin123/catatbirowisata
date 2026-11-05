import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { useNavigate } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  Search,
  ChevronDown,
  Receipt,
  ShieldCheck,
  UserCheck,
  Lock,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatRupiah } from "@/lib/utils";
import { KwitansiInvoiceDialog } from "@/components/KwitansiInvoiceDialog";
import { PettyCashTracker } from "@/components/PettyCashTracker";
import { useRole } from "@/contexts/RoleContext";

interface Keuangan {
  id: string;
  trip_id: string;
  jenis: string;
  jumlah: number;
  keterangan: string | null;
  tanggal: string;
  trips: {
    nama_trip: string;
  };
}

const Keuangan = () => {
  const navigate = useNavigate();
  const { isPemilik, isKru, roleName, activeCrew, hasPermission } = useRole();
  const canSeeFinancials = hasPermission("rule_buku_kas_laba");
  const canPrintKwitansi = hasPermission("rule_kwitansi_invoice");
  const canInputPettyCash = hasPermission("rule_petty_cash");
  const [keuangan, setKeuangan] = useState<Keuangan[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedKruTripId, setSelectedKruTripId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<string>("current");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [showKwitansiDialog, setShowKwitansiDialog] = useState(false);

  useEffect(() => {
    loadKeuangan();

    const channel = supabase
      .channel("keuangan-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "keuangan" },
        () => loadKeuangan()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadKeuangan = async () => {
    try {
      const user = await getActiveUser();
      if (!user) return;

      const [keuanganRes, tripsRes] = await Promise.all([
        supabase
          .from("keuangan")
          .select(`*, trips (nama_trip)`)
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false }),
        supabase
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("tanggal", { ascending: false }),
      ]);

      if (keuanganRes.error) throw keuanganRes.error;
      if (tripsRes.error) throw tripsRes.error;

      const loadedTrips = tripsRes.data || [];
      setKeuangan(keuanganRes.data || []);
      setTrips(loadedTrips);
      if (loadedTrips.length > 0 && !selectedKruTripId) {
        const activeId = localStorage.getItem("active_trip_id") || loadedTrips[0].id;
        setSelectedKruTripId(activeId);
      }
    } catch (error: any) {
      console.error("Error loading keuangan:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data by month
  const filteredKeuangan = keuangan.filter((k) => {
    const kDate = new Date(k.tanggal);
    const today = new Date();

    if (filterMonth === "current") {
      return kDate.getMonth() === today.getMonth() && kDate.getFullYear() === today.getFullYear();
    } else if (filterMonth === "last") {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return kDate.getMonth() === lastMonth.getMonth() && kDate.getFullYear() === lastMonth.getFullYear();
    }
    return true;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedTrips = trips.filter((t) => new Date(t.tanggal) < today);
  const upcomingTrips = trips.filter((t) => new Date(t.tanggal) >= today);

  // Calculate summary per trip
  const tripSummaries = Object.entries(
    filteredKeuangan.reduce((acc, item) => {
      if (!acc[item.trip_id]) {
        const trip = trips.find((t) => t.id === item.trip_id);
        acc[item.trip_id] = {
          trip_id: item.trip_id,
          trip_name: item.trips?.nama_trip || "Trip tidak ditemukan",
          trip_date: trip?.tanggal || "",
          pemasukan: 0,
          pengeluaran: 0,
          saldo: 0,
        };
      }
      if (item.jenis === "pemasukan") {
        acc[item.trip_id].pemasukan += Number(item.jumlah);
      } else {
        acc[item.trip_id].pengeluaran += Number(item.jumlah);
      }
      acc[item.trip_id].saldo = acc[item.trip_id].pemasukan - acc[item.trip_id].pengeluaran;
      return acc;
    }, {} as Record<string, { trip_id: string; trip_name: string; trip_date: string; pemasukan: number; pengeluaran: number; saldo: number }>)
  )
    .map(([_, summary]) => summary)
    .filter(
      (summary) =>
        searchQuery === "" ||
        summary.trip_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.trip_date).getTime() - new Date(a.trip_date).getTime());

  const toggleTrip = (tripId: string) => {
    const newExpanded = new Set(expandedTrips);
    if (newExpanded.has(tripId)) {
      newExpanded.delete(tripId);
    } else {
      newExpanded.add(tripId);
    }
    setExpandedTrips(newExpanded);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 safe-top lg:pl-64">
        <div className="max-w-2xl lg:max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
          {/* Header Berbeda Tegas Antara Pemilik Biro & Kru Lapangan */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black flex items-center gap-2">
                <span>
                  {canSeeFinancials ? "Buku Kas Besar & Laba Biro" : "Kas Saku & Biaya Lapangan (Petty Cash)"}
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1 ${
                    isPemilik
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {isPemilik ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                  {roleName}
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {canSeeFinancials
                  ? "Akses penuh Buku Kas Biro: rekapitulasi omset klien, pengeluaran armada, laba bersih & kwitansi resmi"
                  : `Petugas: ${activeCrew.nama} • Khusus pencatatan uang saku operasional lapangan (BBM, Tol, Parkir, Konsumsi)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canPrintKwitansi && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKwitansiDialog(true)}
                  className="h-9 text-xs rounded-xl font-semibold gap-1.5 border-slate-200 dark:border-slate-800"
                >
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Kwitansi &</span> Invoice
                </Button>
              )}
              {(canInputPettyCash || canSeeFinancials) && (
                <Button
                  onClick={() => navigate("/keuangan/new")}
                  className={`${
                    canSeeFinancials ? "gradient-primary" : "bg-emerald-600 hover:bg-emerald-700"
                  } text-white h-9 rounded-xl font-bold`}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {canSeeFinancials ? "Tambah Kas" : "+ Biaya Lapangan"}
                </Button>
              )}
            </div>
          </div>

          {/* Mode Kru: Tampilkan Banner Proteksi RBAC & PettyCashTracker Langsung */}
          {isKru && (
            <div className="space-y-4">
              {!canSeeFinancials && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-emerald-950 dark:text-emerald-200">
                    <p className="font-extrabold">
                      Pemisahan RBAC Aktif: Fokus Kas Saku Operasional Kru
                    </p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Sebagai <strong>{activeCrew.jabatan}</strong>, Anda hanya melihat dan mencatat pengeluaran operasional lapangan. Data omset pembayaran klien dan margin keuntungan/kerugian biro dikelola terpisah oleh Pemilik Biro.
                    </p>
                  </div>
                </div>
              )}

              {trips.length > 0 && (
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <h2 className="text-sm font-extrabold">
                        Posko Kas Lapangan (Petty Cash Per Trip)
                      </h2>
                    </div>
                    <Select value={selectedKruTripId} onValueChange={setSelectedKruTripId}>
                      <SelectTrigger className="w-full sm:w-64 h-8 text-xs font-bold rounded-xl">
                        <SelectValue placeholder="Pilih Trip" />
                      </SelectTrigger>
                      <SelectContent>
                        {trips.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.nama_trip} ({t.tujuan})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedKruTripId && (
                    <PettyCashTracker
                      tripId={selectedKruTripId}
                      tripName={trips.find((t) => t.id === selectedKruTripId)?.nama_trip}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Compact Filters */}
          <div className="flex gap-2 mb-3">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Bulan Ini</SelectItem>
                <SelectItem value="last">Bulan Lalu</SelectItem>
                <SelectItem value="all">Semua</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari trip..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* Stats Cards - hanya tampilkan statistik penuh jika berizin buku kas */}
          {canSeeFinancials && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="ios-card p-3 bg-green-50">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <p className="text-xs text-muted-foreground">Trip Selesai</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{completedTrips.length}</p>
              </div>

              <div className="ios-card p-3 bg-blue-50">
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-blue-600" />
                  <p className="text-xs text-muted-foreground">Trip Mendatang</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{upcomingTrips.length}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
            </div>
          ) : tripSummaries.length === 0 ? (
            <div className="text-center py-12 ios-card">
              <p className="text-muted-foreground mb-4">
                {filterMonth === "all"
                  ? "Belum ada catatan transaksi"
                  : "Belum ada catatan transaksi untuk periode ini"}
              </p>
              {(canInputPettyCash || canSeeFinancials) && (
                <Button
                  onClick={() => navigate("/keuangan/new")}
                  className="gradient-primary text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {canSeeFinancials ? "Tambah Transaksi" : "Catat Biaya Lapangan"}
                </Button>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-base font-semibold mb-2">
                {canSeeFinancials
                  ? "Ringkasan Laba / Rugi Per Trip (Khusus Pemilik)"
                  : "Rekap Pengeluaran Lapangan Per Trip"}
              </h2>
              <div className="space-y-2">
                {tripSummaries.map((summary) => (
                  <Collapsible key={summary.trip_id}>
                    <div className="ios-card p-3">
                      <CollapsibleTrigger
                        className="w-full flex justify-between items-center"
                        onClick={() => toggleTrip(summary.trip_id)}
                      >
                        <div className="flex-1 text-left">
                          <h3 className="font-semibold text-sm">{summary.trip_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {summary.trip_date
                              ? format(new Date(summary.trip_date), "dd MMM yyyy", { locale: id })
                              : "-"}
                          </p>
                        </div>

                        {/* RBAC: Pemilik melihat Untung/Rugi, Kru HANYA melihat Total Pengeluaran Lapangan */}
                        <div className="flex items-center gap-2">
                          {canSeeFinancials ? (
                            summary.saldo >= 0 ? (
                              <div className="text-right">
                                <p className="text-base font-bold text-green-600">
                                  {formatRupiah(summary.saldo)}
                                </p>
                                <span className="text-[10px] text-green-600 font-bold">
                                  Untung (Laba)
                                </span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <p className="text-base font-bold text-red-600">
                                  {formatRupiah(Math.abs(summary.saldo))}
                                </p>
                                <span className="text-[10px] text-red-600 font-bold">
                                  Defisit / Rugi
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="text-right">
                              <p className="text-base font-bold text-rose-600">
                                {formatRupiah(summary.pengeluaran)}
                              </p>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                Biaya Lapangan Tercatat
                              </span>
                            </div>
                          )}
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform ${
                              expandedTrips.has(summary.trip_id) ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-3 pt-3 border-t">
                        {canSeeFinancials ? (
                          <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                            <div>
                              <span className="text-muted-foreground">Pemasukan (Omset)</span>
                              <p className="font-semibold text-green-600">
                                {formatRupiah(summary.pemasukan)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pengeluaran</span>
                              <p className="font-semibold text-red-600">
                                {formatRupiah(summary.pengeluaran)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs mb-2 flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                            <span className="text-muted-foreground">
                              Total Pengeluaran Operasional:
                            </span>
                            <span className="font-bold text-rose-600">
                              {formatRupiah(summary.pengeluaran)}
                            </span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs"
                          onClick={() => navigate(`/trips/${summary.trip_id}`)}
                        >
                          {canSeeFinancials ? "Lihat Detail & Pembukuan Trip" : "Buka Posko Operasional Trip"}
                        </Button>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </div>
          )}
        </div>

        {canPrintKwitansi && (
          <KwitansiInvoiceDialog
            open={showKwitansiDialog}
            onOpenChange={setShowKwitansiDialog}
          />
        )}

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default Keuangan;
