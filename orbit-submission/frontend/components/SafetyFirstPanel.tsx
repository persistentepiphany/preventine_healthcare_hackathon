'use client';

import { MattePanel } from '@/components/ui/matte-panel';

export default function SafetyFirstPanel() {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-nhs-cyan/10 border border-nhs-cyan/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-nhs-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Urgent symptoms first</h3>
          <p className="text-xs text-text-muted">Safety before routine prevention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* No urgent signs path */}
        <MattePanel variant="border-success" className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary mb-2">
                No urgent warning signs
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                Continue to prevention preparation. Review what information may be missing and explore possible NHS routes.
              </p>
            </div>
          </div>
        </MattePanel>

        {/* Urgent signs path */}
        <MattePanel variant="border-warning" className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
                <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary mb-2">
                Urgent or emergency signs
              </p>
              <p className="text-xs text-text-secondary leading-relaxed mb-3">
                Routine prevention pauses. You may be signposted to:
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-error/10 border border-error/20">
                  <svg className="w-3 h-3 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span className="text-[10px] font-medium text-error">999</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-warning/10 border border-warning/20">
                  <svg className="w-3 h-3 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span className="text-[10px] font-medium text-warning">NHS 111</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-warning/10 border border-warning/20">
                  <svg className="w-3 h-3 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-2.77 2.77-2.77-2.77a5.4 5.4 0 0 0-7.65 0c-2.11 2.11-2.11 5.53 0 7.64l2.77 2.77 7.65 7.65 7.65-7.65 2.77-2.77c2.11-2.11 2.11-5.53 0-7.64z" />
                  </svg>
                  <span className="text-[10px] font-medium text-warning">Urgent care</span>
                </div>
              </div>
            </div>
          </div>
        </MattePanel>
      </div>

      {/* Two-lane diagram */}
      <div className="mt-6">
        <MattePanel variant="default" className="p-5">
          <svg
            className="w-full h-auto"
            viewBox="0 0 500 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Two-lane diagram: Routine prevention path and Urgent help path"
          >
            {/* Divider line */}
            <line x1="250" y1="20" x2="250" y2="120" stroke="rgba(148, 163, 184, 0.3)" strokeWidth="2" strokeDasharray="4 4" />

            {/* Left: Routine path */}
            <g>
              <text x="125" y="35" textAnchor="middle" fill="#00D4FF" fontSize="12" fontWeight="600">Routine prevention</text>
              <rect x="30" y="50" width="80" height="40" rx="6" fill="rgba(0, 212, 255, 0.1)" stroke="#00D4FF" strokeWidth="1.5" />
              <text x="70" y="70" textAnchor="middle" fill="#94A3B8" fontSize="10">Safety OK</text>
              <text x="70" y="82" textAnchor="middle" fill="#94A3B8" fontSize="10">→ Continue</text>
              <path d="M 115 70 L 150 70" stroke="#00D4FF" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-green)" />
              <rect x="155" y="50" width="90" height="40" rx="6" fill="rgba(0, 169, 206, 0.1)" stroke="#00A9CE" strokeWidth="1.5" />
              <text x="200" y="70" textAnchor="middle" fill="#94A3B8" fontSize="10">Prepare for</text>
              <text x="200" y="82" textAnchor="middle" fill="#94A3B8" fontSize="10">conversation</text>
            </g>

            {/* Right: Urgent path */}
            <g>
              <text x="375" y="35" textAnchor="middle" fill="#DC2626" fontSize="12" fontWeight="600">Urgent help</text>
              <rect x="290" y="50" width="80" height="40" rx="6" fill="rgba(220, 38, 38, 0.1)" stroke="#DC2626" strokeWidth="1.5" />
              <text x="330" y="70" textAnchor="middle" fill="#94A3B8" fontSize="10">Urgent signs</text>
              <text x="330" y="82" textAnchor="middle" fill="#94A3B8" fontSize="10">detected</text>
              <path d="M 375 70 L 410 70" stroke="#DC2626" strokeWidth="1.5" fill="none" />
              <rect x="415" y="50" width="70" height="40" rx="6" fill="rgba(255, 176, 32, 0.1)" stroke="#FFB020" strokeWidth="1.5" />
              <text x="450" y="70" textAnchor="middle" fill="#94A3B8" fontSize="10">999 /</text>
              <text x="450" y="82" textAnchor="middle" fill="#94A3B8" fontSize="10">NHS 111</text>
            </g>

            {/* Arrow marker definition */}
            <defs>
              <marker id="arrow-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#00D4FF" />
              </marker>
            </defs>
          </svg>
        </MattePanel>
      </div>

      {/* Safety note */}
      <div className="mt-6 p-4 rounded-lg bg-surface/30 border border-border/30 flex items-start gap-2">
        <svg className="w-4 h-4 text-nhs-cyan flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <p className="text-xs text-text-secondary">
          If you have chest pain, difficulty breathing, severe bleeding, or signs of stroke — call 999 immediately.
        </p>
      </div>
    </div>
  );
}