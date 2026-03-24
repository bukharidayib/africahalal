import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { inspection_id, type, user_ids, title, message } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert in-app notifications
    if (user_ids && user_ids.length > 0) {
      const notifications = user_ids.map((uid: string) => ({
        user_id: uid,
        inspection_id,
        type,
        title,
        message,
      }));
      await supabase.from("inspection_notifications").insert(notifications);
    }

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && user_ids?.length > 0) {
      // Get emails for users
      for (const uid of user_ids) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", uid)
          .maybeSingle();

        if (profile?.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Africa Halal Integrity System <info@africanhalaal.com>",
              to: [profile.email],
              subject: title,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                  <div style="background:#1a5632;padding:20px;text-align:center;">
                    <h1 style="color:white;margin:0;">Africa Halal Integrity System</h1>
                  </div>
                  <div style="padding:30px;background:#f9f9f9;">
                    <p>Dear ${profile.full_name || "User"},</p>
                    <p>${message || title}</p>
                    <p style="margin-top:20px;">Best regards,<br/>AHIS Inspection Team</p>
                  </div>
                </div>
              `,
            }),
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
