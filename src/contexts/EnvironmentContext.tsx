import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

export type EnvironmentSection = 
  | 'executive_dashboard' 
  | 'reports' 
  | 'finance' 
  | 'media_plans' 
  | 'media_resources' 
  | 'taxonomy' 
  | 'library';

interface EnvironmentUser {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
}

interface EnvironmentMembership {
  perm_executive_dashboard: PermissionLevel;
  perm_reports: PermissionLevel;
  perm_finance: PermissionLevel;
  perm_media_plans: PermissionLevel;
  perm_media_resources: PermissionLevel;
  perm_taxonomy: PermissionLevel;
  perm_library: PermissionLevel;
}

const SECTION_TO_COLUMN: Record<EnvironmentSection, keyof EnvironmentMembership> = {
  executive_dashboard: 'perm_executive_dashboard',
  reports: 'perm_reports',
  finance: 'perm_finance',
  media_plans: 'perm_media_plans',
  media_resources: 'perm_media_resources',
  taxonomy: 'perm_taxonomy',
  library: 'perm_library',
};

interface EnvironmentContextType {
  /** The user whose environment is being viewed. null = viewing own environment */
  viewingUser: EnvironmentUser | null;
  /** Set the user whose environment to view. Pass null to return to own environment */
  setViewingUser: (user: EnvironmentUser | null) => void;
  /** Whether currently viewing another user's environment */
  isViewingOtherEnvironment: boolean;
  /** The user_id to use for filtering data (either viewing user or current auth user) */
  effectiveUserId: string | null;
  
  // Permission-related
  /** Whether current user is the owner of the viewed environment */
  isEnvironmentOwner: boolean;
  /** Whether current user has admin permission in any section */
  isEnvironmentAdmin: boolean;
  /** Whether current user is a system admin */
  isSystemAdmin: boolean;
  /** Get permission level for a specific section */
  getPermission: (section: EnvironmentSection) => PermissionLevel;
  /** Check if user can view a section */
  canView: (section: EnvironmentSection) => boolean;
  /** Check if user can edit in a section */
  canEdit: (section: EnvironmentSection) => boolean;
  /** Whether permissions are still loading */
  isLoadingPermissions: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

interface EnvironmentProviderProps {
  children: ReactNode;
  currentUserId: string | null;
}

export function EnvironmentProvider({ children, currentUserId }: EnvironmentProviderProps) {
  const [viewingUser, setViewingUser] = useState<EnvironmentUser | null>(null);

  const isViewingOtherEnvironment = viewingUser !== null;
  const effectiveUserId = viewingUser?.id ?? currentUserId;
  const environmentOwnerId = effectiveUserId;

  // Check if user is system admin
  const { data: isSystemAdmin = false, isLoading: isLoadingSystemAdmin } = useQuery({
    queryKey: ['is-system-admin', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return false;
      
      const { data, error } = await supabase.rpc('is_system_admin', {
        _user_id: currentUserId,
      });
      
      if (error) return false;
      return data as boolean;
    },
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch current user's membership in the viewed environment
  const { data: myMembership, isLoading: isLoadingMembership } = useQuery({
    queryKey: ['environment-membership', environmentOwnerId, currentUserId],
    queryFn: async () => {
      if (!environmentOwnerId || !currentUserId || environmentOwnerId === currentUserId) {
        return null;
      }
      
      const { data, error } = await supabase
        .from('environment_members')
        .select('perm_executive_dashboard, perm_reports, perm_finance, perm_media_plans, perm_media_resources, perm_taxonomy, perm_library')
        .eq('environment_owner_id', environmentOwnerId)
        .eq('member_user_id', currentUserId)
        .maybeSingle();
      
      if (error) return null;
      return data as EnvironmentMembership | null;
    },
    enabled: !!environmentOwnerId && !!currentUserId && isViewingOtherEnvironment,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const isLoadingPermissions = isLoadingSystemAdmin || (isViewingOtherEnvironment && isLoadingMembership);

  // Get permission for a specific section
  const getPermission = useCallback((section: EnvironmentSection): PermissionLevel => {
    // System admin has full access
    if (isSystemAdmin) return 'admin';
    
    // If viewing own environment, has full access
    if (!isViewingOtherEnvironment || environmentOwnerId === currentUserId) {
      return 'admin';
    }
    
    // Get permission from membership
    if (myMembership) {
      const columnName = SECTION_TO_COLUMN[section];
      return (myMembership[columnName] as PermissionLevel) || 'none';
    }
    
    return 'none';
  }, [isSystemAdmin, isViewingOtherEnvironment, environmentOwnerId, currentUserId, myMembership]);

  const canView = useCallback((section: EnvironmentSection): boolean => {
    const level = getPermission(section);
    return level !== 'none';
  }, [getPermission]);

  const canEdit = useCallback((section: EnvironmentSection): boolean => {
    const level = getPermission(section);
    return level === 'edit' || level === 'admin';
  }, [getPermission]);

  const isEnvironmentOwner = !isViewingOtherEnvironment || environmentOwnerId === currentUserId;
  
  const isEnvironmentAdmin = useMemo(() => {
    if (isSystemAdmin || isEnvironmentOwner) return true;
    
    if (myMembership) {
      return (
        myMembership.perm_executive_dashboard === 'admin' ||
        myMembership.perm_reports === 'admin' ||
        myMembership.perm_finance === 'admin' ||
        myMembership.perm_media_plans === 'admin' ||
        myMembership.perm_media_resources === 'admin' ||
        myMembership.perm_taxonomy === 'admin' ||
        myMembership.perm_library === 'admin'
      );
    }
    
    return false;
  }, [isSystemAdmin, isEnvironmentOwner, myMembership]);

  const value = useMemo(() => ({
    viewingUser,
    setViewingUser,
    isViewingOtherEnvironment,
    effectiveUserId,
    isEnvironmentOwner,
    isEnvironmentAdmin,
    isSystemAdmin,
    getPermission,
    canView,
    canEdit,
    isLoadingPermissions,
  }), [
    viewingUser,
    isViewingOtherEnvironment,
    effectiveUserId,
    isEnvironmentOwner,
    isEnvironmentAdmin,
    isSystemAdmin,
    getPermission,
    canView,
    canEdit,
    isLoadingPermissions,
  ]);

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
}
