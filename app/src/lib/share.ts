export interface ShareOptions {
  title?: string;
  text?: string;
  url: string;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Xây dựng URL theo dõi phản ánh có secretCode (spec AC-C04-11, AC-C06-11, UT-039)
 */
export function buildTrackingUrl(reportId: string, secretCode?: string, origin?: string): string {
  const base =
    origin || (typeof window !== 'undefined' ? window.location.origin : 'https://tranbien.vn');
  return secretCode
    ? `${base}/phan-anh/${reportId}?k=${secretCode}`
    : `${base}/phan-anh/${reportId}`;
}

/**
 * Chia sẻ qua Web Share API hoặc copy link vào clipboard (spec AC-C04-11, UT-039)
 */
export async function shareOrCopy(options: ShareOptions): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return 'shared';
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(options.url);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
