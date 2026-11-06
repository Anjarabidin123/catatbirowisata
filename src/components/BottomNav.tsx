import { Home, Calendar, Wallet, StickyNote, Settings, FileText, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";

const BottomNav = () => {
  const location = useLocation();
  const { isPemilik } = useRole();

  const navItems = isPemilik
    ? [
        { icon: Home, label: "Beranda", path: "/dashboard" },
        { icon: Calendar, label: "Kalender", path: "/trips" },
        { icon: Wallet, label: "Keuangan", path: "/keuangan" },
        { icon: FileText, label: "Laporan", path: "/laporan" },
        { icon: User, label: "Profil", path: "/profil" },
      ]
    : [
        { icon: Home, label: "Posko TL", path: "/dashboard" },
        { icon: Calendar, label: "Jadwal", path: "/trips" },
        { icon: Wallet, label: "Kas Saku", path: "/keuangan" },
        { icon: StickyNote, label: "Catatan", path: "/notesnew" },
        { icon: User, label: "Profil", path: "/profil" },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom z-40 lg:hidden shadow-lg">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
                isActive
                  ? isPemilik
                    ? "text-primary"
                    : "text-emerald-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full ${
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
