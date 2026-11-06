import React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Laptop, Check } from "lucide-react";

interface ThemeToggleProps {
  variant?: "button" | "dropdown" | "segmented";
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = "dropdown",
  className = "",
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Mode 1: Segmented Pill (Sangat pas untuk halaman pengaturan profil / sidebar)
  if (variant === "segmented") {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold ${className}`}>
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            theme === "light"
              ? "bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
          title="Paksa Mode Terang (Meskipun Chrome/HP Mode Gelap)"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Terang</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            theme === "dark"
              ? "bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
          title="Mode Gelap (Dark Mode)"
        >
          <Moon className="w-3.5 h-3.5 text-blue-500" />
          <span>Gelap</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("system")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            theme === "system"
              ? "bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
          title="Ikuti Setelan Chrome / Ponsel Otomatis"
        >
          <Laptop className="w-3.5 h-3.5 text-slate-500" />
          <span>Sistem</span>
        </button>
      </div>
    );
  }

  // Mode 2: 1-Click Fast Toggle Button (Untuk Header / Top Bar)
  if (variant === "button") {
    const isDark = resolvedTheme === "dark";
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs ${className}`}
        title={`Tema saat ini: ${isDark ? "Gelap" : "Terang"}. Klik untuk beralih.`}
      >
        {isDark ? (
          <Moon className="w-4 h-4 text-blue-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </Button>
    );
  }

  // Mode 3: Dropdown Menu (Default)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 px-2.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs text-xs font-bold gap-1.5 ${className}`}
          title="Ubah Tema Tampilan (Terang / Gelap / Sistem)"
        >
          {resolvedTheme === "dark" ? (
            <Moon className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className="hidden sm:inline">
            {theme === "light" ? "Terang" : theme === "dark" ? "Gelap" : "Sistem"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl p-1 z-50">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="text-xs font-bold gap-2 py-2 cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Mode Terang (Light)</span>
          </div>
          {theme === "light" && <Check className="w-3.5 h-3.5 text-blue-600" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="text-xs font-bold gap-2 py-2 cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-blue-500" />
            <span>Mode Gelap (Dark)</span>
          </div>
          {theme === "dark" && <Check className="w-3.5 h-3.5 text-blue-600" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="text-xs font-bold gap-2 py-2 cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-slate-500" />
            <span>Ikuti Chrome / HP</span>
          </div>
          {theme === "system" && <Check className="w-3.5 h-3.5 text-blue-600" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
