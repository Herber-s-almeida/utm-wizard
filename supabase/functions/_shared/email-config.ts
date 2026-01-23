// ====================================
// CONFIGURAÇÕES CENTRALIZADAS DE EMAIL
// ====================================

// Provedor de email (trocar aqui caso mude de Resend)
export const EMAIL_PROVIDER = 'resend' as const;

// Configurações do remetente
export const EMAIL_CONFIG = {
  // Nome do sistema que aparece nos emails
  systemName: 'AdsPlanning Pro',
  
  // Endereço do remetente (formato: "Nome <email>")
  // IMPORTANTE: Para Resend funcionar em produção, você precisa
  // verificar seu domínio em https://resend.com/domains
  // Enquanto não verificar, use onboarding@resend.dev (limitado)
  fromAddress: 'AdsPlanning Pro <onboarding@resend.dev>',
  
  // URL base da aplicação (para links nos emails)
  baseUrl: 'https://mediaplab.lovable.app',
  
  // Cor primária da marca (usada nos templates)
  brandColor: '#0284c7',
  
  // Cor gradiente secundária
  brandGradientEnd: '#8b5cf6',
  
  // Ano para copyright
  copyrightYear: new Date().getFullYear(),
};

// Chave da API (lida do ambiente)
export function getEmailApiKey(): string {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    throw new Error("RESEND_API_KEY não configurada. Configure em: Lovable Cloud > Secrets");
  }
  return key;
}

// Função helper para enviar email via Resend
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string; data?: unknown }> {
  const apiKey = getEmailApiKey();
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: EMAIL_CONFIG.fromAddress,
        to: recipients,
        subject: options.subject,
        html: options.html,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Erro ao enviar email:", data);
      return { success: false, error: data.message || "Falha no envio" };
    }

    console.log("Email enviado com sucesso:", data);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Exceção ao enviar email:", error);
    return { success: false, error: message };
  }
}

// Templates base reutilizáveis
export const EMAIL_TEMPLATES = {
  // Header padrão com emoji
  header: (title: string, emoji = '📊') => `
    <tr>
      <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e4e4e7;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background-color: #f0f9ff; border-radius: 12px; margin-bottom: 16px;">
          <span style="font-size: 24px;">${emoji}</span>
        </div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">
          ${title}
        </h1>
      </td>
    </tr>
  `,

  // Header com gradiente (para notificações)
  headerGradient: (title: string, emoji = '📢') => `
    <tr>
      <td style="background: linear-gradient(135deg, ${EMAIL_CONFIG.brandColor} 0%, ${EMAIL_CONFIG.brandGradientEnd} 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${emoji} ${title}</h1>
      </td>
    </tr>
  `,
  
  // Footer padrão
  footer: (extraText?: string) => `
    <tr>
      <td style="padding: 24px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
        ${extraText ? `<p style="margin: 0 0 8px; font-size: 12px; color: #a1a1aa; text-align: center;">${extraText}</p>` : ''}
        <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
          © ${EMAIL_CONFIG.copyrightYear} ${EMAIL_CONFIG.systemName}. Todos os direitos reservados.
        </p>
      </td>
    </tr>
  `,
  
  // Botão CTA
  button: (text: string, url: string, gradient = false) => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${url}" 
             style="display: inline-block; padding: 14px 32px; ${gradient 
               ? `background: linear-gradient(135deg, ${EMAIL_CONFIG.brandColor} 0%, ${EMAIL_CONFIG.brandGradientEnd} 100%);` 
               : `background-color: ${EMAIL_CONFIG.brandColor};`
             } color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `,

  // Info box (dica/destaque)
  infoBox: (content: string, icon = '💡') => `
    <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #0369a1;">
        ${icon} ${content}
      </p>
    </div>
  `,

  // Caixa de mensagem personalizada
  customMessageBox: (senderName: string, message: string) => `
    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${EMAIL_CONFIG.brandGradientEnd};">
      <p style="margin: 0; color: #333;"><strong>Mensagem de ${senderName}:</strong></p>
      <p style="margin: 8px 0 0; color: #555;">${message}</p>
    </div>
  `,

  // Link de fallback
  fallbackLink: (url: string) => `
    <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
      Caso o botão não funcione, copie e cole este link:<br>
      <a href="${url}" style="color: ${EMAIL_CONFIG.brandColor}; word-break: break-all;">${url}</a>
    </p>
  `,

  // Stat card (para métricas)
  statCard: (value: string | number, label: string, bgColor: string, textColor: string) => `
    <div style="background: ${bgColor}; padding: 16px; border-radius: 8px; text-align: center;">
      <div style="font-size: 24px; font-weight: bold; color: ${textColor};">${value}</div>
      <div style="font-size: 12px; color: #666;">${label}</div>
    </div>
  `,
  
  // Wrapper base do email
  wrap: (content: string) => `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${EMAIL_CONFIG.systemName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              ${content}
            </table>
            <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
              © ${EMAIL_CONFIG.copyrightYear} ${EMAIL_CONFIG.systemName}. Todos os direitos reservados.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,

  // Wrapper simples (sem footer duplicado)
  wrapSimple: (content: string) => `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${EMAIL_CONFIG.systemName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              ${content}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
};

// CORS headers padrão para edge functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
