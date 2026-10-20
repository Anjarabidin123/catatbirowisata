import { useState, useEffect } from "react";
import { Download, X, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    // 1. Cek apakah sudah berjalan di mode standalone (sudah terinstall)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // Sudah terinstall, tidak perlu tampilkan banner
    }

    // 2. Cek apakah pengguna baru saja menutup prompt (cooldown 2 hari)
    const dismissedAt = localStorage.getItem("pwa_prompt_dismissed_at");
    if (dismissedAt) {
      const daysSinceDismissed =
        (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 2) {
        return;
      }
    }

    // 3. Deteksi iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);

    if (isAppleDevice && isSafari) {
      setIsIOS(true);
      setShowPrompt(true);
      return;
    }

    // 4. Tangkap event beforeinstallprompt untuk Android / Chromium / Edge / PC
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSTip(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed_at", Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="p-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white border border-slate-700/80 shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-md">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">Pasang Aplikasi Agen Biro</p>
            <p className="text-[10px] text-slate-300 truncate">
              {isIOS
                ? "Pasang di Layar Utama HP untuk akses cepat"
                : "Akses cepat dari layar utama & offline ready"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="h-8 px-3 text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Pasang
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Petunjuk Khusus iOS Safari */}
      {showIOSTip && (
        <div className="mt-2 p-3 rounded-xl bg-blue-600 text-white text-xs shadow-lg space-y-1 animate-in fade-in duration-200">
          <p className="font-bold flex items-center gap-1.5">
            <Share className="w-3.5 h-3.5" />
            Cara pasang di iPhone / iPad:
          </p>
          <ol className="list-decimal list-inside text-[11px] space-y-0.5 text-blue-100">
            <li>Ketuk tombol <strong>Bagikan (Share)</strong> di bagian bawah Safari</li>
            <li>Geser ke bawah dan pilih <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen)</li>
          </ol>
        </div>
      )}
    </div>
  );
};
