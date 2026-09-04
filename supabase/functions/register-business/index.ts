import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const caller = createClient(url, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("is_admin_user", { _user_id: authData.user.id });
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json();
    const businessName = String(body.business_name || "").trim();
    const pacraNumber = String(body.pacra_number || "").trim().toUpperCase();
    const email = String(body.contact_email || "").trim().toLowerCase();
    if (!businessName || !pacraNumber || !email) return json({ error: "Business name, PACRA number and owner email are required" }, 400);

    const orgId = crypto.randomUUID();
    const businessId = crypto.randomUUID();
    const { data: existingOrganization, error: lookupError } = await admin
      .from("organizations")
      .select("id, name")
      .eq("registration_number", pacraNumber)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existingOrganization) {
      return json({
        error: `A business with PACRA number ${pacraNumber} already exists: ${existingOrganization.name}`,
        code: "DUPLICATE_PACRA",
      }, 409);
    }

    const { error: orgError } = await admin.from("organizations").insert({
      id: orgId,
      name: businessName,
      registration_number: pacraNumber,
      sector: String(body.sector || "General").trim(),
      address: body.address || null,
      city: body.city || null,
      country: body.country || "Zambia",
      contact_name: body.contact_name || null,
      contact_email: email,
      contact_phone: body.contact_phone || null,
    });
    if (orgError) throw orgError;

    const { error: businessError } = await admin.from("client_businesses").insert({
      id: businessId,
      user_id: null,
      entity_name: businessName,
      pacra_number: pacraNumber,
      organization_id: orgId,
      business_type: "business",
      status: body.status || "active",
      address: body.address || null,
      city: body.city || null,
      country: body.country || "Zambia",
      contact_name: body.contact_name || null,
      contact_email: email,
      contact_phone: body.contact_phone || null,
      notes: body.notes || null,
      directory_visible: body.directory_visible !== false,
      directory_status: body.directory_status || "listed",
    });
    if (businessError) throw businessError;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: invitationError } = await admin.from("business_user_invitations").insert({
      business_id: businessId,
      email,
      role: "manager",
      token,
      expires_at: expiresAt,
      invited_by: authData.user.id,
    });

    const appUrl = Deno.env.get("APP_URL") || "https://africanhalaal.com";
    const signupUrl = `${appUrl}/auth/signup?email=${encodeURIComponent(email)}&business_invite=${encodeURIComponent(token)}`;
    const resendKey = Deno.env.get("RESEND_API_KEY") || Deno.env.get("RESEND_API_KEY_1");
    const resendFrom = Deno.env.get("RESEND_FROM_EMAIL") || "African Halal Institute <accounts@africanhalaal.com>";
    let invitationSent = false;
    let invitationErrorMessage: string | null = invitationError?.message || null;
    let emailId: string | null = null;
    if (invitationError) {
      console.error("register-business invitation record error:", invitationError);
    } else if (resendKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [email],
            subject: `Client Portal Invitation - ${businessName}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#1f2937"><h2 style="color:#0f3d20">Client Portal Invitation</h2><p>You have been invited to manage <strong>${businessName}</strong> in the Africa Halal Integrity System client portal.</p><p style="margin:24px 0"><a href="${signupUrl}" style="background:#1a5c2e;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Create Client Account</a></p><p style="font-size:12px;color:#6b7280">This invitation expires in 7 days.</p></div>`,
          }),
        });
        const responseBody = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(responseBody?.message || responseBody?.name || `Resend rejected the email (${response.status})`);
        }
        emailId = responseBody?.id || null;
        invitationSent = true;
      } catch (emailError: any) {
        invitationErrorMessage = emailError?.message || "Invitation email could not be sent";
        console.error("register-business invitation email error:", emailError);
      }
    } else {
      invitationErrorMessage = "RESEND_API_KEY is not configured";
    }

    return json({ success: true, business_id: businessId, invitation_sent: invitationSent, invitation_error: invitationErrorMessage, email_id: emailId });
  } catch (error: any) {
    console.error("register-business error:", error);
    const duplicateMessage = String(error?.message || "").toLowerCase();
    if (error?.code === "23505" && (duplicateMessage.includes("registration_number") || duplicateMessage.includes("organization_registration_number_key"))) {
      return json({
        error: "A business with this PACRA number already exists. Use a different PACRA number or update the existing business.",
        code: "DUPLICATE_PACRA",
      }, 409);
    }
    return json({ error: error.message || "Internal error" }, 500);
  }
});
