import { PublicSiteLayout } from '@/components/layout/public/public-site-layout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, MapPin, Sparkles, Trophy } from 'lucide-react';

interface PublicSiteRouteProps {
  readonly params: Promise<{
    readonly siteKey: string;
    readonly slug?: string[];
  }>;
}

export default async function PublicTenantSitePage({ params }: PublicSiteRouteProps) {
  const { siteKey, slug } = await params;
  const resolvedPath = `/${slug?.join('/') ?? ''}`;

  // Realistic sample tenant metadata for Kickoff Turf reference implementation (P0)
  const isKickoffTurf = siteKey === 'kickoff-turf' || siteKey.includes('turf');
  const businessName = isKickoffTurf ? 'Kickoff Football Arena' : `${siteKey.replace(/-/g, ' ').toUpperCase()}`;
  const tagline = isKickoffTurf
    ? 'FIFA Quality Pro 5v5 & 7v7 Floodlit Turfs'
    : 'Professional Appointment & Slot Booking';

  return (
    <PublicSiteLayout
      headerProps={{
        businessName,
        tagline,
        siteKey,
        phone: '+91 98765 43210',
        whatsappNumber: '+919876543210',
        primaryCtaLabel: 'Book a Slot',
        primaryCtaHref: '#book',
      }}
      footerProps={{
        businessName,
        tagline,
        description:
          'Indias premier sports facility for 5v5 and 7v7 football and box cricket. High-performance synthetic turf, floodlights, and instant online slot booking.',
        address: {
          line1: '12th Main Road, HAL 2nd Stage, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
          googleMapsUrl: 'https://maps.google.com',
        },
        contact: {
          phone: '+91 98765 43210',
          email: 'bookings@kickoffturf.in',
          whatsappNumber: '+919876543210',
        },
        operatingHoursText: 'Mon – Sun: 6:00 AM – 1:00 AM',
        socialLinks: {
          instagram: 'https://instagram.com',
          facebook: 'https://facebook.com',
        },
        cancellationPolicyUrl: '#terms',
        termsUrl: '#terms',
      }}
    >
      <main className="flex flex-col items-center justify-center p-6 sm:p-12 text-center" data-path={resolvedPath}>
        <div className="mx-auto max-w-3xl space-y-6 py-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Public Customer Website Active ({siteKey})</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-foreground">
            {businessName}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {tagline}. Real-time availability, instant slot locking, and seamless UPI checkout.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button size="lg" className="bg-brand-primary text-brand-fg font-semibold shadow-md">
              <Calendar className="h-4 w-4 mr-2" />
              Book Time Slot
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#facilities">
                <Trophy className="h-4 w-4 mr-2" />
                View Turfs & Rates
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-border mt-12 text-left">
            <div className="rounded-xl border border-border p-5 bg-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <Trophy className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">FIFA Pro Turfs</h3>
              <p className="text-xs text-muted-foreground mt-1">Dual 5v5 & 7v7 synthetic courts with stadium floodlights.</p>
            </div>
            <div className="rounded-xl border border-border p-5 bg-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 mb-3">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Zero Double Booking</h3>
              <p className="text-xs text-muted-foreground mt-1">Direct real-time locking with instant UPI booking confirmation.</p>
            </div>
            <div className="rounded-xl border border-border p-5 bg-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 mb-3">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Prime Location</h3>
              <p className="text-xs text-muted-foreground mt-1">Indiranagar 100ft road with dedicated locker rooms and parking.</p>
            </div>
          </div>
        </div>
      </main>
    </PublicSiteLayout>
  );
}
