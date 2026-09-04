import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const response = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return response({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc('is_admin_user', { _user_id: authData.user.id });
    if (!isAdmin) return response({ error: 'Forbidden: admin only' }, 403);

    const body = await req.json();
    const { action, user_id: targetUserId } = body;
    if (!targetUserId || typeof targetUserId !== 'string') return response({ error: 'user_id required' }, 400);
    if (targetUserId === authData.user.id) return response({ error: 'You cannot manage your own account here' }, 400);

    const { data: targetAdmin } = await admin.rpc('is_admin_user', { _user_id: targetUserId });
    if (targetAdmin) return response({ error: 'Admin accounts must be managed from User Management' }, 400);

    if (action === 'update') {
      const { full_name, phone, nrc } = body;
      if (!full_name || typeof full_name !== 'string' || !full_name.trim()) return response({ error: 'full_name required' }, 400);
      const { error } = await admin.from('profiles').update({ full_name: full_name.trim(), phone: phone?.trim() || null, nrc: nrc?.trim() || null }).eq('id', targetUserId);
      if (error) return response({ error: error.message }, 500);
      return response({ success: true });
    }

    if (action === 'suspend') {
      const { error } = await admin.auth.admin.updateUserById(targetUserId, { ban_duration: '876000h' });
      if (error) return response({ error: error.message }, 500);
      return response({ success: true });
    }

    if (action === 'delete') {
      const { error } = await admin.auth.admin.deleteUser(targetUserId);
      if (error) return response({ error: error.message }, 500);
      return response({ success: true });
    }

    return response({ error: 'Unsupported action' }, 400);
  } catch (error) {
    console.error('manage-client-user error:', error);
    return response({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});
