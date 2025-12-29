import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  planId: string;
  role: "editor" | "viewer" | "approver";
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify they have permission
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !currentUser) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, planId, role }: InviteRequest = await req.json();
    console.log(`Invite request: email=${email}, planId=${planId}, role=${role}, by user=${currentUser.id}`);

    if (!email || !planId || !role) {
      return new Response(
        JSON.stringify({ error: "Email, planId e role são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to access auth.users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is the owner of the plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from("media_plans")
      .select("user_id")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      console.error("Error getting plan:", planError);
      return new Response(
        JSON.stringify({ error: "Plano não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (plan.user_id !== currentUser.id) {
      console.error("User is not the owner of the plan");
      return new Response(
        JSON.stringify({ error: "Apenas o proprietário pode convidar membros" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by email using admin API
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar usuários" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      console.log(`User not found with email: ${email}`);
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado com este email. O usuário precisa ter uma conta no sistema." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetUser.id === currentUser.id) {
      return new Response(
        JSON.stringify({ error: "Você não pode se convidar para seu próprio plano" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already a member
    const { data: existingRole, error: existingError } = await supabaseAdmin
      .from("plan_roles")
      .select("id")
      .eq("media_plan_id", planId)
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existingRole) {
      return new Response(
        JSON.stringify({ error: "Este usuário já é membro do plano" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add the user to the plan
    const { data: newRole, error: insertError } = await supabaseAdmin
      .from("plan_roles")
      .insert({
        media_plan_id: planId,
        user_id: targetUser.id,
        role: role,
        invited_by: currentUser.id,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting role:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao adicionar membro ao plano" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully invited user ${targetUser.id} to plan ${planId} as ${role}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Membro adicionado com sucesso!",
        member: {
          id: newRole.id,
          user_id: targetUser.id,
          email: targetUser.email,
          role: role,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in invite-to-plan function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
