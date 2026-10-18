import { Home, Bus, Wallet, FileText, StickyNote } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Beranda", path: "/dashboard" },
    { icon: Bus, label: "Trip", path: "/trips" },
    { icon: StickyNote, label: "Catatan", path: "/notesnew" },
    { icon: Wallet, label: "Keuangan", path: "/keuangan" },
    { icon: FileText, label: "Laporan", path: "/laporan" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom z-50">
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
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
              )}
              <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? "scale-110" : ""}`} />
              <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
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
