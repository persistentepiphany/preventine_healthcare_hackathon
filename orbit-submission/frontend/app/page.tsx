import LandingNavbar from '@/components/LandingNavbar';
import HeroSection from '@/components/HeroSection';
import CareJourneyDiagram from '@/components/CareJourneyDiagram';
import WhatItDoesNotDo from '@/components/WhatItDoesNotDo';
import SafetyFirstPanel from '@/components/SafetyFirstPanel';
import MissingInformationCards from '@/components/MissingInformationCards';
import PossibleRoutesSection from '@/components/PossibleRoutesSection';
import NhsConversationPreview from '@/components/NhsConversationPreview';
import FinalCTASection from '@/components/FinalCTASection';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main className="pt-20">
        <HeroSection />

        {/* What it does not do - compact row */}
        <div className="py-6 px-4 border-y border-border bg-surface/20">
          <div className="max-w-7xl mx-auto">
            <WhatItDoesNotDo />
          </div>
        </div>

        {/* Care journey diagram */}
        <section className="py-16 px-4" id="how-it-works">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight mb-2">
                How it works
              </h2>
              <p className="text-sm text-text-secondary max-w-lg mx-auto">
                A simple process to help you prepare for a prevention conversation.
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <CareJourneyDiagram />
            </div>
          </div>
        </section>

        {/* Safety first panel */}
        <section className="py-16 px-4 bg-surface/30" id="safety">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight mb-2">
                Safety first
              </h2>
              <p className="text-sm text-text-secondary max-w-lg mx-auto">
                Urgent symptoms always come before routine prevention.
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <SafetyFirstPanel />
            </div>
          </div>
        </section>

        {/* Missing information cards */}
        <section className="py-16 px-4" id="prepare">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight mb-2">
                What you can prepare
              </h2>
              <p className="text-sm text-text-secondary max-w-lg mx-auto">
                Information that may help you have a useful conversation.
              </p>
            </div>
            <div className="max-w-5xl mx-auto">
              <MissingInformationCards />
            </div>
          </div>
        </section>

        {/* Possible routes section */}
        <section className="py-16 px-4 bg-surface/30" id="routes">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight mb-2">
                Possible routes
              </h2>
              <p className="text-sm text-text-secondary max-w-lg mx-auto">
                NHS services you might consider asking about.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <PossibleRoutesSection />
            </div>
          </div>
        </section>

        {/* Conversation preview */}
        <section className="py-16 px-4" id="demo">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight mb-2">
                Conversation starter
              </h2>
              <p className="text-sm text-text-secondary max-w-lg mx-auto">
                Prepare a short summary for your GP, pharmacist, or NHS service.
              </p>
            </div>
            <div className="max-w-2xl mx-auto">
              <NhsConversationPreview />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <FinalCTASection />
      </main>
    </div>
  );
}