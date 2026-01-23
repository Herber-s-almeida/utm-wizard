import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { 
  sendEmail, 
  EMAIL_CONFIG, 
  EMAIL_TEMPLATES,
  corsHeaders 
} from "../_shared/email-config.ts";

interface NotificationRequest {
  planId: string;
  recipientIds?: string[];
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

    // Get followers for this plan
    let followerUserIds: string[] = [];

    if (recipientIds && recipientIds.length > 0) {
      const { data: followersByPlanId } = await adminClient
        .from("media_plan_followers")
        .select("user_id")
        .in("id", recipientIds)
        .eq("enabled", true);

      if (followersByPlanId && followersByPlanId.length > 0) {
        followerUserIds = followersByPlanId.map(f => f.user_id);
      } else {
        followerUserIds = recipientIds;
      }
    } else {
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

    // Get media lines for this plan
    const { data: mediaLines } = await adminClient
      .from("media_lines")
      .select("id")
      .eq("media_plan_id", planId);

    const lineIds = mediaLines?.map(l => l.id) || [];
    
    // Get creative stats
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

    // Get recent change logs
    let changeLogFilter = new Date();
    changeLogFilter.setDate(changeLogFilter.getDate() - 7);

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

    // Get recent changes
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
    const planUrl = `${EMAIL_CONFIG.baseUrl}/media-plans/${plan.slug || plan.id}/resources`;

    // Build changes HTML
    const changesHtml = recentChanges.length > 0
      ? `
        <h3 style="margin-top: 24px; color: #333;">Mudanças Recentes</h3>
        <ul style="padding-left: 20px; color: #555;">
          ${recentChanges.map(c => `<li><strong>${c.date}</strong>: ${c.notes}</li>`).join("")}
        </ul>
      `
      : `<p style="color: #888; font-style: italic;">Nenhuma mudança registrada desde a última notificação.</p>`;

    // Build custom message HTML
    const customMessageHtml = customMessage
      ? EMAIL_TEMPLATES.customMessageBox(senderName, customMessage)
      : "";

    // Build stats grid
    const statsHtml = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 20px 0;">
        ${EMAIL_TEMPLATES.statCard(creativeStats.approved, 'Aprovados', '#f0fdf4', '#16a34a')}
        ${EMAIL_TEMPLATES.statCard(creativeStats.inProgress, 'Em Andamento', '#fef3c7', '#d97706')}
        ${EMAIL_TEMPLATES.statCard(creativeStats.requested, 'Solicitados', '#dbeafe', '#2563eb')}
        ${EMAIL_TEMPLATES.statCard(creativeStats.total, 'Total', '#f3f4f6', '#374151')}
      </div>
    `;

    // Build full email
    const emailHtml = EMAIL_TEMPLATES.wrapSimple(`
      ${EMAIL_TEMPLATES.headerGradient('Atualização de Recursos')}
      <tr>
        <td style="padding: 24px;">
          <h2 style="color: #333; margin-top: 0;">Plano: ${plan.name}</h2>
          
          ${customMessageHtml}
          ${statsHtml}
          ${changesHtml}
          
          <div style="text-align: center; margin-top: 32px;">
            ${EMAIL_TEMPLATES.button('Ver Recursos de Mídia', planUrl, true)}
          </div>
          
          <p style="margin-top: 32px; font-size: 12px; color: #888; text-align: center;">
            Você está recebendo esta notificação porque está marcado como seguidor deste plano.<br>
            Para gerenciar suas notificações, acesse a página de recursos do plano.
          </p>
        </td>
      </tr>
    `);

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

      const result = await sendEmail({
        to: email,
        subject: `📢 Atualização: ${plan.name} - Recursos de Mídia`,
        html: emailHtml,
      });

      if (result.success) {
        successCount++;
        console.log(`Email sent to ${email}`);
      } else {
        console.error(`Failed to send to ${email}:`, result.error);
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
