import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);

  // Função para buscar dados do usuário na tabela admins
  const fetchUserProfile = async (userId) => {
    if (!userId) return null;

    try {
      console.log('Buscando perfil para usuário:', userId);

      // Timeout de 5 segundos para evitar travamento
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      const fetchPromise = supabase
        .from('admins')
        .select(
          `
          id,
          nome, 
          email, 
          tipo_usuario, 
          ativo,
          nivel_id,
          niveis_acesso (
            nome,
            descricao
          )
        `
        )
        .eq('user_id', userId)
        .single();

      const { data, error } = await Promise.race([
        fetchPromise,
        timeoutPromise,
      ]);

      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        return null;
      }

      console.log('Perfil encontrado:', data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      return null;
    }
  };

  // Função para buscar permissões do usuário
  const fetchUserPermissions = async (nivelId) => {
    if (!nivelId) return [];

    try {
      const { data, error } = await supabase
        .from('nivel_permissoes')
        .select(
          `
          permissao_id,
          permissoes (
            nome,
            modulo,
            acao
          )
        `
        )
        .eq('nivel_id', nivelId);

      if (error) {
        console.error('Erro ao buscar permissões:', error);
        return [];
      }

      return data.map((item) => item.permissoes.nome);
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      return [];
    }
  };

  // Função para registrar login na auditoria
  const registrarLogin = async (user, profile) => {
    try {
      const { error } = await supabase.from('auditoria_login').insert({
        user_id: user.id,
        nome_usuario: profile?.nome || user.email,
        email_usuario: user.email,
        tipo_evento: 'login',
        ip_address: null, // Será capturado pelo backend se necessário
        user_agent: navigator.userAgent,
        event_details: {
          action: 'login',
          timestamp: new Date().toISOString(),
          success: true,
        },
      });

      if (error) {
        console.error('Erro ao registrar login na auditoria:', error);
      } else {
        console.log('Login registrado na auditoria');
      }
    } catch (error) {
      console.error('Erro ao registrar login na auditoria:', error);
    }
  };

  // Função para registrar logout na auditoria
  const registrarLogout = async (user, profile) => {
    try {
      const { error } = await supabase.from('auditoria_login').insert({
        user_id: user?.id,
        nome_usuario: profile?.nome || user?.email,
        email_usuario: user?.email,
        tipo_evento: 'logout',
        ip_address: null,
        user_agent: navigator.userAgent,
        event_details: {
          action: 'logout',
          timestamp: new Date().toISOString(),
          success: true,
        },
      });

      if (error) {
        console.error('Erro ao registrar logout na auditoria:', error);
      } else {
        console.log('Logout registrado na auditoria');
      }
    } catch (error) {
      console.error('Erro ao registrar logout na auditoria:', error);
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);

        // Buscar dados do usuário na tabela admins (com tratamento de erro)
        if (session?.user?.id) {
          try {
            const profile = await fetchUserProfile(session.user.id);
            setUserProfile(profile);

            // Buscar permissões se tiver nível de acesso
            if (profile?.nivel_id) {
              const permissions = await fetchUserPermissions(profile.nivel_id);
              setUserPermissions(permissions);
              console.log('Permissões carregadas:', permissions);
            }
          } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            setUserProfile(null);
            setUserPermissions([]);
          }
        } else {
          setUserProfile(null);
          setUserPermissions([]);
        }
      } catch (error) {
        console.error('Erro no onAuthStateChange:', error);
        setUserProfile(null);
        setUserPermissions([]);
      } finally {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);

        // Buscar dados do usuário na tabela admins (com tratamento de erro)
        if (session?.user?.id) {
          try {
            const profile = await fetchUserProfile(session.user.id);
            setUserProfile(profile);

            // Buscar permissões se tiver nível de acesso
            if (profile?.nivel_id) {
              const permissions = await fetchUserPermissions(profile.nivel_id);
              setUserPermissions(permissions);
              console.log('Permissões carregadas:', permissions);
            }
          } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            setUserProfile(null);
            setUserPermissions([]);
          }
        }
      } catch (error) {
        console.error('Erro no getSession:', error);
        setUserProfile(null);
        setUserPermissions([]);
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
    setUserPermissions([]);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Erro ao fazer login:', error.message);
      setLoading(false);
      return { error };
    }

    // Aguardar um pouco e buscar o perfil do usuário
    setTimeout(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const profile = await fetchUserProfile(session.user.id);
          setUserProfile(profile);

          // Registrar login na auditoria
          await registrarLogin(session.user, profile);

          // Buscar permissões se tiver nível de acesso
          if (profile?.nivel_id) {
            const permissions = await fetchUserPermissions(profile.nivel_id);
            setUserPermissions(permissions);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar perfil após login:', error);
      }
    }, 1000);

    setLoading(false);
    console.log('Login realizado com sucesso!');
    return { error: null };
  };

  const signUp = async (email, password, nome) => {
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { nome } },
    });
    setLoading(false);
    if (error) {
      console.error('Erro ao criar conta:', error.message);
      return { error };
    }
    console.log('Conta criada com sucesso!');
    return { error: null };
  };

  const signOut = async () => {
    setLoading(true);

    // Registrar logout na auditoria antes de limpar os dados
    if (user && userProfile) {
      await registrarLogout(user, userProfile);
    }

    // Limpar dados do usuário imediatamente
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setUserPermissions([]);

    const { error } = await supabase.auth.signOut();
    setLoading(false);

    if (error) {
      console.error('Erro ao sair:', error.message);
      return;
    }

    console.log('Logout realizado com sucesso!');
  };

  // Função para forçar atualização do perfil
  const refreshUserProfile = async () => {
    if (user?.id) {
      try {
        const profile = await fetchUserProfile(user.id);
        setUserProfile(profile);

        // Buscar permissões se tiver nível de acesso
        if (profile?.nivel_id) {
          const permissions = await fetchUserPermissions(profile.nivel_id);
          setUserPermissions(permissions);
        }

        return profile;
      } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return null;
      }
    }
    return null;
  };

  // Função para verificar se o usuário tem uma permissão específica
  const hasPermission = (permissionName) => {
    return userPermissions.includes(permissionName);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        userProfile,
        userPermissions,
        refreshUserProfile,
        hasPermission,
      }}
    >
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
