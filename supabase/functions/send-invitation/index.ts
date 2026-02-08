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

    // Send the invitation email
    const signUpUrl = `${SUPABASE_URL.replace('.supabase.co', '')}.supabase.co`;
    const appUrl = "https://africahalal.lovable.app";

    const emailResponse = await resend.emails.send({
      from: "Africa Halal Integrity System <info@africanhalaal.com>",
      to: [email],
      subject: `You're Invited to Join AHIS as ${role_name}`,
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
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Admin Portal Invitation</p>
            </div>
            
            <!-- Body -->
            <div style="padding:40px;">
              <p style="color:#18181b;font-size:16px;line-height:1.6;margin:0 0 16px;">Hello,</p>
              <p style="color:#18181b;font-size:16px;line-height:1.6;margin:0 0 24px;">
                <strong>${inviter_name}</strong> has invited you to join the AHIS Admin Portal as a <strong>${role_name}</strong>.
              </p>
              
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
                <p style="margin:0;color:#166534;font-size:14px;">
                  <strong>Role:</strong> ${role_name}<br>
                  <strong>Access Level:</strong> Administrative
                </p>
              </div>
              
              <p style="color:#18181b;font-size:16px;line-height:1.6;margin:0 0 24px;">
                To accept this invitation, please create your account or sign in using the link below:
              </p>
              
              <div style="text-align:center;margin:32px 0;">
                <a href="${appUrl}/auth/sign-up?email=${encodeURIComponent(email)}&invited=true" 
                   style="display:inline-block;background:#1a5c2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0 0 8px;">
                Already have an account? <a href="${appUrl}/auth/sign-in" style="color:#1a5c2e;">Sign in here</a>
              </p>
              
              <p style="color:#71717a;font-size:13px;line-height:1.5;margin:24px 0 0;">
                This invitation expires in 7 days. If you did not expect this invitation, please ignore this email.
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
