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

async function resolveRecipient(org: any, organizationId: string) {
  if (org?.contact_email && String(org.contact_email).trim()) {
    return { email: String(org.contact_email).trim(), source: 'organizations.contact_email', missing: null as string | null };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
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
    const recipient = recipientInfo.email;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const b64 = btoa(String.fromCharCode(...bytes));
    const orgName = quotation.organizations?.name || 'Client';
    const total = `${quotation.currency} ${Number(quotation.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #0f2e57; padding: 24px; color: #fff;">
          <h1 style="margin: 0; font-size: 20px;">African Halal Institute</h1>
        </div>
        <div style="padding: 28px 24px;">
          <h2 style="color: #0f2e57; margin-top: 0;">Quotation ${quotation.quotation_number}</h2>
          <p>Dear ${orgName},</p>
          <p>Please find your quotation <strong>"${quotation.title}"</strong> attached. Total: <strong>${total}</strong>.</p>
          <p>Sign in to your client portal to review and accept this quotation.</p>
          <p><a href="https://africanhalaal.com" style="background: #c79e3b; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Quotation</a></p>
        </div>
      </div>
    `;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'African Halal Institute <accounts@africanhalaal.com>',
        to: [recipient],
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
        metadata: { resend_status: resp.status, recipient_source: recipientInfo.source },
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
        resend_id: respBody?.id || null,
      },
    });

    return new Response(JSON.stringify({ success: true, recipient, recipient_source: recipientInfo.source }), {
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
