'use client';

import { ArrowRight, HeartPulse } from 'lucide-react';
import { MattePanel } from '@/components/ui/matte-panel';

export default function HeroSection() {
  return (
    <section className="relative pt-28 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-nhs-cyan/10 border border-nhs-cyan/30 mb-6">
            <svg className="w-3.5 h-3.5 text-nhs-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-xs text-nhs-cyan font-medium">
              Prevention navigator prototype
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-text-primary tracking-tight mb-4 leading-tight">
            Prepare for a prevention<br />
            conversation, safely.
          </h1>

          {/* Subheadline */}
          <p className="text-base md:text-lg text-text-secondary mb-6 leading-relaxed max-w-xl mx-auto">
            PreventPath helps you see what information may be missing before speaking with a GP, pharmacist, or NHS service.
          </p>

          {/* Safety line */}
          <p className="text-sm text-text-muted mb-8">
            No diagnosis. No prescribing. No QRISK score calculated.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#demo"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-nhs-cyan hover:bg-nhs-cyan/90 text-white font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-nhs-cyan focus:ring-offset-2 focus:ring-offset-background"
            >
              Start demo
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:border-nhs-cyan/50 text-text-primary bg-surface/40 hover:bg-surface/60 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-nhs-cyan focus:ring-offset-2 focus:ring-offset-background"
            >
              <HeartPulse className="w-4 h-4" />
              How it works
            </a>
          </div>
        </div>

        {/* Healthcare SVG visual - simple matte diagram */}
        <div className="mt-12 max-w-2xl mx-auto">
          <MattePanel className="p-6">
            <svg
              className="w-full h-auto"
              viewBox="0 0 400 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Simple journey diagram: Start, Safety check, Missing information, Possible routes, Conversation starter"
            >
              {/* Connection line */}
              <line
                x1="50" y1="100"
                x2="350" y2="100"
                stroke="rgba(0, 169, 206, 0.3)"
                strokeWidth="2"
                strokeDasharray="8 8"
              />

              {/* Node 1: Start */}
              <g>
                <circle cx="50" cy="100" r="24" fill="rgba(0, 94, 184, 0.1)" stroke="#005EB8" strokeWidth="2" />
                <circle cx="50" cy="95" r="4" fill="#005EB8" />
                <circle cx="42" cy="102" r="3" fill="#005EB8" />
                <circle cx="58" cy="102" r="3" fill="#005EB8" />
                <text x="50" y="140" textAnchor="middle" fill="#E2E8F0" fontSize="13" fontWeight="500">Tell basic info</text>
              </g>

              {/* Arrow 1 */}
              <path d="M 85 95 L 95 100 L 85 105" stroke="#005EB8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

              {/* Node 2: Safety */}
              <g>
                <circle cx="125" cy="100" r="24" fill="rgba(0, 169, 206, 0.1)" stroke="#00A9CE" strokeWidth="2" />
                <path d="M115 95L123 103L135 91" stroke="#00A9CE" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <text x="125" y="140" textAnchor="middle" fill="#E2E8F0" fontSize="13" fontWeight="500">Safety check</text>
              </g>

              {/* Arrow 2 */}
              <path d="M 160 95 L 170 100 L 160 105" stroke="#005EB8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

              {/* Node 3: Missing */}
              <g>
                <circle cx="200" cy="100" r="24" fill="rgba(255, 176, 32, 0.1)" stroke="#FFB020" strokeWidth="2" />
                <text x="200" y="106" textAnchor="middle" fill="#FFB020" fontSize="18" fontWeight="600">?</text>
                <text x="200" y="140" textAnchor="middle" fill="#E2E8F0" fontSize="13" fontWeight="500">What&apos;s missing</text>
              </g>

              {/* Arrow 3 */}
              <path d="M 235 95 L 245 100 L 235 105" stroke="#005EB8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

              {/* Node 4: Routes */}
              <g>
                <circle cx="275" cy="100" r="24" fill="rgba(0, 169, 206, 0.1)" stroke="#00A9CE" strokeWidth="2" />
                <path d="M268 100L272 94L282 94L286 100L282 106L272 106Z" stroke="#00A9CE" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <text x="275" y="140" textAnchor="middle" fill="#E2E8F0" fontSize="13" fontWeight="500">Possible routes</text>
              </g>

              {/* Arrow 4 */}
              <path d="M 310 95 L 320 100 L 310 105" stroke="#005EB8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

              {/* Node 5: Summary */}
              <g>
                <circle cx="350" cy="100" r="24" fill="rgba(0, 212, 255, 0.1)" stroke="#00D4FF" strokeWidth="2" />
                <rect x="338" y="90" width="24" height="18" rx="2" stroke="#00D4FF" strokeWidth="2" fill="none" />
                <line x1="342" y1="96" x2="358" y2="96" stroke="#00D4FF" strokeWidth="1.5" />
                <line x1="342" y1="102" x2="352" y2="102" stroke="#00D4FF" strokeWidth="1.5" />
                <text x="350" y="140" textAnchor="middle" fill="#E2E8F0" fontSize="13" fontWeight="500">Conversation</text>
              </g>
            </svg>
          </MattePanel>
        </div>
      </div>
    </section>
  );
}