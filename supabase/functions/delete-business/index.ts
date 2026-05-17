import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc('is_admin_user', { _user_id: userData.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { business_id } = await req.json();
    if (!business_id || typeof business_id !== 'string') {
      return new Response(JSON.stringify({ error: 'business_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const del = async (table: string, col: string, ids: string[]) => {
      if (!ids.length) return;
      const { error } = await admin.from(table).delete().in(col, ids);
      if (error) console.warn(`delete ${table}.${col} failed:`, error.message);
    };
    const ids = (rows: any[] | null | undefined, key = 'id') =>
      (rows || []).map((r: any) => r[key]).filter(Boolean);

    // 1. Applications for this business
    const { data: apps } = await admin
      .from('certification_applications').select('id').eq('business_id', business_id);
    const appIds = ids(apps);

    if (appIds.length) {
      // 2. Collect descendant ids per application
      const [{ data: inspections }, { data: certs }, { data: ncns }, { data: invs }, { data: subs }, { data: quos }] = await Promise.all([
        admin.from('inspections').select('id').in('application_id', appIds),
        admin.from('certificates').select('id').in('application_id', appIds),
        admin.from('non_conformance_notices').select('id').in('application_id', appIds),
        admin.from('invoices').select('id').in('application_id', appIds),
        admin.from('subscriptions').select('id').in('application_id', appIds),
        admin.from('quotations').select('id').in('application_id', appIds),
      ]);
      const inspIds = ids(inspections);
      const certIds = ids(certs);
      const ncnIds = ids(ncns);
      const invIds = ids(invs);
      const subIds = ids(subs);
      const quoIds = ids(quos);

      // 3. Grandchildren of invoices
      await del('payment_transactions', 'invoice_id', invIds);
      await del('invoice_activity_log', 'invoice_id', invIds);
      await del('invoice_items', 'invoice_id', invIds);

      // 4. Grandchildren of NCNs
      await del('corrective_actions', 'ncn_id', ncnIds);

      // 5. Grandchildren of inspections
      await del('inspection_reports', 'inspection_id', inspIds);
      await del('inspection_checklist_items', 'inspection_id', inspIds);
      await del('inspection_evidence', 'inspection_id', inspIds);
      await del('inspection_notifications', 'inspection_id', inspIds);
      // NCNs may also reference an inspection
      if (inspIds.length) {
        await admin.from('non_conformance_notices').delete().in('inspection_id', inspIds);
      }

      // 6. Grandchildren of certificates
      await del('certificate_history', 'certificate_id', certIds);
      // invoices reference certificates — null out before deleting certs
      if (certIds.length) {
        await admin.from('invoices').update({ certificate_id: null }).in('certificate_id', certIds);
      }

      // 7. Direct children of application
      await del('application_status_history', 'application_id', appIds);
      await del('application_documents', 'application_id', appIds);
      await del('application_messages', 'application_id', appIds);
      await del('application_products', 'application_id', appIds);
      await del('certification_decisions', 'application_id', appIds);
      await del('approval_requests', 'application_id', appIds);
      await del('non_conformance_notices', 'application_id', appIds);
      await del('inspections', 'application_id', appIds);
      await del('invoices', 'application_id', appIds);
      await del('certificates', 'application_id', appIds);
      await del('subscriptions', 'application_id', appIds);
      await del('quotations', 'application_id', appIds);

      // 8. Applications
      const { error: appDelErr } = await admin
        .from('certification_applications').delete().in('id', appIds);
      if (appDelErr) throw appDelErr;
    }

    // 9. Quotations directly linked to the business (no application)
    await admin.from('quotations').delete().eq('business_id', business_id);

    // 10. Business
    const { error: bizErr } = await admin
      .from('client_businesses').delete().eq('id', business_id);
    if (bizErr) throw bizErr;

    return new Response(JSON.stringify({ success: true, deleted_applications: appIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('delete-business error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
