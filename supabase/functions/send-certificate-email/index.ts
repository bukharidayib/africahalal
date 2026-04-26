import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

type EventType = 'issued' | 'updated' | 'suspended' | 'revoked' | 'reactivated' | 'manual';

const SUBJECTS: Record<EventType, (n: string) => string> = {
  issued: (n) => `Your Halal Certificate ${n}`,
  updated: (n) => `Updated: Halal Certificate ${n}`,
  suspended: (n) => `Suspended: Halal Certificate ${n}`,
  revoked: (n) => `Revoked: Halal Certificate ${n}`,
  reactivated: (n) => `Reactivated: Halal Certificate ${n}`,
  manual: (n) => `Halal Certificate ${n}`,
};

const HEADLINES: Record<EventType, string> = {
  issued: "Thank you — your Halal Certificate has been issued.",
  updated: "Your Halal Certificate has been updated.",
  suspended: "Your Halal Certificate has been suspended.",
  revoked: "Your Halal Certificate has been revoked.",
  reactivated: "Your Halal Certificate has been reactivated.",
  manual: "Here are the latest details for your Halal Certificate.",
};

async function resolveRecipient(orgId: string, contactEmail?: string | null): Promise<string | null> {
  if (contactEmail && contactEmail.trim()) return contactEmail.trim();
  const { data } = await supabase.from('profiles').select('email').eq('organization_id', orgId).limit(1).maybeSingle();
  return data?.email || null;
}

function buildHtml(opts: {
  orgName: string; event: EventType; certNumber: string; issueDate: string;
  expiryDate: string; scope: string; status: string; verifyUrl: string; customMessage?: string;
}) {
  const { orgName, event, certNumber, issueDate, expiryDate, scope, status, verifyUrl, customMessage } = opts;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(15,46,87,0.08);">
<tr><td style="background:#1a5c33;padding:28px 32px;color:#fff;">
  <div style="font-size:18px;font-weight:700;letter-spacing:0.3px;">AFRICAN HALAL INSTITUTE</div>
  <div style="font-size:11px;opacity:0.85;margin-top:4px;letter-spacing:1.5px;">HALAL CERTIFICATE NOTICE</div>
</td></tr>
<tr><td style="height:4px;background:linear-gradient(90deg,#5b5bf2,#8a8aff);"></td></tr>
<tr><td style="padding:36px 32px 12px;">
  <h1 style="margin:0 0 16px;font-size:22px;color:#1a5c33;">Hello ${orgName},</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#374151;">${HEADLINES[event]}</p>
  ${customMessage ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#374151;background:#f0f9f4;border-left:3px solid #1a5c33;padding:12px 14px;border-radius:6px;">${customMessage.replace(/</g, '&lt;')}</p>` : ''}
</td></tr>
<tr><td style="padding:0 32px;">
  <table width="100%" style="background:#f9fafb;border:1px solid #eef2f7;border-radius:10px;font-size:13px;color:#374151;">
    <tr><td style="padding:14px 18px;border-bottom:1px solid #eef2f7;"><span style="color:#6b7280;">Certificate #</span><div style="font-family:monospace;font-weight:700;color:#1a5c33;font-size:15px;margin-top:2px;">${certNumber}</div></td></tr>
    <tr><td style="padding:14px 18px;border-bottom:1px solid #eef2f7;"><span style="color:#6b7280;">Status</span><div style="margin-top:2px;text-transform:capitalize;font-weight:600;">${status}</div></td></tr>
    <tr><td style="padding:14px 18px;border-bottom:1px solid #eef2f7;"><span style="color:#6b7280;">Scope</span><div style="margin-top:2px;">${scope}</div></td></tr>
    <tr><td style="padding:14px 18px;"><table width="100%"><tr>
      <td style="color:#6b7280;">Issue Date<div style="color:#111827;font-weight:600;margin-top:2px;">${issueDate}</div></td>
      <td align="right" style="color:#6b7280;">Expiry Date<div style="color:#111827;font-weight:600;margin-top:2px;">${expiryDate}</div></td>
    </tr></table></td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding:28px 32px 8px;">
  <a href="${verifyUrl}" style="display:inline-block;background:#1a5c33;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px;">Verify Certificate</a>
</td></tr>
<tr><td style="padding:24px 32px 32px;border-top:1px solid #eef2f7;margin-top:20px;">
  <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;"><strong style="color:#1a5c33;">African Halal Institute</strong><br/>Lusaka, Zambia | <a href="mailto:accounts@africanhalaal.com" style="color:#1a5c33;">accounts@africanhalaal.com</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { certificate_id, event_type = 'issued', custom_message } = body || {};
    if (!certificate_id) throw new Error('certificate_id required');

    const { data: cert, error } = await supabase
      .from('certificates')
      .select('*, organizations(id, name, contact_email)')
      .eq('id', certificate_id).single();
    if (error || !cert) throw new Error(error?.message || 'Certificate not found');

    const orgName = cert.organizations?.name || 'Client';
    const recipient = await resolveRecipient(cert.organization_id, cert.organizations?.contact_email);
    if (!recipient) throw new Error('No recipient email for organization');

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const event = (event_type as EventType);
    const verifyUrl = `https://africanhalaal.com/verify/${cert.certificate_number}`;
    const html = buildHtml({
      orgName,
      event,
      certNumber: cert.certificate_number,
      issueDate: new Date(cert.issue_date).toLocaleDateString('en-GB'),
      expiryDate: new Date(cert.expiry_date).toLocaleDateString('en-GB'),
      scope: cert.scope || 'Halal Certification',
      status: cert.status,
      verifyUrl,
      customMessage: custom_message,
    });

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'African Halal Institute <accounts@africanhalaal.com>',
        to: [recipient],
        subject: (SUBJECTS[event] || SUBJECTS.issued)(cert.certificate_number),
        html,
      }),
    });
    const respBody = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(respBody?.message || 'Email send failed');

    return new Response(JSON.stringify({ success: true, recipient, event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('send-certificate-email error', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
