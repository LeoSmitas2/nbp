import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type UserRole = "ADMIN" | "CLIENT";
type UserStatus = "Pendente" | "Aprovado" | "Rejeitado";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  empresa?: string;
  role?: UserRole;
  status?: UserStatus;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string, empresa: string, cnpj: string, telefoneContato: string, nomeContato: string, lojas: Array<{ nome: string; marketplace: string }>) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isApproved: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", userId)
        .single();

      if (roleError) throw roleError;

      setProfile({
        ...profileData,
        role: roleData.role,
        status: roleData.status,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (emailOrUsername: string, password: string) => {
    let email = emailOrUsername;
    
    // Se não contém @, é um username - buscar o email
    if (!emailOrUsername.includes('@')) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", emailOrUsername)
        .single();
      
      if (profileError || !profileData) {
        return { error: { message: "Usuário não encontrado" } };
      }
      
      email = profileData.email;
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, username: string, empresa: string, cnpj: string, telefoneContato: string, nomeContato: string, lojas: Array<{ nome: string; marketplace: string }>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: username,
          username,
          empresa,
          cnpj,
          telefone_contato: telefoneContato,
          nome_contato: nomeContato,
          lojas_marketplaces: JSON.stringify(lojas),
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    navigate("/login");
  };

  const isAdmin = profile?.role === "ADMIN";
  const isApproved = profile?.status === "Aprovado";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin,
        isApproved,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}