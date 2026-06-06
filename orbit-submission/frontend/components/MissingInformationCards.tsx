'use client';

import { MattePanel } from '@/components/ui/matte-panel';

interface InformationCard {
  name: string;
  icon: string;
  reason: string;
  missing: boolean;
}

const informationCards: InformationCard[] = [
  {
    name: 'Blood pressure',
    icon: 'bp',
    reason: 'Discuss whether you need a recent check',
    missing: true,
  },
  {
    name: 'Cholesterol/HDL ratio',
    icon: 'cholesterol',
    reason: 'Ask if this may be useful to know',
    missing: true,
  },
  {
    name: 'BMI or waist measurement',
    icon: 'bmi',
    reason: 'May inform prevention conversations',
    missing: false,
  },
  {
    name: 'Smoking status',
    icon: 'smoking',
    reason: 'Helps understand prevention options',
    missing: false,
  },
  {
    name: 'Family history',
    icon: 'history',
    reason: 'Discuss patterns with your healthcare professional',
    missing: true,
  },
];

// SVG icons for each card type
const icons = {
  bp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  cholesterol: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M12 2.69l5.74 5.88-5.74 5.88-5.74-5.88z" />
      <path d="M12 22a5 5 0 0 0 5-5v-3a5 5 0 0 0-10 0v3a5 5 0 0 0 5 5z" />
    </svg>
  ),
  bmi: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="8" x2="2" y2="22" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="17.5" y1="15" x2="9" y2="15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  smoking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M17 18.5a9 9 0 0 0 6-2.5 12 12 0 0 0-3-8 4 4 0 0 0-3 0" />
      <path d="M13 14.5V9a2 2 0 0 0-4 0v1" />
      <path d="M13 14.5V16a2 2 0 0 1-4 0v-1.5" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function MissingInformationCards() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {informationCards.map((card) => (
          <MattePanel
            key={card.name}
            variant={card.missing ? 'border-warning' : 'default'}
            className="p-5 cursor-pointer hover:border-border-hover transition-colors duration-200"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                card.missing
                  ? 'bg-warning/10 border border-warning/20'
                  : 'bg-surface/50 border border-border/30'
              }`}>
                <span className={card.missing ? 'text-warning' : 'text-text-secondary'}>
                  {icons[card.icon as keyof typeof icons]}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-text-primary">{card.name}</p>
                  {card.missing && (
                    <div className="w-2 h-2 rounded-full bg-warning" />
                  )}
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {card.reason}
                </p>
              </div>
            </div>
          </MattePanel>
        ))}
      </div>

      {/* Note */}
      <p className="mt-6 text-center text-xs text-text-muted max-w-lg mx-auto">
        This information may help prepare for a conversation. It does not indicate any diagnosis or risk level.
      </p>
    </div>
  );
}