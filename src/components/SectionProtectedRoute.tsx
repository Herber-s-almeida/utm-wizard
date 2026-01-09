import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEnvironment, EnvironmentSection, PermissionLevel } from '@/contexts/EnvironmentContext';
import { Loader2, ShieldX } from 'lucide-react';

// Re-export types for convenience
export type { EnvironmentSection, PermissionLevel } from '@/contexts/EnvironmentContext';

interface SectionProtectedRouteProps {
  children: ReactNode;
  section: EnvironmentSection;
  minLevel?: PermissionLevel;
  fallbackPath?: string;
}

/**
 * Protects routes based on environment section permissions.
 * 
 * @param section - The environment section to check permission for
 * @param minLevel - Minimum permission level required ('view' by default)
 * @param fallbackPath - Where to redirect if access denied (defaults to /dashboard)
 */
export function SectionProtectedRoute({ 
  children, 
  section, 
  minLevel = 'view',
  fallbackPath = '/dashboard'
}: SectionProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { getPermission, isEnvironmentOwner, isSystemAdmin, isLoadingPermissions } = useEnvironment();

  // Still loading auth or permissions
  if (authLoading || isLoadingPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // System admin and environment owner always have full access
  if (isSystemAdmin || isEnvironmentOwner) {
    return <>{children}</>;
  }

  const currentLevel = getPermission(section);
  
  // Check if user has sufficient permission
  const hasAccess = checkPermissionLevel(currentLevel, minLevel);
  
  if (!hasAccess) {
    // Show access denied message briefly, then redirect
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          <ShieldX className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-semibold">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta seção.
          </p>
          <Navigate to={fallbackPath} replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Check if a permission level meets the minimum required level.
 */
function checkPermissionLevel(current: PermissionLevel, required: PermissionLevel): boolean {
  const levels: PermissionLevel[] = ['none', 'view', 'edit', 'admin'];
  const currentIndex = levels.indexOf(current);
  const requiredIndex = levels.indexOf(required);
  return currentIndex >= requiredIndex;
}

/**
 * Higher-order component variant for wrapping route elements.
 */
export function withSectionProtection(
  Component: React.ComponentType,
  section: EnvironmentSection,
  minLevel: PermissionLevel = 'view'
) {
  return function ProtectedComponent() {
    return (
      <SectionProtectedRoute section={section} minLevel={minLevel}>
        <Component />
      </SectionProtectedRoute>
    );
  };
}
