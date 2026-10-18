import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

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
const NotFound = lazy(() => import("./pages/NotFound"));

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Handle hardware back button
    let backButtonListener: any;
    
    const setupListener = async () => {
      backButtonListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapacitorApp.exitApp();
        } else {
          window.history.back();
        }
      });
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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
