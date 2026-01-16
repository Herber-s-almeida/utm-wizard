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

interface EnvironmentUser {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
}

export interface UserEnvironment {
  environment_owner_id: string;
  environment_name: string;
  environment_role: EnvironmentRole;
  is_own_environment: boolean;
}

interface EnvironmentMembership {
  perm_executive_dashboard: PermissionLevel;
  perm_reports: PermissionLevel;
  perm_finance: PermissionLevel;
  perm_media_plans: PermissionLevel;
  perm_media_resources: PermissionLevel;
  perm_taxonomy: PermissionLevel;
  perm_library: PermissionLevel;
  environment_role?: EnvironmentRole;
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
  
  // New role-based fields
  /** Current user's role in the viewed environment */
  environmentRole: EnvironmentRole | null;
  /** Whether current user can invite members to the environment */
  canInviteMembers: boolean;
  /** List of environments the user has access to */
  userEnvironments: UserEnvironment[];
  /** Whether environments list is loading */
  isLoadingEnvironments: boolean;
  /** Switch to a different environment */
  switchEnvironment: (environmentOwnerId: string) => void;
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

  // Fetch user's available environments
  const { data: userEnvironments = [], isLoading: isLoadingEnvironments } = useQuery({
    queryKey: ['user-environments', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      
      const { data, error } = await supabase.rpc('get_user_environments', {
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

  // Get current user's role in the viewed environment
  const { data: environmentRole = null } = useQuery({
    queryKey: ['environment-role', environmentOwnerId, currentUserId],
    queryFn: async () => {
      if (!environmentOwnerId || !currentUserId) return null;
      
      const { data, error } = await supabase.rpc('get_environment_role', {
        _environment_owner_id: environmentOwnerId,
        _user_id: currentUserId,
      });
      
      if (error) {
        console.error('Error fetching environment role:', error);
        return null;
      }
      
      return data as EnvironmentRole | null;
    },
    enabled: !!environmentOwnerId && !!currentUserId,
    staleTime: 30 * 1000,
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
        .select('perm_executive_dashboard, perm_reports, perm_finance, perm_media_plans, perm_media_resources, perm_taxonomy, perm_library, environment_role')
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

  // Switch environment function
  const switchEnvironment = useCallback(async (environmentOwnerId: string) => {
    // If switching to own environment
    if (environmentOwnerId === currentUserId) {
      setViewingUser(null);
      return;
    }

    // Get profile of the environment owner
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, company')
      .eq('user_id', environmentOwnerId)
      .single();

    if (error || !profile) {
      console.error('Error fetching profile:', error);
      return;
    }

    // Get email from auth (if system admin)
    const { data: userData } = await supabase.auth.getUser();
    
    setViewingUser({
      id: profile.user_id,
      email: userData?.user?.email || '',
      full_name: profile.full_name,
      company: profile.company,
    });
  }, [currentUserId]);

  // Get permission for a specific section
  const getPermission = useCallback((section: EnvironmentSection): PermissionLevel => {
    // System admin has full access
    if (isSystemAdmin) return 'admin';
    
    // If viewing own environment, has full access
    if (!isViewingOtherEnvironment || environmentOwnerId === currentUserId) {
      return 'admin';
    }
    
    // If user is admin in the environment, has full access
    if (environmentRole === 'admin') {
      return 'admin';
    }
    
    // Get permission from membership
    if (myMembership) {
      const columnName = SECTION_TO_COLUMN[section];
      return (myMembership[columnName] as PermissionLevel) || 'none';
    }
    
    return 'none';
  }, [isSystemAdmin, isViewingOtherEnvironment, environmentOwnerId, currentUserId, myMembership, environmentRole]);

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
    if (environmentRole === 'admin') return true;
    
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
  }, [isSystemAdmin, isEnvironmentOwner, myMembership, environmentRole]);

  // Can invite if owner or admin
  const canInviteMembers = useMemo(() => {
    if (isSystemAdmin) return true;
    return environmentRole === 'owner' || environmentRole === 'admin';
  }, [isSystemAdmin, environmentRole]);

  // Auto-select first environment for members who don't have their own environment
  useEffect(() => {
    // Still loading, wait
    if (isLoadingEnvironments) return;
    
    // Already has a viewing user selected
    if (viewingUser !== null) return;
    
    // No environments available
    if (userEnvironments.length === 0) return;
    
    // Check if user has their own environment
    const ownEnv = userEnvironments.find(env => env.is_own_environment);
    
    // If user doesn't have their own environment but is member of at least one
    if (!ownEnv && userEnvironments.length > 0) {
      const firstEnv = userEnvironments[0];
      console.log('Auto-selecting environment for member:', firstEnv);
      switchEnvironment(firstEnv.environment_owner_id);
    }
  }, [userEnvironments, isLoadingEnvironments, viewingUser, switchEnvironment]);

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
    // New fields
    environmentRole,
    canInviteMembers,
    userEnvironments,
    isLoadingEnvironments,
    switchEnvironment,
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
    environmentRole,
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
