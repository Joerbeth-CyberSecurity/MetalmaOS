import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Permission {
  id: string;
  nome: string;
  descricao: string | null;
  modulo: string;
  acao: string;
}

export interface AccessLevel {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  permissoes: Permission[];
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [accessLevel, setAccessLevel] = useState<AccessLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserPermissions();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserPermissions = async () => {
    try {
      setLoading(true);
      
      // Buscar dados do usuário atual
      const { data: userData, error: userError } = await supabase
        .from('admins')
        .select(`
          nivel_id,
          niveis_acesso (
            id,
            nome,
            descricao,
            ativo,
            nivel_permissoes (
              permissao_id,
              permissoes (
                id,
                nome,
                descricao,
                modulo,
                acao
              )
            )
          )
        `)
        .eq('user_id', user?.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar permissões do usuário:', userError);
        return;
      }

      if (userData?.niveis_acesso) {
        const level = userData.niveis_acesso as any;
        const userPermissions = level.nivel_permissoes?.map((np: any) => np.permissoes) || [];
        
        setAccessLevel({
          id: level.id,
          nome: level.nome,
          descricao: level.descricao,
          ativo: level.ativo,
          permissoes: userPermissions
        });
        
        setPermissions(userPermissions);
      }
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permissionName: string): boolean => {
    return permissions.some(permission => permission.nome === permissionName);
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    return permissionNames.some(permissionName => hasPermission(permissionName));
  };

  const hasAllPermissions = (permissionNames: string[]): boolean => {
    return permissionNames.every(permissionName => hasPermission(permissionName));
  };

  const canAccessModule = (module: string): boolean => {
    return permissions.some(permission => 
      permission.modulo === module && 
      (permission.acao === 'read' || permission.acao === 'manage')
    );
  };

  const canManageModule = (module: string): boolean => {
    return permissions.some(permission => 
      permission.modulo === module && 
      permission.acao === 'manage'
    );
  };

  const isAdmin = (): boolean => {
    return accessLevel?.nome === 'admin';
  };

  const isManager = (): boolean => {
    return accessLevel?.nome === 'gerente' || isAdmin();
  };

  const isSupervisor = (): boolean => {
    return accessLevel?.nome === 'supervisor' || isManager();
  };

  const isCollaborator = (): boolean => {
    return accessLevel?.nome === 'colaborador' || isSupervisor();
  };

  const isViewer = (): boolean => {
    return accessLevel?.nome === 'visualizador' || isCollaborator();
  };

  return {
    permissions,
    accessLevel,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
    canManageModule,
    isAdmin,
    isManager,
    isSupervisor,
    isCollaborator,
    isViewer,
    refreshPermissions: fetchUserPermissions
  };
}

// Hook para verificar permissões específicas
export function usePermissionCheck(permissionName: string) {
  const { hasPermission, loading } = usePermissions();
  
  return {
    hasPermission: hasPermission(permissionName),
    loading
  };
}

// Hook para verificar múltiplas permissões
export function useMultiplePermissionCheck(permissionNames: string[], requireAll = false) {
  const { hasAnyPermission, hasAllPermissions, loading } = usePermissions();
  
  return {
    hasPermission: requireAll ? hasAllPermissions(permissionNames) : hasAnyPermission(permissionNames),
    loading
  };
}

// Hook para verificar acesso a módulos
export function useModuleAccess(module: string, requireManage = false) {
  const { canAccessModule, canManageModule, loading } = usePermissions();
  
  return {
    canAccess: requireManage ? canManageModule(module) : canAccessModule(module),
    loading
  };
}
