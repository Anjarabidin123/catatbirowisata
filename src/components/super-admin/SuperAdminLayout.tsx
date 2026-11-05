import React, { useState } from "react";
import { SuperAdminSidebar } from "./SuperAdminSidebar";
import { SuperAdminHeader } from "./SuperAdminHeader";
import { TenantRecord } from "@/utils/licenseEntitlement";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuperAdminLayoutProps {
  currentView: string;
  onSelectView: (view: string) => void;
  tenants: TenantRecord[];
  devicesCount: number;
  auditCount: number;
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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <SuperAdminSidebar
          currentView={currentView}
          onSelectView={handleSelectView}
          tenantsCount={tenants.length}
          devicesCount={devicesCount}
          auditCount={auditCount}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="relative z-10 w-72 max-w-[85vw] flex flex-col h-full bg-[#0a0f1d] shadow-2xl">
            <div className="p-3 flex justify-end border-b border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 p-0 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SuperAdminSidebar
                currentView={currentView}
                onSelectView={handleSelectView}
                tenantsCount={tenants.length}
                devicesCount={devicesCount}
                auditCount={auditCount}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Top Bar toggle */}
        <div className="lg:hidden bg-[#0a0f1d] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="border-slate-700 bg-slate-900 text-slate-300 w-8 h-8 p-0"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <span className="font-extrabold text-sm text-white tracking-tight">
              CATATBIRO <span className="text-amber-400 text-xs font-mono">ROOT</span>
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
