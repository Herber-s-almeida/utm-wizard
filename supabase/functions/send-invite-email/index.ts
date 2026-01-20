import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  inviteToken: string;
  environmentName: string;
  inviterName?: string;
  baseUrl?: string;
  inviteType?: 'system_user' | 'environment_member';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { 
      email, 
      inviteToken, 
      environmentName, 
      inviterName,
      baseUrl = "https://mediaplab.lovable.app",
      inviteType = 'environment_member'
    }: InviteEmailRequest = await req.json();

    if (!email || !inviteToken || !environmentName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, inviteToken, environmentName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use different routes based on invite type
    // - system_user: /auth/register (creates user + own environment)
    // - environment_member: /auth/join (joins existing environment)
    const registerPath = inviteType === 'system_user' ? '/auth/register' : '/auth/join';
    const registerUrl = `${baseUrl}${registerPath}?token=${inviteToken}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Convite AdsPlanning Pro</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e4e4e7;">
                    <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background-color: #f0f9ff; border-radius: 12px; margin-bottom: 16px;">
                      <span style="font-size: 24px;">📊</span>
                    </div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">
                      Você foi convidado!
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 32px 40px;">
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                      Olá,
                    </p>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                      ${inviterName ? `<strong>${inviterName}</strong> convidou você` : 'Você foi convidado'} para acessar o ambiente 
                      <strong style="color: #0284c7;">${environmentName}</strong> no AdsPlanning Pro.
                    </p>
                    
                    <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                      <p style="margin: 0; font-size: 14px; color: #0369a1;">
                        💡 <strong>O que é o AdsPlanning Pro?</strong><br>
                        Uma plataforma completa para planejamento e gestão de mídia, com controle de orçamento, taxonomia UTM e muito mais.
                      </p>
                    </div>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="${registerUrl}" 
                             style="display: inline-block; padding: 14px 32px; background-color: #0284c7; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Criar minha conta
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; text-align: center;">
                      Este convite expira em 7 dias.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #a1a1aa; text-align: center;">
                      Se você não esperava este convite, pode ignorar este email.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                      Caso o botão não funcione, copie e cole este link:<br>
                      <a href="${registerUrl}" style="color: #0284c7; word-break: break-all;">${registerUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © ${new Date().getFullYear()} AdsPlanning Pro. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Call Resend API directly with fetch
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AdsPlanning Pro <onboarding@resend.dev>",
        to: [email],
        subject: `Você foi convidado para ${environmentName} - AdsPlanning Pro`,
        html: emailHtml,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", responseData);
      throw new Error(responseData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", responseData);

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-invite-email function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
