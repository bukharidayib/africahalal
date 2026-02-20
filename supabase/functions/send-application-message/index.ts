import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = "https://xdixdqyzjfdqummwpuzg.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://africahalal.lovable.app";

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  missing_documents: "Missing Documents",
  additional_info: "Additional Information Required",
  ingredient_issue: "Ingredient Issue Detected",
  general: "General Update",
  custom: "Message from Admin",
};

interface FlaggedIngredient {
  product_name: string;
  ingredient_name: string;
  classification: string;
  reasoning: string;
}

interface MessageRequest {
  application_id: string;
  application_number: string;
  organization_name: string;
  contact_email: string;
  message_type: string;
  message: string;
  flagged_ingredients?: FlaggedIngredient[];
}

function buildIngredientTable(ingredients: FlaggedIngredient[]): string {
  const rows = ingredients.map(ing => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:10px 12px;color:#111827;font-size:13px;">${ing.product_name}</td>
      <td style="padding:10px 12px;color:#111827;font-size:13px;">${ing.ingredient_name}</td>
      <td style="padding:10px 12px;text-align:center;">
        <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;
          background:${ing.classification === 'haram' ? '#fee2e2' : '#fef3c7'};
          color:${ing.classification === 'haram' ? '#dc2626' : '#b45309'};">
          ${ing.classification.toUpperCase()}
        </span>
      </td>
      <td style="padding:10px 12px;color:#6b7280;font-size:12px;">${ing.reasoning}</td>
    </tr>
  `).join('');

  return `
    <div style="overflow-x:auto;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;color:#374151;font-size:12px;font-weight:700;">Product</th>
            <th style="padding:10px 12px;text-align:left;color:#374151;font-size:12px;font-weight:700;">Ingredient</th>
            <th style="padding:10px 12px;text-align:center;color:#374151;font-size:12px;font-weight:700;">Status</th>
            <th style="padding:10px 12px;text-align:left;color:#374151;font-size:12px;font-weight:700;">Reasoning</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildMessageHtml(params: {
  organizationName: string;
  applicationNumber: string;
  messageTypeLabel: string;
  message: string;
  isIngredientIssue: boolean;
  flaggedIngredients?: FlaggedIngredient[];
  headerColor: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:${params.headerColor};padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Africa Halal Integrity System</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">${params.messageTypeLabel}</p>
        </div>

        <!-- Body -->
        <div style="padding:36px 40px;">
          <p style="color:#18181b;font-size:16px;line-height:1.6;margin:0 0 16px;">
            Dear <strong>${params.organizationName}</strong>,
          </p>

          <div style="background:#f8fafc;border-left:4px solid ${params.headerColor};border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
            <p style="margin:0 0 6px;color:#374151;font-size:13px;">
              <strong>Application:</strong> ${params.applicationNumber}
            </p>
            <p style="margin:0;color:#1e293b;font-size:14px;line-height:1.7;white-space:pre-wrap;">${params.message}</p>
          </div>

          ${params.isIngredientIssue && params.flaggedIngredients && params.flaggedIngredients.length > 0 ? `
          <div style="margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#b91c1c;font-size:15px;font-weight:700;">⚠️ Flagged Ingredients</h3>
            ${buildIngredientTable(params.flaggedIngredients)}
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-top:16px;">
              <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.6;">
                <strong>Action Required:</strong> Please review the flagged ingredients above, replace any non-halal components, 
                and resubmit the Technical Specification Sheets for affected products through your client portal.
              </p>
            </div>
          </div>
          ` : ''}

          <!-- CTA -->
          <div style="text-align:center;margin:32px 0;">
            <a href="${APP_URL}/client/applications"
               style="display:inline-block;background:#1a5c2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
              View My Application
            </a>
          </div>

          <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0;">
            If you have any questions, please contact our support team at
            <a href="mailto:support@africanhalaal.com" style="color:#16a34a;">support@africanhalaal.com</a>.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#14532d;padding:24px 40px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.8);font-size:12px;line-height:1.6;">
            Africa Halal Integrity System &nbsp;|&nbsp; info@africanhalaal.com &nbsp;|&nbsp; africanhalaal.com
          </p>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.5);font-size:11px;">
            © ${new Date().getFullYear()} Africa Halal Integrity System. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: MessageRequest = await req.json();
    const {
      application_id,
      application_number,
      organization_name,
      contact_email,
      message_type,
      message,
      flagged_ingredients,
    } = body;

    const messageTypeLabel = MESSAGE_TYPE_LABELS[message_type] || "Message from Admin";
    const isIngredientIssue = message_type === "ingredient_issue";

    // Determine header color
    const headerColor = isIngredientIssue ? "#b91c1c" :
      message_type === "missing_documents" ? "#d97706" :
      message_type === "additional_info" ? "#1d4ed8" :
      "#1a5c2e";

    // Build email subject
    const subjectPrefix = isIngredientIssue ? "⚠️ Action Required: Ingredient Issue" :
      message_type === "missing_documents" ? "Action Required: Missing Documents" :
      message_type === "additional_info" ? "Action Required: Additional Information" :
      `Update on Your Application`;
    const subject = `${subjectPrefix} – ${application_number}`;

    // Build HTML
    const html = buildMessageHtml({
      organizationName: organization_name,
      applicationNumber: application_number,
      messageTypeLabel,
      message,
      isIngredientIssue,
      flaggedIngredients: flagged_ingredients,
      headerColor,
    });

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: "Africa Halal Integrity System <info@africanhalaal.com>",
      to: [contact_email],
      cc: ["admin@africanhalaal.com", "operations@africanhalaal.com"],
      subject,
      html,
    });

    if (emailError) throw new Error(`Resend error: ${JSON.stringify(emailError)}`);

    // Save to application_messages table
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get("authorization")?.replace("Bearer ", "") || ""
    );

    await (supabase.from("application_messages" as any).insert({
      application_id,
      sent_by: user?.id || "00000000-0000-0000-0000-000000000000",
      message_type,
      message,
    }) as any);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("send-application-message error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
