'use client';

import { ReactNode } from 'react';

interface MattePanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'border-nhs' | 'border-warning' | 'border-success';
}

const variants = {
  default: 'border-border/50 bg-surface/40',
  'border-nhs': 'border-nhs-cyan/30 bg-surface/40',
  'border-warning': 'border-warning/30 bg-warning/5',
  'border-success': 'border-success/30 bg-success/5',
};

export function MattePanel({
  children,
  className = '',
  variant = 'default',
}: MattePanelProps) {
  return (
    <div
      className={`relative rounded-xl border ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
}