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
import { TenantRecord, updateTenant } from "@/utils/licenseEntitlement";
import {
  CreditCard,
  Search,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Building2,
  Calendar,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface BillingViewProps {
  tenants: TenantRecord[];
  onRefresh: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ tenants, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentModelFilter, setPaymentModelFilter] = useState<string>("ALL");

  const totalOmset = useMemo(() => {
    return tenants.reduce((acc, t) => acc + (t.nominalBayar || 0), 0);
  }, [tenants]);

  const lifetimeTotal = useMemo(() => {
    return tenants
      .filter((t) => t.paymentModel === "lifetime")
      .reduce((acc, t) => acc + (t.nominalBayar || 0), 0);
  }, [tenants]);

  const subscriptionTotal = useMemo(() => {
    return tenants
      .filter((t) => t.paymentModel === "subscription")
      .reduce((acc, t) => acc + (t.nominalBayar || 0), 0);
  }, [tenants]);

  const formatRupiah = (num: number) => {
    return "Rp " + Math.floor(num).toLocaleString("id-ID");
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (paymentModelFilter !== "ALL" && t.paymentModel !== paymentModelFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          t.namaBiro.toLowerCase().includes(q) ||
          t.ownerNama.toLowerCase().includes(q) ||
          t.ownerEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tenants, paymentModelFilter, searchTerm]);

  const handleSendBillingWhatsApp = (tenant: TenantRecord) => {
    const cleanPhone = tenant.ownerPhone.replace(/[^0-9]/g, "");
    const formatted = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
    const msg = `Halo ${tenant.ownerNama} (${tenant.namaBiro}), ini konfirmasi tagihan lisensi CatatBiro Wisata paket ${tenant.tier.toUpperCase()} sebesar ${formatRupiah(tenant.nominalBayar)}. Pembayaran dapat ditransfer ke Rekening BCA: 0840539121 a/n Nugroho Anjar Abidin. Terima kasih telah bermitra bersama kami! 🙏`;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Penagihan, Invoicing & Arus Kas Lisensi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekapitulasi penjualan lisensi Sekali Bayar (Lifetime Deal) dan biaya langganan hosting tahunan.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Kas Masuk Lisensi
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1.5">
            {formatRupiah(totalOmset)}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Dari {tenants.length} biro wisata
          </p>
        </Card>

        <Card className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Lisensi Sekali Bayar (Lifetime)
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1.5">
            {formatRupiah(lifetimeTotal)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Paket Starter & Pro Lifetime Deal
          </p>
        </Card>

        <Card className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
            Langganan SaaS & Domain
          </span>
          <div className="text-2xl font-black text-purple-600 mt-1.5">
            {formatRupiah(subscriptionTotal)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Paket Enterprise & Recurring VPS
          </p>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari biro atau nama pemilik..."
            className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs h-9 rounded-xl"
          />
        </div>

        <Select value={paymentModelFilter} onValueChange={setPaymentModelFilter}>
          <SelectTrigger className="w-[180px] bg-white border-slate-300 text-slate-900 text-xs h-9 rounded-xl">
            <SelectValue placeholder="Model Bayar" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200 text-slate-900 text-xs shadow-md">
            <SelectItem value="ALL">Semua Model</SelectItem>
            <SelectItem value="lifetime">Sekali Bayar (Lifetime)</SelectItem>
            <SelectItem value="subscription">Langganan Berkala</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Biro & Pemilik</th>
                <th className="py-3.5 px-3">Paket Lisensi</th>
                <th className="py-3.5 px-3">Model Penagihan</th>
                <th className="py-3.5 px-3">Nominal Terbayar</th>
                <th className="py-3.5 px-3">Tanggal Bayar</th>
                <th className="py-3.5 px-3">Jatuh Tempo</th>
                <th className="py-3.5 px-4 text-right">Kirim Tagihan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 space-y-0.5">
                    <div className="font-bold text-slate-900 text-sm">{t.namaBiro}</div>
                    <div className="text-[11px] text-slate-500">{t.ownerNama} • {t.ownerPhone}</div>
                  </td>

                  <td className="py-4 px-3">
                    <Badge
                      className={`text-[10px] uppercase font-mono ${
                        t.tier === "enterprise"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : t.tier === "pro"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {t.tier}
                    </Badge>
                  </td>

                  <td className="py-4 px-3">
                    <Badge variant="outline" className="text-[10px] border-slate-200 bg-slate-50 text-slate-700">
                      {t.paymentModel === "lifetime" ? "Sekali Bayar" : "Langganan Bulanan"}
                    </Badge>
                  </td>

                  <td className="py-4 px-3 font-mono text-emerald-600 font-bold text-sm">
                    {formatRupiah(t.nominalBayar)}
                  </td>

                  <td className="py-4 px-3 font-mono text-slate-600">
                    {t.tanggalBayar || "-"}
                  </td>

                  <td className="py-4 px-3 font-mono text-slate-600">
                    {t.tanggalJatuhTempo || (t.paymentModel === "lifetime" ? "Seumur Hidup" : "-")}
                  </td>

                  <td className="py-4 px-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => handleSendBillingWhatsApp(t)}
                      className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs h-7 px-2.5 rounded-lg flex items-center gap-1 ml-auto transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Invoice WA
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
