import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  className = '',
}) => {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-primary" />,
  };

  const borderStyles: Record<ToastType, string> = {
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/85 dark:text-emerald-100',
    warning:
      'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/85 dark:text-amber-100',
    error:
      'border-red-200 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/85 dark:text-red-100',
    info: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/85 dark:text-sky-100',
  };

  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-md ${borderStyles[type]} ${className}`}
    >
      <span className="flex-shrink-0">{icons[type]}</span>
      <span className="flex-1 text-sm font-medium">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="rounded-full p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
