import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { full_name, email, redirect_to } = await req.json();

    if (!email) {
      throw new Error("Missing email");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate the confirmation link
    // Use magiclink type to generate a verification link for existing users
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: redirect_to || "https://africanhalaal.com/auth/signin",
      },
    });

    if (linkError) {
      throw new Error(`Failed to generate confirmation link: ${linkError.message}`);
    }

    const confirmationUrl = linkData?.properties?.action_link;
    if (!confirmationUrl) {
      throw new Error("No confirmation link generated");
    }

    const name = full_name || "Valued Client";

    const emailResponse = await resend.emails.send({
      from: "Africa Halal Integrity System <info@africanhalaal.com>",
      to: [email],
      subject: "You're Invited — Africa Halal Integrity System",
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
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Account Invitation</p>
            </div>
            
            <!-- Body -->
            <div style="padding:40px;">
              <p style="color:#18181b;font-size:16px;line-height:1.6;margin:0 0 16px;">
                Assalamu Alaikum <strong>${name}</strong>,
              </p>
              
              <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin:0 0 16px;">
                You have been invited to join the <strong>Africa Halal Integrity System (AHIS)</strong>. Please accept this invitation by clicking the button below to verify your email address and activate your account.
              </p>

              <div style="text-align:center;margin:32px 0;">
                <a href="${confirmationUrl}" 
                   style="display:inline-block;background:#1a5c2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
                  Accept Invitation
                </a>
              </div>
              
              <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:16px;margin:24px 0;">
                <p style="color:#854d0e;font-size:13px;line-height:1.5;margin:0;">
                  <strong>⚠ Important:</strong> This invitation link expires in 24 hours. If you did not request this, please ignore this email.
                </p>
              </div>

              <p style="color:#71717a;font-size:13px;line-height:1.5;margin:24px 0 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color:#1a5c2e;font-size:12px;line-height:1.5;margin:8px 0 0;word-break:break-all;">
                <a href="${confirmationUrl}" style="color:#1a5c2e;">${confirmationUrl}</a>
              </p>
              
              <p style="color:#71717a;font-size:13px;line-height:1.5;margin:24px 0 0;">
                Need help? Contact us at 
                <a href="mailto:support@africanhalaal.com" style="color:#1a5c2e;">support@africanhalaal.com</a>.
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

    console.log("Confirmation email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse?.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
