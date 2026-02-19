import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = "https://xdixdqyzjfdqummwpuzg.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, token } = await req.json();

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, token" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Look up the invitation matching email + token + pending status
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from("admin_invitations")
      .select("id, status, expires_at, role_id")
      .eq("email", email)
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (fetchError || !invitation) {
      console.error("Invitation lookup failed:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid or already used invitation token" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired" }),
        { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update status to accepted using service role (bypasses RLS)
    const { error: updateError } = await supabaseAdmin
      .from("admin_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Failed to update invitation:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to accept invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Invitation accepted for ${email}`);

    // Look up the user's profile by email to get their user_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      console.warn(`Profile not found for ${email} — role not assigned yet:`, profileError);
      // Still return success — invitation was marked accepted
      return new Response(
        JSON.stringify({ success: true, warning: "Profile not found, role not assigned" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert the role into user_roles using service role key (bypasses RLS)
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: profile.id,
        role_id: invitation.role_id,
        assigned_by: null,
      });

    if (roleError) {
      // If it's a duplicate (user already has this role), that's fine
      if (roleError.code === "23505") {
        console.log(`Role already assigned to ${email} — skipping`);
      } else {
        console.error("Failed to insert user role:", roleError);
        return new Response(
          JSON.stringify({ error: "Invitation accepted but failed to assign role" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else {
      console.log(`Role ${invitation.role_id} assigned to user ${profile.id}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
