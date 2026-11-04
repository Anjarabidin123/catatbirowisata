import { Home, Bus, Wallet, FileText, StickyNote, Users, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";

const BottomNav = () => {
  const location = useLocation();
  const { isPemilik } = useRole();

  const navItems = isPemilik
    ? [
        { icon: Home, label: "Beranda", path: "/dashboard" },
        { icon: Bus, label: "Trip", path: "/trips" },
        { icon: Users, label: "Kru & RBAC", path: "/manajemen-kru" },
        { icon: Wallet, label: "Keuangan", path: "/keuangan" },
        { icon: FileText, label: "Laporan", path: "/laporan" },
      ]
    : [
        { icon: Home, label: "Posko TL", path: "/dashboard" },
        { icon: Bus, label: "Tugas Trip", path: "/trips" },
        { icon: Wallet, label: "Kas Saku", path: "/keuangan" },
        { icon: StickyNote, label: "Catatan", path: "/notesnew" },
        { icon: FileText, label: "Import Word", path: "/import-rundown" },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom z-50 lg:bottom-auto lg:left-0 lg:top-0 lg:right-auto lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-r lg:border-t-0 lg:px-4 lg:py-6">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1 lg:h-auto lg:w-full lg:max-w-none lg:flex-col lg:items-stretch lg:gap-2 lg:px-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative lg:flex-row lg:justify-start lg:gap-3 lg:h-12 lg:w-full lg:rounded-xl lg:px-3 ${
                isActive
                  ? isPemilik
                    ? "text-primary"
                    : "text-emerald-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full lg:top-1/2 lg:left-0 lg:h-8 lg:w-1 lg:-translate-y-1/2 ${
                    isPemilik ? "bg-primary" : "bg-emerald-600"
                  }`}
                />
              )}
              <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? "scale-110" : ""}`} />
              <span className={`text-[10px] font-medium ${isActive ? "font-bold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
