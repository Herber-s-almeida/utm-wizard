import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create regular client to verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const regularClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the calling user
    const { data: { user }, error: userError } = await regularClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the caller is a system admin
    const { data: isAdmin } = await adminClient.rpc("is_system_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: System admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, payload } = await req.json();

    switch (action) {
      // ==================== ENVIRONMENT MANAGEMENT ====================
      
      case "list_environments": {
        // Get all environments with their members count
        const { data: environments, error: envError } = await adminClient
          .from("environments")
          .select("id, name, company_name, cnpj, created_at, created_by")
          .order("name");

        if (envError) throw envError;

        // For each environment, get member counts and members list
        const environmentsWithMembers = await Promise.all(
          (environments || []).map(async (env) => {
            // Get members with their details
            const { data: members } = await adminClient
              .from("environment_roles")
              .select("user_id, is_environment_admin, accepted_at")
              .eq("environment_id", env.id)
              .not("accepted_at", "is", null);

            // Get profiles for these users
            const userIds = members?.map(m => m.user_id) || [];
            let profiles: any[] = [];
            let emails: Record<string, string> = {};
            
            if (userIds.length > 0) {
              const { data: profileData } = await adminClient
                .from("profiles")
                .select("user_id, full_name")
                .in("user_id", userIds);
              profiles = profileData || [];

              // Get emails from auth.users
              const { data: authUsers } = await adminClient.auth.admin.listUsers();
              if (authUsers?.users) {
                for (const au of authUsers.users) {
                  if (userIds.includes(au.id)) {
                    emails[au.id] = au.email || "";
                  }
                }
              }
            }

            // Combine data
            const membersWithDetails = (members || []).map(m => {
              const profile = profiles.find(p => p.user_id === m.user_id);
              return {
                user_id: m.user_id,
                is_environment_admin: m.is_environment_admin,
                full_name: profile?.full_name || null,
                email: emails[m.user_id] || null,
              };
            });

            return {
              ...env,
              members: membersWithDetails,
              admin_count: membersWithDetails.filter(m => m.is_environment_admin).length,
              member_count: membersWithDetails.length,
            };
          })
        );

        return new Response(
          JSON.stringify({ environments: environmentsWithMembers }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create_environment": {
        const { name, companyName, initialAdminEmail } = payload;

        if (!name || typeof name !== "string" || name.trim().length < 2) {
          return new Response(
            JSON.stringify({ error: "Nome do ambiente é obrigatório (mínimo 2 caracteres)" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create the environment
        const { data: newEnv, error: createError } = await adminClient
          .from("environments")
          .insert({
            name: name.trim(),
            company_name: companyName?.trim() || null,
            created_by: user.id,
            owner_user_id: null, // No owner - environment is managed by admins
          })
          .select()
          .single();

        if (createError) throw createError;

        // If initialAdminEmail is provided, either add existing user or create invite
        if (initialAdminEmail && typeof initialAdminEmail === "string") {
          // Check if user exists
          const { data: authUsers } = await adminClient.auth.admin.listUsers();
          const existingUser = authUsers?.users.find(
            (u) => u.email?.toLowerCase() === initialAdminEmail.toLowerCase()
          );

          if (existingUser) {
            // Add existing user as admin
            const { error: roleError } = await adminClient
              .from("environment_roles")
              .insert({
                environment_id: newEnv.id,
                user_id: existingUser.id,
                is_environment_admin: true,
                role_read: true,
                role_edit: true,
                role_delete: true,
                role_invite: true,
                perm_executive_dashboard: "admin",
                perm_reports: "admin",
                perm_finance: "admin",
                perm_media_plans: "admin",
                perm_media_resources: "admin",
                perm_taxonomy: "admin",
                perm_library: "admin",
                invited_by: user.id,
                invited_at: new Date().toISOString(),
                accepted_at: new Date().toISOString(),
              });

            if (roleError) {
              console.error("Error adding admin to environment:", roleError);
            }
          } else {
            // Create pending invite for new user
            const inviteToken = crypto.randomUUID() + crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const { error: inviteError } = await adminClient
              .from("pending_environment_invites")
              .insert({
                environment_id: newEnv.id,
                email: initialAdminEmail.toLowerCase(),
                environment_role: "admin",
                invited_by: user.id,
                invite_token: inviteToken,
                expires_at: expiresAt.toISOString(),
                perm_executive_dashboard: "admin",
                perm_reports: "admin",
                perm_finance: "admin",
                perm_media_plans: "admin",
                perm_media_resources: "admin",
                perm_taxonomy: "admin",
                perm_library: "admin",
              });

            if (inviteError) {
              console.error("Error creating invite:", inviteError);
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, environment: newEnv }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_environment": {
        const { environmentId, name, companyName, cnpj } = payload;

        if (!environmentId) {
          return new Response(
            JSON.stringify({ error: "ID do ambiente é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updateData.name = name.trim();
        if (companyName !== undefined) updateData.company_name = companyName?.trim() || null;
        if (cnpj !== undefined) updateData.cnpj = cnpj?.trim() || null;

        const { error } = await adminClient
          .from("environments")
          .update(updateData)
          .eq("id", environmentId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_environment": {
        const { environmentId } = payload;

        if (!environmentId) {
          return new Response(
            JSON.stringify({ error: "ID do ambiente é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if environment has data
        const { count: planCount } = await adminClient
          .from("media_plans")
          .select("id", { count: "exact", head: true })
          .eq("environment_id", environmentId);

        if (planCount && planCount > 0) {
          return new Response(
            JSON.stringify({ error: `Ambiente possui ${planCount} plano(s) de mídia. Exclua os dados antes de remover o ambiente.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete environment roles first
        await adminClient
          .from("environment_roles")
          .delete()
          .eq("environment_id", environmentId);

        // Delete pending invites
        await adminClient
          .from("pending_environment_invites")
          .delete()
          .eq("environment_id", environmentId);

        // Delete the environment
        const { error } = await adminClient
          .from("environments")
          .delete()
          .eq("id", environmentId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "add_environment_member": {
        const { environmentId, email, isAdmin } = payload;

        if (!environmentId || !email) {
          return new Response(
            JSON.stringify({ error: "ID do ambiente e email são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if user exists
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = authUsers?.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (existingUser) {
          // Check if already a member
          const { data: existingRole } = await adminClient
            .from("environment_roles")
            .select("id")
            .eq("environment_id", environmentId)
            .eq("user_id", existingUser.id)
            .maybeSingle();

          if (existingRole) {
            return new Response(
              JSON.stringify({ error: "Este usuário já é membro do ambiente" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Add as member
          const permLevel = isAdmin ? "admin" : "view";
          const { error: roleError } = await adminClient
            .from("environment_roles")
            .insert({
              environment_id: environmentId,
              user_id: existingUser.id,
              is_environment_admin: isAdmin ?? false,
              role_read: true,
              role_edit: isAdmin ?? false,
              role_delete: isAdmin ?? false,
              role_invite: isAdmin ?? false,
              perm_executive_dashboard: permLevel,
              perm_reports: permLevel,
              perm_finance: permLevel,
              perm_media_plans: permLevel,
              perm_media_resources: permLevel,
              perm_taxonomy: permLevel,
              perm_library: permLevel,
              invited_by: user.id,
              invited_at: new Date().toISOString(),
              accepted_at: new Date().toISOString(),
            });

          if (roleError) throw roleError;

          return new Response(
            JSON.stringify({ success: true, type: "added" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // Create pending invite
          const inviteToken = crypto.randomUUID() + crypto.randomUUID();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const permLevel = isAdmin ? "admin" : "view";
          const { error: inviteError } = await adminClient
            .from("pending_environment_invites")
            .insert({
              environment_id: environmentId,
              email: email.toLowerCase(),
              environment_role: isAdmin ? "admin" : "user",
              invited_by: user.id,
              invite_token: inviteToken,
              expires_at: expiresAt.toISOString(),
              perm_executive_dashboard: permLevel,
              perm_reports: permLevel,
              perm_finance: permLevel,
              perm_media_plans: permLevel,
              perm_media_resources: permLevel,
              perm_taxonomy: permLevel,
              perm_library: permLevel,
            });

          if (inviteError) throw inviteError;

          return new Response(
            JSON.stringify({ success: true, type: "invited", inviteToken }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "update_environment_member": {
        const { environmentId, userId, isAdmin } = payload;

        if (!environmentId || !userId) {
          return new Response(
            JSON.stringify({ error: "ID do ambiente e do usuário são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const permLevel = isAdmin ? "admin" : "view";
        const { error } = await adminClient
          .from("environment_roles")
          .update({
            is_environment_admin: isAdmin ?? false,
            role_edit: isAdmin ?? false,
            role_delete: isAdmin ?? false,
            role_invite: isAdmin ?? false,
            perm_executive_dashboard: permLevel,
            perm_reports: permLevel,
            perm_finance: permLevel,
            perm_media_plans: permLevel,
            perm_media_resources: permLevel,
            perm_taxonomy: permLevel,
            perm_library: permLevel,
          })
          .eq("environment_id", environmentId)
          .eq("user_id", userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "remove_environment_member": {
        const { environmentId, userId } = payload;

        if (!environmentId || !userId) {
          return new Response(
            JSON.stringify({ error: "ID do ambiente e do usuário são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await adminClient
          .from("environment_roles")
          .delete()
          .eq("environment_id", environmentId)
          .eq("user_id", userId);

        if (error) {
          if (error.message?.includes("último administrador")) {
            return new Response(
              JSON.stringify({ error: "Não é possível remover o último administrador do ambiente" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw error;
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ==================== LEGACY USER MANAGEMENT ====================

      case "list_users": {
        // Get all users from auth.users with their profiles and system roles
        const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: profiles } = await adminClient
          .from("profiles")
          .select("*");

        const { data: systemRoles } = await adminClient
          .from("system_roles")
          .select("*");

        // Merge the data
        const users = authUsers.users.map((authUser) => {
          const profile = profiles?.find((p) => p.user_id === authUser.id);
          const systemRole = systemRoles?.find((r) => r.user_id === authUser.id);
          return {
            id: authUser.id,
            email: authUser.email,
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            full_name: profile?.full_name || null,
            company: profile?.company || null,
            system_role: systemRole?.role || "user",
            is_system_user: profile?.is_system_user || false,
          };
        });

        return new Response(
          JSON.stringify({ users }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "promote_to_system_user": {
        const { userId } = payload;
        
        // Update profile to mark as system user
        const { error } = await adminClient
          .from("profiles")
          .update({ is_system_user: true, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
          
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_profile": {
        const { userId, fullName, company } = payload;
        
        // Check if profile exists
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (existingProfile) {
          const { error } = await adminClient
            .from("profiles")
            .update({ full_name: fullName, company, updated_at: new Date().toISOString() })
            .eq("user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await adminClient
            .from("profiles")
            .insert({ user_id: userId, full_name: fullName, company });
          if (error) throw error;
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_system_role": {
        const { userId, role } = payload;
        
        // Check if system role exists
        const { data: existingRole } = await adminClient
          .from("system_roles")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (existingRole) {
          const { error } = await adminClient
            .from("system_roles")
            .update({ role, updated_at: new Date().toISOString() })
            .eq("user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await adminClient
            .from("system_roles")
            .insert({ user_id: userId, role });
          if (error) throw error;
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_user": {
        const { userId } = payload;
        
        // Prevent self-deletion
        if (userId === user.id) {
          return new Response(
            JSON.stringify({ error: "Cannot delete yourself" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete from auth.users (cascades to other tables)
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_user_plans": {
        const { userId } = payload;
        
        const { data: plans, error } = await adminClient
          .from("media_plans")
          .select("id, name, client, campaign, status, total_budget, start_date, end_date, created_at")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ plans }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "invite_user": {
        const { email, makeAdmin } = payload;
        
        if (!email || typeof email !== "string") {
          return new Response(
            JSON.stringify({ error: "Email é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if email already exists
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = authUsers?.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: "Este email já está cadastrado no sistema" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Send invitation with is_system_user = true (system user gets their own environment)
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin
          .inviteUserByEmail(email, {
            redirectTo: `${supabaseUrl}/auth`,
            data: {
              is_system_user: true, // Mark as system user - will have their own environment
            },
          });

        if (inviteError) {
          console.error("Invite error:", inviteError);
          throw inviteError;
        }

        // If makeAdmin is true, create system_role entry
        if (makeAdmin && inviteData.user) {
          const { error: roleError } = await adminClient
            .from("system_roles")
            .insert({ user_id: inviteData.user.id, role: "system_admin" });
          
          if (roleError) {
            console.error("Role creation error:", roleError);
            // Don't throw, user was still created
          }
        }

        return new Response(
          JSON.stringify({ success: true, user: inviteData.user }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list_access_requests": {
        const { data: requests, error } = await adminClient
          .from("system_access_requests")
          .select("*")
          .order("requested_at", { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ requests }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "approve_access_request": {
        const { requestId, makeAdmin } = payload;
        
        // Get the request
        const { data: request, error: fetchError } = await adminClient
          .from("system_access_requests")
          .select("*")
          .eq("id", requestId)
          .single();

        if (fetchError || !request) {
          return new Response(
            JSON.stringify({ error: "Solicitação não encontrada" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (request.status !== "pending") {
          return new Response(
            JSON.stringify({ error: "Solicitação já foi processada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if email already exists
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = authUsers?.users.find(
          (u) => u.email?.toLowerCase() === request.email.toLowerCase()
        );

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: "Este email já está cadastrado no sistema" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Send invitation
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin
          .inviteUserByEmail(request.email, {
            redirectTo: `${supabaseUrl}/auth`,
            data: {
              is_system_user: true,
              full_name: request.full_name,
              company: request.company_name,
            },
          });

        if (inviteError) throw inviteError;

        // If makeAdmin, create system_role entry
        if (makeAdmin && inviteData.user) {
          await adminClient
            .from("system_roles")
            .insert({ user_id: inviteData.user.id, role: "system_admin" });
        }

        // Update request status
        await adminClient
          .from("system_access_requests")
          .update({
            status: "approved",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reject_access_request": {
        const { requestId, reason } = payload;

        const { error } = await adminClient
          .from("system_access_requests")
          .update({
            status: "rejected",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: reason || null,
          })
          .eq("id", requestId)
          .eq("status", "pending");

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("Admin operation error:", error);
    
    // Handle Supabase/Postgres errors which have a message property
    let message = "Unknown error";
    let status = 500;
    
    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>;
      // Supabase errors have a message property directly
      if (typeof err.message === "string") {
        message = err.message;
        // Check for specific known errors
        if (message.includes("último administrador")) {
          status = 400;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
    }
    
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
