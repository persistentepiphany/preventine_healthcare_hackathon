'use client';

import { motion } from 'framer-motion';
import { Shield, Phone, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';

const emergencyNodes = [
  {
    icon: Phone,
    label: '999',
    color: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error/40',
  },
  {
    icon: Phone,
    label: 'NHS 111',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/40',
  },
  {
    icon: AlertTriangle,
    label: 'Urgent care',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/40',
  },
];

const routineNodes = [
  {
    icon: CheckCircle2,
    label: 'Pharmacy BP',
    color: 'text-success',
    bg: 'bg-success/5',
    border: 'border-success/30',
  },
  {
    icon: CheckCircle2,
    label: 'GP prevention',
    color: 'text-success',
    bg: 'bg-success/5',
    border: 'border-success/30',
  },
  {
    icon: CheckCircle2,
    label: 'NHS Health Check',
    color: 'text-success',
    bg: 'bg-success/5',
    border: 'border-success/30',
  },
];

export default function SafetyGateDiagram() {
  return (
    <div className="w-full">
      <div className="card-premium p-6 md:p-8 rounded-2xl border border-error/20 bg-error/5 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-error/10 border border-error/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-error" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Safety gate priority</h3>
            <p className="text-xs text-text-muted">Red flags interrupt routine flow</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Emergency Path */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
              <p className="text-xs font-medium text-error">If red flags detected:</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {emergencyNodes.map((node, index) => (
                <motion.div
                  key={node.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg ${node.bg} border ${node.border} flex flex-col items-center gap-1`}
                >
                  <node.icon className={`w-5 h-5 ${node.color}`} />
                  <span className="text-[10px] font-medium text-text-primary">{node.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Blocked indicator */}
            <div className="p-3 rounded-lg bg-surface/50 border border-border/50 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-text-muted" />
              <p className="text-xs text-text-muted">Routine prevention cards paused</p>
            </div>
          </div>

          {/* Routine Path */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <p className="text-xs font-medium text-success">If no red flags:</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {routineNodes.map((node, index) => (
                <motion.div
                  key={node.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className={`p-3 rounded-lg ${node.bg} border ${node.border} flex flex-col items-center gap-1`}
                >
                  <node.icon className={`w-5 h-5 ${node.color}`} />
                  <span className="text-[10px] font-medium text-text-primary">{node.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Continuation indicator */}
            <div className="p-3 rounded-lg bg-success/5 border border-success/30 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <p className="text-xs text-text-secondary">Continue to copyable summary</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}