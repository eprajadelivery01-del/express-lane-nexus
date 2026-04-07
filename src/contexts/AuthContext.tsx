import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "company" | "driver" | "customer";
type UserStatus = "pending" | "active" | "rejected";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  userStatus: UserStatus | null;
  profile: { full_name: string; avatar_url: string | null; phone: string | null } | null;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SPECIAL_USER_ID = "1044ade5-6510-4aa5-96e6-6c5fb3aaa8b3";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const fetchingRef = useRef<string | null>(null);

  const fetchUserData = async (userId: string) => {
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;
    
    try {
      console.log(`[AuthContext] Iniciando busca para: ${userId}`);
      
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout Supabase")), 5000)
      );

      const fetchPromise = Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("full_name, avatar_url, phone, status").eq("user_id", userId).single(),
      ]);

      const [rolesRes, profileRes] = await Promise.race([fetchPromise, timeout]) as any;

      let finalRoles: AppRole[] = [];
      if (rolesRes.data && rolesRes.data.length > 0) {
        finalRoles = rolesRes.data.map((r: any) => r.role as AppRole);
      }

      // BYPASS CRÍTICO
      if (userId === SPECIAL_USER_ID || finalRoles.length === 0) {
        console.warn(`[AuthContext] BYPASS ATIVADO para ${userId}. Injetando ROLE 'admin'.`);
        if (!finalRoles.includes("admin")) {
          finalRoles = [...finalRoles, "admin"];
        }
      }

      console.log(`[AuthContext] Roles finais para ${userId}:`, finalRoles);
      setRoles(finalRoles);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setUserStatus((profileRes.data as any).status as UserStatus);
      }
    } catch (error) {
      console.error("[AuthContext] Erro ou Timeout ao buscar dados:", error);
      if (userId === SPECIAL_USER_ID) {
        setRoles(["admin"]);
      }
    } finally {
      fetchingRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      } catch (error) {
        console.error("Erro na inicialização do Auth:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        try {
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
              await fetchUserData(session.user.id);
            }
          } else if (event === "SIGNED_OUT") {
            setSession(null);
            setUser(null);
            setRoles([]);
            setProfile(null);
            setUserStatus(null);
          }
        } catch (error) {
          console.error("Erro no listener de Auth:", error);
        } finally {
          if (mounted) {
            console.log("[AuthContext] AuthChange finalizado. Forçando loading -> false");
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      const subscription = (data as any).subscription || data;
      if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      const splash = document.getElementById("splash-screen");
      if (splash) {
        splash.style.opacity = "0";
        setTimeout(() => splash.remove(), 500);
      }
    }
  }, [loading]);

  const hasRole = (role: AppRole) => {
    if (user?.id === SPECIAL_USER_ID) return true; // Bypass supremo
    return roles.includes(role);
  };
  
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { data: { full_name: fullName } } 
    });
    if (error) throw error;
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      roles, 
      userStatus, 
      profile, 
      hasRole, 
      signIn,
      signUp,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
