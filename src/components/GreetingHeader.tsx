import { useEffect, useState } from "react";
import BusAnimation from "@/components/BusAnimation";

const GreetingHeader = () => {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const updateGreeting = () => {
      // Waktu Indonesia Barat (WIB) adalah UTC+7
      const now = new Date();
      const wibTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      const hour = wibTime.getHours();

      if (hour >= 5 && hour < 11) {
        setGreeting("Selamat Pagi");
      } else if (hour >= 11 && hour < 15) {
        setGreeting("Selamat Siang");
      } else if (hour >= 15 && hour < 18) {
        setGreeting("Selamat Sore");
      } else {
        setGreeting("Selamat Malam");
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update setiap menit

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="gradient-hero p-6 rounded-3xl shadow-lg mb-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white mb-1">{greeting}! 👋</h1>
          <p className="text-white/90 text-sm">Selamat datang di Malika Tour</p>
        </div>
        <div className="w-20 h-16">
          <BusAnimation />
        </div>
      </div>
    </div>
  );
};

export default GreetingHeader;
