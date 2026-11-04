import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, Fingerprint, Mail, Lock, ArrowRight, ShieldCheck, MapPin, UserCheck, Smartphone } from "lucide-react";
import { biometricAuth } from "@/utils/biometricAuth";
import { Capacitor } from "@capacitor/core";
import MiniRunningBus from "@/components/MiniRunningBus";
import { useRole, UserRole } from "@/contexts/RoleContext";
import { registerCurrentDeviceLogin, logCrewActivity } from "@/utils/rbacAuditLogger";

const Auth = () => {
  const navigate = useNavigate();
  const { role, setRole, activeCrew, switchActiveCrew, crewList, currentDevice } = useRole();
  const [selectedRole, setSelectedRole] = useState<UserRole>(role);
  const [selectedCrewId, setSelectedCrewId] = useState<string>(activeCrew.crewId);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState("");

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

  const applyRBACSession = () => {
    setRole(selectedRole);
    if (selectedRole === "kru") {
      switchActiveCrew(selectedCrewId);
      const picked = crewList.find((c) => c.id === selectedCrewId);
      const crewId = picked ? picked.id : activeCrew.crewId;
      const crewName = picked ? picked.nama : activeCrew.nama;
      const jabatan = picked ? picked.jabatan : activeCrew.jabatan;

      registerCurrentDeviceLogin({
        role: "kru",
        crewId,
        crewName,
        jabatan,
      });
      logCrewActivity({
        kategori: "login_device",
        aksi: `Login Kru Berhasil: ${crewName}`,
        detail: `Perangkat: ${currentDevice.deviceName} (${currentDevice.os} • ${currentDevice.browser})`,
        customActor: { crewId, crewName, jabatan, role: "kru" },
      });
    } else {
      registerCurrentDeviceLogin({
        role: "pemilik",
        crewId: "owner_primary",
        crewName: "Pemilik Biro (Direktur)",
        jabatan: "Owner & Super Admin",
      });
      logCrewActivity({
        kategori: "login_device",
        aksi: "Login Pemilik Biro (Owner)",
        detail: `Perangkat: ${currentDevice.deviceName} (${currentDevice.os} • ${currentDevice.browser})`,
        customActor: {
          crewId: "owner_primary",
          crewName: "Pemilik Biro (Owner)",
          jabatan: "Owner & Super Admin",
          role: "pemilik",
        },
      });
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSignupMessage("");

    try {
      if (isLogin) {
        // Bersihkan sisa token sesi lama sebelum login baru
        try {
          localStorage.removeItem("sb-xirxglkwojgbzjyhhdhm-auth-token");
        } catch (e) {}

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

        applyRBACSession();
        toast.success(
          selectedRole === "pemilik"
            ? "Selamat datang, Pemilik Biro! Berhasil masuk dengan hak akses penuh."
            : "Selamat bertugas! Berhasil masuk ke Posko Operasional Kru."
        );
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
        setSignupMessage(
          `Pendaftaran berhasil. Kami telah mengirim email konfirmasi ke ${email.trim()}. Buka inbox Anda, lalu klik tautan konfirmasi tersebut sebelum login. Jika belum terlihat, periksa folder Spam atau Promosi.`
        );
        toast.success("Pendaftaran berhasil. Silakan konfirmasi melalui email yang dikirim sebelum login.");
        setPassword("");
      }
    } catch (error: any) {
      const message = error?.message || "Gagal memproses autentikasi";
      const lowerMessage = message.toLowerCase();
      const safeMessage = lowerMessage.includes("invalid login credentials")
        ? "Email atau kata sandi salah. Jika baru mendaftar, konfirmasi email terlebih dahulu."
        : message;
      toast.error(safeMessage);
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

      applyRBACSession();
      toast.success("Login biometrik berhasil!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login biometrik gagal");
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f6f7f3] flex items-center justify-center p-4 lg:p-8">
      {/* Mobile keeps the original full-bleed travel backdrop; desktop gets a quieter split layout. */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 brightness-[0.9] saturate-[1.15] lg:inset-y-8 lg:left-8 lg:right-1/2 lg:scale-100 lg:rounded-[2rem] lg:brightness-[0.78]"
        style={{ backgroundImage: "url('/bali-beach.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-sky-950/80 via-white/40 to-sky-100/70 backdrop-blur-[2px] pointer-events-none lg:inset-y-8 lg:left-8 lg:right-1/2 lg:rounded-[2rem] lg:bg-gradient-to-t lg:from-[#123d3a]/80 lg:via-transparent lg:to-[#123d3a]/10" />

      <div className="w-full max-w-md relative z-10 my-6 lg:my-0 lg:max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:items-center lg:gap-16">
        <div className="hidden lg:flex lg:min-h-[620px] lg:flex-col lg:justify-end lg:px-12 lg:py-12 lg:text-white">
          <div className="max-w-md">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold tracking-wide text-white/85">
              <MapPin className="h-4 w-4" /> Nusantara Travel Operations
            </div>
            <h2 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em]">Perjalanan yang rapi dimulai dari sini.</h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-white/80">Kelola armada, jadwal, dan kas biro wisata dalam satu ruang kerja yang tenang.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-xl shadow-2xl shadow-sky-900/15 p-6 sm:p-8 text-slate-800 lg:rounded-[2rem] lg:border-slate-200/80 lg:p-10 lg:shadow-xl lg:shadow-slate-900/10">
          {/* Header Branding */}
          <div className="text-center mb-5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
              Catat Trip Nusantara
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Manajemen Armada Bus, Jadwal & Kas Operasional
            </p>
          </div>

          {/* Segmented Tab (Masuk vs Daftar) */}
          <div className="flex p-1 mb-4 rounded-2xl bg-slate-100 border border-slate-200/80">
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

          {/* RBAC Role Selector (Pemilik Biro vs Kru Lapangan) */}
          {isLogin && (
            <div className="mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Pilih Hak Akses Login (RBAC):
                </span>
                <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  {currentDevice.deviceType}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole("pemilik")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedRole === "pemilik"
                      ? "bg-amber-50 border-amber-400 text-amber-900 shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldCheck className={`w-4 h-4 ${selectedRole === "pemilik" ? "text-amber-600" : "text-slate-400"}`} />
                    <span>Pemilik Biro</span>
                  </div>
                  <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1">
                    Owner, Kas & Monitor Kru
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("kru")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedRole === "kru"
                      ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <UserCheck className={`w-4 h-4 ${selectedRole === "kru" ? "text-emerald-600" : "text-slate-400"}`} />
                    <span>Kru / TL</span>
                  </div>
                  <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1">
                    Tour Leader & Driver
                  </p>
                </button>
              </div>

              {selectedRole === "kru" && (
                <div className="pt-1.5 space-y-1">
                  <label className="text-[10px] font-bold text-emerald-800 block">
                    Identitas Personel Kru yang Bertugas:
                  </label>
                  <select
                    value={selectedCrewId}
                    onChange={(e) => setSelectedCrewId(e.target.value)}
                    className="w-full h-8 rounded-xl bg-white border border-emerald-300 px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {crewList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama} — {c.jabatan} ({c.kodeKru})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-1 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500">
                <span>Perangkat tercatat di Audit Pemilik:</span>
                <strong className="text-slate-700 truncate max-w-[175px]">
                  {currentDevice.deviceName} • {currentDevice.os}
                </strong>
              </div>
            </div>
          )}

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

            {/* Mini Animated Running Bus with Idling Smoke & Drive-off */}
            <MiniRunningBus isDriving={loading} className="my-2" />

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
