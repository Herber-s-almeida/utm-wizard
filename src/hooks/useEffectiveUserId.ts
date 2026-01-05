import { useAuth } from './useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';

/**
 * Returns the effective user ID to use for data filtering.
 * When viewing another user's environment (as admin), returns that user's ID.
 * Otherwise, returns the current authenticated user's ID.
 */
export function useEffectiveUserId(): string | null {
  const { user } = useAuth();
  
  // Try to get environment context, but handle case where it's not available
  try {
    const { effectiveUserId } = useEnvironment();
    return effectiveUserId;
  } catch {
    // Environment context not available, use current user
    return user?.id ?? null;
  }
}
