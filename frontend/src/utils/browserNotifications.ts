/**
 * Browser / PWA notifications (Notifications API + Service Worker).
 * True background Web Push (app closed) also needs VAPID keys on the server.
 */

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

export async function showAppNotification(options: {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
}): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;

  const payload: NotificationOptions = {
    body: options.body,
    tag: options.tag || 'agency-os-alert',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: options.data,
  };

  try {
    const reg = await navigator.serviceWorker?.ready.catch(() => null);
    if (reg?.showNotification) {
      await reg.showNotification(options.title, payload);
      return true;
    }
  } catch {
    /* fall through to page Notification */
  }

  try {
    // eslint-disable-next-line no-new
    new Notification(options.title, payload);
    return true;
  } catch {
    return false;
  }
}

export async function notifyUnreadAlerts(alerts: {
  id: string;
  title: string;
  body: string;
}[]): Promise<void> {
  if (!alerts.length) return;
  if (getNotificationPermission() !== 'granted') return;

  // One summary if many; otherwise individual
  if (alerts.length > 3) {
    await showAppNotification({
      title: 'AgencyOS',
      body: `${alerts.length} new alerts`,
      tag: 'agency-os-alert-summary',
      data: { count: alerts.length },
    });
    return;
  }

  for (const a of alerts) {
    await showAppNotification({
      title: a.title,
      body: a.body,
      tag: a.id,
      data: { alertId: a.id },
    });
  }
}
