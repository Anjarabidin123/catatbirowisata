import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, MapPin, Sparkles } from "lucide-react";

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

  const displayName = userEmail ? userEmail.split("@")[0] : "Rekan Biro";

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-xl mb-6 text-white min-h-[145px] flex flex-col justify-end p-5 sm:p-6 group">
      {/* Background Photo: Real Indonesian Destination (Borobudur / Bromo) */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: "url('/borobudur.jpg')" }}
      />

      {/* Cinematic Dark & Pesona Blue Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-blue-950/40" />

      {/* Pesona Colors Top Accent Ribbon */}
      <div className="absolute top-0 left-0 right-0 h-1 flex">
        <div className="flex-1 bg-[#0085CD]" />
        <div className="flex-1 bg-[#6CB42C]" />
        <div className="flex-1 bg-[#FF8000]" />
        <div className="flex-1 bg-[#FFB800]" />
        <div className="flex-1 bg-[#E6007E]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[11px] font-medium text-slate-200">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>{currentDate}</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-[10px] font-semibold text-emerald-300">
            <Sparkles className="w-3 h-3" />
            <span>Pesona Indonesia</span>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-0.5 drop-shadow-sm">
          {greeting}, <span className="capitalize text-cyan-300">{displayName}</span>!
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 line-clamp-1 drop-shadow-sm">
          Panel kendali armada, destinasi wisata, dan pembukuan trip biro Anda.
        </p>
      </div>
    </div>
  );
};

export default GreetingHeader;
