import React, { useState } from 'react';
import { Notification } from '@/domain/types';
import { formatDateTime } from '@/domain/format';
import { Bell } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';

export interface NotificationBellProps {
  notifications: Notification[];
  onMarkRead?: () => void;
  onSelectNotification?: (notification: Notification) => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onMarkRead,
  onSelectNotification,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpen = () => {
    setIsOpen(true);
    if (unreadCount > 0 && onMarkRead) {
      onMarkRead();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Thông báo (${unreadCount} chưa đọc)`}
        className={`relative flex h-10 w-10 min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-full text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={
          <div className="flex items-center justify-between w-full pr-2">
            <span>Thông báo</span>
            {notifications.length > 0 && (
              <span className="text-xs font-normal text-[var(--color-text-muted)]">
                {notifications.length} tin
              </span>
            )}
          </div>
        }
      >
        <div className="divide-y divide-[var(--color-border)]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              Chưa có thông báo nào
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  onSelectNotification?.(n);
                  setIsOpen(false);
                }}
                className={`py-3 px-2 transition-colors hover:bg-[var(--color-surface-elevated)] rounded-xl cursor-pointer ${
                  !n.read ? 'bg-sky-50/50 dark:bg-sky-950/35' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-[var(--color-text)] leading-snug">
                    Hồ sơ {n.reportId}
                  </h4>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {n.message}
                </p>
                <div className="mt-1.5 text-[11px] text-[var(--color-text-muted)] opacity-80">
                  {formatDateTime(n.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </BottomSheet>
    </>
  );
};
