'use client';

import { Shield, GitCommit } from 'lucide-react';

const footerLinks = {
  product: [
    { name: 'How it works', href: '#how-it-works', external: false as const },
    { name: 'Safety', href: '#safety', external: false as const },
  ],
  resources: [
    { name: 'NHS Health Check', href: 'https://www.nhs.uk/nhs-health-check/', external: true as const },
    { name: 'NHS Prevention', href: 'https://www.nhs.uk/live-well/', external: true as const },
  ],
};

export default function LandingFooter() {
  return (
    <footer className="py-10 px-4 border-t border-border bg-surface/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-nhs-cyan/10 border border-nhs-cyan/30 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-nhs-cyan" />
            </div>
            <span className="text-lg font-semibold text-text-primary">
              PreventPath
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-6">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category} className="flex items-center gap-4">
                {links.map((link) => (
                  link.external ? (
                    <a
                      key={link.name}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <a
                      key={link.name}
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                  )
                ))}
              </div>
            ))}
          </div>

          {/* GitHub */}
          <a
            href="https://github.com/persistentepiphany/preventine_healthcare_hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
          >
            <GitCommit className="w-4 h-4" />
            GitHub
          </a>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-text-muted text-center md:text-left max-w-xl">
              Not medical advice. See a healthcare professional if you are concerned about your health.
            </p>
            <p className="text-xs text-text-muted">
              © 2024 PreventPath. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}