import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TenantRecord } from "@/utils/licenseEntitlement";
import {
  Globe,
  Server,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  Clock,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface WebsitesViewProps {
  tenants: TenantRecord[];
  onRefresh: () => void;
}

export const WebsitesView: React.FC<WebsitesViewProps> = ({ tenants }) => {
  const websiteTenants = useMemo(() => {
    return tenants.filter((t) => t.hasWebsite);
  }, [tenants]);

  const handleSendRenewalWhatsApp = (tenant: TenantRecord) => {
    const cleanPhone = tenant.ownerPhone.replace(/[^0-9]/g, "");
    const formatted = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
    const msg = `Halo ${tenant.ownerNama} (${tenant.namaBiro}), ini Mas Anjar (Founder CatatBiro). Masa aktif domain & server VPS website promosi Anda (${tenant.domainName || tenant.subdomain}) akan berakhir pada ${tenant.domainExpiredAt || "segera"}. Biaya perpanjangan tahunan adalah Rp 750.000/tahun (termasuk domain & VPS SG). Silakan konfirmasi untuk perpanjangan ya! Terima kasih. 🙏`;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Website Promosi, Domain Kustom & Manajemen VPS
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring domain klien (.com / .id), subdomain sistem, serta jadwal perpanjangan tahunan Rp 750.000/thn.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Domain Aktif
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1.5">
            {websiteTenants.length} <span className="text-sm font-medium text-slate-500">Website</span>
          </div>
          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Domain kustom & subdomain terhubung
          </p>
        </Card>

        <Card className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <Server className="w-3.5 h-3.5" />
            VPS Server Node
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1.5">
            vps-sgp-01
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            IP: 103.186.201.44 (Singapore)
          </p>
        </Card>

        <Card className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Biaya Perpanjangan
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1.5">
            Rp 750.000 <span className="text-sm font-medium text-slate-500">/thn</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Domain .com/.id + Hosting VPS Cloud
          </p>
        </Card>
      </div>

      {/* Websites Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Nama Biro</th>
                <th className="py-3.5 px-3">Domain Utama (.com / .id)</th>
                <th className="py-3.5 px-3">Subdomain Sistem</th>
                <th className="py-3.5 px-3">Node VPS</th>
                <th className="py-3.5 px-3">Status SSL</th>
                <th className="py-3.5 px-3">Kadaluarsa Domain</th>
                <th className="py-3.5 px-4 text-right">Tagihan Perpanjangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {websiteTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Belum ada biro yang mengaktifkan add-on paket website promosi
                  </td>
                </tr>
              ) : (
                websiteTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900 text-sm">
                      {t.namaBiro}
                    </td>

                    <td className="py-4 px-3 font-mono">
                      {t.domainName ? (
                        <a
                          href={`https://${t.domainName}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          {t.domainName}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">Belum setting domain</span>
                      )}
                    </td>

                    <td className="py-4 px-3 font-mono text-cyan-700 font-medium">
                      {t.subdomain || `${t.slugBiro}.catatbiro.id`}
                    </td>

                    <td className="py-4 px-3 font-mono text-slate-600">
                      {t.vpsIp || "103.186.201.44"}
                    </td>

                    <td className="py-4 px-3">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] flex items-center gap-1 w-fit font-medium">
                        <ShieldCheck className="w-3 h-3" /> Let's Encrypt
                      </Badge>
                    </td>

                    <td className="py-4 px-3 font-mono text-slate-600">
                      {t.domainExpiredAt || "2027-10-15"}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleSendRenewalWhatsApp(t)}
                        className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs h-7 px-2.5 rounded-lg flex items-center gap-1 ml-auto transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        Tagih WA (Rp 750k)
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
