import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || "https://africanhalaal.com";

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const { data: isAdmin } = await admin.rpc("is_admin_user", { _user_id: userData.user.id });
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const { business_id, email } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!business_id || !normalizedEmail) return json({ error: "business_id and email are required" }, 400);

    const { data: business, error: businessErr } = await admin
      .from("client_businesses")
      .select("id, entity_name, branch_name, business_type, parent_business_id")
      .eq("id", business_id)
      .maybeSingle();
    if (businessErr) throw businessErr;
    if (!business) return json({ error: "Business not found" }, 404);

    let parentName = "";
    if (business.parent_business_id) {
      const { data: parent } = await admin
        .from("client_businesses")
        .select("entity_name")
        .eq("id", business.parent_business_id)
        .maybeSingle();
      parentName = parent?.entity_name || "";
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: existing } = await admin
      .from("business_user_invitations")
      .select("id")
      .eq("business_id", business_id)
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle();

    let invitationId = existing?.id as string | undefined;
    if (invitationId) {
      const { error } = await admin
        .from("business_user_invitations")
        .update({ token, expires_at: expiresAt, invited_by: userData.user.id, role: "manager" })
        .eq("id", invitationId);
      if (error) throw error;
    } else {
      const { data, error } = await admin
        .from("business_user_invitations")
        .insert({
          business_id,
          email: normalizedEmail,
          role: "manager",
          token,
          expires_at: expiresAt,
          invited_by: userData.user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      invitationId = data.id;
    }

    const businessName = business.branch_name || business.entity_name;
    const scopeText =
      business.business_type === "branch"
        ? `the branch ${businessName}${parentName ? ` under ${parentName}` : ""}`
        : `${businessName} and all of its branches`;
    const signupUrl = `${appUrl}/auth/signup?email=${encodeURIComponent(normalizedEmail)}&business_invite=${encodeURIComponent(token)}`;
    const signinUrl = `${appUrl}/auth/signin?email=${encodeURIComponent(normalizedEmail)}&business_invite=${encodeURIComponent(token)}`;

    if (resendKey) {
      const { Resend } = await import("npm:resend@2.0.0");
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "Africa Halal Integrity System <info@africanhalaal.com>",
        to: [normalizedEmail],
        subject: `Client Portal Access Invitation - ${businessName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#1f2937;">
            <h2 style="color:#0f3d20;margin-bottom:8px;">Client Portal Access</h2>
            <p>You have been invited to manage <strong>${scopeText}</strong> in the Africa Halal Integrity System client portal.</p>
            <p style="margin:24px 0;">
              <a href="${signupUrl}" style="background:#1a5c2e;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Create Client Account</a>
            </p>
            <p>Already have an account? <a href="${signinUrl}" style="color:#1a5c2e;font-weight:700;">Sign in to accept the invitation</a>.</p>
            <p style="font-size:12px;color:#6b7280;margin-top:24px;">This invitation expires in 7 days.</p>
          </div>
        `,
      });
    }

    return json({ success: true, invitation_id: invitationId, token });
  } catch (error: any) {
    console.error("send-business-user-invitation error:", error);
    return json({ error: error.message || "Internal error" }, 500);
  }
});
