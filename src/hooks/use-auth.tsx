import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type AppRole } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  isAuthenticated: boolean;
};

type AuthContextType = AuthState & {
  signUp: (email: string, password: string, meta?: { full_name?: string; phone?: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<AppRole[]>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<AppRole[]>;
  hasRole: (role: AppRole) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUserRoles(userId: string, appMeta?: Record<string, unknown>): Promise<AppRole[]> {
  if (appMeta?.["roles"] && Array.isArray(appMeta["roles"]) && appMeta["roles"].length > 0) {
    return appMeta["roles"] as AppRole[];
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc("get_my_roles");
  if (!rpcErr && Array.isArray(rpcData)) {
    return rpcData as AppRole[];
  }

  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data?.map((r) => r.role as AppRole) ?? []) as AppRole[];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    roles: [],
    loading: true,
    isAuthenticated: false,
  });
  const skipNextSignedInRef = useRef(false);

  const applySession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({ user: null, session: null, roles: [], loading: false, isAuthenticated: false });
      return [];
    }
    const roles = await fetchUserRoles(
      session.user.id,
      session.user.app_metadata as Record<string, unknown>,
    );
    setState({
      user: session.user,
      session,
      roles,
      loading: false,
      isAuthenticated: true,
    });
    return roles;
  }, []);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      void applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && skipNextSignedInRef.current) {
        skipNextSignedInRef.current = false;
        return;
      }
      await applySession(session);
    });

    const safety = setTimeout(() => {
      if (mounted) setState((p) => (p.loading ? { ...p, loading: false } : p));
    }, 6000);

    return () => {
      mounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, [applySession]);

  const value: AuthContextType = {
    ...state,
    hasRole: (role) => state.roles.includes(role),
    async refreshRoles() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return applySession(session);
    },
    async signUp(email, password, meta) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: meta ?? {} },
      });
      if (error) throw error;
      if (!data.session) {
        throw new Error("Account created. Confirm your email, then sign in.");
      }
      skipNextSignedInRef.current = true;
      await applySession(data.session);
    },
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      skipNextSignedInRef.current = true;
      return applySession(data.session);
    },
    async signOut() {
      await supabase.auth.signOut();
      setState({ user: null, session: null, roles: [], loading: false, isAuthenticated: false });
    },
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
