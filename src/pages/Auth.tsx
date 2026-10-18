import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, Fingerprint, Mail, Lock, Compass, ArrowRight, ShieldCheck } from "lucide-react";
import { biometricAuth } from "@/utils/biometricAuth";
import { Capacitor } from "@capacitor/core";

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
    // Cek remembered email dari key baru atau fallback key lama
    const savedEmail = localStorage.getItem("app_remembered_email") || localStorage.getItem("malika_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // Check biometric availability
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
        
        // Simpan email jika remember me aktif
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
        
        toast.success("Login berhasil! Selamat datang kembali.");
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
        toast.success("Akun berhasil dibuat! Silakan masuk.");
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat otentikasi");
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
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center p-4">
      {/* Background Ambient Glow Effect */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Subtle Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-2xl shadow-2xl p-7 sm:p-9 text-slate-100">
          
          {/* Header Brand */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/25 mb-4 group transition-transform hover:scale-105">
              <Compass className="w-8 h-8 text-white transition-transform group-hover:rotate-45" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1.5">
              Pencatatan Agen Biro
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Sistem Operasional Trip, Kendaraan & Keuangan
            </p>
          </div>

          {/* Segmented Tab Switcher (Masuk vs Daftar) */}
          <div className="flex p-1 mb-6 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                isLogin
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                !isLogin
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                Alamat Email
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@agenbiro.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-950/60 border-slate-700/80 pl-10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500 h-11 text-sm rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                Kata Sandi
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-950/60 border-slate-700/80 pl-10 pr-10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500 h-11 text-sm rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
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
                    className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <label
                    htmlFor="remember"
                    className="text-slate-400 cursor-pointer select-none hover:text-slate-300"
                  >
                    Ingat email saya
                  </label>
                </div>
                <div className="flex items-center text-slate-500 text-[11px] gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Enkripsi Aman</span>
                </div>
              </div>
            )}

            {isLogin && biometricAvailable && (
              <Button
                type="button"
                onClick={handleBiometricLogin}
                variant="outline"
                className="w-full bg-slate-800/40 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white h-11 rounded-xl"
                disabled={biometricLoading}
              >
                <Fingerprint className="w-4 h-4 mr-2 text-blue-400" />
                {biometricLoading ? "Memverifikasi..." : "Masuk dengan Sidik Jari"}
              </Button>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold h-11 shadow-lg shadow-blue-600/25 transition-all active:scale-[0.99] rounded-xl flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>{isLogin ? "Masuk ke Sistem" : "Buat Akun Sekarang"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer note */}
          <div className="mt-7 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Khusus Penggunaan Internal Agen Biro Perjalanan
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
