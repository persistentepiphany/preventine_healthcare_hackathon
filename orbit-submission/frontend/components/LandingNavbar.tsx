'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { MattePanel } from '@/components/ui/matte-panel';

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'How it works', href: '#how-it-works' },
    { name: 'Safety first', href: '#safety' },
    { name: 'What you can prepare', href: '#prepare' },
    { name: 'Possible routes', href: '#routes' },
  ];

  return (
    <nav className="fixed top-4 left-4 right-4 z-50">
      <MattePanel variant="default" className="px-5 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-3 group"
          >
            <div className="flex items-center gap-2.5">
              <Image
                src="/nhs-logo.svg"
                alt="NHS"
                width={80}
                height={24}
                className="opacity-80 group-hover:opacity-100 transition-opacity duration-200"
              />
              <div className="w-px h-6 bg-border" />
              <span className="text-sm font-semibold text-text-primary tracking-tight">
                PreventPath
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-text-secondary hover:text-text-primary text-sm font-medium transition-colors duration-200 focus:outline-none focus:text-text-primary"
              >
                {link.name}
              </a>
            ))}
            <a
              href="#demo"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nhs-cyan hover:bg-nhs-cyan/90 text-white text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-nhs-cyan focus:ring-offset-2 focus:ring-offset-background"
            >
              Start demo
              <Menu className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-surface-hover transition-colors duration-200"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-text-primary" />
            ) : (
              <Menu className="w-5 h-5 text-text-primary" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-border">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-text-secondary hover:text-text-primary text-sm font-medium transition-colors duration-200 py-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <a
                href="#demo"
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-nhs-cyan hover:bg-nhs-cyan/90 text-white text-sm font-medium transition-colors duration-200 mt-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Start demo
                <Menu className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </MattePanel>
    </nav>
  );
}