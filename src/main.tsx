import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from "@capacitor/app";

// Handle Android hardware back button
try {
  CapacitorApp.addListener("backButton", ({ canGoBack }) => {
    if (!canGoBack) {
      CapacitorApp.exitApp();
    } else {
      window.history.back();
    }
  });
} catch (e) {
  // Ignore on non-native platform
}

// Register PWA Service Worker (hanya di Production agar tidak mengganggu CORS & HMR di local dev)
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("PWA Service Worker aktif:", registration.scope);
        })
        .catch((error) => {
          console.warn("PWA Service Worker gagal didaftarkan:", error);
        });
    });
  } else {
    // Unregister service worker yang ada saat local development
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
        console.log("Service Worker dinonaktifkan untuk local development:", registration.scope);
      }
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
