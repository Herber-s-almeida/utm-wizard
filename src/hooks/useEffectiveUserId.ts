import { useAuth } from './useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';

/**
 * @deprecated Use currentEnvironmentId from useEnvironment instead
 * Returns the effective user ID for backwards compatibility.
 */
export function useEffectiveUserId(): string | null {
  const { user } = useAuth();
  
  try {
    const { effectiveUserId } = useEnvironment();
    return effectiveUserId;
  } catch {
    return user?.id ?? null;
  }
}

/**
 * Returns the current environment ID for data filtering.
 * This is the new preferred way to filter data by environment.
 */
export function useCurrentEnvironmentId(): string | null {
  try {
    const { currentEnvironmentId } = useEnvironment();
    return currentEnvironmentId;
  } catch {
    return null;
  }
}
