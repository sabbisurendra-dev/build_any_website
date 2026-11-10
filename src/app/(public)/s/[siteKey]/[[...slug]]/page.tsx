import { notFound } from 'next/navigation';
import { PublicSiteLayout } from '@/components/layout/public/public-site-layout';
import { PublicSiteView } from '@/components/booking-flow/public-site-view';
import { WebsiteServiceImpl } from '@/modules/website-builder/website.impl';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';
import { UniversalCommerceService } from '@/modules/commerce/commerce.service';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';

export const dynamic = 'force-dynamic';

interface PublicSiteRouteProps {
  readonly params: Promise<{
    readonly siteKey: string;
    readonly slug?: string[];
  }>;
}

export default async function PublicTenantSitePage({ params }: PublicSiteRouteProps) {
  const { siteKey } = await params;

  BookingServiceImpl.sweepExpiredAllocationsNow();
  const websiteService = new WebsiteServiceImpl();
  const published = websiteService.getPublishedWebsiteBySiteKey(siteKey);

  if (!published) {
    notFound();
  }

  const { tenant, sections, theme, publishedVersion } = published;
  const state = RuntimeStateRepository.getState();

  const resources = state.resources.filter(
    (r) => r.tenantId === tenant.id && r.isActive,
  );
  const services = state.services.filter(
    (s) => s.tenantId === tenant.id && s.isActive,
  );
  const staffMembers = state.staffMembers
    .filter((st) => st.tenantId === tenant.id && st.isActive)
    .map((st) => ({
      id: st.id,
      displayName: st.displayName,
      specialty: st.specialty,
      serviceIds: st.serviceIds,
      workingStartHour: st.workingStartHour,
      workingEndHour: st.workingEndHour,
    }));
  const sessions = state.sessions
    .filter((sess) => sess.tenantId === tenant.id && sess.isActive)
    .map((sess) => ({
      id: sess.id,
      name: sess.name,
      instructorName: sess.instructorName,
      description: sess.description,
      dateLocal: sess.dateLocal,
      startTime: sess.startTime,
      endTime: sess.endTime,
      maxCapacity: sess.maxCapacity,
      bookedCount: sess.bookedCount,
      heldCount: sess.heldCount,
      remainingCapacity: Math.max(
        0,
        sess.maxCapacity - sess.bookedCount - sess.heldCount,
      ),
      priceMinor: sess.priceMinor,
    }));

  const verticalTaglineMap: Record<string, string> = {
    sports_turf: 'Floodlit Sports Arenas & Instant Online Slot Booking',
    racquet_court: 'Championship Courts & Instant Slot Booking',
    clinic_healthcare: 'Specialist Doctor Consultations & Online Appointments',
    salon_beauty: 'Luxury Styling, Wellness & Stylist Appointments',
    fitness_yoga: 'Group Fitness Batches, Yoga & Live Seat Reservation',
    general_appointment: 'Professional Online Appointment & Slot Booking',
    universal_commerce: 'Universal Commerce, Inventory, Slot Booking & Entitlement Platform',
  };

  const tagline = verticalTaglineMap[tenant.vertical] ?? 'Online Storefront & Slot Booking';
  const commerceService = new UniversalCommerceService();
  const catalogueItems = commerceService.listCatalogue(tenant.id, { includeDormant: true });
  const masterProjection = commerceService.getMasterDataProjection(tenant.id);

  return (
    <PublicSiteLayout
      headerProps={{
        businessName: tenant.name,
        tagline,
        siteKey: tenant.slug,
        phone: tenant.location.phone,
        whatsappNumber: tenant.location.phone.replace(/\s+/g, ''),
        primaryCtaLabel: 'Book Now',
        primaryCtaHref: '#book',
      }}
      footerProps={{
        businessName: tenant.name,
        tagline,
        description: `${tenant.name} (${tenant.location.city}) — real-time online slot availability, concurrency-protected booking holds, and instant digital confirmation.`,
        address: {
          line1: tenant.location.address,
          city: tenant.location.city,
          state: tenant.location.state,
          postalCode: '560038',
          googleMapsUrl: 'https://maps.google.com',
        },
        contact: {
          phone: tenant.location.phone,
          email: `bookings@${tenant.slug}.in`,
          whatsappNumber: tenant.location.phone.replace(/\s+/g, ''),
        },
        operatingHoursText: 'Open Daily • Live Online Availability',
        socialLinks: {
          instagram: 'https://instagram.com',
          facebook: 'https://facebook.com',
        },
        cancellationPolicyUrl: '#terms',
        termsUrl: '#terms',
      }}
    >
      <PublicSiteView
        tenantId={tenant.id}
        siteKey={tenant.slug}
        businessName={tenant.name}
        vertical={tenant.vertical}
        tagline={tagline}
        locationLabel={`${tenant.location.address}, ${tenant.location.city}`}
        publishedVersion={publishedVersion}
        sections={sections}
        theme={theme}
        initialCatalog={{
          resources,
          services,
          staffMembers,
          sessions,
          catalogueItems,
          masterProjection,
        }}
      />
    </PublicSiteLayout>
  );
}
