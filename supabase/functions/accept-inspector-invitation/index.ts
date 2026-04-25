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

    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from("inspector_invitations")
      .select("*")
      .eq("email", email)
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (fetchError || !invitation) {
      console.error("Inspector invitation lookup failed:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid or already used invitation token" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired" }),
        { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark accepted
    await supabaseAdmin
      .from("inspector_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    // Find user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!profile) {
      console.warn(`Profile not found for ${email} — inspector creation deferred`);
      return new Response(
        JSON.stringify({ success: true, warning: "Profile not found, deferred" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if inspector already exists
    const { data: existingInspector } = await supabaseAdmin
      .from("inspectors")
      .select("id")
      .eq("user_id", profile.id)
      .maybeSingle();

    let inspectorId = existingInspector?.id;

    if (!inspectorId) {
      // Generate inspector number
      const year = new Date().getFullYear();
      const { count } = await supabaseAdmin
        .from("inspectors")
        .select("*", { count: "exact", head: true });
      const inspectorNumber = `INS-${year}-${String((count || 0) + 1).padStart(5, "0")}`;

      const { data: newInsp, error: insError } = await supabaseAdmin
        .from("inspectors")
        .insert({
          user_id: profile.id,
          inspector_number: inspectorNumber,
          full_name: invitation.full_name,
          nrc_number: invitation.nrc_number,
          address: invitation.address,
          specializations: [],
          regions: [],
          is_active: true,
          is_manager: !!invitation.is_manager,
        })
        .select("id")
        .single();

      if (insError) {
        console.error("Failed to create inspector:", insError);
        return new Response(
          JSON.stringify({ error: "Failed to create inspector record" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      inspectorId = newInsp.id;
    }

    // Assign organizations
    const orgIds: string[] = invitation.organization_ids || [];
    if (orgIds.length > 0 && inspectorId) {
      const rows = orgIds.map((oid) => ({
        inspector_id: inspectorId,
        organization_id: oid,
        assigned_by: invitation.invited_by,
      }));
      const { error: orgError } = await supabaseAdmin
        .from("inspector_organizations")
        .upsert(rows, { onConflict: "inspector_id,organization_id", ignoreDuplicates: true });
      if (orgError) console.error("Failed to assign organizations:", orgError);
    }

    // Assign managed inspectors (only if this user is a manager)
    const managedIds: string[] = invitation.managed_inspector_ids || [];
    if (invitation.is_manager && managedIds.length > 0 && inspectorId) {
      const rows = managedIds
        .filter((id) => id !== inspectorId)
        .map((id) => ({
          manager_id: inspectorId,
          inspector_id: id,
          assigned_by: invitation.invited_by,
        }));
      if (rows.length > 0) {
        const { error: mgrError } = await supabaseAdmin
          .from("inspector_manager_inspectors")
          .upsert(rows, { onConflict: "manager_id,inspector_id", ignoreDuplicates: true });
        if (mgrError) console.error("Failed to assign managed inspectors:", mgrError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, inspector_id: inspectorId }),
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
