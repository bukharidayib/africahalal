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

    // Verify caller is an admin
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

    // Fetch all application ids tied to this business
    const { data: apps, error: appsErr } = await admin
      .from('certification_applications')
      .select('id')
      .eq('business_id', business_id);
    if (appsErr) throw appsErr;
    const appIds = (apps || []).map((a: any) => a.id);

    if (appIds.length > 0) {
      // Delete dependent records (child tables) first
      const childTables = [
        'application_status_history',
        'application_documents',
        'application_messages',
        'application_products',
        'certification_decisions',
        'approval_requests',
        'non_conformance_notices',
        'inspections',
        'certificates',
        'invoices',
        'subscriptions',
        'quotations',
      ];
      for (const t of childTables) {
        const { error } = await admin.from(t).delete().in('application_id', appIds);
        if (error) console.warn(`delete ${t} by application_id failed:`, error.message);
      }
      // Delete applications themselves
      const { error: delAppsErr } = await admin
        .from('certification_applications')
        .delete()
        .in('id', appIds);
      if (delAppsErr) throw delAppsErr;
    }

    // Delete quotations directly linked to business (not via application)
    await admin.from('quotations').delete().eq('business_id', business_id);

    // Finally delete the business
    const { error: delBizErr } = await admin
      .from('client_businesses')
      .delete()
      .eq('id', business_id);
    if (delBizErr) throw delBizErr;

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
