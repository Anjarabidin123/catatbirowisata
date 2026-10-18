import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import BusAnimation from "@/components/BusAnimation";
import { Eye, EyeOff, Fingerprint } from "lucide-react";
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
    const savedEmail = localStorage.getItem("malika_remembered_email");
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
          email,
          password,
        });
        if (error) throw error;
        
        // Save email if remember me is checked
        if (rememberMe) {
          localStorage.setItem("malika_remembered_email", email);
          // Save credentials for biometric login
          if (biometricAvailable) {
            await biometricAuth.saveCredentials({ email, password });
          }
        } else {
          localStorage.removeItem("malika_remembered_email");
          if (biometricAvailable) {
            await biometricAuth.deleteCredentials();
          }
        }
        
        toast.success("Login berhasil!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("Registrasi berhasil! Silakan login.");
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
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
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 safe-top">
      <div className="w-full max-w-md">
        <div className="ios-card p-8 animate-slide-up backdrop-blur-xl bg-white/95">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-40 h-32">
                <BusAnimation />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Malika Tour</h1>
            <p className="text-muted-foreground">Manajemen Trip & Keuangan</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="ios-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="ios-card pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Ingat email saya
                </label>
              </div>
            )}

            {isLogin && biometricAvailable && (
              <Button
                type="button"
                onClick={handleBiometricLogin}
                variant="outline"
                className="w-full border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                disabled={biometricLoading}
              >
                <Fingerprint className="w-5 h-5 mr-2" />
                {biometricLoading ? "Memverifikasi..." : "Login dengan Sidik Jari"}
              </Button>
            )}

            <Button
              type="submit"
              className="w-full gradient-primary text-white font-semibold"
              disabled={loading}
            >
              {loading ? "Memproses..." : isLogin ? "Masuk" : "Daftar"}
            </Button>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
