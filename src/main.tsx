import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from "@capacitor/app";

// Handle Android back button
CapacitorApp.addListener("backButton", ({ canGoBack }) => {
  if (!canGoBack) {
    CapacitorApp.exitApp();
  } else {
    window.history.back();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
