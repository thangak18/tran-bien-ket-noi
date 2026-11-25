import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

export interface TurnstileWidgetProps {
  onTokenChange: (token: string | null) => void;
  className?: string;
}

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';

export function TurnstileWidget({ onTokenChange, className = '' }: TurnstileWidgetProps) {
  const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || '';
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [devChecked, setDevChecked] = useState(false);
  const checkboxId = useId();

  useEffect(() => {
    if (!siteKey) return;

    const mountWidget = () => {
      if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'auto',
        callback: (token) => onTokenChange(token),
        'expired-callback': () => onTokenChange(null),
        'error-callback': () => onTokenChange(null),
      });
    };

    if (window.turnstile) {
      mountWidget();
    } else if (!document.getElementById(TURNSTILE_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = mountWidget;
      document.head.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onTokenChange]);

  if (siteKey) {
    return (
      <div className={className} data-testid="turnstile-widget">
        <div ref={containerRef} />
      </div>
    );
  }

  const handleToggleDev = () => {
    const next = !devChecked;
    setDevChecked(next);
    onTokenChange(next ? `dev-turnstile-${Date.now().toString(36)}` : null);
  };

  return (
    <div
      data-testid="turnstile-widget"
      className={`rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800/60 ${className}`}
    >
      <label
        htmlFor={checkboxId}
        className="flex cursor-pointer items-center justify-between gap-3"
      >
        <span className="flex items-center gap-2.5">
          <input
            id={checkboxId}
            type="checkbox"
            checked={devChecked}
            onChange={handleToggleDev}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Xác minh không phải robot (Turnstile)
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
          {devChecked ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Đã xác minh
            </>
          ) : (
            <>
              <ShieldCheck className="h-3 w-3 text-sky-500" />
              Chế độ thử nghiệm
            </>
          )}
        </span>
      </label>
    </div>
  );
}
