'use client';

import { ReactNode, useState } from 'react';

interface MagicCardProps {
  children: ReactNode;
  className?: string;
  gradient?: 'nhs-cyan' | 'success' | 'warning' | 'subtle';
}

const gradients = {
  'nhs-cyan': 'rgba(0, 169, 206, 0.1)',
  success: 'rgba(0, 212, 255, 0.1)',
  warning: 'rgba(255, 176, 32, 0.1)',
  subtle: 'rgba(0, 94, 184, 0.05)',
};

export default function MagicCard({
  children,
  className = '',
  gradient = 'subtle',
}: MagicCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      className={`relative rounded-xl border border-border/50 bg-surface/30 overflow-hidden transition-all duration-300 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Gradient spotlight effect */}
      {isHovering && (
        <div
          className="absolute inset-0 opacity-30 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(
              600px circle at ${mousePosition.x}px ${mousePosition.y}px,
              ${gradients[gradient]},
              transparent 40%
            )`,
          }}
        />
      )}

      {/* Subtle border glow on hover */}
      <div
        className={`absolute inset-0 rounded-xl border border-nhs-cyan/30 opacity-0 transition-opacity duration-300 ${
          isHovering ? 'opacity-100' : ''
        }`}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}