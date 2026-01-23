import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { 
  sendEmail, 
  EMAIL_CONFIG, 
  EMAIL_TEMPLATES,
  corsHeaders 
} from "../_shared/email-config.ts";

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
    const { 
      email, 
      inviteToken, 
      environmentName, 
      inviterName,
      baseUrl = EMAIL_CONFIG.baseUrl,
      inviteType = 'environment_member'
    }: InviteEmailRequest = await req.json();

    if (!email || !inviteToken || !environmentName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, inviteToken, environmentName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use different routes based on invite type
    const registerPath = inviteType === 'system_user' ? '/auth/register' : '/auth/join';
    const registerUrl = `${baseUrl}${registerPath}?token=${inviteToken}`;

    // Build email using centralized templates
    const emailHtml = EMAIL_TEMPLATES.wrap(`
      ${EMAIL_TEMPLATES.header('Você foi convidado!', '📊')}
      <tr>
        <td style="padding: 32px 40px;">
          <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
            Olá,
          </p>
          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
            ${inviterName ? `<strong>${inviterName}</strong> convidou você` : 'Você foi convidado'} para acessar o ambiente 
            <strong style="color: ${EMAIL_CONFIG.brandColor};">${environmentName}</strong> no ${EMAIL_CONFIG.systemName}.
          </p>
          
          ${EMAIL_TEMPLATES.infoBox(
            `<strong>O que é o ${EMAIL_CONFIG.systemName}?</strong><br>Uma plataforma completa para planejamento e gestão de mídia, com controle de orçamento, taxonomia UTM e muito mais.`
          )}
          
          ${EMAIL_TEMPLATES.button('Criar minha conta', registerUrl)}
          
          <p style="margin: 24px 0 0; font-size: 14px; color: #71717a; text-align: center;">
            Este convite expira em 7 dias.
          </p>
        </td>
      </tr>
      ${EMAIL_TEMPLATES.footer('Se você não esperava este convite, pode ignorar este email.')}
    `);

    const result = await sendEmail({
      to: email,
      subject: `Você foi convidado para ${environmentName} - ${EMAIL_CONFIG.systemName}`,
      html: emailHtml,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: result.data }),
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
