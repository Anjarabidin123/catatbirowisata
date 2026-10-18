import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, Fingerprint, Mail, Lock, ArrowRight, ShieldCheck, MapPin, Sparkles } from "lucide-react";
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
    <div className="min-h-screen relative overflow-hidden bg-sky-50/60 flex items-center justify-center p-4">
      {/* Bright, Sunny Indonesian Landscape (Pantai Tropis Bali & Langit Cerah) */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 filter brightness-[0.9] saturate-[1.15]"
        style={{ backgroundImage: "url('/bali-beach.jpg')" }}
      />

      {/* Fresh Sunny Daylight Overlay with Soft Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-sky-950/80 via-white/40 to-sky-100/70 backdrop-blur-[2px] pointer-events-none" />


      <div className="w-full max-w-md relative z-10 my-6">
        
        {/* Animated Executive Tourist Bus in Daylight */}
        <div className="w-48 sm:w-56 mx-auto mb-2 filter drop-shadow-md">
          <BusAnimation />
        </div>

        {/* Main Clean Light Card */}
        <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-xl shadow-2xl shadow-sky-900/15 p-6 sm:p-8 text-slate-800">
          
          {/* Header Branding */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-[11px] font-bold text-blue-700 mb-2.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Sistem Operasional Agen Biro</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
              Catat Trip Nusantara
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Manajemen Armada Bus, Jadwal & Kas Operasional
            </p>
          </div>

          {/* Segmented Tab (Masuk vs Daftar) */}
          <div className="flex p-1 mb-5 rounded-2xl bg-slate-100 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                isLogin
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                !isLogin
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Daftar Akun
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
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
                  className="bg-slate-50/80 border-slate-200 pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-600 focus-visible:border-blue-600 h-11 text-sm rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
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
                  className="bg-slate-50/80 border-slate-200 pl-10 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-600 focus-visible:border-blue-600 h-11 text-sm rounded-xl font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
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
                    className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <label
                    htmlFor="remember"
                    className="text-slate-600 cursor-pointer select-none hover:text-slate-900 font-medium"
                  >
                    Ingat email saya
                  </label>
                </div>
                <div className="flex items-center text-slate-500 text-[11px] gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Aman & Terenkripsi</span>
                </div>
              </div>
            )}

            {isLogin && biometricAvailable && (
              <Button
                type="button"
                onClick={handleBiometricLogin}
                variant="outline"
                className="w-full bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-blue-700 h-11 rounded-xl font-semibold"
                disabled={biometricLoading}
              >
                <Fingerprint className="w-4 h-4 mr-2 text-blue-600" />
                {biometricLoading ? "Memverifikasi..." : "Masuk dengan Sidik Jari"}
              </Button>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-700 hover:to-sky-700 text-white font-bold h-11 shadow-lg shadow-blue-600/25 transition-all active:scale-[0.99] rounded-xl flex items-center justify-center gap-2"
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
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <MapPin className="w-3 h-3 text-red-500" />
            <span>Jelajahi Pesona Pariwisata Nusantara</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
