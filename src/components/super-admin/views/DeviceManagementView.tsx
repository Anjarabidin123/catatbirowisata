import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TenantDeviceSession,
  revokeDeviceSession,
  revokeAllTenantDevices,
  resetDefaultDevices,
} from "@/utils/superAdminDevices";
import {
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Clock,
  User,
  Globe,
  MapPin,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface DeviceManagementViewProps {
  devices: TenantDeviceSession[];
  onRefresh: () => void;
}

export const DeviceManagementView: React.FC<DeviceManagementViewProps> = ({
  devices,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // State Dialog Konfirmasi Revoke
  const [targetDevice, setTargetDevice] = useState<TenantDeviceSession | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeReason, setRevokeReason] = useState("Diputus manual oleh Super Admin");

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && d.deviceType !== typeFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          d.deviceName.toLowerCase().includes(q) ||
          d.userName.toLowerCase().includes(q) ||
          d.tenantName.toLowerCase().includes(q) ||
          d.userEmail.toLowerCase().includes(q) ||
          d.ipAddress.includes(q) ||
          d.locationCity.toLowerCase().includes(q) ||
          d.deviceId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [devices, statusFilter, typeFilter, searchTerm]);

  // Statistik Metrik
  const stats = useMemo(() => {
    return {
      total: devices.length,
      active: devices.filter((d) => d.status === "active").length,
      desktop: devices.filter((d) => d.deviceType === "desktop").length,
      mobile: devices.filter((d) => d.deviceType === "mobile").length,
      revoked: devices.filter((d) => d.status === "revoked").length,
    };
  }, [devices]);

  const handleConfirmRevoke = () => {
    if (!targetDevice) return;
    revokeDeviceSession(targetDevice.id, revokeReason);
    toast.success(`Sesi perangkat "${targetDevice.deviceName}" milik ${targetDevice.userName} berhasil diputus!`);
    setShowRevokeDialog(false);
    setTargetDevice(null);
    onRefresh();
  };

  const handleKillSwitchBiro = (tenantId: string, tenantName: string) => {
    if (confirm(`PERINGATAN KERAS: Yakin ingin memutuskan SEMUA sesi login perangkat untuk biro [${tenantName}]? Semua kru & owner akan terlempar ke layar login.`)) {
      revokeAllTenantDevices(tenantId, tenantName);
      toast.success(`Kill switch berhasil: Seluruh sesi perangkat [${tenantName}] telah diputus.`);
      onRefresh();
    }
  };

  const handleResetSeed = () => {
    if (confirm("Reset seluruh data perangkat ke seed awal?")) {
      resetDefaultDevices();
      toast.success("Data perangkat berhasil di-reset");
      onRefresh();
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "desktop":
        return <Laptop className="w-5 h-5 text-blue-600" />;
      case "tablet":
        return <Tablet className="w-5 h-5 text-indigo-600" />;
      default:
        return <Smartphone className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Manajemen Perangkat & Keamanan Sesi Terdaftar
                </h2>
                <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-mono">
                  Enterprise Security
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Monitoring sidik jari perangkat login kru & pemilik biro. Putus sesi mencurigakan atau jalankan Kill Switch darurat.
              </p>
            </div>
          </div>

          <Button
            onClick={handleResetSeed}
            variant="outline"
            size="sm"
            className="text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-9 rounded-xl flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Data Seed
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Terdaftar
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sesi Aktif
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
            <Laptop className="w-3.5 h-3.5" />
            Laptop / PC
          </span>
          <div className="text-2xl font-black text-blue-700 mt-1">{stats.desktop}</div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            Diputus (Revoked)
          </span>
          <div className="text-2xl font-black text-rose-700 mt-1">{stats.revoked}</div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3 flex-wrap shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari perangkat, nama kru, biro, kota, atau IP address..."
            className="pl-9 bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl placeholder:text-slate-400"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl">
            <SelectValue placeholder="Status Sesi" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200 text-slate-900 text-xs">
            <SelectItem value="ALL">Semua Sesi</SelectItem>
            <SelectItem value="active">Aktif Online</SelectItem>
            <SelectItem value="revoked">Diputus (Revoked)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl">
            <SelectValue placeholder="Tipe Alat" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200 text-slate-900 text-xs">
            <SelectItem value="ALL">Semua Tipe</SelectItem>
            <SelectItem value="desktop">Laptop / PC</SelectItem>
            <SelectItem value="mobile">Smartphone</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Device Cards / Table */}
      <div className="space-y-3">
        {filteredDevices.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2 shadow-xs">
            <Smartphone className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-sm font-medium">Tidak ada perangkat yang cocok dengan kriteria filter</p>
          </div>
        ) : (
          filteredDevices.map((dev) => (
            <Card
              key={dev.id}
              className={`p-4 rounded-2xl border transition-all shadow-xs ${
                dev.status === "active"
                  ? "bg-white border-slate-200 hover:border-slate-300"
                  : "bg-slate-50 border-rose-200 opacity-90"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Info Perangkat & Pengguna */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-3 rounded-xl border flex-shrink-0 ${
                      dev.status === "active"
                        ? "bg-slate-50 border-slate-200"
                        : "bg-rose-50 border-rose-200"
                    }`}
                  >
                    {getDeviceIcon(dev.deviceType)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{dev.deviceName}</h4>
                      {dev.status === "active" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] flex items-center gap-1 font-mono font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          ONLINE AKTIF
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-mono font-medium">
                          SESI DIPUTUS
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] font-mono text-slate-600 border-slate-200 bg-slate-50">
                        {dev.os} • {dev.browser}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                      <span>Biro: <strong className="text-slate-900">{dev.tenantName}</strong></span>
                      <span>Kru: <strong className="text-cyan-700 font-semibold">{dev.userName}</strong> ({dev.userRole})</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono flex-wrap pt-0.5">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-500" /> IP: {dev.ipAddress}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" /> {dev.locationCity}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3 text-slate-500" /> Terakhir: {format(new Date(dev.lastActiveAt), "dd MMM, HH:mm 'WIB'", { locale: id })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aksi Putus Sesi */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {dev.status === "active" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setTargetDevice(dev);
                        setShowRevokeDialog(true);
                      }}
                      className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Putus Sesi (Revoke)
                    </Button>
                  ) : (
                    <span className="text-xs text-rose-600 italic font-mono pr-2">
                      Sesi telah dihentikan
                    </span>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleKillSwitchBiro(dev.tenantId, dev.tenantName)}
                    className="border-slate-300 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs h-8 px-2 rounded-xl shadow-xs"
                    title={`Kill Switch: Putus seluruh sesi biro ${dev.tenantName}`}
                  >
                    Kill All Biro
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Dialog Konfirmasi Revoke Perangkat */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 p-6 rounded-2xl shadow-xl">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Putus Sesi Perangkat Ini?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Tindakan ini akan langsung logout user di perangkat tersebut.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {targetDevice && (
            <div className="space-y-3 py-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-700">
                <div>Perangkat: <strong className="text-slate-900">{targetDevice.deviceName}</strong></div>
                <div>Pengguna: <strong className="text-cyan-700 font-semibold">{targetDevice.userName}</strong> ({targetDevice.userEmail})</div>
                <div>Biro: <strong className="text-slate-800">{targetDevice.tenantName}</strong></div>
                <div>IP / Lokasi: <span className="font-mono text-slate-500">{targetDevice.ipAddress} ({targetDevice.locationCity})</span></div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-600 font-medium">Alasan Pemutusan Sesi:</span>
                <Input
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevokeDialog(false)}
              className="text-xs border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRevoke}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
            >
              Ya, Putus Sesi Sekarang
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
