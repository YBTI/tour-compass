import { supabase } from './supabaseClient';

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

// Base64URL の VAPID 公開鍵を Uint8Array に変換
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const isPushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!vapidPublicKey;

// 通知許可を取り、Push購読を作成して DB に保存する
export const subscribePush = async (userId: string, groupId: string) => {
  if (!isPushSupported()) return;

  const permission =
    Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!)
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: subscription.endpoint,
      user_id: userId,
      group_id: groupId,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth
    },
    { onConflict: 'endpoint' }
  );
  if (error) console.error('Error saving push subscription:', error);
};

// 指定メンバーに応援 Push 通知を送る (Edge Function 経由)
export const sendCheerPush = async (groupId: string, fromName: string, toIds: string[]) => {
  const { error } = await supabase.functions.invoke('send-cheer', {
    body: { groupId, fromName, toIds }
  });
  if (error) console.error('Error sending cheer push:', error);
};
