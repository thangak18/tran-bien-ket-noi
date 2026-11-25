import React from 'react';

export interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  selected = false,
  onClick,
  className = '',
  disabled = false,
}) => {
  return (
    <button
      type="button"
      role="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected
          ? 'border-2 border-primary bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold shadow-xs'
          : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {icon && <span className="inline-flex items-center text-current">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
