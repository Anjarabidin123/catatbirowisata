import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, Fingerprint, Mail, Lock, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { biometricAuth } from "@/utils/biometricAuth";
import { Capacitor } from "@capacitor/core";
import BusAnimation from "@/components/BusAnimation";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("app_remembered_email") || localStorage.getItem("malika_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    if (Capacitor.isNativePlatform()) {
      biometricAuth.isAvailable().then(setBiometricAvailable);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        
        if (rememberMe) {
          localStorage.setItem("app_remembered_email", email.trim());
          if (biometricAvailable) {
            await biometricAuth.saveCredentials({ email: email.trim(), password });
          }
        } else {
          localStorage.removeItem("app_remembered_email");
          localStorage.removeItem("malika_remembered_email");
          if (biometricAvailable) {
            await biometricAuth.deleteCredentials();
          }
        }
        
        toast.success("Selamat datang! Berhasil masuk ke sistem.");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("Registrasi berhasil! Silakan masuk dengan akun Anda.");
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal masuk ke sistem");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const credentials = await biometricAuth.getCredentials();
      
      if (!credentials) {
        toast.error("Kredensial biometrik tidak ditemukan");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      toast.success("Login biometrik berhasil!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login biometrik gagal");
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Real Cinematic Indonesian Landscape Background (Gunung Bromo Sunrise) */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 filter brightness-[0.45] contrast-[1.05]"
        style={{ backgroundImage: "url('/hero-bromo.jpg')" }}
      />

      {/* Atmospheric Indonesian Tourism Color Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-blue-950/40 pointer-events-none" />

      {/* Pesona Indonesia Top Ribbon Colors */}
      <div className="absolute top-0 left-0 right-0 h-1.5 flex z-20">
        <div className="flex-1 bg-[#0085CD]" /> {/* Blue */}
        <div className="flex-1 bg-[#6CB42C]" /> {/* Green */}
        <div className="flex-1 bg-[#FF8000]" /> {/* Orange */}
        <div className="flex-1 bg-[#FFB800]" /> {/* Yellow */}
        <div className="flex-1 bg-[#E6007E]" /> {/* Magenta */}
      </div>

      <div className="w-full max-w-md relative z-10 my-6">
        
        {/* Animated Executive Tourist Bus Graphic */}
        <div className="w-48 sm:w-56 mx-auto mb-2 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]">
          <BusAnimation />
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-white/15 bg-slate-900/85 backdrop-blur-xl shadow-2xl p-6 sm:p-8 text-white">
          
          {/* Header Branding */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-emerald-300 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Sistem Biro Perjalanan Wisata</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
              Catat Trip Nusantara
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Manajemen Armada Bus, Jadwal & Kas Operasional
            </p>
          </div>

          {/* Segmented Tab (Masuk vs Daftar) */}
          <div className="flex p-1 mb-5 rounded-2xl bg-slate-800/90 border border-white/10">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                isLogin
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                !isLogin
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Daftar Akun
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                Alamat Email
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="agen@birowisata.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-950/70 border-white/15 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 h-11 text-sm rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                Kata Sandi
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-950/70 border-white/15 pl-10 pr-10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 h-11 text-sm rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <label
                    htmlFor="remember"
                    className="text-slate-300 cursor-pointer select-none hover:text-white"
                  >
                    Ingat email saya
                  </label>
                </div>
                <div className="flex items-center text-slate-400 text-[11px] gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Aman & Terenkripsi</span>
                </div>
              </div>
            )}

            {isLogin && biometricAvailable && (
              <Button
                type="button"
                onClick={handleBiometricLogin}
                variant="outline"
                className="w-full bg-white/5 border-white/15 text-slate-200 hover:bg-white/10 hover:text-white h-11 rounded-xl"
                disabled={biometricLoading}
              >
                <Fingerprint className="w-4 h-4 mr-2 text-cyan-400" />
                {biometricLoading ? "Memverifikasi..." : "Masuk dengan Sidik Jari"}
              </Button>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-11 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.99] rounded-xl flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>{isLogin ? "Masuk ke Sistem" : "Buat Akun Biro"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <MapPin className="w-3 h-3 text-red-400" />
            <span>Jelajahi Pesona Pariwisata Indonesia</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
