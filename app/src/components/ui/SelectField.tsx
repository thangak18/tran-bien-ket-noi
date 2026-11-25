import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectFieldProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md';
  wrapperClassName?: string;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ size = 'md', wrapperClassName = '', className = '', children, ...props }, ref) => {
    const sizeClasses =
      size === 'sm'
        ? 'h-9 rounded-xl pl-3 pr-8 text-xs font-semibold'
        : 'h-10 min-h-[var(--tap)] rounded-xl pl-3.5 pr-9 text-sm font-medium';

    return (
      <div className={`relative inline-flex w-full items-center ${wrapperClassName}`}>
        <select
          ref={ref}
          className={`w-full appearance-none border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xs transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses} ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className={`pointer-events-none absolute text-[var(--color-text-muted)] ${
            size === 'sm' ? 'right-2.5 h-3.5 w-3.5' : 'right-3 h-4 w-4'
          }`}
          aria-hidden="true"
        />
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
