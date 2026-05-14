import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "company" | "driver" | "customer";
type UserStatus = "pending" | "active" | "rejected";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rolesLoaded: boolean;
  roles: AppRole[];
  userStatus: UserStatus | null;
  profile: { full_name: string; avatar_url: string | null; phone: string | null } | null;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const fetchingRef = useRef<string | null>(null);

  const isAppRole = (role: string | null | undefined): role is AppRole => {
    return role === "admin" || role === "company" || role === "driver" || role === "customer";
  };

  const fetchUserData = async (userId: string, forceEmail?: string) => {
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;
    // Only reset rolesLoaded if it's the very first time we are fetching
    if (!rolesLoaded) {
      setRolesLoaded(false);
    }
    
    try {
      const userEmail = forceEmail?.toLowerCase();

      if (import.meta.env.DEV) {
        console.log(`[Auth] Loading profile for user`);
      }
      
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );

      // Usando seleção específica de colunas para contornar erro de Schema
      const rolesFetch = supabase.from("user_roles").select("role").eq("user_id", userId);
      const profileFetch = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, status, role") 
        .eq("user_id", userId)
        .maybeSingle();

      const results = await Promise.race([
        Promise.all([rolesFetch, profileFetch]),
        timeout
      ]) as any;

      const [rolesRes, profileRes] = results;

      // Roles are sourced ONLY from user_roles table (server-side trust boundary).
      // The profiles.role column is NOT used as a fallback to prevent privilege
      // escalation via self-update of a profile row.
      let finalRoles: AppRole[] = [];
      if (rolesRes?.data) {
        finalRoles = rolesRes.data.map((r: any) => r.role as AppRole);
      }

      setRoles(finalRoles);

      if (profileRes?.data) {
        setProfile({
          full_name: profileRes.data.full_name,
          avatar_url: profileRes.data.avatar_url,
          phone: profileRes.data.phone
        });
        setUserStatus(profileRes.data.status ?? "active");
      } else {
        setUserStatus("active");
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("[Auth] Metadata load error:", error?.message);
      }
    } finally {
      fetchingRef.current = null;
      setRolesLoaded(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        const currentUser = session?.user;
        setSession(session);
        setUser(currentUser ?? null);
        
        if (currentUser) {
          const email = currentUser.email?.toLowerCase();
          // Wait for metadata to be loaded before releasing the transition screen
          await fetchUserData(currentUser.id, email);
        } else {
          setRolesLoaded(true);
          setLoading(false);
        }
      } catch (error) {
        setRolesLoaded(true);
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (import.meta.env.DEV) {
          console.log(`[Auth] event: ${event}`);
        }

        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          const currentUser = session?.user;
          setSession(session);
          setUser(currentUser ?? null);
          
          if (currentUser) {
            const email = currentUser.email?.toLowerCase();
            fetchUserData(currentUser.id, email);
          } else {
            setRolesLoaded(true);
            setLoading(false);
          }
        } else if (event === "TOKEN_REFRESHED") {
          // Ignore token refreshed events to prevent infinite reload loops
          return;
        } else if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setRoles([]);
          setRolesLoaded(true);
          setProfile(null);
          setUserStatus(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (role: AppRole) => {
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

  const deleteAccount = async () => {
    if (!user) return;
    try {
      await supabase.from("profiles").update({ status: "rejected" }).eq("user_id", user.id);
      await signOut();
    } catch (error) {}
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, loading, rolesLoaded, roles, userStatus, profile, hasRole, signIn, signUp, signOut, deleteAccount 
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


