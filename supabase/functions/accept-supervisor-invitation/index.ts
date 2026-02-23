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

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Look up the supervisor invitation
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from("supervisor_invitations")
      .select("id, status, expires_at, organization_id, site_name, site_address, invited_by")
      .eq("email", email)
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (fetchError || !invitation) {
      console.error("Supervisor invitation lookup failed:", fetchError);
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

    // Mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from("supervisor_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Failed to update supervisor invitation:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to accept invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Supervisor invitation accepted for ${email}`);

    // Look up user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      console.warn(`Profile not found for ${email} — supervisor assignment deferred`);
      return new Response(
        JSON.stringify({ success: true, warning: "Profile not found, assignment deferred" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert into organization_supervisors
    if (invitation.organization_id) {
      const { error: assignError } = await supabaseAdmin
        .from("organization_supervisors")
        .insert({
          supervisor_id: profile.id,
          organization_id: invitation.organization_id,
          assigned_by: invitation.invited_by,
        });

      if (assignError) {
        if (assignError.code === "23505") {
          console.log(`Supervisor already assigned to org — skipping`);
        } else {
          console.error("Failed to assign supervisor to org:", assignError);
        }
      } else {
        console.log(`Supervisor ${profile.id} assigned to org ${invitation.organization_id}`);
      }

      // Create site assignment if site_name was provided
      if (invitation.site_name) {
        const { error: siteError } = await supabaseAdmin
          .from("supervisor_sites")
          .insert({
            supervisor_id: profile.id,
            organization_id: invitation.organization_id,
            site_name: invitation.site_name,
            site_address: invitation.site_address || null,
            assigned_by: invitation.invited_by,
          });

        if (siteError) {
          console.error("Failed to create site assignment:", siteError);
        } else {
          console.log(`Site "${invitation.site_name}" assigned to supervisor ${profile.id}`);
        }
      }
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
