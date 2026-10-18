import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, Compass, ShieldCheck } from "lucide-react";

interface GreetingHeaderProps {
  userEmail?: string;
}

const GreetingHeader = ({ userEmail }: GreetingHeaderProps) => {
  const [greeting, setGreeting] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();

      if (hour >= 4 && hour < 11) {
        setGreeting("Selamat Pagi");
      } else if (hour >= 11 && hour < 15) {
        setGreeting("Selamat Siang");
      } else if (hour >= 15 && hour < 18) {
        setGreeting("Selamat Sore");
      } else {
        setGreeting("Selamat Malam");
      }

      setCurrentDate(format(now, "EEEE, dd MMMM yyyy", { locale: id }));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Ambil nama dari email jika ada
  const displayName = userEmail ? userEmail.split("@")[0] : "Rekan Biro";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-5 sm:p-6 text-white shadow-xl shadow-blue-900/10 mb-6">
      {/* Decorative Glow */}
      <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-32 h-32 bg-indigo-400/10 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-medium text-blue-100 mb-2 border border-white/10">
            <Calendar className="w-3 h-3" />
            <span>{currentDate}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
            {greeting}, <span className="capitalize">{displayName}</span>!
          </h1>
          <p className="text-blue-100/80 text-xs sm:text-sm mt-0.5">
            Semoga operasional perjalanan hari ini lancar & berkah.
          </p>
        </div>

        <div className="flex-shrink-0 hidden xs:flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-inner">
          <Compass className="w-7 h-7 text-white animate-spin-slow" />
        </div>
      </div>
    </div>
  );
};

export default GreetingHeader;
