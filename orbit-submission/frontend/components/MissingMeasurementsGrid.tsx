'use client';

import { motion } from 'framer-motion';
import { Activity, Droplet, Ruler, Flame, History, AlertCircle, Check, HelpCircle } from 'lucide-react';

type Status = 'known' | 'missing' | 'unknown';

interface Measurement {
  name: string;
  icon: React.ElementType;
  status: Status;
  note?: string;
}

const measurements: Measurement[] = [
  {
    name: 'Blood pressure',
    icon: Activity,
    status: 'missing',
    note: 'Recommended checks vary by age',
  },
  {
    name: 'Cholesterol/HDL',
    icon: Droplet,
    status: 'missing',
    note: 'Usually checked every 5 years',
  },
  {
    name: 'BMI or waist',
    icon: Ruler,
    status: 'known',
  },
  {
    name: 'Smoking status',
    icon: Flame,
    status: 'known',
  },
  {
    name: 'Family history',
    icon: History,
    status: 'unknown',
  },
  {
    name: 'HbA1c',
    icon: Droplet,
    status: 'missing',
    note: 'Blood sugar indicator',
  },
];

const statusConfig: Record<Status, { icon: React.ElementType; label: string; color: string; bg: string; border: string; dot: string }> = {
  known: {
    icon: Check,
    label: 'Known',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    dot: 'bg-success',
  },
  missing: {
    icon: AlertCircle,
    label: 'Missing',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    dot: 'bg-warning',
  },
  unknown: {
    icon: HelpCircle,
    label: 'Unknown',
    color: 'text-text-muted',
    bg: 'bg-surface/50',
    border: 'border-border/50',
    dot: 'bg-text-muted',
  },
} as const;

export default function MissingMeasurementsGrid() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {measurements.map((measurement, index) => {
          const config = statusConfig[measurement.status];

          return (
            <motion.div
              key={measurement.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl ${config.bg} border ${config.border} hover:border-border-hover transition-colors duration-200 cursor-pointer`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface/50 border border-border/30 flex items-center justify-center">
                    <measurement.icon className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{measurement.name}</p>
                    {measurement.note && (
                      <p className="text-[10px] text-text-muted mt-0.5">{measurement.note}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                  <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}