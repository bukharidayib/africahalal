import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
    const { full_name, email } = await req.json();

    if (!email) {
      throw new Error("Missing email");
    }

    const name = full_name || "Valued Client";
    const appUrl = "https://africahalal.lovable.app";

    const emailResponse = await resend.emails.send({
      from: "Africa Halal Integrity System <info@africanhalaal.com>",
      to: [email],
      subject: "Welcome to Africa Halal Integrity System",
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
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Welcome Aboard</p>
            </div>
            
            <!-- Body -->
            <div style="padding:40px;">
              <p style="color:#18181b;font-size:16px;line-height:1.6;margin:0 0 16px;">
                Assalamu Alaikum <strong>${name}</strong>,
              </p>
              
              <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin:0 0 16px;">
                Welcome to the <strong>Africa Halal Integrity System (AHIS)</strong> — your trusted partner for Halal certification in Africa.
              </p>

              <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin:0 0 16px;">
                Your account has been created successfully. Through our platform you can:
              </p>

              <ul style="color:#3f3f46;font-size:14px;line-height:2;margin:0 0 24px;padding-left:20px;">
                <li>Submit and track Halal certification applications</li>
                <li>Upload required compliance documents</li>
                <li>Monitor inspection schedules and results</li>
                <li>Download and manage your certificates</li>
              </ul>

              <div style="text-align:center;margin:32px 0;">
                <a href="${appUrl}/client/dashboard" 
                   style="display:inline-block;background:#1a5c2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
                  Go to Dashboard
                </a>
              </div>
              
              <p style="color:#71717a;font-size:13px;line-height:1.5;margin:24px 0 0;">
                If you need any assistance, please don't hesitate to reach out to our support team at 
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

    console.log("Welcome email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse?.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
