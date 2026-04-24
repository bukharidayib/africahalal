import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function logAudit(entry: Record<string, unknown>) {
  try {
    await supabase.from('accountant_audit_log').insert(entry);
  } catch (e) {
    console.error('audit log insert failed', e);
  }
}

// Resolve a recipient email for an organization, falling back to the owner profile.
// Returns { email, source, missing } where missing describes which field is empty.
async function resolveRecipient(org: any, organizationId: string) {
  if (org?.contact_email && String(org.contact_email).trim()) {
    return { email: String(org.contact_email).trim(), source: 'organizations.contact_email', missing: null as string | null };
  }
  // Fall back: profile of any user linked to this organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('organization_id', organizationId)
    .limit(1)
    .maybeSingle();
  if (profile?.email && String(profile.email).trim()) {
    return { email: String(profile.email).trim(), source: 'profiles.email (organization owner)', missing: null };
  }
  return {
    email: null,
    source: null,
    missing: 'organizations.contact_email (and no linked profile email found for this organization)',
  };
}

// Inline copy of buildInvoicePdf (edge functions can't share imports cleanly)
async function buildInvoicePdf(invoiceId: string) {
  const { data: inv, error } = await supabase
    .from('invoices')
    .select('*, organizations(id, name, address, city, country, contact_email, contact_phone, registration_number)')
    .eq('id', invoiceId)
    .single();
  if (error || !inv) throw new Error(error?.message || 'Invoice not found');

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.06, 0.18, 0.34);
  const gold = rgb(0.78, 0.62, 0.23);
  const grey = rgb(0.4, 0.4, 0.4);
  const black = rgb(0, 0, 0);

  page.drawRectangle({ x: 0, y: 780, width: 595, height: 62, color: navy });
  page.drawText('AFRICAN HALAL INSTITUTE', { x: 40, y: 812, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Halal Certification & Compliance', { x: 40, y: 794, size: 9, font, color: rgb(0.85, 0.85, 0.85) });
  page.drawText('INVOICE', { x: 460, y: 808, size: 20, font: bold, color: gold });

  page.drawText(`Invoice #: ${inv.invoice_number}`, { x: 40, y: 745, size: 11, font: bold, color: black });
  page.drawText(`Issue Date: ${new Date(inv.created_at).toLocaleDateString('en-GB')}`, { x: 40, y: 728, size: 10, font, color: grey });
  page.drawText(`Due Date: ${new Date(inv.due_date).toLocaleDateString('en-GB')}`, { x: 40, y: 713, size: 10, font, color: grey });
  page.drawText(`Status: ${String(inv.status).toUpperCase()}`, { x: 40, y: 698, size: 10, font: bold, color: navy });

  const org = inv.organizations || {};
  page.drawText('BILL TO', { x: 350, y: 745, size: 9, font: bold, color: gold });
  page.drawText(org.name || '—', { x: 350, y: 728, size: 11, font: bold, color: black });
  if (org.contact_email) page.drawText(org.contact_email, { x: 350, y: 713, size: 9, font, color: grey });

  let y = 640;
  page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 22, color: navy });
  page.drawText('DESCRIPTION', { x: 50, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText('AMOUNT', { x: 480, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  y -= 28;

  const feeLabel: Record<string, string> = {
    application_fee: 'Application Fee', certification: 'Certification Fee',
    subscription: 'Subscription Fee', inspection: 'Inspection Fee',
    renewal: 'Renewal Fee', other: 'Service Charge',
  };
  page.drawText(feeLabel[inv.fee_type] || inv.fee_type, { x: 50, y, size: 11, font: bold, color: black });
  if (inv.description) {
    page.drawText(String(inv.description).slice(0, 70), { x: 50, y: y - 14, size: 9, font, color: grey });
  }
  page.drawText(`${inv.currency} ${Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 480, y, size: 11, font: bold });

  page.drawText('TOTAL', { x: 360, y: 500, size: 13, font: bold, color: navy });
  page.drawText(`${inv.currency} ${Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 460, y: 500, size: 14, font: bold, color: gold });

  page.drawText('African Halal Institute · accounts@africanhalaal.com · Lusaka, Zambia', { x: 40, y: 55, size: 8, font, color: grey });

  return { bytes: await pdf.save(), invoice: inv };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildInvoiceEmailHtml(opts: {
  invoice: any;
  orgName: string;
  amount: string;
  dueDate: string;
  payUrl: string;
}) {
  const { invoice, orgName, amount, dueDate, payUrl } = opts;
  const issueDate = new Date(invoice.created_at || Date.now()).toLocaleDateString('en-GB');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invoice ${invoice.invoice_number}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(15,46,87,0.08);">
      <tr><td style="background:#0f2e57;padding:28px 32px;">
        <table width="100%"><tr>
          <td style="color:#fff;font-size:18px;font-weight:700;letter-spacing:0.3px;">AFRICAN HALAL INSTITUTE</td>
          <td align="right" style="color:#c79e3b;font-size:11px;font-weight:600;letter-spacing:1.5px;">INVOICE</td>
        </tr></table>
      </td></tr>
      <tr><td style="height:4px;background:linear-gradient(90deg,#c79e3b 0%,#e7c674 100%);"></td></tr>
      <tr><td style="padding:36px 32px 8px;">
        <p style="margin:0 0 4px;color:#6b7280;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Invoice</p>
        <h1 style="margin:0 0 24px;font-size:26px;color:#0f2e57;font-weight:700;">${invoice.invoice_number}</h1>
        <p style="margin:0 0 8px;font-size:15px;">Dear <strong>${orgName}</strong>,</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#374151;">
          Thank you for choosing the African Halal Institute. Please find your invoice attached as a PDF.
          A summary of charges is shown below.
        </p>
      </td></tr>
      <tr><td style="padding:0 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;border:1px solid #eef2f7;">
          <tr>
            <td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">
              <p style="margin:0;color:#6b7280;font-size:11px;letter-spacing:0.8px;text-transform:uppercase;">Amount Due</p>
              <p style="margin:4px 0 0;color:#c79e3b;font-size:28px;font-weight:700;">${amount}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 22px;">
              <table width="100%" style="font-size:13px;color:#374151;">
                <tr><td style="padding:4px 0;color:#6b7280;">Issue Date</td><td align="right" style="padding:4px 0;font-weight:600;">${issueDate}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Due Date</td><td align="right" style="padding:4px 0;font-weight:600;color:#0f2e57;">${dueDate}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Reference</td><td align="right" style="padding:4px 0;font-weight:600;font-family:monospace;">${invoice.invoice_number}</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:28px 32px 8px;" align="center">
        <a href="${payUrl}" style="display:inline-block;background:#c79e3b;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(199,158,59,0.35);">
          Pay Invoice Online
        </a>
        <p style="margin:14px 0 0;font-size:12px;color:#6b7280;">Mobile Money &middot; Card &middot; Bank Transfer</p>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#4b5563;">
          You can also sign in to your client portal to track payments, download receipts and manage your certification.
        </p>
      </td></tr>
      <tr><td style="padding:28px 32px 32px;">
        <table width="100%" style="border-top:1px solid #eef2f7;padding-top:20px;">
          <tr>
            <td style="font-size:12px;color:#6b7280;line-height:1.6;">
              <strong style="color:#0f2e57;">African Halal Institute</strong><br/>
              Lusaka, Zambia &middot; <a href="mailto:accounts@africanhalaal.com" style="color:#c79e3b;text-decoration:none;">accounts@africanhalaal.com</a><br/>
              <a href="https://africanhalaal.com" style="color:#c79e3b;text-decoration:none;">africanhalaal.com</a>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
          This is an automated message. For queries, reply to this email.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  let invoice_id: string | undefined;
  let actor_user_id: string | null = null;
  let actor_email: string | null = null;
  try {
    const body = await req.json();
    invoice_id = body.invoice_id;
    const overrideEmails: string[] | undefined = Array.isArray(body.recipient_emails)
      ? body.recipient_emails.map((e: any) => String(e || '').trim()).filter(Boolean)
      : undefined;
    if (!invoice_id) throw new Error('invoice_id required');

    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      actor_user_id = data?.user?.id || null;
      actor_email = data?.user?.email || null;
    }

    const { bytes, invoice } = await buildInvoicePdf(invoice_id);

    let recipients: string[] = [];
    let recipientSource = '';
    if (overrideEmails && overrideEmails.length) {
      const valid = Array.from(new Set(overrideEmails.filter((e) => EMAIL_RE.test(e))));
      if (valid.length === 0) {
        const msg = 'No valid email addresses provided in recipient_emails';
        await logAudit({
          event_type: 'invoice_send_failed', actor_user_id, actor_email, invoice_id,
          organization_id: invoice.organization_id, status: 'error', error_message: msg,
          metadata: { provided: overrideEmails },
        });
        return new Response(JSON.stringify({ error: msg }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      recipients = valid;
      recipientSource = 'manual_override';
    } else {
      const recipientInfo = await resolveRecipient(invoice.organizations, invoice.organization_id);
      if (!recipientInfo.email) {
        const msg = `Cannot send invoice: missing ${recipientInfo.missing}`;
        await logAudit({
          event_type: 'invoice_send_failed', actor_user_id, actor_email, invoice_id,
          organization_id: invoice.organization_id, status: 'error', error_message: msg,
          metadata: { missing_field: recipientInfo.missing },
        });
        return new Response(
          JSON.stringify({ error: msg, missing_field: recipientInfo.missing }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      recipients = [recipientInfo.email];
      recipientSource = recipientInfo.source || 'auto';
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const b64 = btoa(String.fromCharCode(...bytes));
    const orgName = invoice.organizations?.name || 'Client';
    const dueDate = new Date(invoice.due_date).toLocaleDateString('en-GB');
    const amount = `${invoice.currency} ${Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const payUrl = `https://africanhalaal.com/client/billing/invoices/${invoice.id}`;

    const html = buildInvoiceEmailHtml({ invoice, orgName, amount, dueDate, payUrl });

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'African Halal Institute <accounts@africanhalaal.com>',
        to: recipients,
        subject: `Invoice ${invoice.invoice_number} from African Halal Institute`,
        html,
        attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: b64 }],
      }),
    });

    const respBody = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = `Email send failed: ${respBody?.message || resp.statusText}`;
      await logAudit({
        event_type: 'invoice_send_failed', actor_user_id, actor_email, invoice_id,
        organization_id: invoice.organization_id,
        recipient_email: recipients.join(', '),
        status: 'error', error_message: msg,
        metadata: { resend_status: resp.status, recipient_source: recipientSource, recipients },
      });
      throw new Error(msg);
    }

    await supabase.from('invoice_activity_log').insert({
      invoice_id, action: 'invoice_emailed',
      performed_by: actor_user_id,
      metadata: { recipients, recipient_source: recipientSource, resend_id: respBody?.id || null },
    });

    await logAudit({
      event_type: 'invoice_sent', actor_user_id, actor_email, invoice_id,
      organization_id: invoice.organization_id,
      recipient_email: recipients.join(', '),
      status: 'success',
      metadata: {
        invoice_number: invoice.invoice_number, amount: invoice.amount, currency: invoice.currency,
        recipient_source: recipientSource, recipients, resend_id: respBody?.id || null,
      },
    });

    return new Response(JSON.stringify({ success: true, recipients, recipient_source: recipientSource }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    await logAudit({
      event_type: 'invoice_send_failed', actor_user_id, actor_email,
      invoice_id: invoice_id || null, status: 'error', error_message: e.message,
    });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
