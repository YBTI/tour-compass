// 応援 Push 通知の送信 (Supabase Edge Function)
// 必要なシークレット: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY は Supabase が自動で設定する
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { groupId, fromName, toIds } = await req.json();
    if (!groupId || !Array.isArray(toIds) || toIds.length === 0) {
      return new Response(JSON.stringify({ error: 'groupId and toIds are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 同じグループの指定メンバーの購読のみ対象にする
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('group_id', groupId)
      .in('user_id', toIds);
    if (error) throw error;

    const payload = JSON.stringify({
      title: '応援要請',
      body: `${fromName ?? 'メンバー'}さんが応援を求めています`,
      tag: `cheer_${groupId}`,
      url: '/map'
    });

    const results = await Promise.allSettled(
      (subs ?? []).map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      )
    );

    // 無効になった購読 (410/404) は削除
    const expired = results
      .map((r, i) => (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode) ? subs![i].endpoint : null))
      .filter((e): e is string => !!e);
    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired);
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return new Response(JSON.stringify({ sent, total: results.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
