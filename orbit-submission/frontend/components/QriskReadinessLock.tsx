'use client';

import { Lock, Key, Droplet, Ruler, Flame, History, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const requiredKeys = [
  { icon: Droplet, label: 'Cholesterol', known: false },
  { icon: Droplet, label: 'HbA1c', known: false },
  { icon: Ruler, label: 'BMI', known: true },
  { icon: Flame, label: 'Smoking', known: true },
  { icon: History, label: 'Family history', known: false },
];

export default function QriskReadinessLock() {
  const knownCount = requiredKeys.filter(k => k.known).length;
  const totalCount = requiredKeys.length;
  const readiness = Math.round((knownCount / totalCount) * 100);

  return (
    <div className="w-full">
      <div className="card-premium p-6 rounded-2xl border border-border/50 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-xl ${readiness === 100 ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'} border flex items-center justify-center`}>
              {readiness === 100 ? (
                <CheckCircle2 className="w-6 h-6 text-success" />
              ) : (
                <Lock className="w-6 h-6 text-warning" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">QRISK Readiness</h3>
              <p className="text-xs text-text-muted">{knownCount}/{totalCount} inputs known</p>
            </div>

            <div className="ml-auto">
              <div className={`text-2xl font-bold ${readiness === 100 ? 'text-success' : 'text-warning'}`}>
                {readiness}%
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="h-1.5 rounded-full bg-surface overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-warning to-success"
                initial={{ width: 0 }}
                whileInView={{ width: `${readiness}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Keys grid */}
          <div className="grid grid-cols-5 gap-2">
            {requiredKeys.map((key, index) => (
              <motion.div
                key={key.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`p-2 rounded-lg ${key.known ? 'bg-success/10 border-success/30' : 'bg-surface/50 border-border/50'} border flex flex-col items-center gap-1`}
              >
                {key.known ? (
                  <Key className="w-4 h-4 text-success" />
                ) : (
                  <Key className="w-4 h-4 text-text-muted opacity-50" />
                )}
                <span className="text-[9px] text-text-secondary text-center">{key.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Note */}
          <div className="mt-6 pt-4 border-t border-border/30 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              PreventPath checks readiness only. No cardiovascular risk score is calculated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}