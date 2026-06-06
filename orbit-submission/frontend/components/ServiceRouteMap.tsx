'use client';

import { motion } from 'framer-motion';
import { Pill, Stethoscope, Calendar, Phone } from 'lucide-react';

interface Route {
  icon: React.ElementType;
  label: string;
  caution: string;
  color: string;
  bg: string;
  border: string;
}

const routes: Route[] = [
  {
    icon: Pill,
    label: 'Pharmacy BP check',
    caution: 'Possible route',
    color: 'text-primary',
    bg: 'bg-primary/5',
    border: 'border-primary/20',
  },
  {
    icon: Stethoscope,
    label: 'GP prevention discussion',
    caution: 'May be useful to ask',
    color: 'text-primary',
    bg: 'bg-primary/5',
    border: 'border-primary/20',
  },
  {
    icon: Calendar,
    label: 'NHS Health Check enquiry',
    caution: 'Check invitation status',
    color: 'text-success',
    bg: 'bg-success/5',
    border: 'border-success/20',
  },
];

const emergencyRoutes: Route[] = [
  {
    icon: Phone,
    label: 'NHS 111 / 999',
    caution: 'Only if urgent or emergency red flags',
    color: 'text-error',
    bg: 'bg-error/5',
    border: 'border-error/20',
  },
];

export default function ServiceRouteMap() {
  return (
    <div className="w-full">
      {/* Main routes */}
      <div className="card-premium p-5 rounded-2xl border border-border/50 relative overflow-hidden">
        {/* Transit line background */}
        <div className="absolute top-1/2 left-4 right-4 h-px bg-gradient-to-r from-border via-primary/30 to-border opacity-30" />

        <div className="relative">
          <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
            {routes.map((route, index) => (
              <motion.div
                key={route.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex-shrink-0 flex flex-col items-center gap-2"
              >
                {/* Station node */}
                <div className={`relative w-14 h-14 rounded-xl ${route.bg} border ${route.border} flex items-center justify-center hover:scale-105 transition-transform duration-200 cursor-pointer z-10`}>
                  <route.icon className={`w-6 h-6 ${route.color}`} />
                  <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${route.color.replace('text-', 'bg-')}`} />
                </div>

                {/* Labels */}
                <div className="text-center max-w-[100px]">
                  <p className="text-[11px] font-medium text-text-primary">{route.label}</p>
                  <p className="text-[9px] text-text-muted mt-0.5">{route.caution}</p>
                </div>

                {/* Connection line */}
                {index < routes.length - 1 && (
                  <div className="absolute top-7 left-14 w-8 h-px bg-primary/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency routes - separate */}
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
          <p className="text-[10px] text-text-muted uppercase tracking-wider">When red flags present</p>
        </div>

        <div className="card p-4 rounded-xl border border-error/20 bg-error/5">
          {emergencyRoutes.map((route, index) => (
            <motion.div
              key={route.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-lg ${route.bg} border ${route.border}`}
            >
              <div className="w-10 h-10 rounded-lg bg-surface/50 flex items-center justify-center">
                <route.icon className={`w-5 h-5 ${route.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{route.label}</p>
                <p className="text-[10px] text-text-muted">{route.caution}</p>
              </div>
              <Phone className="w-4 h-4 text-error" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}