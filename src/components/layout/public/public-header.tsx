'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, Phone, MessageSquare, CalendarCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export interface PublicNavLink {
  label: string;
  href: string;
}

export interface PublicHeaderProps {
  businessName: string;
  tagline?: string;
  logoUrl?: string;
  siteKey: string;
  navLinks?: PublicNavLink[];
  phone?: string;
  whatsappNumber?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
}

export function PublicHeader({
  businessName,
  tagline,
  logoUrl,
  siteKey,
  navLinks = [
    { label: 'Facilities', href: `#facilities` },
    { label: 'Services & Pricing', href: `#services` },
    { label: 'Location & Hours', href: `#location` },
    { label: 'Contact', href: `#contact` },
  ],
  phone,
  whatsappNumber,
  primaryCtaLabel = 'Book Slot',
  primaryCtaHref = '#book',
}: PublicHeaderProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href={`/s/${siteKey}`} className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={businessName} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-brand-fg font-bold text-sm shadow-xs">
              {businessName.charAt(0)}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground">{businessName}</span>
            {tagline && <span className="text-[11px] text-muted-foreground line-clamp-1">{tagline}</span>}
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA & Contact */}
        <div className="hidden sm:flex items-center gap-3">
          {phone && (
            <a
              href={`tel:${phone}`}
              aria-label={`Call ${phone}`}
              className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{phone}</span>
            </a>
          )}

          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="hidden xl:flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs font-medium border border-emerald-200 dark:border-emerald-800 hover:opacity-90"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </a>
          )}

          <Button asChild size="sm" className="bg-brand-primary text-brand-fg font-semibold shadow-xs">
            <Link href={primaryCtaHref}>
              <CalendarCheck2 className="h-4 w-4 mr-1.5" />
              <span>{primaryCtaLabel}</span>
            </Link>
          </Button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 sm:hidden">
          <Button asChild size="sm" className="bg-brand-primary text-brand-fg text-xs h-8">
            <Link href={primaryCtaHref}>{primaryCtaLabel}</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-w-[300px] p-6 top-0 translate-y-0 right-0 left-auto translate-x-0 h-full sm:rounded-none rounded-none border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
          <DialogTitle className="text-base font-bold">{businessName}</DialogTitle>
          <div className="flex flex-col gap-5 mt-6">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-base font-medium text-foreground hover:text-brand-primary transition-colors py-1"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="pt-4 border-t border-border flex flex-col gap-3">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-4 w-4" />
                  <span>{phone}</span>
                </a>
              )}
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-600 font-medium"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat on WhatsApp</span>
                </a>
              )}
            </div>

            <Button asChild className="w-full bg-brand-primary text-brand-fg mt-2">
              <Link href={primaryCtaHref} onClick={() => setMobileOpen(false)}>
                <CalendarCheck2 className="h-4 w-4 mr-2" />
                {primaryCtaLabel}
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
