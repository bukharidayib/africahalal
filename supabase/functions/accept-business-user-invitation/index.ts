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
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { token, email } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!token || !normalizedEmail) return json({ error: "token and email are required" }, 400);

    const { data: invitation, error: invitationErr } = await admin
      .from("business_user_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .maybeSingle();
    if (invitationErr) throw invitationErr;
    if (!invitation) return json({ error: "Invitation not found or already used" }, 404);
    if (String(invitation.email).toLowerCase() !== normalizedEmail) {
      return json({ error: "Invitation email does not match this account" }, 403);
    }
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await admin.from("business_user_invitations").update({ status: "expired" }).eq("id", invitation.id);
      return json({ error: "Invitation has expired" }, 410);
    }

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile) {
      return json({ success: false, pending: true, message: "Create your account first, then sign in to accept this invitation." }, 202);
    }

    const { error: membershipErr } = await admin
      .from("business_user_memberships")
      .upsert(
        {
          business_id: invitation.business_id,
          user_id: profile.id,
          role: invitation.role || "manager",
          status: "active",
          invited_by: invitation.invited_by,
        },
        { onConflict: "business_id,user_id" },
      );
    if (membershipErr) throw membershipErr;

    const { error: acceptedErr } = await admin
      .from("business_user_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);
    if (acceptedErr) throw acceptedErr;

    return json({ success: true, business_id: invitation.business_id });
  } catch (error: any) {
    console.error("accept-business-user-invitation error:", error);
    return json({ error: error.message || "Internal error" }, 500);
  }
});
