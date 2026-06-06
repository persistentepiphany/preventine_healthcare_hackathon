'use client';

import { Ban, Stethoscope, Pill, Calculator, Calendar, AlertCircle } from 'lucide-react';

const items = [
  { icon: Stethoscope, label: 'No diagnosis' },
  { icon: Pill, label: 'No prescribing' },
  { icon: Calculator, label: 'No QRISK score' },
  { icon: Calendar, label: 'No booking' },
  { icon: AlertCircle, label: 'No NHS advice replacement' },
];

export default function WhatWeDoNotDoStrip() {
  return (
    <div className="border-y border-border bg-surface/30 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {items.map((item, index) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-text-muted hover:text-text-secondary transition-colors duration-200"
            >
              <Ban className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
              {index < items.length - 1 && (
                <span className="text-border mx-1">/</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}