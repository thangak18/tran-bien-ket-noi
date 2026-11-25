import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center md:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel (Bottom sheet on Mobile, Centered Dialog on Tablet/PC) */}
      <div
        className={`relative z-10 flex max-h-[90vh] w-full max-w-[460px] md:max-w-[540px] flex-col rounded-t-[24px] md:rounded-3xl border-t md:border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl animate-sheet-up ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle (Mobile only) */}
        <div
          data-testid="drag-handle"
          className="md:hidden mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600"
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="font-semibold text-[var(--color-text)] text-[var(--fs-title)]">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-10 w-10 min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>

        {/* Sticky footer */}
        {footer && (
          <div className="sticky bottom-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
