const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
}

const escapeHtml = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function renderEmail(d: ContactPayload) {
  const row = (label: string, value?: string) =>
    value
      ? `<tr>
          <td style="padding:10px 16px;background:#f8fafc;color:#64748b;font-size:13px;font-weight:600;width:140px;border-bottom:1px solid #e2e8f0;">${label}</td>
          <td style="padding:10px 16px;color:#0f172a;font-size:14px;border-bottom:1px solid #e2e8f0;">${escapeHtml(value)}</td>
        </tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>New Contact Enquiry</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#065f46 0%,#047857 100%);padding:32px 32px 28px;">
              <p style="margin:0 0 6px;color:#a7f3d0;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">African Halal Institute</p>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">New Contact Form Enquiry</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#0f172a;font-size:16px;font-weight:600;">${escapeHtml(d.subject)}</p>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;">A new message was submitted via the contact form on africanhalaal.com.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                ${row('Name', d.name)}
                ${row('Email', d.email)}
                ${row('Phone', d.phone)}
                ${row('Company', d.company)}
              </table>

              <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
              <div style="padding:16px 18px;background:#f8fafc;border-left:3px solid #047857;border-radius:6px;color:#0f172a;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(d.message)}</div>

              <table role="presentation" width="100%" style="margin-top:28px;">
                <tr>
                  <td>
                    <a href="mailto:${escapeHtml(d.email)}?subject=Re:%20${encodeURIComponent(d.subject)}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;">Reply to ${escapeHtml(d.name)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;text-align:center;">
              African Halal Institute · Lusaka, Zambia<br/>
              This is an automated notification from your website contact form.
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY_1') ?? Deno.env.get('RESEND_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const body = (await req.json()) as ContactPayload;
    if (!body?.name || !body?.email || !body?.subject || !body?.message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = renderEmail(body);
    const recipients = ['info@africanhalaal.com', 'support@africanhalaal.com'];

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'AHI Website <noreply@africanhalaal.com>',
        to: recipients,
        reply_to: body.email,
        subject: `[Contact] ${body.subject}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Resend error', res.status, data);
      return new Response(JSON.stringify({ error: 'Email send failed', details: data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-contact-email error', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
