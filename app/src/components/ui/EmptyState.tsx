import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-[var(--color-surface-elevated)]/60 border border-dashed border-[var(--color-border)] ${className}`}
    >
      <div className="mb-3 text-[var(--color-text-muted)] [&>svg]:h-12 [&>svg]:w-12">{icon}</div>
      <h4 className="text-base font-semibold text-[var(--color-text)]">{title}</h4>
      <p className="mt-1 text-sm text-[var(--color-text-muted)] max-w-xs">{description}</p>
      {actionText && onAction && (
        <div className="mt-4">
          <Button variant="primary" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
