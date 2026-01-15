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
          };
        });

        return new Response(
          JSON.stringify({ users }),
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

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("Admin operation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
