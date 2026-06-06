'use client';

import { motion } from 'framer-motion';
import { User, Shield, FileText, Ban, Pill, Calendar, XCircle, ArrowRight, Check } from 'lucide-react';

const flowSteps = [
  {
    icon: User,
    label: 'Patient input',
    color: 'text-text-secondary',
    bg: 'bg-surface',
    border: 'border-border',
  },
  {
    icon: Shield,
    label: 'Safety guardrails',
    color: 'text-primary',
    bg: 'bg-primary/5',
    border: 'border-primary/30',
    note: 'Red flags first',
  },
  {
    icon: FileText,
    label: 'Deterministic rules',
    color: 'text-primary',
    bg: 'bg-primary/5',
    border: 'border-primary/30',
    note: 'No LLM, no AI',
  },
  {
    icon: Check,
    label: 'Non-diagnostic output',
    color: 'text-success',
    bg: 'bg-success/5',
    border: 'border-success/30',
  },
];

const blockedOutputs = [
  { icon: Ban, label: 'Diagnosis', color: 'text-error' },
  { icon: Pill, label: 'Prescribing', color: 'text-error' },
  { icon: Calendar, label: 'Booking claims', color: 'text-error' },
  { icon: XCircle, label: 'QRISK score', color: 'text-error' },
];

export default function RulesEngineFlow() {
  return (
    <div className="w-full">
      <div className="card-premium p-6 rounded-2xl border border-border/50 relative overflow-hidden">
        {/* Tech grid background */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-8 gap-px h-full">
            {[...Array(32)].map((_, i) => (
              <div key={i} className="bg-border/30" />
            ))}
          </div>
        </div>

        <div className="relative">
          {/* Flow diagram */}
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-0 mb-6">
            {flowSteps.map((step, index) => (
              <div key={step.label} className="flex items-center gap-3 w-full md:w-auto">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl ${step.bg} border ${step.border} w-full md:w-28`}
                >
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                  <span className="text-[10px] font-medium text-text-primary text-center">{step.label}</span>
                  {step.note && (
                    <span className="text-[8px] text-text-muted">{step.note}</span>
                  )}
                </motion.div>

                {index < flowSteps.length - 1 && (
                  <ArrowRight className="hidden md:block w-4 h-4 text-border flex-shrink-0" />
                )}
                {index < flowSteps.length - 1 && (
                  <div className="md:hidden w-px h-6 bg-border flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Blocked outputs */}
          <div className="pt-4 border-t border-border/30">
            <p className="text-xs font-medium text-text-muted mb-3 uppercase tracking-wider">Blocked outputs</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {blockedOutputs.map((output, index) => (
                <motion.div
                  key={output.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-error/5 border border-error/20"
                >
                  <output.icon className={`w-3.5 h-3.5 ${output.color} flex-shrink-0`} />
                  <span className="text-[10px] text-text-secondary">{output.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}