import { createContext, useContext, useState, ReactNode } from 'react';

interface EnvironmentUser {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
}

interface EnvironmentContextType {
  /** The user whose environment is being viewed. null = viewing own environment */
  viewingUser: EnvironmentUser | null;
  /** Set the user whose environment to view. Pass null to return to own environment */
  setViewingUser: (user: EnvironmentUser | null) => void;
  /** Whether currently viewing another user's environment */
  isViewingOtherEnvironment: boolean;
  /** The user_id to use for filtering data (either viewing user or current auth user) */
  effectiveUserId: string | null;
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

  return (
    <EnvironmentContext.Provider
      value={{
        viewingUser,
        setViewingUser,
        isViewingOtherEnvironment,
        effectiveUserId,
      }}
    >
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
