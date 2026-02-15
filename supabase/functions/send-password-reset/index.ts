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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirect_to } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate the recovery link using admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirect_to || "https://africahalal.lovable.app/auth/reset-password",
      },
    });

    if (linkError) {
      console.error("Link generation error:", linkError);
      // Don't reveal if email exists or not - always return success
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resetLink = linkData?.properties?.action_link;
    if (!resetLink) {
      console.error("No action_link returned");
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send branded email via Resend
    const emailResponse = await resend.emails.send({
      from: "Africa Halal Integrity System <info@africanhalaal.com>",
      to: [email],
      subject: "Reset Your Password — Africa Halal Integrity System",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header with Logo -->
            <div style="background:linear-gradient(135deg,#1a5c2e,#2d7a45);padding:32px 40px;text-align:center;">
              <img src="https://africahalal.lovable.app/logo.png" alt="AHI Logo" style="height:56px;margin-bottom:16px;" />
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                Africa Halal Integrity System
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;text-transform:uppercase;letter-spacing:2px;">
                Password Recovery
              </p>
            </div>
            
            <!-- Body -->
            <div style="padding:40px;">
              <p style="color:#18181b;font-size:16px;line-height:1.6;margin:0 0 16px;">
                Hello,
              </p>
              <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin:0 0 24px;">
                We received a request to reset the password associated with your account. Click the button below to set a new password. This link will expire in 1 hour.
              </p>
              
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetLink}" 
                   style="display:inline-block;background:linear-gradient(135deg,#1a5c2e,#2d7a45);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(26,92,46,0.3);">
                  Reset My Password
                </a>
              </div>

              <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin:24px 0;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  <strong>⚠️ Security Notice:</strong> If you did not request this password reset, please ignore this email. Your account remains secure.
                </p>
              </div>
              
              <p style="color:#a1a1aa;font-size:12px;line-height:1.5;margin:24px 0 0;">
                If the button above doesn't work, copy and paste this URL into your browser:<br>
                <a href="${resetLink}" style="color:#1a5c2e;word-break:break-all;font-size:11px;">${resetLink}</a>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background:#fafafa;border-top:1px solid #e4e4e7;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;color:#71717a;font-size:13px;font-weight:600;">
                Africa Halal Integrity System
              </p>
              <p style="margin:0;color:#a1a1aa;font-size:11px;">
                Lusaka, Zambia • <a href="mailto:support@africanhalaal.com" style="color:#1a5c2e;">support@africanhalaal.com</a>
              </p>
              <p style="margin:8px 0 0;color:#d4d4d8;font-size:10px;">
                © ${new Date().getFullYear()} All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Password reset email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending password reset:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
