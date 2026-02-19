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
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXhkcXl6amZkcXVtbXdwdXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDkxNjEsImV4cCI6MjA4NDQ4NTE2MX0.9Pf3D35nv5tHrnPODut_EcSpSK6LTrbseFwXeae4fJQ";

interface InvitationRequest {
  email: string;
  role_id: string;
  role_name: string;
  inviter_name: string;
  invitation_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Verify user is admin
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin_user", {
      _user_id: user.id,
    });

    if (!isAdmin) {
      throw new Error("Only admin users can send invitations");
    }

    const { email, role_id, role_name, inviter_name, invitation_id }: InvitationRequest =
      await req.json();

    if (!email || !role_id || !invitation_id) {
      throw new Error("Missing required fields: email, role_id, invitation_id");
    }

    const appUrl = "https://africahalal.lovable.app";

    const registerUrl = `${appUrl}/admin/register?email=${encodeURIComponent(email)}&invited=true&role=${encodeURIComponent(role_name || '')}`;
    const loginUrl = `${appUrl}/admin/login`;
    const year = new Date().getFullYear();

    const emailResponse = await resend.emails.send({
      from: "Africa Halal Integrity System <info@africanhalaal.com>",
      to: [email],
      subject: `Admin Portal Invitation — You've been invited as ${role_name}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AHIS Admin Portal Invitation</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f0f2f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:600px;margin:40px auto;padding:0 16px;">
            
            <!-- Card -->
            <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <div style="background:linear-gradient(135deg,#0f3d20 0%,#1a5c2e 50%,#2d7a45 100%);padding:40px 48px;text-align:center;position:relative;">
                <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;width:64px;height:64px;line-height:64px;margin-bottom:16px;font-size:28px;">🌿</div>
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Africa Halal Integrity System</h1>
                <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:1.5px;text-transform:uppercase;">Admin Portal Invitation</p>
              </div>
              
              <!-- Body -->
              <div style="padding:44px 48px;">
                <p style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 8px;">Hello,</p>
                <p style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 28px;">
                  You have been personally invited by <strong style="color:#0f3d20;">${inviter_name || 'an AHIS Administrator'}</strong> to join the Africa Halal Integrity System as a member of the Admin Portal team.
                </p>

                <!-- Role Badge -->
                <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac;border-radius:12px;padding:20px 24px;margin:0 0 28px;">
                  <p style="margin:0 0 4px;color:#166534;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Your Assigned Role</p>
                  <p style="margin:0;color:#0f3d20;font-size:20px;font-weight:700;">${role_name || 'Administrator'}</p>
                  <p style="margin:4px 0 0;color:#15803d;font-size:13px;">Administrative Access · Africa Halal Integrity System</p>
                </div>

                <!-- Inviter Attribution -->
                <div style="background:#f9fafb;border-left:4px solid #1a5c2e;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 28px;">
                  <p style="margin:0;color:#6b7280;font-size:13px;">
                    <strong style="color:#374151;">Invited by:</strong> ${inviter_name || 'AHIS Administrator'}
                  </p>
                </div>

                <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 32px;">
                  Click the button below to create your admin account. You will be asked to set a secure password and verify your email address before you can sign in.
                </p>

                <!-- CTA Button -->
                <div style="text-align:center;margin:0 0 32px;">
                  <a href="${registerUrl}"
                     style="display:inline-block;background:linear-gradient(135deg,#1a5c2e,#2d7a45);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(26,92,46,0.4);">
                    ✅ &nbsp;Create Your Admin Account
                  </a>
                </div>

                <!-- Expiry Warning -->
                <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:14px 18px;margin:0 0 28px;text-align:center;">
                  <p style="margin:0;color:#92400e;font-size:13px;">
                    ⏱ &nbsp;<strong>This invitation expires in 7 days.</strong> Please create your account before it expires.
                  </p>
                </div>

                <!-- Secondary Link -->
                <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;text-align:center;">
                  Already have an admin account?
                  <a href="${loginUrl}" style="color:#1a5c2e;font-weight:600;text-decoration:none;"> Sign in to Admin Portal →</a>
                </p>
              </div>

              <!-- Divider -->
              <div style="height:1px;background:#e5e7eb;margin:0 48px;"></div>

              <!-- Footer -->
              <div style="padding:28px 48px;text-align:center;">
                <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;line-height:1.6;">
                  If you did not expect this invitation, please ignore this email — no account will be created without your action.
                </p>
                <p style="margin:0;color:#d1d5db;font-size:11px;">
                  © ${year} Africa Halal Integrity System. All rights reserved.<br>
                  Questions? Contact us at <a href="mailto:info@africanhalaal.com" style="color:#9ca3af;text-decoration:none;">info@africanhalaal.com</a>
                </p>
              </div>

            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Invitation email sent:", emailResponse);

    // Update invitation with email sent confirmation
    await supabaseAdmin
      .from("admin_invitations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", invitation_id);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse?.data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" ? 401 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
