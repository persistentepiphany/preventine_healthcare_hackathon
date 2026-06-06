'use client';

import { ReactNode } from 'react';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className = '' }: BentoGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {children}
    </div>
  );
}

interface BentoItemProps {
  children: ReactNode;
  className?: string;
  span?: 1 | 2;
}

export function BentoItem({ children, className = '', span = 1 }: BentoItemProps) {
  const spanStyles = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
  };

  return (
    <div className={`${spanStyles[span]} ${className}`}>
      {children}
    </div>
  );
}