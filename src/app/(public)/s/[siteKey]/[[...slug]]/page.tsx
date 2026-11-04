import { PublicSiteLayout } from '@/components/layout/public/public-site-layout';
import { PublicSiteView } from '@/components/booking-flow/public-site-view';

interface PublicSiteRouteProps {
  readonly params: Promise<{
    readonly siteKey: string;
    readonly slug?: string[];
  }>;
}

export default async function PublicTenantSitePage({ params }: PublicSiteRouteProps) {
  const { siteKey } = await params;

  // Tenant branding lookup
  const isKickoffTurf = siteKey === 'kickoff-turf' || siteKey.includes('turf');
  const businessName = isKickoffTurf ? 'Kickoff Football Arena' : `${siteKey.replace(/-/g, ' ').toUpperCase()}`;
  const tagline = isKickoffTurf
    ? 'FIFA Quality Pro 5v5 & 7v7 Floodlit Synthetic Turfs'
    : 'Professional Online Appointment & Slot Booking';

  return (
    <PublicSiteLayout
      headerProps={{
        businessName,
        tagline,
        siteKey,
        phone: '+91 98765 43210',
        whatsappNumber: '+919876543210',
        primaryCtaLabel: 'Book a Slot',
        primaryCtaHref: '#courts',
      }}
      footerProps={{
        businessName,
        tagline,
        description:
          'Bengaluru’s premier sports facility for 5v5 and 7v7 football and box cricket. High-performance synthetic turf, stadium floodlights, and instant online slot booking.',
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
      <PublicSiteView
        siteKey={siteKey}
        businessName={businessName}
        tagline={tagline}
      />
    </PublicSiteLayout>
  );
}
