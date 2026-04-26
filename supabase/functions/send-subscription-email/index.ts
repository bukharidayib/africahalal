import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

type EventType = 'created' | 'updated' | 'renewed' | 'suspended' | 'reactivated' | 'cancelled' | 'manual';

const SUBJECTS: Record<EventType, string> = {
  created: 'Your Subscription Has Been Activated',
  updated: 'Your Subscription Has Been Updated',
  renewed: 'Your Subscription Has Been Renewed',
  suspended: 'Your Subscription Has Been Suspended',
  reactivated: 'Your Subscription Has Been Reactivated',
  cancelled: 'Your Subscription Has Been Cancelled',
  manual: 'Subscription Update From African Halal Institute',
};

const HEADLINES: Record<EventType, string> = {
  created: 'Welcome — your subscription is active',
  updated: 'Your subscription details have been updated',
  renewed: 'Your subscription has been renewed',
  suspended: 'Your subscription has been suspended',
  reactivated: 'Your subscription is active again',
  cancelled: 'Your subscription has been cancelled',
  manual: 'Subscription details',
};

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('en-GB') : '—');
const fmtCycle = (c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

function buildHtml(opts: {
  orgName: string; event: EventType; planName: string; cycle: string;
  amount: number; currency: string; startDate: string; endDate?: string | null;
  nextBilling?: string | null; status: string; notes?: string | null; customMessage?: string;
}) {
  const { orgName, event, planName, cycle, amount, currency, startDate, endDate, nextBilling, status, notes, customMessage } = opts;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 12px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(15,46,87,0.08);">
<tr><td style="background:#1a5c33;padding:28px 32px;color:#fff;">
  <div style="font-size:18px;font-weight:700;letter-spacing:0.3px;">AFRICAN HALAL INSTITUTE</div>
  <div style="font-size:11px;opacity:0.85;margin-top:4px;letter-spacing:1.5px;">SUBSCRIPTION NOTICE</div>
</td></tr>
<tr><td style="height:4px;background:linear-gradient(90deg,#5b5bf2,#8a8aff);"></td></tr>
<tr><td style="padding:36px 32px 12px;">
  <h1 style="margin:0 0 16px;font-size:22px;color:#1a5c33;">Hello ${orgName},</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#374151;">${HEADLINES[event]}.</p>
  ${customMessage ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#374151;background:#f0f9f4;border-left:3px solid #1a5c33;padding:12px 14px;border-radius:6px;">${customMessage.replace(/</g, '&lt;')}</p>` : ''}
</td></tr>
<tr><td style="padding:0 32px;">
  <table width="100%" style="background:#f9fafb;border:1px solid #eef2f7;border-radius:10px;font-size:13px;color:#374151;">
    <tr><td style="padding:14px 18px;border-bottom:1px solid #eef2f7;"><span style="color:#6b7280;">Plan</span><div style="font-weight:700;color:#1a5c33;font-size:15px;margin-top:2px;">${planName}</div></td></tr>
    <tr><td style="padding:14px 18px;border-bottom:1px solid #eef2f7;"><span style="color:#6b7280;">Billing Cycle</span><div style="margin-top:2px;">${fmtCycle(cycle)}</div></td></tr>
    <tr><td style="padding:14px 18px;border-bottom:1px solid #eef2f7;"><span style="color:#6b7280;">Amount</span><div style="margin-top:2px;font-weight:600;">${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></td></tr>
    <tr><td style="padding:14px 18px;border-bottom:1px solid #eef2f7;"><table width="100%"><tr>
      <td style="color:#6b7280;">Start Date<div style="color:#111827;font-weight:600;margin-top:2px;">${fmtDate(startDate)}</div></td>
      <td align="right" style="color:#6b7280;">End Date<div style="color:#111827;font-weight:600;margin-top:2px;">${fmtDate(endDate)}</div></td>
    </tr></table></td></tr>
    <tr><td style="padding:14px 18px;border-bottom:1px solid #eef2f7;"><span style="color:#6b7280;">Next Billing</span><div style="margin-top:2px;">${fmtDate(nextBilling)}</div></td></tr>
    <tr><td style="padding:14px 18px;"><span style="color:#6b7280;">Status</span><div style="margin-top:2px;text-transform:capitalize;font-weight:600;">${status}</div></td></tr>
    ${notes ? `<tr><td style="padding:14px 18px;border-top:1px solid #eef2f7;"><span style="color:#6b7280;">Notes</span><div style="margin-top:2px;">${notes.replace(/</g, '&lt;')}</div></td></tr>` : ''}
  </table>
</td></tr>
<tr><td style="padding:24px 32px 32px;border-top:1px solid #eef2f7;margin-top:20px;">
  <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;"><strong style="color:#1a5c33;">African Halal Institute</strong><br/>Lusaka, Zambia | <a href="mailto:accounts@africanhalaal.com" style="color:#1a5c33;">accounts@africanhalaal.com</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

async function resolveRecipient(orgId: string, contactEmail?: string | null): Promise<string | null> {
  if (contactEmail && contactEmail.trim()) return contactEmail.trim();
  const { data } = await supabase.from('profiles').select('email').eq('organization_id', orgId).limit(1).maybeSingle();
  return data?.email || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { subscription_id, event_type = 'updated', custom_message } = body || {};
    if (!subscription_id) throw new Error('subscription_id required');

    const { data: sub, error } = await supabase
      .from('subscriptions')
      .select('*, organizations(id, name, contact_email)')
      .eq('id', subscription_id)
      .single();
    if (error || !sub) throw new Error(error?.message || 'Subscription not found');

    const recipient = await resolveRecipient(sub.organization_id, sub.organizations?.contact_email);
    if (!recipient) throw new Error('No recipient email for organization');

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const event = (event_type as EventType);
    const html = buildHtml({
      orgName: sub.organizations?.name || 'Client',
      event,
      planName: sub.plan_name,
      cycle: sub.billing_cycle,
      amount: Number(sub.amount),
      currency: sub.currency || 'ZMW',
      startDate: sub.start_date,
      endDate: sub.end_date,
      nextBilling: sub.next_billing_date,
      status: sub.status,
      notes: sub.notes,
      customMessage: custom_message,
    });

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'African Halal Institute <accounts@africanhalaal.com>',
        to: [recipient],
        subject: SUBJECTS[event] || SUBJECTS.updated,
        html,
      }),
    });
    const respBody = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(respBody?.message || 'Email send failed');

    return new Response(JSON.stringify({ success: true, recipient, event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('send-subscription-email error', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
