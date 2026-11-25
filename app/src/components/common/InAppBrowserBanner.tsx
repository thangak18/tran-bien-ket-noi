import { useState } from 'react';
import { Check, Copy, ExternalLink, X } from 'lucide-react';

export function detectInAppBrowser(userAgent: string): string | null {
  if (/Zalo/i.test(userAgent)) return 'Zalo';
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return 'Facebook';
  if (/Instagram/i.test(userAgent)) return 'Instagram';
  if (/Line\//i.test(userAgent)) return 'LINE';
  return null;
}

export function InAppBrowserBanner() {
  const appName = typeof navigator !== 'undefined' ? detectInAppBrowser(navigator.userAgent) : null;
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!appName || dismissed) return null;

  const handleCopyUrl = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Bỏ qua nếu WebView chặn clipboard
    }
  };

  return (
    <div
      role="status"
      data-testid="inapp-browser-banner"
      className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 shadow-lg dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-100 print:hidden"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-bold">Bạn đang mở từ trình duyệt trong {appName}</p>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
              Hãy bấm menu <strong>⋯ → Mở bằng trình duyệt</strong> (Chrome/Safari) để GPS, Camera
              và cài ứng dụng hoạt động ổn định.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Đóng thông báo trình duyệt"
          className="rounded-lg p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => void handleCopyUrl()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-700"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Đã sao chép link' : 'Sao chép link'}
        </button>
      </div>
    </div>
  );
}
