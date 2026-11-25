import { AlertTriangle } from 'lucide-react';

export interface ActionErrorProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}

/** Thông báo lỗi của một thao tác; có chữ "Lỗi" để không chỉ truyền đạt bằng màu. */
export function ActionError({ message, onDismiss, className = '' }: ActionErrorProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      data-testid="action-error"
      className={`flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">
        <span className="font-bold">Lỗi: </span>
        {message}
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng thông báo lỗi"
          className="shrink-0 rounded px-1 text-red-700 underline"
        >
          Đóng
        </button>
      )}
    </div>
  );
}
