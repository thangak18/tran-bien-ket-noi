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
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-gray-50/50 border border-dashed border-gray-200 ${className}`}
    >
      <div className="mb-3 text-gray-400 [&>svg]:h-12 [&>svg]:w-12">{icon}</div>
      <h4 className="text-base font-semibold text-gray-900">{title}</h4>
      <p className="mt-1 text-sm text-gray-500 max-w-xs">{description}</p>
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
