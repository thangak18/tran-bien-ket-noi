import React from 'react';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, helperText, id, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-[var(--color-text)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-2xl border bg-[var(--color-surface)] px-3.5 py-2.5 text-[var(--fs-body)] text-[var(--color-text)] shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 min-h-[var(--tap)] ${
            error
              ? 'border-red-400 focus-visible:ring-red-500'
              : 'border-[var(--color-border)] focus-visible:border-primary focus-visible:ring-primary'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
        {helperText && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{helperText}</p>}
      </div>
    );
  }
);

TextField.displayName = 'TextField';
