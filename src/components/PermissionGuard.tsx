import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Lock } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  module?: string;
  requireManage?: boolean;
  fallback?: React.ReactNode;
  showError?: boolean;
}

export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  module,
  requireManage = false,
  fallback = null,
  showError = true
}: PermissionGuardProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
    canManageModule,
    loading
  } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  let hasAccess = true; // Temporariamente permitir acesso para debug

  // if (permission) {
  //   hasAccess = hasPermission(permission);
  // } else if (permissions) {
  //   hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  // } else if (module) {
  //   hasAccess = requireManage ? canManageModule(module) : canAccessModule(module);
  // }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showError) {
      return (
        <Alert variant="destructive" className="m-4">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar esta funcionalidade.
            {permission && ` (Permissão necessária: ${permission})`}
            Entre em contato com o administrador do sistema.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
}

// Componente para botões com verificação de permissão
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  module?: string;
  requireManage?: boolean;
  children: React.ReactNode;
}

export function PermissionButton({
  permission,
  permissions,
  requireAll = false,
  module,
  requireManage = false,
  children,
  ...props
}: PermissionButtonProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
    canManageModule,
    loading
  } = usePermissions();

  if (loading) {
    return (
      <button {...props} disabled>
        {children}
      </button>
    );
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else if (module) {
    hasAccess = requireManage ? canManageModule(module) : canAccessModule(module);
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <button {...props}>
      {children}
    </button>
  );
}

// Componente para links com verificação de permissão
interface PermissionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  module?: string;
  requireManage?: boolean;
  children: React.ReactNode;
}

export function PermissionLink({
  permission,
  permissions,
  requireAll = false,
  module,
  requireManage = false,
  children,
  ...props
}: PermissionLinkProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
    canManageModule,
    loading
  } = usePermissions();

  if (loading) {
    return (
      <a {...props} className="pointer-events-none opacity-50">
        {children}
      </a>
    );
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else if (module) {
    hasAccess = requireManage ? canManageModule(module) : canAccessModule(module);
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <a {...props}>
      {children}
    </a>
  );
}

// Hook para usar em componentes funcionais
export function usePermissionGuard(
  permission?: string,
  permissions?: string[],
  requireAll = false,
  module?: string,
  requireManage = false
) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
    canManageModule,
    loading
  } = usePermissions();

  if (loading) {
    return { hasAccess: false, loading: true };
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else if (module) {
    hasAccess = requireManage ? canManageModule(module) : canAccessModule(module);
  }

  return { hasAccess, loading: false };
}
