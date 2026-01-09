import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client for user lookup
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create regular client to verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const regularClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await regularClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    const { email, permissions } = await req.json();

    if (!email) {
      throw new Error("Email é obrigatório");
    }

    // Check member count limit
    const { data: countData, error: countError } = await adminClient
      .rpc('count_environment_members', { _environment_owner_id: user.id });
    
    if (countError) {
      console.error("Count error:", countError);
      throw new Error("Erro ao verificar limite de membros");
    }

    if (countData >= 30) {
      throw new Error("Limite de 30 membros atingido");
    }

    // Find user by email using admin client
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error("List users error:", listError);
      throw new Error("Erro ao buscar usuário");
    }

    const targetUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      throw new Error("Usuário não encontrado. O usuário precisa ter uma conta na plataforma.");
    }

    if (targetUser.id === user.id) {
      throw new Error("Você não pode convidar a si mesmo");
    }

    // Check if already a member
    const { data: existingMember } = await adminClient
      .from('environment_members')
      .select('id')
      .eq('environment_owner_id', user.id)
      .eq('member_user_id', targetUser.id)
      .maybeSingle();

    if (existingMember) {
      throw new Error("Este usuário já é membro do seu ambiente");
    }

    // Insert the new member
    const { data: newMember, error: insertError } = await adminClient
      .from('environment_members')
      .insert({
        environment_owner_id: user.id,
        member_user_id: targetUser.id,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(), // Auto-accept for now
        perm_executive_dashboard: permissions.executive_dashboard || 'none',
        perm_reports: permissions.reports || 'none',
        perm_finance: permissions.finance || 'none',
        perm_media_plans: permissions.media_plans || 'none',
        perm_media_resources: permissions.media_resources || 'none',
        perm_taxonomy: permissions.taxonomy || 'none',
        perm_library: permissions.library || 'none',
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(insertError.message || "Erro ao adicionar membro");
    }

    return new Response(
      JSON.stringify({ success: true, member: newMember }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
