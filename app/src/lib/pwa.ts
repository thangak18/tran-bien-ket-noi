export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const OFFLINE_QUEUE_KEY = 'tbkn:offline-queue';

export interface OfflineQueuedSubmission {
  id: string;
  createdAt: string;
  category: string;
  title?: string;
  description?: string;
  address: string;
}

export function registerPwaServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (navigator.userAgent.includes('jsdom')) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Bỏ qua nếu môi trường dev không hỗ trợ SW
    });
  });
}

export function getOfflineQueue(): OfflineQueuedSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as OfflineQueuedSubmission[]) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineSubmission(
  item: Omit<OfflineQueuedSubmission, 'id' | 'createdAt'>
): OfflineQueuedSubmission {
  const entry: OfflineQueuedSubmission = {
    id: `OFF-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    ...item,
  };
  if (typeof window !== 'undefined') {
    const current = getOfflineQueue();
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([...current, entry]));
  }
  return entry;
}

export function clearOfflineQueue(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(OFFLINE_QUEUE_KEY);
}
