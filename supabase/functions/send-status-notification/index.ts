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

interface StatusNotificationRequest {
  application_id: string;
  new_status: string;
  application_number: string;
  organization_name: string;
  contact_email: string;
  reason?: string;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  awaiting_inspection: "Inspection Scheduled",
  inspection_complete: "Inspection Completed",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "#2563eb",
  under_review: "#7c3aed",
  awaiting_inspection: "#0891b2",
  inspection_complete: "#059669",
  approved: "#16a34a",
  rejected: "#dc2626",
  suspended: "#ea580c",
};

function getStatusMessage(status: string, orgName: string, reason?: string): string {
  switch (status) {
    case "submitted":
      return `Your application has been successfully submitted and is now in our queue for review. Our certification team will begin processing it shortly.`;
    case "under_review":
      return `Great news! Your application is now being actively reviewed by our certification officers. We will notify you of any updates.`;
    case "awaiting_inspection":
      return `An inspection has been scheduled for your organization. Our certified inspector will contact you to confirm the date and time. Please ensure all relevant areas and documentation are prepared.`;
    case "inspection_complete":
      return `The on-site inspection for ${orgName} has been completed. Our team is now reviewing the inspection findings and will make a certification decision soon.`;
    case "approved":
      return `Congratulations! Your Halal certification application has been approved. Your certificate has been generated and is available in your Certificate Vault.`;
    case "rejected":
      return `After careful review, your application has not met the certification requirements at this time.${reason ? ` Reason: ${reason}` : ""} Please contact our support team for guidance on reapplication.`;
    case "suspended":
      return `Your certification has been suspended.${reason ? ` Reason: ${reason}` : ""} Please contact our support team immediately to discuss the next steps.`;
    default:
      return `Your application status has been updated to ${STATUS_LABELS[status] || status}.`;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application_id, new_status, application_number, organization_name, contact_email, reason }: StatusNotificationRequest = await req.json();

    if (!application_id || !new_status || !contact_email) {
      throw new Error("Missing required fields");
    }

    const statusLabel = STATUS_LABELS[new_status] || new_status;
    const statusColor = STATUS_COLORS[new_status] || "#6b7280";
    const statusMessage = getStatusMessage(new_status, organization_name, reason);

    // If approved, fetch certificate details
    let certificateHtml = "";
    if (new_status === "approved") {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: cert } = await supabaseAdmin
        .from("certificates")
        .select("certificate_number, issue_date, expiry_date, scope")
        .eq("application_id", application_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (cert) {
        certificateHtml = `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#166534;font-size:16px;font-weight:700;">🎉 Certificate Details</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:4px 0;color:#166534;font-size:14px;font-weight:600;">Certificate No:</td><td style="padding:4px 0;color:#166534;font-size:14px;">${cert.certificate_number}</td></tr>
              <tr><td style="padding:4px 0;color:#166534;font-size:14px;font-weight:600;">Scope:</td><td style="padding:4px 0;color:#166534;font-size:14px;">${cert.scope}</td></tr>
              <tr><td style="padding:4px 0;color:#166534;font-size:14px;font-weight:600;">Issue Date:</td><td style="padding:4px 0;color:#166534;font-size:14px;">${new Date(cert.issue_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td></tr>
              <tr><td style="padding:4px 0;color:#166534;font-size:14px;font-weight:600;">Expiry Date:</td><td style="padding:4px 0;color:#166534;font-size:14px;">${new Date(cert.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td></tr>
            </table>
          </div>
        `;
      }
    }

    const appUrl = "https://africahalal.lovable.app";

    const emailResponse = await resend.emails.send({
      from: "Africa Halal Integrity System <info@africanhalaal.com>",
      to: [contact_email],
      subject: `Application ${application_number} - Status Update: ${statusLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#1a5c2e,#2d7a45);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Africa Halal Integrity System</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Application Status Update</p>
            </div>
            
            <!-- Body -->
            <div style="padding:40px;">
              <p style="color:#18181b;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear ${organization_name},</p>
              
              <!-- Status Badge -->
              <div style="text-align:center;margin:24px 0;">
                <span style="display:inline-block;background:${statusColor};color:#ffffff;padding:8px 24px;border-radius:20px;font-size:14px;font-weight:700;letter-spacing:0.5px;">
                  ${statusLabel.toUpperCase()}
                </span>
              </div>
              
              <div style="background:#f8fafc;border-left:4px solid ${statusColor};border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
                <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">
                  <strong>Application:</strong> ${application_number}<br>
                  ${statusMessage}
                </p>
              </div>

              ${certificateHtml}
              
              <div style="text-align:center;margin:32px 0;">
                <a href="${appUrl}/client/applications" 
                   style="display:inline-block;background:#1a5c2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
                  View Application
                </a>
              </div>
              
              <p style="color:#71717a;font-size:13px;line-height:1.5;margin:24px 0 0;">
                If you have any questions, please contact our support team at <a href="mailto:support@africanhalaal.com" style="color:#1a5c2e;">support@africanhalaal.com</a>.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background:#fafafa;border-top:1px solid #e4e4e7;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                © ${new Date().getFullYear()} Africa Halal Integrity System. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Status notification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse?.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending status notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
