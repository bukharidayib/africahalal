import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://africahalal.lovable.app";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "#d97706",
  major: "#ea580c",
  critical: "#dc2626",
};

function buildNcnEmailHtml(p: {
  organizationName: string;
  applicationNumber: string;
  ncnNumber: string;
  category: string;
  severity: string;
  description: string;
  dueDate: string;
}): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const sevColor = SEVERITY_COLORS[p.severity] || "#dc2626";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#7f1d1d,#b91c1c);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">⚠ Non-Conformance Notice Issued</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Africa Halal Integrity System</p>
    </div>
    <div style="padding:36px 40px;">
      <p style="color:#18181b;font-size:15px;margin:0 0 12px;">Dear <strong>${p.organizationName}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
        A formal Non-Conformance Notice has been issued against your certification application
        <strong>${p.applicationNumber}</strong>. Please review the details below and submit a corrective action before the due date.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;background:${sevColor};color:#fff;padding:6px 18px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.5px;">
          ${p.severity.toUpperCase()} SEVERITY
        </span>
      </div>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:18px 20px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:4px 0;color:#6b7280;width:130px;">NCN Number</td><td style="padding:4px 0;color:#111;font-weight:700;">${p.ncnNumber}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Category</td><td style="padding:4px 0;color:#111;">${p.category}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Due Date</td><td style="padding:4px 0;color:#dc2626;font-weight:600;">${fmt(p.dueDate)}</td></tr>
        </table>
      </div>

      <div style="background:#f8fafc;border-left:4px solid ${sevColor};border-radius:0 6px 6px 0;padding:14px 18px;margin:0 0 28px;">
        <p style="margin:0 0 6px;color:#334155;font-size:12px;font-weight:700;text-transform:uppercase;">Description</p>
        <p style="margin:0;color:#334155;font-size:13px;line-height:1.6;white-space:pre-wrap;">${p.description.replace(/</g, "&lt;")}</p>
      </div>

      <div style="text-align:center;margin:28px 0;">
        <a href="${APP_URL}/client/compliance"
           style="display:inline-block;background:#1a5c2e;color:#fff;text-decoration:none;padding:13px 30px;border-radius:8px;font-size:14px;font-weight:600;">
          Submit Corrective Action
        </a>
      </div>

      <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;">
        Failure to respond by the due date may result in escalation or suspension of your certification process.
        For assistance, contact <a href="mailto:support@africanhalaal.com" style="color:#16a34a;">support@africanhalaal.com</a>.
      </p>
    </div>
    <div style="background:#14532d;padding:18px 40px;text-align:center;">
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;">© ${new Date().getFullYear()} Africa Halal Integrity System</p>
    </div>
  </div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ncn_id } = await req.json();
    if (!ncn_id) {
      return new Response(JSON.stringify({ error: "ncn_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: ncn, error: ncnErr } = await admin
      .from("non_conformance_notices")
      .select(`
        id, ncn_number, category, description, severity, due_date,
        certification_applications (
          application_number,
          organizations ( name, contact_email )
        )
      `)
      .eq("id", ncn_id)
      .single();

    if (ncnErr || !ncn) throw ncnErr || new Error("NCN not found");

    const app = (ncn as any).certification_applications;
    const org = app?.organizations;
    const recipient = org?.contact_email;

    if (!recipient) {
      console.warn("No contact_email on organization for NCN", ncn_id);
      return new Response(JSON.stringify({ skipped: true, reason: "no contact_email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildNcnEmailHtml({
      organizationName: org.name,
      applicationNumber: app.application_number,
      ncnNumber: (ncn as any).ncn_number,
      category: (ncn as any).category,
      severity: (ncn as any).severity,
      description: (ncn as any).description,
      dueDate: (ncn as any).due_date,
    });

    const { error: sendErr } = await resend.emails.send({
      from: "AHI Enforcement <onboarding@resend.dev>",
      to: [recipient],
      subject: `[${(ncn as any).severity.toUpperCase()}] NCN ${(ncn as any).ncn_number} — Action Required`,
      html,
    });

    if (sendErr) throw sendErr;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-ncn-notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
