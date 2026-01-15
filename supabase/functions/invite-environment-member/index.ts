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

    if (targetUser) {
      // ===== USER EXISTS - Add directly as member =====
      
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
          accepted_at: new Date().toISOString(), // Auto-accept since user exists
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
        JSON.stringify({ 
          success: true, 
          member: newMember, 
          type: 'existing_user',
          message: 'Membro adicionado com sucesso!'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      // ===== USER DOES NOT EXIST - Create pending invite and send email =====
      
      // Check if there's already a pending invite for this email
      const { data: existingInvite } = await adminClient
        .from('pending_environment_invites')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('environment_owner_id', user.id)
        .maybeSingle();

      if (existingInvite) {
        throw new Error("Já existe um convite pendente para este email");
      }

      // Create pending invite record
      const { error: pendingError } = await adminClient
        .from('pending_environment_invites')
        .insert({
          email: email.toLowerCase(),
          environment_owner_id: user.id,
          invited_by: user.id,
          perm_executive_dashboard: permissions.executive_dashboard || 'none',
          perm_reports: permissions.reports || 'none',
          perm_finance: permissions.finance || 'none',
          perm_media_plans: permissions.media_plans || 'none',
          perm_media_resources: permissions.media_resources || 'none',
          perm_taxonomy: permissions.taxonomy || 'none',
          perm_library: permissions.library || 'none',
        });

      if (pendingError) {
        console.error("Pending invite error:", pendingError);
        throw new Error(pendingError.message || "Erro ao criar convite pendente");
      }

      // Get origin for redirect URL
      const origin = req.headers.get("origin") || supabaseUrl;

      // Generate invite link using generateLink (returns the action_link)
      // is_system_user = false means the user will NOT have their own environment
      const { data: linkData, error: linkError } = await adminClient.auth.admin
        .generateLink({
          type: 'invite',
          email: email,
          options: {
            redirectTo: `${origin}/auth`,
            data: {
              is_system_user: false, // Environment-only user - no personal environment
              invited_to_environment: user.id,
            },
          },
        });

      if (linkError) {
        // Rollback pending invite if link generation fails
        await adminClient
          .from('pending_environment_invites')
          .delete()
          .eq('email', email.toLowerCase())
          .eq('environment_owner_id', user.id);
        
        console.error("Generate link error:", linkError);
        throw new Error(linkError.message || "Erro ao gerar link de convite");
      }

      const inviteLink = linkData?.properties?.action_link;
      console.log("Invite link generated:", inviteLink ? "success" : "no link");

      return new Response(
        JSON.stringify({ 
          success: true, 
          type: 'invite_sent',
          inviteLink: inviteLink || null,
          message: 'Convite criado! Copie o link ou compartilhe com o usuário.'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
