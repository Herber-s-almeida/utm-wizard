/**
 * @deprecated This edge function is DEPRECATED.
 * 
 * Plan-specific invitations have been replaced by environment-based roles.
 * Use the invite-environment-member function instead.
 * 
 * All access control is now managed at the environment level via:
 * - environment_roles table
 * - invite-environment-member edge function
 * - /settings/team UI
 * 
 * This function is kept for backwards compatibility but should NOT be used.
 * It will return an error explaining the new system.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Return deprecation error
  return new Response(
    JSON.stringify({ 
      error: "Esta função está descontinuada. O gerenciamento de equipes agora é feito no nível do ambiente. Acesse Configurações > Equipe para convidar membros.",
      deprecated: true,
      alternative: "/settings/team"
    }),
    { 
      status: 410, // Gone
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
});
