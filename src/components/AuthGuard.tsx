import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getInitialSessionSync } from "@/utils/authHelper";

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(() => !getInitialSessionSync());

  useEffect(() => {
    let active = true;

    const redirectToAuth = () => {
      if (active && window.location.pathname !== "/auth") {
        navigate("/auth", { replace: true });
      }
    };

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      if (!session) {
        redirectToAuth();
      }
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (!session && event !== "INITIAL_SESSION") {
        navigate("/auth");
      }
    });

    checkSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
