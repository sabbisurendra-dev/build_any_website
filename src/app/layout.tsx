import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AppProviders } from '@/components/providers/app-providers';

export const metadata: Metadata = {
  title: {
    template: '%s | Antigravity SlotBook Platform',
    default: 'SMB Website Builder & Slot Booking Platform',
  },
  description:
    'Production-grade multi-tenant SaaS platform for rapid website building and appointment, facility, and time-slot booking.',
  applicationName: 'Antigravity SlotBook',
  keywords: ['booking', 'turf booking', 'clinic appointment', 'salon scheduling', 'website builder', 'SaaS', 'India'],
  authors: [{ name: 'Antigravity Solutions' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary selection:text-primary-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
