import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a secure random token
function generateInviteToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

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

    const { email, permissions, environment_role = 'user', environment_id } = await req.json();

    if (!email) {
      throw new Error("Email é obrigatório");
    }

    if (!environment_id) {
      throw new Error("ID do ambiente é obrigatório");
    }

    // Validate environment_role
    const validRoles = ['admin', 'user'];
    const normalizedRole = validRoles.includes(environment_role) ? environment_role : 'user';
    const isAdminRole = normalizedRole === 'admin';

    console.log(`Inviting ${email} to environment ${environment_id} with role ${normalizedRole}`);

    // Check if user is admin in this environment (only admins can invite)
    const { data: adminCheck, error: adminCheckError } = await adminClient
      .from('environment_roles')
      .select('is_environment_admin, role_invite')
      .eq('environment_id', environment_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminCheckError) {
      console.error("Admin check error:", adminCheckError);
    }

    const isEnvAdmin = adminCheck?.is_environment_admin === true;
    const hasInvitePermission = adminCheck?.role_invite === true;
    const canInvite = isEnvAdmin || hasInvitePermission;

    // Also check system admin
    const { data: isSystemAdmin } = await adminClient.rpc('is_system_admin', { _user_id: user.id });

    if (!canInvite && !isSystemAdmin) {
      throw new Error("Você não tem permissão para convidar membros neste ambiente");
    }

    // Get environment data for email
    const { data: envData } = await adminClient
      .from('environments')
      .select('owner_user_id, name')
      .eq('id', environment_id)
      .single();

    // Check member count limit for this environment
    const { count: memberCount, error: countError } = await adminClient
      .from('environment_roles')
      .select('*', { count: 'exact', head: true })
      .eq('environment_id', environment_id);
    
    if (countError) {
      console.error("Count error:", countError);
      throw new Error("Erro ao verificar limite de membros");
    }

    if ((memberCount || 0) >= 30) {
      throw new Error("Limite de 30 membros atingido neste ambiente");
    }

    // Get inviter's profile name
    const { data: inviterProfile } = await adminClient
      .from('profiles')
      .select('full_name, company')
      .eq('user_id', user.id)
      .maybeSingle();

    const inviterName = inviterProfile?.full_name || inviterProfile?.company || 'Um administrador';

    // Find user by email using admin client
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error("List users error:", listError);
      throw new Error("Erro ao buscar usuário");
    }

    const targetUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (targetUser) {
      // ===== USER EXISTS - Add directly to environment_roles =====
      
      if (targetUser.id === user.id) {
        throw new Error("Você não pode convidar a si mesmo");
      }

      // Check if already has access to this environment
      const { data: existingRole } = await adminClient
        .from('environment_roles')
        .select('id')
        .eq('environment_id', environment_id)
        .eq('user_id', targetUser.id)
        .maybeSingle();

      if (existingRole) {
        throw new Error("Este usuário já tem acesso a este ambiente");
      }

      // Insert into environment_roles with proper permissions
      const { data: newRole, error: insertError } = await adminClient
        .from('environment_roles')
        .insert({
          environment_id: environment_id,
          user_id: targetUser.id,
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(), // Auto-accept since user exists
          // Admin flag
          is_environment_admin: isAdminRole,
          // Role-based permissions
          role_read: true,
          role_edit: isAdminRole,
          role_delete: isAdminRole,
          role_invite: isAdminRole,
          // Section permissions (all 'admin' if admin, otherwise use granular)
          perm_executive_dashboard: isAdminRole ? 'admin' : (permissions?.executive_dashboard || 'view'),
          perm_reports: isAdminRole ? 'admin' : (permissions?.reports || 'view'),
          perm_finance: isAdminRole ? 'admin' : (permissions?.finance || 'none'),
          perm_media_plans: isAdminRole ? 'admin' : (permissions?.media_plans || 'view'),
          perm_media_resources: isAdminRole ? 'admin' : (permissions?.media_resources || 'view'),
          perm_taxonomy: isAdminRole ? 'admin' : (permissions?.taxonomy || 'view'),
          perm_library: isAdminRole ? 'admin' : (permissions?.library || 'view'),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(insertError.message || "Erro ao adicionar membro");
      }

      // Log audit entry for existing user invitation
      await adminClient.from('invite_audit_log').insert({
        action: 'accepted',
        invite_type: 'environment_member',
        email: email.toLowerCase(),
        environment_id: environment_id,
        environment_owner_id: envData?.owner_user_id,
        invited_by: user.id,
        target_user_id: targetUser.id,
        metadata: { role: normalizedRole, auto_accepted: true },
      });

      console.log(`Member ${email} added to environment ${environment_id} with role ${normalizedRole}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          member: newRole, 
          type: 'existing_user',
          message: 'Membro adicionado com sucesso!'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      // ===== USER DOES NOT EXIST - Create pending invite with token and send email =====
      
      // Check if there's already a pending invite for this email in this environment
      const { data: existingInvite } = await adminClient
        .from('pending_environment_invites')
        .select('id, status')
        .eq('email', email.toLowerCase())
        .eq('environment_id', environment_id)
        .eq('status', 'invited')
        .maybeSingle();

      if (existingInvite) {
        throw new Error("Já existe um convite pendente para este email neste ambiente");
      }

      // Generate unique invite token
      const inviteToken = generateInviteToken();

      // Get environment name for email
      const environmentName = envData?.name || 
        (await adminClient.from('profiles').select('company').eq('user_id', envData?.owner_user_id).maybeSingle())?.data?.company ||
        'Ambiente';

      // Create pending invite record with token and environment_id
      const { data: inviteData, error: pendingError } = await adminClient
        .from('pending_environment_invites')
        .insert({
          email: email.toLowerCase(),
          environment_owner_id: envData?.owner_user_id || user.id,
          environment_id: environment_id,
          invited_by: user.id,
          invite_token: inviteToken,
          status: 'invited',
          invite_type: 'environment_member',
          environment_role: normalizedRole,
          perm_executive_dashboard: isAdminRole ? 'admin' : (permissions?.executive_dashboard || 'view'),
          perm_reports: isAdminRole ? 'admin' : (permissions?.reports || 'view'),
          perm_finance: isAdminRole ? 'admin' : (permissions?.finance || 'none'),
          perm_media_plans: isAdminRole ? 'admin' : (permissions?.media_plans || 'view'),
          perm_media_resources: isAdminRole ? 'admin' : (permissions?.media_resources || 'view'),
          perm_taxonomy: isAdminRole ? 'admin' : (permissions?.taxonomy || 'view'),
          perm_library: isAdminRole ? 'admin' : (permissions?.library || 'view'),
        })
        .select()
        .single();

      if (pendingError) {
        console.error("Pending invite error:", pendingError);
        throw new Error(pendingError.message || "Erro ao criar convite pendente");
      }

      // Log audit entry for new invite
      await adminClient.from('invite_audit_log').insert({
        action: 'invited',
        invite_type: 'environment_member',
        email: email.toLowerCase(),
        environment_id: environment_id,
        environment_owner_id: envData?.owner_user_id,
        invited_by: user.id,
        metadata: { role: normalizedRole, invite_id: inviteData.id },
      });

      console.log(`Invite created for email: ${email.toLowerCase()} with role ${normalizedRole} and token ${inviteToken.substring(0, 8)}...`);

      // Send invite email
      let emailSent = false;
      console.log(`Attempting to send invite email to ${email} via send-invite-email function...`);
      try {
        const emailPayload = {
          email: email.toLowerCase(),
          inviteToken: inviteToken,
          environmentName: environmentName,
          inviterName: inviterName,
          inviteType: 'environment_member',
        };
        console.log('Email payload:', JSON.stringify(emailPayload));
        
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invite-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(emailPayload),
        });

        if (emailResponse.ok) {
          emailSent = true;
          const emailResult = await emailResponse.json();
          console.log(`Invite email sent successfully to ${email}:`, emailResult);
        } else {
          const errorData = await emailResponse.json();
          console.error("Email send failed:", {
            status: emailResponse.status,
            statusText: emailResponse.statusText,
            error: errorData
          });
        }
      } catch (emailError) {
        console.error("Failed to send invite email (exception):", emailError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          type: 'invite_sent',
          emailSent: emailSent,
          // Return token only when email fails so frontend can show copyable link
          inviteToken: emailSent ? null : inviteToken,
          inviteId: inviteData.id,
          message: emailSent 
            ? 'Convite enviado por email! O usuário receberá um link para criar a conta.'
            : 'Convite criado! O email não pôde ser enviado, mas você pode compartilhar o link manualmente.'
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
