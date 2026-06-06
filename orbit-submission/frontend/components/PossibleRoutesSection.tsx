'use client';

import { MattePanel } from '@/components/ui/matte-panel';
import { BentoGrid, BentoItem } from '@/components/ui/bento-grid';

interface RouteCard {
  icon: string;
  label: string;
  note: string;
  span?: 1 | 2;
}

const routeCards: RouteCard[] = [
  {
    icon: 'pharmacy',
    label: 'Pharmacy blood pressure check',
    note: 'May be useful to ask about',
    span: 1,
  },
  {
    icon: 'gp',
    label: 'GP prevention discussion',
    note: 'Possible route to explore',
    span: 2,
  },
  {
    icon: 'healthcheck',
    label: 'NHS Health Check enquiry',
    note: 'Check invitation status',
    span: 1,
  },
  {
    icon: 'screening',
    label: 'Screening programmes',
    note: 'Consider checking eligibility',
    span: 1,
  },
];

// SVG icons
const routeIcons = {
  pharmacy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M12 2v20M2 12h20M7 7l10 10M17 7L7 17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  gp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  healthcheck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  screening: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
};

export default function PossibleRoutesSection() {
  return (
    <div className="w-full">
      {/* Header note */}
      <p className="text-xs text-text-muted mb-4 text-center max-w-lg mx-auto">
        These are possible routes to explore. Whether they apply depends on your circumstances.
      </p>

      {/* Bento Grid */}
      <BentoGrid>
        {routeCards.map((route) => (
          <BentoItem key={route.label} span={route.span}>
            <MattePanel variant="border-nhs" className="h-full group cursor-pointer hover:border-nhs-cyan/50 transition-colors duration-200">
              <div className="p-5 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-nhs-cyan/10 border border-nhs-cyan/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-nhs-cyan">
                      {routeIcons[route.icon as keyof typeof routeIcons]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{route.label}</p>
                    <p className="text-[10px] text-text-muted">{route.note}</p>
                  </div>
                </div>
              </div>
            </MattePanel>
          </BentoItem>
        ))}
      </BentoGrid>

      {/* Caution note */}
      <div className="mt-6 p-4 rounded-lg bg-surface/30 border border-border/30">
        <p className="text-xs text-text-muted text-center leading-relaxed">
          PreventPath shows possible routes. It cannot confirm eligibility or make bookings.
          Your GP or healthcare professional can advise on what applies to you.
        </p>
      </div>
    </div>
  );
}