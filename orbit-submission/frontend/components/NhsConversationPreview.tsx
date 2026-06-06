'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { MattePanel } from '@/components/ui/matte-panel';

const sampleSummary = `I've been thinking about my health and prepared a few things to discuss.

• My last blood pressure check was over a year ago
• I'm not sure if I'm eligible for an NHS Health Check
• My family has some history of heart conditions

Could we talk about what prevention might be helpful?`;

const badges = [
  { label: 'Safety checked', color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  { label: 'No diagnosis', color: 'text-nhs-cyan', bg: 'bg-nhs-cyan/5', border: 'border-nhs-cyan/20' },
  { label: 'Conversation starter', color: 'text-text-muted', bg: 'bg-surface/50', border: 'border-border/50' },
];

export default function NhsConversationPreview() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sampleSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MattePanel variant="border-nhs" className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-nhs-cyan/5 border border-nhs-cyan/20 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-nhs-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-text-primary">Conversation starter</span>
            <p className="text-[10px] text-text-muted">For GP, pharmacist, or NHS service</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface/50 border border-border hover:border-border-hover transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-nhs-cyan focus:ring-offset-2 focus:ring-offset-background"
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

      {/* Summary preview */}
      <div className="bg-surface/50 rounded-xl p-4 border border-border/30 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-nhs-cyan/10 flex items-center justify-center">
            <svg className="w-3 h-3 text-nhs-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </div>
          <span className="text-[10px] text-text-muted">Based on your inputs</span>
        </div>
        <pre className="whitespace-pre-wrap text-sm text-text-secondary leading-relaxed font-sans">
          {sampleSummary}
        </pre>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <div
            key={badge.label}
            className={`px-2.5 py-1 rounded-md ${badge.bg} border ${badge.border}`}
          >
            <span className={`text-[10px] font-medium ${badge.color}`}>{badge.label}</span>
          </div>
        ))}
      </div>

      {/* Note */}
      <p className="mt-4 text-[10px] text-text-muted leading-relaxed">
        This is a conversation starter, not medical advice. Bring it to discuss with your GP, pharmacist, or healthcare professional.
      </p>
    </MattePanel>
  );
}