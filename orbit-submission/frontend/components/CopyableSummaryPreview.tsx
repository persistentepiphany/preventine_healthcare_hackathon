'use client';

import { Copy, Check, FileText, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { copyableSummary } from '@/lib/copy';

const ruleChips = [
  { label: 'Safety check passed', color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  { label: 'Missing: BP', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  { label: 'NHS Health Check possible', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  { label: 'Non-diagnostic', color: 'text-text-muted', bg: 'bg-surface/50', border: 'border-border/50' },
];

export default function CopyableSummaryPreview() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyableSummary.sample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      <div className="card-premium p-6 rounded-2xl border border-border/50 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                <FileText className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold text-text-primary">Conversation starter</span>
                <p className="text-[10px] text-text-muted">For GP, pharmacist, or NHS service</p>
              </div>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface/50 border border-border hover:border-border-hover transition-colors duration-200"
              aria-label="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span className="text-xs text-success">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-text-secondary" />
                  <span className="text-xs text-text-secondary">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Fake message preview */}
          <div className="bg-surface/50 rounded-xl p-4 border border-border/30 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
              <span className="text-[10px] text-text-muted">Generated from your inputs</span>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-text-secondary leading-relaxed font-mono">
              {copyableSummary.sample}
            </pre>
          </div>

          {/* Rule chips */}
          <div className="flex flex-wrap gap-2">
            {ruleChips.map((chip) => (
              <div
                key={chip.label}
                className={`px-2 py-1 rounded-md ${chip.bg} border ${chip.border} flex items-center gap-1`}
              >
                <div className={`w-1 h-1 rounded-full ${chip.color.replace('text-', 'bg-')}`} />
                <span className={`text-[10px] font-medium ${chip.color}`}>{chip.label}</span>
              </div>
            ))}
          </div>

          {/* Note */}
          <p className="mt-4 text-[10px] text-text-muted italic">
            {copyableSummary.note}
          </p>
        </div>
      </div>
    </div>
  );
}