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

// Register PWA Service Worker
if ("serviceWorker" in navigator) {
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
}

createRoot(document.getElementById("root")!).render(<App />);
