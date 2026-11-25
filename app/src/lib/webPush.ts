import { ApiRole, fetchVapidPublicKeyApi, subscribeWebPushApi } from './apiClient';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function enableWebPushNotifications(options: {
  role: ApiRole;
  phone?: string;
}): Promise<{ ok: boolean; mode: 'web-push' | 'browser-local' | 'denied' | 'unsupported' }> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return { ok: false, mode: 'unsupported' };
  }

  const permission =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, mode: 'denied' };
  }

  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapid = await fetchVapidPublicKeyApi();
      if (vapid?.configured && vapid.publicKey) {
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid.publicKey) as BufferSource,
        });
        const subJson = sub.toJSON();
        if (subJson.endpoint) {
          await subscribeWebPushApi({
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth,
            },
            role: options.role,
            phone: options.phone,
          });
          return { ok: true, mode: 'web-push' };
        }
      }
    } catch {
      // Fallback sang thông báo trình duyệt cục bộ
    }
  }

  return { ok: true, mode: 'browser-local' };
}

export function showLocalBrowserNotification(title: string, body: string, url = '/'): void {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        void reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          data: { url },
        });
      })
      .catch(() => {
        new Notification(title, { body });
      });
    return;
  }

  new Notification(title, { body });
}
