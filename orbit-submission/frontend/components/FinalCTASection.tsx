'use client';

import { ArrowRight, Shield } from 'lucide-react';
import { ShimmerButton } from '@/components/ui/shimmer-button';

export default function FinalCTASection() {
  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface/50 to-background pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-nhs-cyan/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-2xl mx-auto text-center relative">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-nhs-cyan/10 border border-nhs-cyan/30 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-nhs-cyan" />
        </div>

        <h2 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight mb-3">
          See what prevention may be missing
        </h2>

        <p className="text-sm text-text-secondary mb-6 max-w-lg mx-auto">
          Start the demo to explore possible routes and prepare for a conversation with your GP or pharmacist.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="#demo">
            <ShimmerButton variant="primary">
              Start demo
              <ArrowRight className="w-4 h-4" />
            </ShimmerButton>
          </a>
        </div>

        <p className="mt-4 text-xs text-text-muted">
          This is a prototype, not medical advice. If you are concerned about your health, speak to a healthcare professional.
        </p>
      </div>
    </section>
  );
}