import * as React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, MessageSquare, ExternalLink, Clock } from 'lucide-react';

export interface PublicFooterProps {
  businessName: string;
  tagline?: string;
  description?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    googleMapsUrl?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    whatsappNumber?: string;
  };
  operatingHoursText?: string;
  socialLinks?: Record<string, string>;
  navLinks?: Array<{ label: string; href: string }>;
  termsUrl?: string;
  cancellationPolicyUrl?: string;
  privacyUrl?: string;
}

export function PublicFooter({
  businessName,
  tagline,
  description,
  address,
  contact,
  operatingHoursText,
  socialLinks,
  navLinks = [
    { label: 'Facilities', href: '#facilities' },
    { label: 'Services', href: '#services' },
    { label: 'Book Online', href: '#book' },
    { label: 'Contact', href: '#contact' },
  ],
  termsUrl,
  cancellationPolicyUrl,
  privacyUrl,
}: PublicFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/40 text-muted-foreground text-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: Business Overview */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-foreground tracking-tight">{businessName}</h3>
            {tagline && <p className="text-xs font-medium text-foreground/80">{tagline}</p>}
            {description && <p className="text-xs leading-relaxed opacity-90">{description}</p>}
            {socialLinks && Object.keys(socialLinks).length > 0 && (
              <div className="flex items-center gap-3 pt-2">
                {Object.entries(socialLinks).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="capitalize text-xs hover:text-foreground underline-offset-4 hover:underline"
                  >
                    {platform}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Location & Hours (Only rendered when configured) */}
          {(address || operatingHoursText) && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Location & Timings</h4>
              {address && (
                <div className="flex items-start gap-2 text-xs leading-relaxed">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-foreground" />
                  <div>
                    <p>{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    <p>
                      {address.city}
                      {address.state ? `, ${address.state}` : ''}
                      {address.postalCode ? ` - ${address.postalCode}` : ''}
                    </p>
                    {address.googleMapsUrl && (
                      <a
                        href={address.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-accent hover:underline mt-1"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {operatingHoursText && (
                <div className="flex items-start gap-2 text-xs pt-1">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5 text-foreground" />
                  <p>{operatingHoursText}</p>
                </div>
              )}
            </div>
          )}

          {/* Col 4: Contact & Booking Help */}
          {contact && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Get in Touch</h4>
              <ul className="space-y-2 text-xs">
                {contact.phone && (
                  <li>
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{contact.phone}</span>
                    </a>
                  </li>
                )}
                {contact.email && (
                  <li>
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{contact.email}</span>
                    </a>
                  </li>
                )}
                {contact.whatsappNumber && (
                  <li>
                    <a
                      href={`https://wa.me/${contact.whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Chat on WhatsApp</span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs sm:flex-row">
          <p>© {currentYear} {businessName}. All rights reserved.</p>

          <div className="flex items-center gap-4 text-xs">
            {cancellationPolicyUrl && (
              <Link href={cancellationPolicyUrl} className="hover:text-foreground underline-offset-4 hover:underline">
                Cancellation Policy
              </Link>
            )}
            {termsUrl && (
              <Link href={termsUrl} className="hover:text-foreground underline-offset-4 hover:underline">
                Terms of Service
              </Link>
            )}
            {privacyUrl && (
              <Link href={privacyUrl} className="hover:text-foreground underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
