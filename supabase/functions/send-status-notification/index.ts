import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { jsPDF } from "npm:jspdf@2.5.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = "https://xdixdqyzjfdqummwpuzg.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://africahalal.lovable.app";

interface StatusNotificationRequest {
  application_id: string;
  new_status: string;
  application_number: string;
  organization_name: string;
  contact_email: string;
  reason?: string;
  certificate_number?: string;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  awaiting_inspection: "Inspection Scheduled",
  inspection_complete: "Inspection Completed",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "#2563eb",
  under_review: "#7c3aed",
  awaiting_inspection: "#0891b2",
  inspection_complete: "#059669",
  approved: "#16a34a",
  rejected: "#dc2626",
  suspended: "#ea580c",
};

const NEXT_STEPS: Record<string, string> = {
  submitted: "Our team will review your application within 3–5 business days.",
  under_review: "An officer has been assigned and will contact you if additional documents are needed.",
  awaiting_inspection: "Please prepare your facility. An inspector will contact you to confirm the exact date and time.",
  inspection_complete: "The findings are under review. A certification decision will be communicated within 5 business days.",
  rejected: "You may contact our support team at support@africanhalaal.com to discuss reapplication guidelines.",
  suspended: "Immediate action is required. Please contact support@africanhalaal.com urgently.",
};

function getStatusMessage(status: string, orgName: string, reason?: string): string {
  switch (status) {
    case "submitted":
      return `Your application has been successfully submitted and is now in our queue for review. Our certification team will begin processing it shortly.`;
    case "under_review":
      return `Your application is now being actively reviewed by our certification officers. We will notify you of any updates or if additional information is required.`;
    case "awaiting_inspection":
      return `An inspection has been scheduled for your organisation. Our certified inspector will contact you to confirm the date and time. Please ensure all relevant areas and documentation are prepared.`;
    case "inspection_complete":
      return `The on-site inspection for ${orgName} has been completed. Our team is now reviewing the inspection findings and will make a certification decision soon.`;
    case "rejected":
      return `After careful review, your application has not met the certification requirements at this time.${reason ? ` Reason: ${reason}` : ""} Please contact our support team for guidance on reapplication.`;
    case "suspended":
      return `Your certification has been suspended.${reason ? ` Reason: ${reason}` : ""} Please contact our support team immediately to discuss the next steps.`;
    default:
      return `Your application status has been updated to ${STATUS_LABELS[status] || status}.`;
  }
}

// ─── PDF Certificate Generator ───────────────────────────────────────────────
function generateCertificatePdf(params: {
  certificateNumber: string;
  organizationName: string;
  scope: string;
  issueDate: string;
  expiryDate: string;
  qrHash: string;
}): string {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const pageH = 297;
  const margin = 20;

  // ── Background ──
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, "F");

  // ── Green header block ──
  doc.setFillColor(26, 92, 46); // #1a5c2e
  doc.rect(0, 0, pageW, 55, "F");

  // ── Header text ──
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("AFRICA HALAL INTEGRITY SYSTEM", pageW / 2, 22, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Certification of Halal Compliance", pageW / 2, 32, { align: "center" });

  doc.setFontSize(9);
  doc.text("africanhalaal.com", pageW / 2, 42, { align: "center" });

  // ── Decorative gold line ──
  doc.setDrawColor(212, 175, 55); // gold
  doc.setLineWidth(1.2);
  doc.line(margin, 58, pageW - margin, 58);

  // ── "THIS IS TO CERTIFY THAT" ──
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("THIS IS TO CERTIFY THAT", pageW / 2, 70, { align: "center" });

  // ── Organisation name ──
  doc.setTextColor(26, 92, 46);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  const orgLines = doc.splitTextToSize(params.organizationName.toUpperCase(), pageW - margin * 2);
  doc.text(orgLines, pageW / 2, 84, { align: "center" });

  const orgBlockEnd = 84 + orgLines.length * 9;

  // ── Compliance statement ──
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    "has been assessed and found to be in compliance with",
    pageW / 2,
    orgBlockEnd + 10,
    { align: "center" }
  );
  doc.setFont("helvetica", "bold");
  doc.text("AHI HALAL STANDARDS (AHI-HALAL-2024)", pageW / 2, orgBlockEnd + 17, { align: "center" });

  // ── Scope box ──
  const scopeBoxY = orgBlockEnd + 26;
  doc.setFillColor(240, 253, 244); // very light green
  doc.setDrawColor(187, 247, 208);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, scopeBoxY, pageW - margin * 2, 22, 3, 3, "FD");

  doc.setTextColor(22, 101, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("SCOPE OF CERTIFICATION", pageW / 2, scopeBoxY + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const scopeLines = doc.splitTextToSize(params.scope, pageW - margin * 2 - 10);
  doc.text(scopeLines, pageW / 2, scopeBoxY + 15, { align: "center" });

  // ── Details grid ──
  const gridY = scopeBoxY + 30;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, gridY, pageW - margin * 2, 30, 2, 2, "D");

  const col1 = margin + 5;
  const col2 = pageW / 2 + 5;

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICATE NUMBER", col1, gridY + 9);
  doc.text("ISSUE DATE", col2, gridY + 9);
  doc.text("EXPIRY DATE", col1, gridY + 22);
  doc.text("STATUS", col2, gridY + 22);

  doc.setTextColor(26, 92, 46);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(params.certificateNumber, col1, gridY + 15);
  doc.text(new Date(params.issueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), col2, gridY + 15);
  doc.text(new Date(params.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), col1, gridY + 28);
  doc.setTextColor(22, 163, 74);
  doc.text("ACTIVE", col2, gridY + 28);

  // ── Divider ──
  const divY = gridY + 38;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.6);
  doc.line(margin, divY, pageW - margin, divY);

  // ── Verification URL ──
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Verify this certificate at:", pageW / 2, divY + 9, { align: "center" });
  doc.setTextColor(26, 92, 46);
  doc.setFont("helvetica", "bold");
  doc.text(`${APP_URL}/verify?id=${params.qrHash}`, pageW / 2, divY + 15, { align: "center" });

  // ── Signature line ──
  const sigY = divY + 35;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  const sigLineX = pageW / 2 - 35;
  doc.line(sigLineX, sigY, sigLineX + 70, sigY);
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Authorised Signatory", pageW / 2, sigY + 6, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("African Halal Certification Board", pageW / 2, sigY + 12, { align: "center" });

  // ── Footer ──
  doc.setFillColor(26, 92, 46);
  doc.rect(0, pageH - 18, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `© ${new Date().getFullYear()} Africa Halal Integrity System  |  info@africanhalaal.com  |  africanhalaal.com`,
    pageW / 2,
    pageH - 6,
    { align: "center" }
  );

  // ── Return as base64 ──
  return doc.output("datauristring").split(",")[1];
}

// ─── Congratulations Email HTML ───────────────────────────────────────────────
function buildCongratulationsHtml(params: {
  organizationName: string;
  applicationNumber: string;
  certificateNumber: string;
  scope: string;
  issueDate: string;
  expiryDate: string;
}): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#14532d,#16a34a);padding:40px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🎉</div>
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Congratulations!</h1>
          <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">Your Halal Certification has been Approved</p>
        </div>

        <!-- Body -->
        <div style="padding:40px;">
          <p style="color:#18181b;font-size:16px;line-height:1.7;margin:0 0 20px;">
            Dear <strong>${params.organizationName}</strong>,
          </p>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
            We are delighted to inform you that your Halal Certification application
            <strong>(${params.applicationNumber})</strong> has been reviewed, assessed, and
            <strong style="color:#16a34a;">officially approved</strong> by the African Halal Certification Board.
          </p>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 32px;">
            Your certificate is attached to this email as a PDF. You can also access and download it at any time from your Certificate Vault.
          </p>

          <!-- Certificate Card -->
          <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:10px;padding:24px;margin-bottom:32px;">
            <h3 style="margin:0 0 16px;color:#14532d;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
              ✅ Certificate Details
            </h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;width:140px;">Certificate No.</td>
                <td style="padding:6px 0;color:#14532d;font-size:13px;font-weight:700;">${params.certificateNumber}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;">Scope</td>
                <td style="padding:6px 0;color:#111827;font-size:13px;">${params.scope}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;">Issue Date</td>
                <td style="padding:6px 0;color:#111827;font-size:13px;">${fmt(params.issueDate)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;">Expiry Date</td>
                <td style="padding:6px 0;color:#dc2626;font-size:13px;font-weight:600;">${fmt(params.expiryDate)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;">Status</td>
                <td style="padding:6px 0;">
                  <span style="background:#dcfce7;color:#15803d;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;">ACTIVE</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- CTA Buttons -->
          <div style="text-align:center;margin:32px 0;">
            <a href="${APP_URL}/client/certificates"
               style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;margin-right:12px;">
              📄 View Certificate Vault
            </a>
          </div>

          <!-- Note -->
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-top:24px;">
            <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
              <strong>📎 Note:</strong> Your certificate PDF is attached to this email for your records.
              Please keep it safely as proof of your Halal certification status.
            </p>
          </div>

          <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:28px 0 0;">
            If you have any questions, please contact our support team at
            <a href="mailto:support@africanhalaal.com" style="color:#16a34a;">support@africanhalaal.com</a>.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#14532d;padding:24px 40px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.8);font-size:12px;line-height:1.6;">
            Africa Halal Integrity System &nbsp;|&nbsp; info@africanhalaal.com &nbsp;|&nbsp; africanhalaal.com
          </p>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.5);font-size:11px;">
            © ${new Date().getFullYear()} Africa Halal Integrity System. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ─── Generic Status Update Email HTML ─────────────────────────────────────────
function buildStatusUpdateHtml(params: {
  organizationName: string;
  applicationNumber: string;
  statusLabel: string;
  statusColor: string;
  statusMessage: string;
  nextStep?: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1a5c2e,#2d7a45);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Africa Halal Integrity System</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Application Status Update</p>
        </div>

        <!-- Body -->
        <div style="padding:40px;">
          <p style="color:#18181b;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear ${params.organizationName},</p>

          <!-- Status Badge -->
          <div style="text-align:center;margin:24px 0;">
            <span style="display:inline-block;background:${params.statusColor};color:#ffffff;padding:8px 24px;border-radius:20px;font-size:14px;font-weight:700;letter-spacing:0.5px;">
              ${params.statusLabel.toUpperCase()}
            </span>
          </div>

          <div style="background:#f8fafc;border-left:4px solid ${params.statusColor};border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
            <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">
              <strong>Application:</strong> ${params.applicationNumber}<br><br>
              ${params.statusMessage}
            </p>
          </div>

          ${params.nextStep ? `
          <!-- What happens next -->
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin:24px 0;">
            <p style="margin:0;color:#1e40af;font-size:13px;font-weight:700;margin-bottom:6px;">📋 What happens next?</p>
            <p style="margin:0;color:#1d4ed8;font-size:13px;line-height:1.6;">${params.nextStep}</p>
          </div>` : ""}

          <div style="text-align:center;margin:32px 0;">
            <a href="${APP_URL}/client/applications"
               style="display:inline-block;background:#1a5c2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
              View Application
            </a>
          </div>

          <p style="color:#71717a;font-size:13px;line-height:1.5;margin:24px 0 0;">
            If you have any questions, please contact our support team at
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
  `;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: StatusNotificationRequest = await req.json();
    const {
      application_id,
      new_status,
      application_number,
      organization_name,
      contact_email,
      reason,
      certificate_number: certNumberFromPayload,
    } = body;

    if (!application_id || !new_status || !contact_email) {
      throw new Error("Missing required fields");
    }

    const allRecipients = [contact_email, "admin@africanhalaal.com", "operations@africanhalaal.com"].filter(Boolean);

    // ── APPROVED: Congratulations email + PDF attachment ──────────────────────
    if (new_status === "approved") {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: cert, error: certErr } = await supabaseAdmin
        .from("certificates")
        .select("certificate_number, issue_date, expiry_date, scope, qr_hash")
        .eq("application_id", application_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (certErr || !cert) {
        console.error("Could not fetch certificate for PDF generation:", certErr);
        throw new Error("Certificate not found for this application.");
      }

      const certNumber = certNumberFromPayload || cert.certificate_number;

      // Generate PDF
      let pdfBase64: string | null = null;
      try {
        pdfBase64 = generateCertificatePdf({
          certificateNumber: certNumber,
          organizationName: organization_name,
          scope: cert.scope,
          issueDate: cert.issue_date,
          expiryDate: cert.expiry_date,
          qrHash: cert.qr_hash,
        });
      } catch (pdfErr) {
        console.error("PDF generation failed (email will be sent without attachment):", pdfErr);
      }

      const html = buildCongratulationsHtml({
        organizationName: organization_name,
        applicationNumber: application_number,
        certificateNumber: certNumber,
        scope: cert.scope,
        issueDate: cert.issue_date,
        expiryDate: cert.expiry_date,
      });

      const emailPayload: Record<string, unknown> = {
        from: "Africa Halal Integrity System <info@africanhalaal.com>",
        to: allRecipients,
        subject: `🎉 Congratulations! Your Halal Certificate is Ready — ${application_number}`,
        html,
      };

      if (pdfBase64) {
        emailPayload.attachments = [
          {
            filename: `Certificate-${certNumber}.pdf`,
            content: pdfBase64,
          },
        ];
      }

      const emailResponse = await resend.emails.send(emailPayload as unknown as Parameters<typeof resend.emails.send>[0]);
      console.log("Congratulations email sent:", emailResponse);

      return new Response(
        JSON.stringify({ success: true, emailId: emailResponse?.data?.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ── ALL OTHER STATUSES: Standard status update email ──────────────────────
    const statusLabel = STATUS_LABELS[new_status] || new_status;
    const statusColor = STATUS_COLORS[new_status] || "#6b7280";
    const statusMessage = getStatusMessage(new_status, organization_name, reason);
    const nextStep = NEXT_STEPS[new_status];

    const html = buildStatusUpdateHtml({
      organizationName: organization_name,
      applicationNumber: application_number,
      statusLabel,
      statusColor,
      statusMessage,
      nextStep,
    });

    const emailResponse = await resend.emails.send({
      from: "Africa Halal Integrity System <info@africanhalaal.com>",
      to: allRecipients,
      subject: `Application ${application_number} — Status Update: ${statusLabel}`,
      html,
    });

    console.log("Status notification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse?.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error sending status notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
