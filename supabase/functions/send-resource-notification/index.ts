import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  planId: string;
  recipientIds?: string[]; // Legacy support - now we get followers automatically
  customMessage?: string;
  isDigest?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to identify sender
    const authHeader = req.headers.get("Authorization");
    let senderUserId: string | null = null;

    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      senderUserId = user?.id || null;
    }

    const { planId, recipientIds, customMessage }: NotificationRequest = await req.json();

    if (!planId) {
      throw new Error("planId is required");
    }

    // Get plan details
    const { data: plan, error: planError } = await adminClient
      .from("media_plans")
      .select("id, name, slug, user_id, environment_id")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      throw new Error("Plan not found");
    }

    // Get followers for this plan (or use legacy recipientIds)
    let followerUserIds: string[] = [];

    if (recipientIds && recipientIds.length > 0) {
      // Legacy mode: recipientIds provided
      // First try to get from media_plan_followers by ID
      const { data: followersByPlanId } = await adminClient
        .from("media_plan_followers")
        .select("user_id")
        .in("id", recipientIds)
        .eq("enabled", true);

      if (followersByPlanId && followersByPlanId.length > 0) {
        followerUserIds = followersByPlanId.map(f => f.user_id);
      } else {
        // Fallback: treat recipientIds as user_ids directly
        followerUserIds = recipientIds;
      }
    } else {
      // New mode: get all active followers for the plan
      const { data: followers } = await adminClient
        .from("media_plan_followers")
        .select("user_id")
        .eq("media_plan_id", planId)
        .eq("enabled", true);

      if (followers && followers.length > 0) {
        followerUserIds = followers.map(f => f.user_id);
      }
    }

    if (followerUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum seguidor para notificar", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender profile name
    let senderName = "Sistema";
    if (senderUserId) {
      const { data: senderProfile } = await adminClient
        .from("profiles")
        .select("full_name")
        .eq("user_id", senderUserId)
        .single();
      senderName = senderProfile?.full_name || "Equipe";
    }

    // Get recipient emails from auth.users
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const emailMap: Record<string, string> = {};
    if (authUsers?.users) {
      authUsers.users.forEach((u) => {
        if (u.email && followerUserIds.includes(u.id)) {
          emailMap[u.id] = u.email;
        }
      });
    }

    // Get creative stats
    const { data: mediaLines } = await adminClient
      .from("media_lines")
      .select("id")
      .eq("media_plan_id", planId);

    const lineIds = mediaLines?.map(l => l.id) || [];
    let creativeStats = { total: 0, approved: 0, inProgress: 0, requested: 0 };

    if (lineIds.length > 0) {
      const { data: creatives } = await adminClient
        .from("media_creatives")
        .select("id, production_status")
        .in("media_line_id", lineIds);

      if (creatives) {
        creativeStats.total = creatives.length;
        creativeStats.approved = creatives.filter(c => c.production_status === "aprovado").length;
        creativeStats.inProgress = creatives.filter(c => c.production_status === "em_andamento").length;
        creativeStats.requested = creatives.filter(c => c.production_status === "solicitado").length;
      }
    }

    // Get recent change logs (last 7 days or since last digest)
    let changeLogFilter = new Date();
    changeLogFilter.setDate(changeLogFilter.getDate() - 7);

    // Check for last digest sent
    const { data: notifState } = await adminClient
      .from("media_plan_notification_state")
      .select("last_digest_sent_at")
      .eq("media_plan_id", planId)
      .maybeSingle();

    if (notifState?.last_digest_sent_at) {
      const lastSent = new Date(notifState.last_digest_sent_at);
      if (lastSent > changeLogFilter) {
        changeLogFilter = lastSent;
      }
    }

    // Get creatives for this plan to filter change logs
    let recentChanges: { date: string; notes: string }[] = [];
    if (lineIds.length > 0) {
      const { data: creatives } = await adminClient
        .from("media_creatives")
        .select("id")
        .in("media_line_id", lineIds);

      const creativeIds = creatives?.map(c => c.id) || [];

      if (creativeIds.length > 0) {
        const { data: changeLogs } = await adminClient
          .from("creative_change_logs")
          .select("change_date, notes")
          .in("creative_id", creativeIds)
          .gte("change_date", changeLogFilter.toISOString())
          .order("change_date", { ascending: false })
          .limit(20);

        if (changeLogs) {
          recentChanges = changeLogs.map(log => ({
            date: new Date(log.change_date).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
            notes: log.notes || "Alteração registrada",
          }));
        }
      }
    }

    // Generate plan URL
    const planUrl = `https://mediaplab.lovable.app/media-plans/${plan.slug || plan.id}/resources`;

    // Build email HTML
    const changesHtml = recentChanges.length > 0
      ? `
        <h3 style="margin-top: 24px; color: #333;">Mudanças Recentes</h3>
        <ul style="padding-left: 20px; color: #555;">
          ${recentChanges.map(c => `<li><strong>${c.date}</strong>: ${c.notes}</li>`).join("")}
        </ul>
      `
      : `<p style="color: #888; font-style: italic;">Nenhuma mudança registrada desde a última notificação.</p>`;

    const customMessageHtml = customMessage
      ? `
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
          <p style="margin: 0; color: #333;"><strong>Mensagem de ${senderName}:</strong></p>
          <p style="margin: 8px 0 0; color: #555;">${customMessage}</p>
        </div>
      `
      : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📢 Atualização de Recursos</h1>
        </div>
        
        <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #333; margin-top: 0;">Plano: ${plan.name}</h2>
          
          ${customMessageHtml}
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 20px 0;">
            <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${creativeStats.approved}</div>
              <div style="font-size: 12px; color: #666;">Aprovados</div>
            </div>
            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #d97706;">${creativeStats.inProgress}</div>
              <div style="font-size: 12px; color: #666;">Em Andamento</div>
            </div>
            <div style="background: #dbeafe; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${creativeStats.requested}</div>
              <div style="font-size: 12px; color: #666;">Solicitados</div>
            </div>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #374151;">${creativeStats.total}</div>
              <div style="font-size: 12px; color: #666;">Total</div>
            </div>
          </div>
          
          ${changesHtml}
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="${planUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Ver Recursos de Mídia
            </a>
          </div>
          
          <p style="margin-top: 32px; font-size: 12px; color: #888; text-align: center;">
            Você está recebendo esta notificação porque está marcado como seguidor deste plano.<br>
            Para gerenciar suas notificações, acesse a página de recursos do plano.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send emails to all followers
    let successCount = 0;
    let errorCount = 0;

    for (const userId of followerUserIds) {
      const email = emailMap[userId];
      if (!email) {
        console.log(`No email found for user ${userId}`);
        errorCount++;
        continue;
      }

      try {
        await resend.emails.send({
          from: "Mediaplab <onboarding@resend.dev>",
          to: [email],
          subject: `📢 Atualização: ${plan.name} - Recursos de Mídia`,
          html: emailHtml,
        });
        successCount++;
        console.log(`Email sent to ${email}`);
      } catch (emailError) {
        console.error(`Failed to send to ${email}:`, emailError);
        errorCount++;
      }
    }

    // Update notification state
    if (successCount > 0) {
      await adminClient
        .from("media_plan_notification_state")
        .upsert({
          media_plan_id: planId,
          last_digest_sent_at: new Date().toISOString(),
          last_digest_sent_by: senderUserId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "media_plan_id",
        });
    }

    return new Response(
      JSON.stringify({
        message: `Notificação enviada para ${successCount} seguidor(es)`,
        sent: successCount,
        errors: errorCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-resource-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
