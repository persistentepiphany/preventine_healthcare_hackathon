'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
}

const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ children, className = '', variant = 'primary', ...props }, ref) => {
    const baseStyles =
      'relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 overflow-hidden group';

    const variantStyles = {
      primary:
        'bg-nhs-cyan hover:bg-nhs-cyan/90 text-white shadow-[0_0_20px_rgba(0,169,206,0.3)] hover:shadow-[0_0_30px_rgba(0,169,206,0.5)]',
      secondary:
        'border border-border hover:border-nhs-cyan/50 text-text-primary bg-surface/50 hover:bg-surface',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {/* Shimmer effect */}
        <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  },
);

ShimmerButton.displayName = 'ShimmerButton';

export { ShimmerButton };