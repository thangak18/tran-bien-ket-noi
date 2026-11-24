import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

// Icon-only buttons require an aria-label for accessibility (CT-030)
export type ButtonProps =
  | (BaseButtonProps & { children: React.ReactNode; 'aria-label'?: string })
  | (BaseButtonProps & { children?: never; 'aria-label': string });

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      icon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none';

    const variantStyles: Record<ButtonVariant, string> = {
      primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
      secondary: 'bg-primary-50 text-primary-dark hover:bg-primary-100',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'h-9 px-3 text-xs rounded-xl min-h-[36px]',
      md: 'h-[var(--btn-h)] min-h-[var(--btn-h)] px-4 text-[var(--fs-body)] rounded-2xl',
      lg: 'h-14 min-h-[56px] px-6 text-lg rounded-2xl',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
        ) : icon ? (
          <span className={children ? 'mr-2 inline-flex items-center' : 'inline-flex items-center'}>
            {icon}
          </span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
