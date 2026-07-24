import { authHeaders } from './permissions';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function fetchVapidPublicKey(): Promise<{
  configured: boolean;
  publicKey: string;
}> {
  const res = await fetch('/api/push/vapid-public-key');
  if (!res.ok) return { configured: false, publicKey: '' };
  const data = (await res.json()) as { configured?: boolean; publicKey?: string };
  return {
    configured: Boolean(data.configured && data.publicKey),
    publicKey: data.publicKey || '',
  };
}

export async function subscribeWebPush(
  userId: string,
  registration: ServiceWorkerRegistration
): Promise<{ ok: boolean; reason?: string }> {
  const { configured, publicKey } = await fetchVapidPublicKey();
  if (!configured || !publicKey) {
    return { ok: false, reason: 'vapid_missing' };
  }
  if (!registration.pushManager) {
    return { ok: false, reason: 'push_unsupported' };
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, reason: 'invalid_subscription' };
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: authHeaders(userId),
    body: JSON.stringify({
      endpoint,
      keys: { p256dh, auth },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      ok: false,
      reason: typeof err.error === 'string' ? err.error : 'subscribe_failed',
    };
  }
  return { ok: true };
}

export async function sendTestWebPush(userId: string): Promise<boolean> {
  const res = await fetch('/api/push/test', {
    method: 'POST',
    headers: authHeaders(userId),
    body: '{}',
  });
  return res.ok;
}
