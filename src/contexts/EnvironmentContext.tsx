import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';
export type EnvironmentRole = 'owner' | 'admin' | 'user';

export type EnvironmentSection = 
  | 'executive_dashboard' 
  | 'reports' 
  | 'finance' 
  | 'media_plans' 
  | 'media_resources' 
  | 'taxonomy' 
  | 'library';

export interface UserEnvironment {
  environment_id: string;
  environment_name: string;
  environment_owner_id: string;
  is_own_environment: boolean;
  role_read: boolean;
  role_edit: boolean;
  role_delete: boolean;
  role_invite: boolean;
}

interface EnvironmentRole2 {
  perm_executive_dashboard: PermissionLevel;
  perm_reports: PermissionLevel;
  perm_finance: PermissionLevel;
  perm_media_plans: PermissionLevel;
  perm_media_resources: PermissionLevel;
  perm_taxonomy: PermissionLevel;
  perm_library: PermissionLevel;
  role_read: boolean;
  role_edit: boolean;
  role_delete: boolean;
  role_invite: boolean;
}

const SECTION_TO_COLUMN: Record<EnvironmentSection, keyof EnvironmentRole2> = {
  executive_dashboard: 'perm_executive_dashboard',
  reports: 'perm_reports',
  finance: 'perm_finance',
  media_plans: 'perm_media_plans',
  media_resources: 'perm_media_resources',
  taxonomy: 'perm_taxonomy',
  library: 'perm_library',
};

interface EnvironmentContextType {
  /** The current environment ID being viewed */
  currentEnvironmentId: string | null;
  /** Whether currently viewing another user's environment */
  isViewingOtherEnvironment: boolean;
  /** @deprecated Use currentEnvironmentId instead */
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
  
  /** Whether current user can invite members to the environment */
  canInviteMembers: boolean;
  /** List of environments the user has access to */
  userEnvironments: UserEnvironment[];
  /** Whether environments list is loading */
  isLoadingEnvironments: boolean;
  /** Switch to a different environment */
  switchEnvironment: (environmentId: string) => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

interface EnvironmentProviderProps {
  children: ReactNode;
  currentUserId: string | null;
}

export function EnvironmentProvider({ children, currentUserId }: EnvironmentProviderProps) {
  const [currentEnvironmentId, setCurrentEnvironmentId] = useState<string | null>(null);

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
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's available environments using the new function
  const { data: userEnvironments = [], isLoading: isLoadingEnvironments } = useQuery({
    queryKey: ['user-environments-v2', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      
      const { data, error } = await supabase.rpc('get_user_environments_v2', {
        _user_id: currentUserId,
      });
      
      if (error) {
        console.error('Error fetching environments:', error);
        return [];
      }
      
      return (data || []) as UserEnvironment[];
    },
    enabled: !!currentUserId,
    staleTime: 30 * 1000,
  });

  // Get current user's role in the current environment
  const { data: myRole, isLoading: isLoadingRole } = useQuery({
    queryKey: ['environment-role-v2', currentEnvironmentId, currentUserId],
    queryFn: async () => {
      if (!currentEnvironmentId || !currentUserId) return null;
      
      const { data, error } = await supabase
        .from('environment_roles')
        .select('perm_executive_dashboard, perm_reports, perm_finance, perm_media_plans, perm_media_resources, perm_taxonomy, perm_library, role_read, role_edit, role_delete, role_invite')
        .eq('environment_id', currentEnvironmentId)
        .eq('user_id', currentUserId)
        .maybeSingle();
      
      if (error) return null;
      return data as EnvironmentRole2 | null;
    },
    enabled: !!currentEnvironmentId && !!currentUserId,
    staleTime: 30 * 1000,
  });

  const isLoadingPermissions = isLoadingSystemAdmin || isLoadingRole;

  // Determine if viewing own or other environment
  const currentEnvDetails = useMemo(() => {
    return userEnvironments.find(env => env.environment_id === currentEnvironmentId);
  }, [userEnvironments, currentEnvironmentId]);

  const isViewingOtherEnvironment = currentEnvDetails ? !currentEnvDetails.is_own_environment : false;
  const isEnvironmentOwner = currentEnvDetails?.is_own_environment ?? false;

  // For backwards compatibility
  const effectiveUserId = currentEnvDetails?.environment_owner_id ?? currentUserId;

  // Switch environment function
  const switchEnvironment = useCallback((environmentId: string) => {
    setCurrentEnvironmentId(environmentId);
  }, []);

  // Get permission for a specific section
  const getPermission = useCallback((section: EnvironmentSection): PermissionLevel => {
    if (isSystemAdmin) return 'admin';
    if (isEnvironmentOwner) return 'admin';
    
    if (myRole) {
      const columnName = SECTION_TO_COLUMN[section];
      const value = myRole[columnName];
      if (typeof value === 'string') {
        return value as PermissionLevel;
      }
    }
    
    return 'none';
  }, [isSystemAdmin, isEnvironmentOwner, myRole]);

  const canView = useCallback((section: EnvironmentSection): boolean => {
    const level = getPermission(section);
    return level !== 'none';
  }, [getPermission]);

  const canEdit = useCallback((section: EnvironmentSection): boolean => {
    const level = getPermission(section);
    return level === 'edit' || level === 'admin';
  }, [getPermission]);

  const isEnvironmentAdmin = useMemo(() => {
    if (isSystemAdmin || isEnvironmentOwner) return true;
    if (myRole) {
      return myRole.role_edit && myRole.role_delete && myRole.role_invite;
    }
    return false;
  }, [isSystemAdmin, isEnvironmentOwner, myRole]);

  const canInviteMembers = useMemo(() => {
    if (isSystemAdmin) return true;
    return myRole?.role_invite ?? false;
  }, [isSystemAdmin, myRole]);

  // Auto-select first environment when user loads
  useEffect(() => {
    if (isLoadingEnvironments) return;
    if (currentEnvironmentId !== null) return;
    if (userEnvironments.length === 0) return;
    
    // Prefer own environment, otherwise first available
    const ownEnv = userEnvironments.find(env => env.is_own_environment);
    const envToSelect = ownEnv || userEnvironments[0];
    
    if (envToSelect) {
      console.log('Auto-selecting environment:', envToSelect.environment_name);
      setCurrentEnvironmentId(envToSelect.environment_id);
    }
  }, [userEnvironments, isLoadingEnvironments, currentEnvironmentId]);

  const value = useMemo(() => ({
    currentEnvironmentId,
    isViewingOtherEnvironment,
    effectiveUserId,
    isEnvironmentOwner,
    isEnvironmentAdmin,
    isSystemAdmin,
    getPermission,
    canView,
    canEdit,
    isLoadingPermissions,
    canInviteMembers,
    userEnvironments,
    isLoadingEnvironments,
    switchEnvironment,
  }), [
    currentEnvironmentId,
    isViewingOtherEnvironment,
    effectiveUserId,
    isEnvironmentOwner,
    isEnvironmentAdmin,
    isSystemAdmin,
    getPermission,
    canView,
    canEdit,
    isLoadingPermissions,
    canInviteMembers,
    userEnvironments,
    isLoadingEnvironments,
    switchEnvironment,
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
