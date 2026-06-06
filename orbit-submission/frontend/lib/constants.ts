/**
 * Design System Constants for PreventPath
 * Dark mode inspired by Linear, NHS-aligned colors
 */

// Color Palette
export const colors = {
  background: '#0A0E14',
  surface: '#11161D',
  surfaceHover: '#161B24',
  border: '#1E2530',
  borderHover: '#2A3544',

  // NHS-inspired Primary
  primary: '#005EB8',
  primaryHover: '#004A94',
  primaryGlow: 'rgba(0, 94, 184, 0.15)',

  // Status Colors
  success: '#00D4FF',
  successGlow: 'rgba(0, 212, 255, 0.15)',
  warning: '#FFB020',
  warningGlow: 'rgba(255, 176, 32, 0.15)',
  error: '#DC2626',
  errorGlow: 'rgba(220, 38, 38, 0.15)',

  // Text Colors
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',
} as const;

// Typography Scale
export const typography = {
  font: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
    '4xl': '64px',
  },
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// Spacing Scale
export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const;

// Border Radius
export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
} as const;

// Transitions
export const transitions = {
  duration: {
    fast: 150,
    base: 200,
    slow: 300,
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
  },
} as const;

// Z-index Scale
export const zIndex = {
  dropdown: 10,
  sticky: 20,
  navbar: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
} as const;

// Breakpoints (for reference, Tailwind handles these)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Container widths
export const containers = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Animation durations
export const animations = {
  fast: 150,
  base: 300,
  slow: 500,
  routePulse: 2000,
} as const;

// Utility: Get CSS variable name
export const cssVar = (name: keyof typeof colors) => `var(--${camelToKebab(name)})`;

function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// Type exports
export type Color = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;