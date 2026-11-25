import { useEffect, useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { BeforeInstallPromptEvent } from '@/lib/pwa';

const DISMISS_KEY = 'tbkn:pwa-install-dismissed';

export function PwaStatusBanner() {
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine === false : false
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    }
  };

  if (!isOffline && (!installPrompt || dismissed)) {
    return null;
  }

  return (
    <div className="fixed top-2 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 space-y-2 print:hidden">
      {isOffline && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-900 shadow-lg dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-100"
        >
          <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Đang ngoại tuyến — bản nháp vẫn được lưu an toàn trên thiết bị.</span>
        </div>
      )}

      {!isOffline && installPrompt && !dismissed && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-white px-3.5 py-2.5 text-xs shadow-lg dark:border-sky-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 min-w-0">
            <Download className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <span className="truncate font-bold text-slate-800 dark:text-slate-100">
              Cài Trấn Biên Kết Nối lên màn hình chính
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="rounded-lg bg-[#0084E8] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#006EC4]"
            >
              Cài ngay
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Đóng gợi ý cài ứng dụng"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
