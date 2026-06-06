'use client';

import { MattePanel } from '@/components/ui/matte-panel';

export default function CareJourneyDiagram() {
  return (
    <MattePanel className="p-6 md:p-8">
      <svg
        className="w-full h-auto"
        viewBox="0 0 800 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Care journey process: Basic information → Safety check → Missing information → Possible route → Conversation summary"
      >
        {/* Connection line */}
        <line x1="80" y1="100" x2="720" y2="100" stroke="rgba(0, 169, 206, 0.3)" strokeWidth="2" strokeDasharray="8 8" />

        {/* Step 1: Basic info */}
        <g>
          <circle cx="80" cy="100" r="28" fill="rgba(0, 94, 184, 0.1)" stroke="#005EB8" strokeWidth="2" />
          {/* Person icon */}
          <circle cx="80" cy="92" r="6" fill="#005EB8" />
          <path d="M70 110 Q80 100 90 110" stroke="#005EB8" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Number badge */}
          <circle cx="100" cy="76" r="10" fill="#005EB8" />
          <text x="100" y="80" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">1</text>
          <text x="80" y="145" textAnchor="middle" fill="#94A3B8" fontSize="12" fontWeight="500">Basic information</text>
        </g>

        {/* Arrow 1 */}
        <path d="M 120 95 L 130 100 L 120 105" stroke="#005EB8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Step 2: Safety check */}
        <g>
          <circle cx="200" cy="100" r="28" fill="rgba(0, 169, 206, 0.1)" stroke="#00A9CE" strokeWidth="2" />
          {/* Shield icon */}
          <path d="M190 88 L200 84 L210 88 V98 C210 106 200 114 200 114 C200 114 190 106 190 98 V88Z" stroke="#00A9CE" strokeWidth="2" fill="none" />
          {/* Number badge */}
          <circle cx="220" cy="76" r="10" fill="#00A9CE" />
          <text x="220" y="80" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">2</text>
          <text x="200" y="145" textAnchor="middle" fill="#94A3B8" fontSize="12" fontWeight="500">Safety check</text>
        </g>

        {/* Arrow 2 */}
        <path d="M 240 95 L 250 100 L 240 105" stroke="#005EB8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Step 3: Missing information */}
        <g>
          <circle cx="320" cy="100" r="28" fill="rgba(255, 176, 32, 0.1)" stroke="#FFB020" strokeWidth="2" />
          {/* Document with ? */}
          <rect x="310" y="86" width="20" height="26" rx="2" stroke="#FFB020" strokeWidth="2" fill="none" />
          <text x="320" y="103" textAnchor="middle" fill="#FFB020" fontSize="14" fontWeight="600">?</text>
          {/* Number badge */}
          <circle cx="340" cy="76" r="10" fill="#FFB020" />
          <text x="340" y="80" textAnchor="middle" fill="#0A0E14" fontSize="11" fontWeight="600">3</text>
          <text x="320" y="145" textAnchor="middle" fill="#94A3B8" fontSize="12" fontWeight="500">Missing info</text>
        </g>

        {/* Arrow 3 */}
        <path d="M 360 95 L 370 100 L 360 105" stroke="#005EB8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Step 4: Possible route */}
        <g>
          <circle cx="440" cy="100" r="28" fill="rgba(0, 169, 206, 0.1)" stroke="#00A9CE" strokeWidth="2" />
          {/* Location/Route icon */}
          <path d="M440 88C434 88 430 92 430 98C430 106 440 114 440 114C440 114 450 106 450 98C450 92 446 88 440 88Z" stroke="#00A9CE" strokeWidth="2" fill="none" />
          <circle cx="440" cy="96" r="3" fill="#00A9CE" />
          {/* Number badge */}
          <circle cx="460" cy="76" r="10" fill="#00A9CE" />
          <text x="460" y="80" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">4</text>
          <text x="440" y="145" textAnchor="middle" fill="#94A3B8" fontSize="12" fontWeight="500">Possible route</text>
        </g>

        {/* Arrow 4 */}
        <path d="M 480 95 L 490 100 L 480 105" stroke="#005EB8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Step 5: Conversation summary */}
        <g>
          <circle cx="560" cy="100" r="28" fill="rgba(0, 212, 255, 0.1)" stroke="#00D4FF" strokeWidth="2" />
          {/* Chat/document icon */}
          <rect x="550" y="88" width="20" height="24" rx="2" stroke="#00D4FF" strokeWidth="2" fill="none" />
          <line x1="554" y1="94" x2="566" y2="94" stroke="#00D4FF" strokeWidth="1.5" />
          <line x1="554" y1="100" x2="562" y2="100" stroke="#00D4FF" strokeWidth="1.5" />
          {/* Number badge */}
          <circle cx="580" cy="76" r="10" fill="#00D4FF" />
          <text x="580" y="80" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">5</text>
          <text x="560" y="145" textAnchor="middle" fill="#94A3B8" fontSize="12" fontWeight="500">Conversation</text>
        </g>
      </svg>

      {/* Disclaimer */}
      <p className="mt-6 text-center text-xs text-text-muted">
        This is a prototype. Not medical advice. Speak to a healthcare professional about your health.
      </p>
    </MattePanel>
  );
}