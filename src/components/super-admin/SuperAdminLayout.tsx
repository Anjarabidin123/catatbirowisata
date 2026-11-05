import React, { useState } from "react";
import { SuperAdminSidebar } from "./SuperAdminSidebar";
import { SuperAdminHeader } from "./SuperAdminHeader";
import { TenantRecord } from "@/utils/licenseEntitlement";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuperAdminLayoutProps {
  currentView: string;
  onSelectView: (view: string) => void;
  tenants: TenantRecord[];
  devicesCount: number;
  auditCount: number;
  broadcastsCount?: number;
  ticketsCount?: number;
  onRefresh: () => void;
  onOpenAddTenant?: () => void;
  children: React.ReactNode;
}

export const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({
  currentView,
  onSelectView,
  tenants,
  devicesCount,
  auditCount,
  broadcastsCount,
  ticketsCount,
  onRefresh,
  onOpenAddTenant,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectView = (view: string) => {
    onSelectView(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <SuperAdminSidebar
          currentView={currentView}
          onSelectView={handleSelectView}
          tenantsCount={tenants.length}
          devicesCount={devicesCount}
          auditCount={auditCount}
          broadcastsCount={broadcastsCount}
          ticketsCount={ticketsCount}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="relative z-10 w-64 max-w-[85vw] flex flex-col h-full bg-white border-r border-slate-200 shadow-2xl">
            <SuperAdminSidebar
              currentView={currentView}
              onSelectView={handleSelectView}
              tenantsCount={tenants.length}
              devicesCount={devicesCount}
              auditCount={auditCount}
              broadcastsCount={broadcastsCount}
              ticketsCount={ticketsCount}
              className="w-full min-h-0 h-full border-r-0"
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Top Bar toggle */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="border-slate-300 bg-white hover:bg-slate-50 text-slate-700 w-8 h-8 p-0 shadow-xs"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">
              CATATBIRO <span className="text-amber-600 text-xs font-mono font-bold">ROOT</span>
            </span>
          </div>
        </div>

        {/* Global Super Admin Header */}
        <SuperAdminHeader
          currentView={currentView}
          onRefresh={onRefresh}
          onOpenAddTenant={onOpenAddTenant}
          onSelectView={handleSelectView}
          tenants={tenants}
        />

        {/* Page View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
