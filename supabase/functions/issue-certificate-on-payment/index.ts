import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const VALIDITY_MONTHS: Record<string, number> = {
  '1_quarter': 3, '2_quarter': 6, '3_quarter': 9, '4_quarter': 12,
};

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error('invoice_id required');

    // Resolve actor (for audit / cert.issued_by/approved_by fallback)
    let actorId: string | null = null;
    const auth = req.headers.get('Authorization');
    if (auth?.startsWith('Bearer ')) {
      const { data } = await supabase.auth.getUser(auth.slice(7));
      actorId = data?.user?.id || null;
    }

    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .select('*, organizations(id, name, sector), certification_applications(id, scope, sector, validity_period)')
      .eq('id', invoice_id)
      .single();
    if (invErr || !inv) throw new Error(invErr?.message || 'Invoice not found');

    if (inv.status !== 'paid') {
      return new Response(JSON.stringify({ skipped: true, reason: 'invoice_not_paid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Always send the receipt email (any paid invoice)
    try {
      await supabase.functions.invoke('send-invoice-email', {
        body: { invoice_id, mode: 'receipt' },
      });
    } catch (e) { console.warn('receipt email failed', e); }

    // Only certification fees produce a certificate
    if (inv.fee_type !== 'certification') {
      return new Response(JSON.stringify({ skipped: true, reason: 'not_certification_fee' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotency: certificate already exists for this application or org?
    const existsQuery = supabase.from('certificates').select('id').limit(1);
    const { data: existing } = inv.application_id
      ? await existsQuery.eq('application_id', inv.application_id)
      : await existsQuery.eq('organization_id', inv.organization_id);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'certificate_exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve dates
    const validity = inv.validity_period || inv.certification_applications?.validity_period || '4_quarter';
    const months = VALIDITY_MONTHS[validity] || 12;
    const issueDate = inv.start_date || new Date().toISOString().slice(0, 10);
    const expiryDate = inv.expiry_date || addMonths(issueDate, months);

    // Generate certificate number
    const { data: certNum, error: numErr } = await supabase.rpc('generate_certificate_number');
    if (numErr || !certNum) throw new Error(numErr?.message || 'Failed to generate certificate number');

    const qrHash = await sha256Hex(`${certNum}:${inv.organization_id}:${issueDate}`);
    const scope =
      inv.certification_applications?.scope ||
      `Halal certification for ${inv.organizations?.name || 'organization'}`;

    // Need an application_id to insert (column is NOT NULL). Fall back: pick any app for the org.
    let appId = inv.application_id as string | null;
    if (!appId) {
      const { data: anyApp } = await supabase
        .from('certification_applications')
        .select('id')
        .eq('organization_id', inv.organization_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      appId = anyApp?.id || null;
    }
    if (!appId) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_application_for_org' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: cert, error: certErr } = await supabase
      .from('certificates')
      .insert({
        certificate_number: certNum as string,
        organization_id: inv.organization_id,
        application_id: appId,
        issue_date: issueDate,
        expiry_date: expiryDate,
        scope,
        qr_hash: qrHash,
        status: 'active',
        issued_by: actorId || inv.organization_id, // fallback non-null
        approved_by: actorId || inv.organization_id,
      })
      .select()
      .single();
    if (certErr) throw new Error(certErr.message);

    await supabase.from('certificate_history').insert({
      certificate_id: cert.id,
      action: 'issued_on_payment',
      performed_by: actorId,
      reason: `Auto-issued on payment of invoice ${inv.invoice_number}`,
    });

    // Send certificate email (thank-you + cert PDF link)
    try {
      await supabase.functions.invoke('send-certificate-email', {
        body: { certificate_id: cert.id, invoice_id },
      });
    } catch (e) { console.warn('certificate email failed', e); }

    return new Response(JSON.stringify({ success: true, certificate_id: cert.id, certificate_number: certNum }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('issue-certificate-on-payment error', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
