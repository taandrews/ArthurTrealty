'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, ArrowRight } from 'lucide-react';
import { serviceGroups, QUIZ_LABEL } from '@/data/serviceGroups';

const navLinks = [
  { name: 'About', href: '/about' },
  { name: 'Blog', href: '/blog' },
  { name: 'Contact', href: '/contact' },
];

const groupLabel = 'text-[11px] font-heading font-bold uppercase tracking-[0.12em] text-gray-text';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Escape or a click outside closes the Services menu.
  useEffect(() => {
    if (!servicesOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setServicesOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (!servicesRef.current?.contains(e.target as Node)) setServicesOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [servicesOpen]);

  return (
    <nav
      aria-label="Main"
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 backdrop-blur-xl"
      style={{
        background: '#ffffff',
        boxShadow: scrolled ? '0 1px 3px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ maxWidth: '1300px', margin: '0 auto', paddingLeft: 'clamp(20px, 5vw, 96px)', paddingRight: 'clamp(20px, 5vw, 96px)' }}>
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-arthur-t-realty.png"
              alt="Arthur T Realty — Your Home Buying Specialist"
              style={{
                height: '84px',
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
                filter: 'contrast(1.3) saturate(1.2)',
              }}
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Services menu: opens on hover, click, or keyboard */}
            <div
              ref={servicesRef}
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <button
                type="button"
                aria-expanded={servicesOpen}
                aria-controls="services-menu"
                onClick={() => setServicesOpen((o) => !o)}
                className="flex items-center gap-1.5 px-4 py-3 text-[14px] font-body font-medium rounded-lg transition-colors duration-300 text-navy/80 hover:text-navy hover:bg-navy/[0.04]"
              >
                Services
                <ChevronDown aria-hidden className={`w-3.5 h-3.5 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {servicesOpen && (
                  <motion.div
                    id="services-menu"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full left-0 bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(10,31,68,0.2)] border border-gray-border/60 p-5"
                    style={{ width: '600px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}
                  >
                    {serviceGroups.map((group) => (
                      <div key={group.goal}>
                        <p className={`${groupLabel} px-3 mb-1`}>{group.goal}</p>
                        <ul>
                          {group.links.map((link) => (
                            <li key={link.href}>
                              <Link
                                href={link.href}
                                onClick={() => setServicesOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-body font-medium text-navy hover:bg-gray-bg transition-colors"
                              >
                                <link.icon aria-hidden className="w-4 h-4 text-gold shrink-0" />
                                {link.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 text-[14px] font-body font-medium rounded-lg transition-colors duration-300 text-navy/80 hover:text-navy hover:bg-navy/[0.04]"
              >
                {link.name}
              </Link>
            ))}

            <Link
              href="/quiz"
              className="group flex items-center gap-2 bg-gold hover:bg-gold-light text-navy font-heading font-bold text-[14px] rounded-lg transition-all duration-300 hover:shadow-[0_8px_24px_-6px_rgba(212,160,23,0.4)]"
              style={{ marginLeft: '16px', padding: '12px 22px' }}
            >
              {QUIZ_LABEL}
              <ArrowRight aria-hidden className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            className="lg:hidden flex items-center justify-center w-11 h-11 -mr-2 rounded-lg transition-colors text-navy hover:bg-navy/[0.04]"
          >
            {isOpen ? <X aria-hidden className="w-6 h-6" /> : <Menu aria-hidden className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-white border-t border-gray-border/40 overflow-y-auto"
            style={{ maxHeight: 'calc(100svh - 96px)' }}
          >
            <div style={{ padding: '20px 20px 28px' }}>
              {serviceGroups.map((group) => (
                <div key={group.goal} className="mb-4">
                  <p className={`${groupLabel} px-3 mb-1`}>{group.goal}</p>
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 text-navy text-[15px] font-body font-medium rounded-lg hover:bg-gray-bg transition-colors"
                    >
                      <link.icon aria-hidden className="w-4 h-4 text-gold" />
                      {link.name}
                    </Link>
                  ))}
                </div>
              ))}
              <div className="h-px bg-gray-border/60 my-3" />
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-3 text-navy text-[15px] font-body font-medium rounded-lg hover:bg-gray-bg transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4">
                <Link
                  href="/quiz"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-gold text-navy font-heading font-bold text-[15px] rounded-lg"
                >
                  {QUIZ_LABEL}
                  <ArrowRight aria-hidden className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
