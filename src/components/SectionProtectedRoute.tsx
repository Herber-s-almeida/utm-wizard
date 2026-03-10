import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEnvironment, EnvironmentSection, PermissionLevel } from '@/contexts/EnvironmentContext';
import { Loader2, ShieldX } from 'lucide-react';
import { toast } from 'sonner';

// Re-export types for convenience
export type { EnvironmentSection, PermissionLevel } from '@/contexts/EnvironmentContext';

/** Priority-ordered list of sections and their landing routes */
const SECTION_ROUTES: { section: EnvironmentSection; path: string }[] = [
  { section: 'media_plans', path: '/media-plan-dashboard' },
  { section: 'finance', path: '/finance' },
  { section: 'executive_dashboard', path: '/executive-dashboard' },
  { section: 'reports', path: '/reports' },
  { section: 'media_resources', path: '/media-resources' },
  { section: 'taxonomy', path: '/taxonomy' },
  { section: 'library', path: '/config/clients' },
];

/**
 * Find the first accessible route for the current user based on permissions.
 * Excludes a specific section to avoid redirect loops.
 */
function findFirstAccessibleRoute(
  getPermission: (section: EnvironmentSection) => PermissionLevel,
  excludeSection?: EnvironmentSection
): string | null {
  for (const route of SECTION_ROUTES) {
    if (route.section === excludeSection) continue;
    const level = getPermission(route.section);
    if (level !== 'none') {
      return route.path;
    }
  }
  return null;
}

interface SectionProtectedRouteProps {
  children: ReactNode;
  section: EnvironmentSection;
  minLevel?: PermissionLevel;
  fallbackPath?: string;
}

/**
 * Protects routes based on environment section permissions.
 * When access is denied, redirects to the first available section.
 */
export function SectionProtectedRoute({ 
  children, 
  section, 
  minLevel = 'view',
  fallbackPath
}: SectionProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { getPermission, isEnvironmentAdmin, isSystemAdmin, isLoadingPermissions } = useEnvironment();
  const [showDenied, setShowDenied] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

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

  // System admin and environment admin always have full access
  if (isSystemAdmin || isEnvironmentAdmin) {
    return <>{children}</>;
  }

  const currentLevel = getPermission(section);
  const hasAccess = checkPermissionLevel(currentLevel, minLevel);
  
  if (!hasAccess) {
    // Find the best redirect target
    const target = fallbackPath || findFirstAccessibleRoute(getPermission, section) || '/account';
    
    toast.error('Acesso Negado', {
      description: 'Você não tem permissão para acessar esta seção. Redirecionando...',
      duration: 3000,
    });

    return <Navigate to={target} replace />;
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

/** Export for reuse in other components (e.g., post-login redirect) */
export { findFirstAccessibleRoute, SECTION_ROUTES };
