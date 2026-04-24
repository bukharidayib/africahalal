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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  let invoice_id: string | undefined;
  let actor_user_id: string | null = null;
  let actor_email: string | null = null;
  try {
    const body = await req.json();
    invoice_id = body.invoice_id;
    if (!invoice_id) throw new Error('invoice_id required');

    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      actor_user_id = data?.user?.id || null;
      actor_email = data?.user?.email || null;
    }

    const { bytes, invoice } = await buildInvoicePdf(invoice_id);
    const recipientInfo = await resolveRecipient(invoice.organizations, invoice.organization_id);

    if (!recipientInfo.email) {
      const msg = `Cannot send invoice: missing ${recipientInfo.missing}`;
      await logAudit({
        event_type: 'invoice_send_failed',
        actor_user_id, actor_email,
        invoice_id,
        organization_id: invoice.organization_id,
        status: 'error',
        error_message: msg,
        metadata: { missing_field: recipientInfo.missing },
      });
      return new Response(
        JSON.stringify({ error: msg, missing_field: recipientInfo.missing }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const recipient = recipientInfo.email;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const b64 = btoa(String.fromCharCode(...bytes));
    const orgName = invoice.organizations?.name || 'Client';
    const dueDate = new Date(invoice.due_date).toLocaleDateString('en-GB');
    const amount = `${invoice.currency} ${Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #0f2e57; padding: 24px; color: #fff;">
          <h1 style="margin: 0; font-size: 20px;">African Halal Institute</h1>
          <p style="margin: 4px 0 0; opacity: 0.85; font-size: 12px;">Halal Certification &amp; Compliance</p>
        </div>
        <div style="padding: 28px 24px;">
          <h2 style="color: #0f2e57; margin-top: 0;">Invoice ${invoice.invoice_number}</h2>
          <p>Dear ${orgName},</p>
          <p>Please find your invoice attached. A summary is below:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount Due</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${amount}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Due Date</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${dueDate}</td></tr>
            <tr><td style="padding: 8px;"><strong>Reference</strong></td><td style="padding: 8px; text-align: right;">${invoice.invoice_number}</td></tr>
          </table>
          <p>You can pay online via Mobile Money or Card by signing into your client portal:</p>
          <p><a href="https://africanhalaal.com/client/billing/invoices/${invoice.id}" style="background: #c79e3b; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Invoice Online</a></p>
          <p style="color: #777; font-size: 12px; margin-top: 24px;">For any questions, reply to this email or contact accounts@africanhalaal.com.</p>
        </div>
      </div>
    `;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'African Halal Institute <accounts@africanhalaal.com>',
        to: [recipient],
        subject: `Invoice ${invoice.invoice_number} from African Halal Institute`,
        html,
        attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: b64 }],
      }),
    });

    const respBody = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = `Email send failed: ${respBody?.message || resp.statusText}`;
      await logAudit({
        event_type: 'invoice_send_failed',
        actor_user_id, actor_email,
        invoice_id,
        organization_id: invoice.organization_id,
        recipient_email: recipient,
        status: 'error',
        error_message: msg,
        metadata: { resend_status: resp.status, recipient_source: recipientInfo.source },
      });
      throw new Error(msg);
    }

    await supabase.from('invoice_activity_log').insert({
      invoice_id,
      action: 'invoice_emailed',
      metadata: { recipient, resend_id: respBody?.id || null },
    });

    await logAudit({
      event_type: 'invoice_sent',
      actor_user_id, actor_email,
      invoice_id,
      organization_id: invoice.organization_id,
      recipient_email: recipient,
      status: 'success',
      metadata: {
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        currency: invoice.currency,
        recipient_source: recipientInfo.source,
        resend_id: respBody?.id || null,
      },
    });

    return new Response(JSON.stringify({ success: true, recipient, recipient_source: recipientInfo.source }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    await logAudit({
      event_type: 'invoice_send_failed',
      actor_user_id, actor_email,
      invoice_id: invoice_id || null,
      status: 'error',
      error_message: e.message,
    });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
