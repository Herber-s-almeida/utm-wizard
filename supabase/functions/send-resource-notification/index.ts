import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  planId: string;
  recipientIds: string[];
  customMessage?: string;
}

interface ChangeLog {
  change_date: string;
  notes: string | null;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token to identify the sender
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current user
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { planId, recipientIds, customMessage }: NotificationRequest = await req.json();

    if (!planId || !recipientIds || recipientIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending notification for plan ${planId} to ${recipientIds.length} recipients`);

    // Get plan details
    const { data: plan, error: planError } = await adminClient
      .from("media_plans")
      .select("id, name, campaign, client, user_id, slug")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      console.error("Plan not found:", planError);
      return new Response(
        JSON.stringify({ error: "Plano não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify sender is the plan owner or has permission
    if (plan.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para enviar notificações deste plano" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get creatives count and stats
    const { data: lines } = await adminClient
      .from("media_lines")
      .select("id")
      .eq("media_plan_id", planId);

    const lineIds = (lines || []).map(l => l.id);
    
    let creativesStats = { total: 0, approved: 0, inProgress: 0, requested: 0 };
    let recentChangeLogs: ChangeLog[] = [];

    if (lineIds.length > 0) {
      const { data: creatives } = await adminClient
        .from("media_creatives")
        .select("id, production_status")
        .in("media_line_id", lineIds);

      if (creatives) {
        creativesStats.total = creatives.length;
        creativesStats.approved = creatives.filter(c => c.production_status === "aprovado").length;
        creativesStats.inProgress = creatives.filter(c => c.production_status === "em_andamento").length;
        creativesStats.requested = creatives.filter(c => c.production_status === "solicitado").length;
      }

      const creativeIds = (creatives || []).map(c => c.id);
      if (creativeIds.length > 0) {
        const { data: changeLogs } = await adminClient
          .from("creative_change_logs")
          .select("change_date, notes")
          .in("creative_id", creativeIds)
          .order("change_date", { ascending: false })
          .limit(10);
        
        recentChangeLogs = changeLogs || [];
      }
    }

    // Get sender profile
    const { data: senderProfile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const senderName = senderProfile?.full_name || user.email || "Usuário";

    // Get recipients' emails from environment_members
    const { data: members } = await adminClient
      .from("environment_members")
      .select("member_user_id")
      .in("id", recipientIds);

    if (!members || members.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum destinatário válido encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const memberUserIds = members.map(m => m.member_user_id);

    // Get user emails from auth
    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers();
    const recipientEmails = authUsers
      .filter(u => memberUserIds.includes(u.id) && u.email)
      .map(u => ({ id: u.id, email: u.email!, name: u.user_metadata?.full_name || u.email }));

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum email de destinatário encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email HTML
    const planUrl = `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/media-plans/${plan.slug || plan.id}/resources`;
    
    const changeLogsHtml = recentChangeLogs.length > 0 
      ? `
        <h3 style="color: #333; margin-top: 24px; margin-bottom: 12px;">Alterações Recentes</h3>
        <ul style="padding-left: 20px; margin: 0;">
          ${recentChangeLogs.map(log => `
            <li style="margin-bottom: 8px; color: #555;">
              <strong>${new Date(log.change_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
              ${log.notes ? ` - ${log.notes}` : ""}
            </li>
          `).join("")}
        </ul>
      ` 
      : "";

    const customMessageHtml = customMessage 
      ? `<div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
          <p style="margin: 0; color: #333;"><strong>${senderName} diz:</strong></p>
          <p style="margin: 8px 0 0 0; color: #555;">${customMessage}</p>
        </div>` 
      : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📢 Atualização de Recursos de Mídia</h1>
        </div>
        
        <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #333;">
            Olá! Houve atualizações nos recursos do plano <strong>${plan.name}</strong>.
          </p>

          ${customMessageHtml}

          <h3 style="color: #333; margin-top: 24px; margin-bottom: 12px;">Resumo dos Criativos</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px; background: #f3f4f6; border-radius: 8px 0 0 0; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #4f46e5;">${creativesStats.total}</div>
                <div style="font-size: 12px; color: #666;">Total</div>
              </td>
              <td style="padding: 12px; background: #f3f4f6; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #10b981;">${creativesStats.approved}</div>
                <div style="font-size: 12px; color: #666;">Aprovados</div>
              </td>
              <td style="padding: 12px; background: #f3f4f6; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${creativesStats.inProgress}</div>
                <div style="font-size: 12px; color: #666;">Em Andamento</div>
              </td>
              <td style="padding: 12px; background: #f3f4f6; border-radius: 0 8px 0 0; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${creativesStats.requested}</div>
                <div style="font-size: 12px; color: #666;">Solicitados</div>
              </td>
            </tr>
          </table>

          ${changeLogsHtml}

          <div style="text-align: center; margin-top: 32px;">
            <a href="${planUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Ver Recursos de Mídia
            </a>
          </div>

          <p style="margin-top: 32px; font-size: 14px; color: #666;">
            Enviado por <strong>${senderName}</strong>
          </p>
        </div>

        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 16px;">
          Você recebeu este email porque optou por receber notificações de recursos de mídia.
        </p>
      </body>
      </html>
    `;

    // Send emails
    const emailResults = [];
    for (const recipient of recipientEmails) {
      try {
        const { data, error } = await resend.emails.send({
          from: "Media Plan Lab <onboarding@resend.dev>",
          to: [recipient.email],
          subject: `📢 Atualização: ${plan.name} - Recursos de Mídia`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending to ${recipient.email}:`, error);
          emailResults.push({ email: recipient.email, success: false, error: error.message });
        } else {
          console.log(`Email sent to ${recipient.email}:`, data);
          emailResults.push({ email: recipient.email, success: true });
        }
      } catch (err) {
        console.error(`Exception sending to ${recipient.email}:`, err);
        emailResults.push({ email: recipient.email, success: false, error: String(err) });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failCount = emailResults.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notificação enviada para ${successCount} destinatário(s)${failCount > 0 ? `, ${failCount} falha(s)` : ""}`,
        results: emailResults
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-resource-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
