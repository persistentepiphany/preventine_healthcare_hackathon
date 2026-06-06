'use client';

import { Code, ShieldCheck, HardDrive, Brain, Server, GitCommit } from 'lucide-react';
import { techAndRules } from '@/lib/copy';
import { LucideIcon } from 'lucide-react';

const featureIcons: Record<string, LucideIcon> = {
  TypeScript: Code,
  'Safety rules': ShieldCheck,
  'Local processing': HardDrive,
  'No LLM calls': Brain,
  'No NHS API integration': Server,
  'Open source': GitCommit,
};

export default function TechAndRulesSection() {
  return (
    <section className="py-20 px-4" id="about">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-text-primary tracking-tight mb-4">
            {techAndRules.title}
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {techAndRules.description}
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="card-premium p-8 rounded-2xl border border-border/50">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {techAndRules.features.map((feature, index) => {
                const Icon = featureIcons[feature.name];
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-3 p-4 rounded-lg hover:bg-surface/50 transition-colors duration-200 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                      {Icon && <Icon className="w-6 h-6 text-primary" />}
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-semibold text-text-primary mb-1">
                        {feature.name}
                      </h3>
                      <p className="text-xs text-text-secondary">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}