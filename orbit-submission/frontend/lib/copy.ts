/**
 * NHS-Safe Copy for PreventPath Landing Page
 * All copy uses cautious language: "may", "possible", "consider asking"
 * Never states: "you are eligible", "you need", "you have risk", "diagnosis"
 */

// Hero Section
export const hero = {
  headline: 'Prevention navigation, without pretending to diagnose.',
  subheadline: 'See what prevention information may be missing. Navigate possible NHS routes. No diagnosis, no risk scores.',
  ctaPrimary: 'Start demo',
  ctaSecondary: 'See how it works',
  tagline: 'No diagnosis, no risk scores',
} as const;

// Safety Trust Strip
export const safetyStrip = [
  'Safety first',
  'No diagnosis',
  'NHS-aligned',
  'Private by default',
] as const;

// Copyable Summary Preview
export const copyableSummary = {
  title: 'Conversation starter',
  subtitle: 'Prepare for your appointment',
  sample: `Based on what I shared, it may be worth discussing:

[1] When my last blood pressure was taken
[2] Whether NHS Health Check applies to me
[3] Any routine prevention I might have missed`,
  note: 'Copy this summary to bring to your GP, pharmacist, or healthcare professional.',
  copyButton: 'Copy to clipboard',
  copied: 'Copied!',
} as const;

// Tech and Rules Section
export const techAndRules = {
  title: 'Built with safety first',
  description: 'Technical safeguards built into every step.',
  features: [
    { name: 'TypeScript', description: 'Type-safe codebase' },
    { name: 'Safety rules', description: 'Guardrails at every step' },
    { name: 'Local processing', description: 'No data leaves your device' },
    { name: 'No LLM calls', description: 'Deterministic logic only' },
    { name: 'No NHS API', description: 'Reference information only' },
    { name: 'Open source', description: 'Transparent codebase' },
  ],
} as const;

// Final CTA Section
export const finalCta = {
  headline: 'Ready to see what prevention may be missing?',
  description: 'Start a free demo to explore possible prevention routes.',
  buttonText: 'Start demo',
  subText: 'No signup required',
} as const;

// Footer
export const footer = {
  brand: 'PreventPath',
  legal: 'Not medical advice. See a healthcare professional if you are concerned about your health.',
  safety: 'Built with patient safety first',
  links: {
    product: ['How it works', 'Safety', 'About'],
    resources: ['NHS Health Check', 'NHS Prevention'],
    project: ['GitHub', 'Privacy', 'Terms'],
  },
} as const;

// Global Disclaimer
export const disclaimer = 'PreventPath does not diagnose, prescribe, choose treatment, calculate QRISK, or replace NHS advice.';

// Export all copy as namespace
export const copy = {
  hero,
  safetyStrip,
  copyableSummary,
  techAndRules,
  finalCta,
  footer,
  disclaimer,
} as const;