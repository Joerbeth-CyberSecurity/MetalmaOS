import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Função para buscar dados do usuário na tabela admins
  const fetchUserProfile = async (userId) => {
    if (!userId) return null;
    
    try {
      // Timeout de 5 segundos para evitar travamento
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      const fetchPromise = supabase
        .from('admins')
        .select('nome, email, tipo_usuario, ativo')
        .eq('user_id', userId)
        .single();
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      return null;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Buscar dados do usuário na tabela admins (com tratamento de erro)
          if (session?.user?.id) {
            try {
              const profile = await fetchUserProfile(session.user.id);
              setUserProfile(profile);
            } catch (error) {
              console.error('Erro ao buscar perfil:', error);
              setUserProfile(null);
            }
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Erro no onAuthStateChange:', error);
          setUserProfile(null);
        } finally {
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Buscar dados do usuário na tabela admins (com tratamento de erro)
        if (session?.user?.id) {
          try {
            const profile = await fetchUserProfile(session.user.id);
            setUserProfile(profile);
          } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            setUserProfile(null);
          }
        }
      } catch (error) {
        console.error('Erro no getSession:', error);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    
    // Limpar dados anteriores
    setUserProfile(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error("Erro ao fazer login:", error.message);
      setLoading(false);
      return { error };
    }
    
    // Aguardar um pouco e buscar o perfil do usuário
    setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const profile = await fetchUserProfile(session.user.id);
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Erro ao buscar perfil após login:', error);
      }
    }, 1000);
    
    setLoading(false);
    console.log("Login realizado com sucesso!");
    return { error: null };
  };

  const signUp = async (email, password, nome) => {
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { nome } }
    });
    setLoading(false);
    if (error) {
      console.error("Erro ao criar conta:", error.message);
      return { error };
    }
    console.log("Conta criada com sucesso!");
    return { error: null };
  };

  const signOut = async () => {
    setLoading(true);
    
    // Limpar dados do usuário imediatamente
    setUser(null);
    setSession(null);
    setUserProfile(null);
    
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    
    if (error) {
      console.error("Erro ao sair:", error.message);
      return;
    }
    
    console.log("Logout realizado com sucesso!");
  };

  // Função para forçar atualização do perfil
  const refreshUserProfile = async () => {
    if (user?.id) {
      try {
        const profile = await fetchUserProfile(user.id);
        setUserProfile(profile);
        return profile;
      } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return null;
      }
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      userProfile,
      refreshUserProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 