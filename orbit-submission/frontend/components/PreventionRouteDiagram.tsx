'use client';

import { motion } from 'framer-motion';
import { Shield, AlertTriangle, FolderOpen, Navigation, Copy, CheckCircle2 } from 'lucide-react';

const nodes = [
  {
    id: 'input',
    icon: FolderOpen,
    label: 'Patient input',
    sublabel: 'Age, measurements',
    color: 'text-text-secondary',
    bg: 'bg-surface',
    border: 'border-border',
  },
  {
    id: 'safety',
    icon: Shield,
    label: 'Safety gate',
    sublabel: 'Red flags first',
    color: 'text-primary',
    bg: 'bg-primary/5',
    border: 'border-primary/30',
    status: 'active',
  },
  {
    id: 'missing',
    icon: AlertTriangle,
    label: 'Missing info',
    sublabel: 'Gaps flagged',
    color: 'text-warning',
    bg: 'bg-warning/5',
    border: 'border-warning/30',
    status: 'warning',
  },
  {
    id: 'routes',
    icon: Navigation,
    label: 'NHS routes',
    sublabel: 'Possible paths',
    color: 'text-success',
    bg: 'bg-success/5',
    border: 'border-success/30',
  },
  {
    id: 'summary',
    icon: Copy,
    label: 'Copyable summary',
    sublabel: 'Conversation starter',
    color: 'text-primary',
    bg: 'bg-primary/5',
    border: 'border-primary/30',
  },
];

export default function PreventionRouteDiagram() {
  return (
    <div className="w-full">
      {/* Main diagram */}
      <div className="card-premium p-6 md:p-8 rounded-2xl border border-border/50 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-6 gap-px h-full">
            {[...Array(24)].map((_, i) => (
              <div key={i} className="bg-border/30" />
            ))}
          </div>
        </div>

        {/* Connection line */}
        <div className="relative">
          <div className="hidden md:block absolute top-12 left-16 right-16 h-px bg-gradient-to-r from-border via-primary/30 to-border">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {nodes.map((node, index) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                {/* Node card */}
                <div className={`relative w-20 h-20 rounded-xl ${node.bg} border ${node.border} flex items-center justify-center hover:scale-105 transition-transform duration-200 cursor-pointer`}>
                  <node.icon className={`w-7 h-7 ${node.color}`} />
                  {node.status === 'active' && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-surface"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  {node.status === 'warning' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-warning border-2 border-surface">
                      <AlertTriangle className="w-2.5 h-2.5 text-background" />
                    </div>
                  )}
                </div>

                {/* Labels */}
                <div className="text-center">
                  <p className="text-xs font-medium text-text-primary">{node.label}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{node.sublabel}</p>
                </div>

                {/* Arrow for mobile */}
                {index < nodes.length - 1 && (
                  <div className="md:hidden">
                    <ChevronDown className="w-4 h-4 text-border" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 pt-4 border-t border-border/30 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <p className="text-xs text-text-muted">
            No diagnosis. No QRISK score calculated.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}