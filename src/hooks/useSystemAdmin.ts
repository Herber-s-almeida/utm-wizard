import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useSystemAdmin() {
  const { user } = useAuth();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["system-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc("is_system_admin", { 
        _user_id: user.id 
      });
      
      if (error) {
        console.error("Error checking system admin:", error);
        return false;
      }
      
      return data ?? false;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    isAdmin: isAdmin ?? false,
    isLoading,
  };
}
