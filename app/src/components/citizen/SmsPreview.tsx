import React from 'react';
import { MessageSquare, ShieldCheck } from 'lucide-react';
import { MockLabel } from '@/components/common/MockLabel';

export interface SmsPreviewProps {
  phone: string;
  message: string;
  time?: string;
  sender?: string;
  showMockBadge?: boolean;
  className?: string;
}

export const SmsPreview: React.FC<SmsPreviewProps> = ({
  phone,
  message,
  time = 'Vừa xong',
  sender = 'UBND P. Tran Bien',
  showMockBadge = true,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm select-none ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--color-text)]">{sender}</div>
            <div className="text-[11px] text-[var(--color-text-muted)]">Gửi tới {phone}</div>
          </div>
        </div>
        {showMockBadge && <MockLabel />}
      </div>

      <div className="rounded-xl bg-[var(--color-surface-elevated)] p-3.5 text-xs text-[var(--color-text)] leading-relaxed font-mono whitespace-pre-wrap">
        {message}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Thông báo tiến độ
        </span>
        <span>{time}</span>
      </div>
    </div>
  );
};
