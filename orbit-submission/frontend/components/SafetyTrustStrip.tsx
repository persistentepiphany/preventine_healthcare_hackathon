'use client';

import { Check } from 'lucide-react';
import { safetyStrip } from '@/lib/copy';

export default function SafetyTrustStrip() {
  return (
    <div className="py-8 px-4 border-y border-border bg-surface/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {safetyStrip.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-success/10 border border-success/30 flex items-center justify-center">
                <Check className="w-3 h-3 text-success" />
              </div>
              <span className="text-sm text-text-secondary font-medium">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}