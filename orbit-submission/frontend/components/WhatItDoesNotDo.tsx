'use client';

const items = [
  { label: 'Does not diagnose', icon: 'stethoscope' },
  { label: 'Does not prescribe', icon: 'pill' },
  { label: 'Does not calculate QRISK', icon: 'calculator' },
  { label: 'Does not book appointments', icon: 'calendar' },
  { label: 'Does not replace NHS advice', icon: 'alert' },
];

const icons = {
  stethoscope: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
      <path d="M4.8 2.3A.3.3 0 0 0 5 2h14a.3.3 0 0 0 .2.3l-3.7 5.6a2 2 0 0 1-1.7 1H9.2a2 2 0 0 1-1.7-1L3.8 2.3z" />
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  pill: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
      <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calculator: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="14" />
      <line x1="8" y1="14" x2="8" y2="14" />
      <line x1="12" y1="14" x2="12" y2="14" />
      <line x1="16" y1="18" x2="16" y2="18" />
      <line x1="8" y1="18" x2="8" y2="18" />
      <line x1="12" y1="18" x2="12" y2="18" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

export default function WhatItDoesNotDo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 text-text-muted px-3 py-2 rounded-lg bg-surface/30 border border-border/30"
        >
          <span className="text-text-muted">
            {icons[item.icon as keyof typeof icons]}
          </span>
          <span className="text-xs font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}