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
    if (fetchingRef.current === userId) {
      console.log(`[AuthContext] Já existe uma busca em andamento para ${userId}.`);
      return;
    }
    fetchingRef.current = userId;
    
    try {
      console.log(`[AuthContext] Iniciando busca (V4 - Estabilidade Máxima) para: ${userId}`);
      
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Tempo limite excedido ao buscar dados do usuário. O banco pode estar lento ou travado.")), 30000)
      );

      // Warning timer: Avisa no console se passar de 10s
      const slowDbWarning = setTimeout(() => {
        if (fetchingRef.current === userId) {
          console.warn("[AuthContext] ATENÇÃO: O banco de dados está demorando mais de 10s para responder. Possível lentidão global.");
        }
      }, 10000);

      const fetchPromise = Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).throwOnError(),
        supabase.from("profiles").select("full_name, avatar_url, phone, status").eq("user_id", userId).single(),
      ]);

      const [rolesRes, profileRes] = await Promise.race([fetchPromise, timeout]) as any;
      clearTimeout(slowDbWarning);

      let finalRoles: AppRole[] = [];
      if (rolesRes.data && rolesRes.data.length > 0) {
        finalRoles = rolesRes.data.map((r: any) => r.role as AppRole);
        console.log(`[AuthContext] Papéis encontrados: ${finalRoles.join(", ")}`);
      }

      // BYPASS CRÍTICO E SUPREMO PARA O ADMIN
      if (userId === SPECIAL_USER_ID) {
        console.warn(`[AuthContext] USUÁRIO ESPECIAL DETECTADO. Garantindo acesso pleno.`);
        if (!finalRoles.includes("admin")) {
          finalRoles = [...finalRoles, "admin"];
        }
      } else if (finalRoles.length === 0) {
         console.warn(`[AuthContext] Nenhum papel encontrado para o usuário ${userId}. Verifique se as permissões foram atribuídas.`);
      }

      setRoles(finalRoles);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setUserStatus((profileRes.data as any).status as UserStatus);
        console.log(`[AuthContext] Perfil carregado com sucesso.`);
      } else {
        console.warn(`[AuthContext] Perfil não encontrado ou erro na busca do perfil.`);
      }
    } catch (error: any) {
      console.error(`[AuthContext] Erro Crítico na busca de dados: ${error.message || "timeout"}`);
      
      // Fallback supremo para o admin mestre se o banco travar de vez
      if (userId === SPECIAL_USER_ID) {
        console.log("[AuthContext] Banco de dados travado, mas você é o admin. Liberando entrada de emergência.");
        setRoles(["admin"]);
        setLoading(false); // Forçamos o fim do carregamento
      }
    } finally {
      fetchingRef.current = null;
      setLoading(false);
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
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro na inicialização do Auth:", error);
        setLoading(false);
      }
    };

    initializeAuth();

    const { data } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log(`[AuthContext] Evento de Auth: ${event}`);

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchUserData(session.user.id);
          } else {
            setLoading(false);
          }
        } else if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setRoles([]);
          setProfile(null);
          setUserStatus(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      const subscription = (data as any).subscription || data;
      if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe();
    };
  }, []);

  // Auth V4: Simplificação do Splash Screen
  // O index.html já tem CSS (#root:not(:empty) + #splash-screen) que esconde o splash 
  // automaticamente e sem conflitos de DOM quando o React começa a renderizar.
  // Remover qualquer manipulação manual via JS para evitar erros de 'insertBefore' ou 'removeChild'.


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
