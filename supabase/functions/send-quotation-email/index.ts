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

async function resolveRecipient(quotation: any) {
  const customerEmail = quotation?.customer_email && String(quotation.customer_email).trim();
  if (customerEmail) {
    return { email: customerEmail, source: 'quotations.customer_email', missing: null as string | null };
  }
  const org = quotation?.organizations;
  if (org?.contact_email && String(org.contact_email).trim()) {
    return { email: String(org.contact_email).trim(), source: 'organizations.contact_email', missing: null };
  }
  if (quotation?.organization_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('organization_id', quotation.organization_id)
      .limit(1)
      .maybeSingle();
    if (profile?.email && String(profile.email).trim()) {
      return { email: String(profile.email).trim(), source: 'profiles.email (organization owner)', missing: null };
    }
  }
  return {
    email: null,
    source: null,
    missing: 'customer_email or recipient_emails (no fallback available)',
  };
}

async function buildQuotationPdf(quotationId: string) {
  const { data: q, error } = await supabase
    .from('quotations')
    .select('*, organizations(id, name, contact_email)')
    .eq('id', quotationId)
    .single();
  if (error || !q) throw new Error(error?.message || 'Quotation not found');

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
  page.drawText('QUOTATION', { x: 440, y: 808, size: 20, font: bold, color: gold });

  page.drawText(`Quotation #: ${q.quotation_number}`, { x: 40, y: 745, size: 11, font: bold });
  if (q.valid_until) page.drawText(`Valid Until: ${new Date(q.valid_until).toLocaleDateString('en-GB')}`, { x: 40, y: 728, size: 10, font, color: grey });

  const org = q.organizations || {};
  page.drawText('PREPARED FOR', { x: 350, y: 745, size: 9, font: bold, color: gold });
  page.drawText(org.name || '—', { x: 350, y: 728, size: 11, font: bold });

  page.drawText(q.title, { x: 40, y: 680, size: 13, font: bold, color: navy });

  let y = 650;
  page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 22, color: navy });
  page.drawText('ITEM', { x: 50, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText('QTY', { x: 360, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText('UNIT', { x: 410, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText('TOTAL', { x: 500, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  y -= 22;
  for (const it of (q.items as any[]) || []) {
    if (y < 200) break;
    page.drawText(String(it.label || '').slice(0, 50), { x: 50, y, size: 10, font });
    page.drawText(String(it.qty ?? 1), { x: 365, y, size: 10, font });
    page.drawText(Number(it.unit_price || 0).toFixed(2), { x: 410, y, size: 10, font });
    page.drawText(Number(it.total || 0).toFixed(2), { x: 500, y, size: 10, font });
    y -= 18;
  }
  y -= 10;
  page.drawText('TOTAL', { x: 360, y, size: 13, font: bold, color: navy });
  page.drawText(`${q.currency} ${Number(q.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 460, y, size: 14, font: bold, color: gold });

  return { bytes: await pdf.save(), quotation: q };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  let quotation_id: string | undefined;
  let actor_user_id: string | null = null;
  let actor_email: string | null = null;
  try {
    const body = await req.json();
    quotation_id = body.quotation_id;
    if (!quotation_id) throw new Error('quotation_id required');

    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      actor_user_id = data?.user?.id || null;
      actor_email = data?.user?.email || null;
    }

    const { bytes, quotation } = await buildQuotationPdf(quotation_id);

    // Prefer explicit recipient_emails on the quotation; fall back to org/profile resolution.
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const explicitRecipients: string[] = Array.isArray((quotation as any).recipient_emails)
      ? ((quotation as any).recipient_emails as string[])
          .map((e) => String(e || '').trim().toLowerCase())
          .filter((e) => e && EMAIL_RE.test(e))
      : [];

    let recipients: string[] = [];
    let recipientSource = 'quotations.recipient_emails';
    if (explicitRecipients.length > 0) {
      recipients = Array.from(new Set(explicitRecipients));
    } else {
      const recipientInfo = await resolveRecipient(quotation.organizations, quotation.organization_id);
      if (!recipientInfo.email) {
        const msg = `Cannot send quotation: missing ${recipientInfo.missing}`;
        await logAudit({
          event_type: 'quotation_send_failed',
          actor_user_id, actor_email,
          quotation_id,
          organization_id: quotation.organization_id,
          status: 'error',
          error_message: msg,
          metadata: { missing_field: recipientInfo.missing },
        });
        return new Response(
          JSON.stringify({ error: msg, missing_field: recipientInfo.missing }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      recipients = [recipientInfo.email];
      recipientSource = recipientInfo.source || 'fallback';
    }
    const recipient = recipients[0];
    const recipientInfo = { source: recipientSource };

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const b64 = btoa(String.fromCharCode(...bytes));
    const orgName = quotation.organizations?.name || 'Client';
    const total = `${quotation.currency} ${Number(quotation.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const validUntil = quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-GB') : '—';
    const itemRows = ((quotation.items as any[]) || []).map((it: any) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;font-size:13px;color:#374151;">${String(it.label || '').replace(/</g, '&lt;')}</td>
        <td align="right" style="padding:10px 14px;border-bottom:1px solid #eef2f7;font-size:13px;color:#6b7280;">${it.qty ?? 1}</td>
        <td align="right" style="padding:10px 14px;border-bottom:1px solid #eef2f7;font-size:13px;font-weight:600;">${quotation.currency} ${Number(it.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Quotation ${quotation.quotation_number}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(15,46,87,0.08);">
      <tr><td style="background:#0f2e57;padding:28px 32px;">
        <table width="100%"><tr>
          <td style="color:#fff;font-size:18px;font-weight:700;letter-spacing:0.3px;">AFRICAN HALAL INSTITUTE</td>
          <td align="right" style="color:#c79e3b;font-size:11px;font-weight:600;letter-spacing:1.5px;">QUOTATION</td>
        </tr></table>
      </td></tr>
      <tr><td style="height:4px;background:linear-gradient(90deg,#c79e3b 0%,#e7c674 100%);"></td></tr>
      <tr><td style="padding:36px 32px 8px;">
        <p style="margin:0 0 4px;color:#6b7280;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Quotation</p>
        <h1 style="margin:0 0 8px;font-size:26px;color:#0f2e57;font-weight:700;">${quotation.quotation_number}</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#0f2e57;font-weight:600;">${String(quotation.title || '').replace(/</g, '&lt;')}</p>
        <p style="margin:0 0 8px;font-size:15px;">Dear <strong>${orgName}</strong>,</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">
          Thank you for your interest in our services. Please find your detailed quotation attached.
          A summary is shown below.
        </p>
      </td></tr>
      <tr><td style="padding:0 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;border:1px solid #eef2f7;overflow:hidden;">
          <tr><td style="padding:14px 18px;background:#0f2e57;color:#fff;font-size:11px;letter-spacing:0.8px;text-transform:uppercase;">
            <table width="100%"><tr>
              <td style="font-weight:600;">Item</td>
              <td align="right" style="font-weight:600;">Qty</td>
              <td align="right" style="font-weight:600;">Total</td>
            </tr></table>
          </td></tr>
          ${itemRows || '<tr><td style="padding:14px;font-size:13px;color:#6b7280;text-align:center;">See attached PDF for line items.</td></tr>'}
          <tr><td style="padding:18px 18px 16px;background:#0f2e57;">
            <table width="100%"><tr>
              <td style="color:#fff;font-size:13px;letter-spacing:0.5px;">TOTAL</td>
              <td align="right" style="color:#c79e3b;font-size:22px;font-weight:700;">${total}</td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:18px 32px 8px;">
        <table width="100%" style="font-size:13px;color:#374151;">
          <tr><td style="padding:4px 0;color:#6b7280;">Valid Until</td><td align="right" style="padding:4px 0;font-weight:600;color:#0f2e57;">${validUntil}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Reference</td><td align="right" style="padding:4px 0;font-weight:600;font-family:monospace;">${quotation.quotation_number}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;" align="center">
        <a href="https://africanhalaal.com" style="display:inline-block;background:#c79e3b;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(199,158,59,0.35);">
          Review &amp; Accept Quotation
        </a>
      </td></tr>
      <tr><td style="padding:28px 32px 32px;">
        <table width="100%" style="border-top:1px solid #eef2f7;padding-top:20px;">
          <tr><td style="font-size:12px;color:#6b7280;line-height:1.6;">
            <strong style="color:#0f2e57;">African Halal Institute</strong><br/>
            Lusaka, Zambia &middot; <a href="mailto:accounts@africanhalaal.com" style="color:#c79e3b;text-decoration:none;">accounts@africanhalaal.com</a><br/>
            <a href="https://africanhalaal.com" style="color:#c79e3b;text-decoration:none;">africanhalaal.com</a>
          </td></tr>
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

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'African Halal Institute <accounts@africanhalaal.com>',
        to: recipients,
        subject: `Quotation ${quotation.quotation_number} from African Halal Institute`,
        html,
        attachments: [{ filename: `${quotation.quotation_number}.pdf`, content: b64 }],
      }),
    });
    const respBody = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = `Email send failed: ${respBody?.message || resp.statusText}`;
      await logAudit({
        event_type: 'quotation_send_failed',
        actor_user_id, actor_email,
        quotation_id,
        organization_id: quotation.organization_id,
        recipient_email: recipient,
        status: 'error',
        error_message: msg,
        metadata: { resend_status: resp.status, recipient_source: recipientInfo.source, recipients },
      });
      throw new Error(msg);
    }

    await supabase.from('quotations').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', quotation_id);

    await logAudit({
      event_type: 'quotation_sent',
      actor_user_id, actor_email,
      quotation_id,
      organization_id: quotation.organization_id,
      recipient_email: recipient,
      status: 'success',
      metadata: {
        quotation_number: quotation.quotation_number,
        total: quotation.total,
        currency: quotation.currency,
        recipient_source: recipientInfo.source,
        recipients,
        resend_id: respBody?.id || null,
      },
    });

    return new Response(JSON.stringify({ success: true, recipients, recipient_source: recipientInfo.source }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    await logAudit({
      event_type: 'quotation_send_failed',
      actor_user_id, actor_email,
      quotation_id: quotation_id || null,
      status: 'error',
      error_message: e.message,
    });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
