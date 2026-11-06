import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { ThemeProvider } from "next-themes";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { AiAutomationCopilot } from "@/components/AiAutomationCopilot";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import { RoleProvider } from "@/contexts/RoleContext";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { DesktopModeLockOverlay } from "@/components/DesktopModeLockOverlay";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { initAuthListener } from "@/utils/authHelper";

// Lazy load heavy pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Trips = lazy(() => import("./pages/Trips"));
const NewTrip = lazy(() => import("./pages/NewTrip"));
const TripDetail = lazy(() => import("./pages/TripDetail"));
const Keuangan = lazy(() => import("./pages/Keuangan"));
const NewKeuangan = lazy(() => import("./pages/NewKeuangan"));
const Laporan = lazy(() => import("./pages/Laporan"));
const Destinations = lazy(() => import("./pages/Destinations"));
const SelectDestinations = lazy(() => import("./pages/SelectDestinations"));
const Notes = lazy(() => import("./pages/Notes"));
const NotesNew = lazy(() => import("./pages/NotesNew"));
const ImportWordRundown = lazy(() => import("./pages/ImportWordRundown"));
const PengaturanBiro = lazy(() => import("./pages/PengaturanBiro"));
const ManajemenKruRBAC = lazy(() => import("./pages/ManajemenKruRBAC"));
const GoalTargetBiro = lazy(() => import("./pages/GoalTargetBiro"));
const BoostUpgrade = lazy(() => import("./pages/BoostUpgrade"));
const LearnKnowledgeBase = lazy(() => import("./pages/LearnKnowledgeBase"));
const ProfilBiro = lazy(() => import("./pages/ProfilBiro"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard").then((m) => ({ default: m.SuperAdminDashboard })));
const NotFound = lazy(() => import("./pages/NotFound"));

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initAuthListener();

    // Handle hardware back button secara aman dan presisi
    let backButtonListener: any;
    
    const setupListener = async () => {
      try {
        backButtonListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          const currentPath = window.location.pathname;
          // Jika berada di dashboard, root, atau auth, atau tidak ada riwayat mundur, keluar dari aplikasi
          if (!canGoBack || currentPath === "/dashboard" || currentPath === "/" || currentPath === "/auth") {
            CapacitorApp.exitApp();
          } else {
            window.history.back();
          }
        });
      } catch (e) {
        // Ignore on non-native platform
      }
    };

    setupListener();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PWAInstallPrompt />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AiAutomationCopilot />
            <RoleProvider>
              <ImpersonationBanner />
              <DesktopSidebar />
              <DesktopModeLockOverlay />
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/trips" element={<Trips />} />
                  <Route path="/trips/new" element={<NewTrip />} />
                  <Route path="/trips/:id" element={<TripDetail />} />
                  <Route path="/destinations" element={<Destinations />} />
                  <Route path="/destinations/select" element={<SelectDestinations />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/notesnew" element={<NotesNew />} />
                  <Route path="/keuangan" element={<Keuangan />} />
                  <Route path="/keuangan/new" element={<NewKeuangan />} />
                  <Route path="/laporan" element={<Laporan />} />
                  <Route path="/import-rundown" element={<ImportWordRundown />} />
                  <Route path="/asisten-ai" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/profil" element={<ProfilBiro />} />
                  <Route path="/pengaturan" element={<ProfilBiro />} />
                  <Route path="/pengaturan-biro" element={<ProfilBiro />} />
                  <Route path="/pengaturan-biro-legacy" element={<PengaturanBiro />} />
                  <Route path="/manajemen-kru" element={<ManajemenKruRBAC />} />
                  <Route path="/goal" element={<GoalTargetBiro />} />
                  <Route path="/boost" element={<BoostUpgrade />} />
                  <Route path="/learn" element={<LearnKnowledgeBase />} />
                  <Route path="/super-admin" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/*" element={<SuperAdminDashboard />} />
                  <Route path="/teamwork-preview" element={<Navigate to="/super-admin?view=devices" replace />} />
                  <Route path="/agy-customizations" element={<Navigate to="/super-admin?view=feature_gating" replace />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </RoleProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
