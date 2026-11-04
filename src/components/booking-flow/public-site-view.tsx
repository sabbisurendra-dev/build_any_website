'use client';

import * as React from 'react';
import {
  Calendar,
  MapPin,
  Trophy,
  Scissors,
  Users,
  ChevronRight,
  HelpCircle,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type {
  PageSection,
  PlacedWidgetInstance,
  ViewportBreakpoint,
  WebsiteThemeConfig,
} from '@/modules/website-builder/layout.types';
import { resolveWidgetsForBreakpoint } from '@/modules/website-builder/grid-engine';
import type { BookingModel, BusinessVertical } from '@/types/domain';
import {
  CustomerBookingJourney,
  type PublicCatalogPayload,
} from './customer-booking-journey';

interface PublicSiteViewProps {
  tenantId: string;
  siteKey: string;
  businessName: string;
  vertical: BusinessVertical;
  tagline: string;
  locationLabel: string;
  publishedVersion: number;
  sections: PageSection[];
  theme: WebsiteThemeConfig;
  initialCatalog: PublicCatalogPayload;
}

export function PublicSiteView({
  tenantId,
  siteKey,
  businessName,
  vertical,
  locationLabel,
  publishedVersion,
  sections,
  theme,
  initialCatalog,
}: PublicSiteViewProps) {
  const [bookingModalOpen, setBookingModalOpen] = React.useState(false);
  const [catalog, setCatalog] = React.useState<PublicCatalogPayload>(initialCatalog);
  const [preselectedId, setPreselectedId] = React.useState<string | undefined>(undefined);
  const [viewportBp, setViewportBp] = React.useState<ViewportBreakpoint>('desktop');

  // Detect live viewport breakpoint so 12-col / 8-col / 4-col grid adapts cleanly
  React.useEffect(() => {
    const syncBp = () => {
      const w = window.innerWidth;
      if (w < 640) setViewportBp('mobile');
      else if (w < 1024) setViewportBp('tablet');
      else setViewportBp('desktop');
    };
    syncBp();
    window.addEventListener('resize', syncBp);
    return () => window.removeEventListener('resize', syncBp);
  }, []);

  const refreshCatalog = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/public/v1/catalog?tenantId=${encodeURIComponent(tenantId)}`,
        { cache: 'no-store' },
      );
      if (res.ok) {
        const data = await res.json();
        setCatalog({
          resources: data.resources ?? [],
          services: data.services ?? [],
          staffMembers: data.staffMembers ?? [],
          sessions: data.sessions ?? [],
        });
      }
    } catch {
      // Keep current catalog snapshot on transient error
    }
  }, [tenantId]);

  const inferredBookingModel: BookingModel =
    vertical === 'clinic_healthcare' || vertical === 'salon_beauty'
      ? 'staff_appointment'
      : vertical === 'fitness_yoga'
      ? 'capacity_session'
      : 'exclusive_resource';

  const openBookingFor = (itemId?: string) => {
    setPreselectedId(itemId);
    setBookingModalOpen(true);
  };

  return (
    <div
      data-testid="public-site-root"
      data-published-version={publishedVersion}
      data-brand-accent={theme.brandAccentHex}
      style={
        {
          '--tenant-accent': theme.brandAccentHex,
          '--tenant-primary': theme.brandPrimaryHex,
        } as React.CSSProperties
      }
      className="flex flex-col items-center w-full overflow-x-clip"
    >
      {/* Render Published 12-Column / 8-Column / 4-Column Grid Sections */}
      <div id="book" className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {sections.map((section) => {
          const resolved = resolveWidgetsForBreakpoint(section.widgets, viewportBp);
          const gridCols =
            viewportBp === 'desktop' ? 12 : viewportBp === 'tablet' ? 8 : 1;

          return (
            <section
              key={section.id}
              data-testid={`public-section-${section.id}`}
              className={`w-full rounded-2xl ${
                section.style.backgroundVariant === 'muted'
                  ? 'bg-muted/30 p-4 sm:p-6 border border-border/60'
                  : ''
              }`}
            >
              <div
                className="grid gap-5"
                style={
                  viewportBp === 'mobile'
                    ? { gridTemplateColumns: 'minmax(0, 1fr)' }
                    : {
                        gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                      }
                }
              >
                {resolved.map(({ widget, box }) => (
                  <div
                    key={widget.id}
                    data-testid={`public-widget-${widget.id}`}
                    data-widget-type={widget.widgetType}
                    style={
                      viewportBp === 'mobile'
                        ? undefined
                        : {
                            gridColumnStart: box.colStart,
                            gridColumnEnd: `span ${box.colSpan}`,
                          }
                    }
                    className="min-w-0"
                  >
                    <PublishedWidgetRenderer
                      widget={widget}
                      theme={theme}
                      catalog={catalog}
                      bookingModel={inferredBookingModel}
                      locationLabel={locationLabel}
                      onOpenBooking={openBookingFor}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Interactive Real-API Multi-Model Booking Modal */}
      <CustomerBookingJourney
        isOpen={bookingModalOpen}
        onOpenChange={(open) => {
          setBookingModalOpen(open);
          if (!open) {
            void refreshCatalog();
          }
        }}
        tenantId={tenantId}
        siteKey={siteKey}
        businessName={businessName}
        bookingModel={inferredBookingModel}
        brandAccentHex={theme.brandAccentHex}
        catalog={catalog}
        preselectedItemId={preselectedId}
        onBookingCompleted={() => {
          void refreshCatalog();
        }}
      />
    </div>
  );
}

function PublishedWidgetRenderer({
  widget,
  theme,
  catalog,
  bookingModel,
  locationLabel,
  onOpenBooking,
}: {
  widget: PlacedWidgetInstance;
  theme: WebsiteThemeConfig;
  catalog: PublicCatalogPayload;
  bookingModel: BookingModel;
  locationLabel: string;
  onOpenBooking: (itemId?: string) => void;
}) {
  const cfg = widget.config as Record<string, unknown>;
  const str = (k: string, fb = '') => (typeof cfg[k] === 'string' ? (cfg[k] as string) : fb);

  switch (widget.widgetType) {
    case 'hero.banner':
      return (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-6 sm:p-10 shadow-xs space-y-5">
          {str('eyebrow') && (
            <div
              style={{
                borderColor: `${theme.brandAccentHex}40`,
                color: theme.brandAccentHex,
                backgroundColor: `${theme.brandAccentHex}12`,
              }}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border"
            >
              <span
                style={{ backgroundColor: theme.brandAccentHex }}
                className="h-2 w-2 rounded-full"
              />
              <span>{str('eyebrow')}</span>
            </div>
          )}

          <h1
            data-testid="public-hero-headline"
            className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-tight"
          >
            {str('headline', 'Book Your Slot Online')}
          </h1>

          {str('subheadline') && (
            <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {str('subheadline')}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              size="lg"
              data-testid="public-book-now-btn"
              onClick={() => onOpenBooking()}
              style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
              className="gap-2 font-semibold shadow-sm"
            >
              <Calendar className="h-4 w-4" />
              <span>{str('primaryCtaLabel', 'Book Now')}</span>
            </Button>
          </div>
        </div>
      );

    case 'catalog.resource-grid':
      return (
        <Card className="p-5 sm:p-6 space-y-4 h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Trophy className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
                <span>{str('heading', 'Available Courts & Arenas')}</span>
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono">
                {catalog.resources.length} Active
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {catalog.resources.map((court) => (
                <div
                  key={court.id}
                  data-testid={`public-resource-card-${court.id}`}
                  className="rounded-xl border border-border p-4 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-foreground">{court.name}</div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {court.description}
                    </p>
                    <div className="text-xs font-mono text-muted-foreground pt-0.5">
                      Day: ₹{(court.basePriceMinor / 100).toLocaleString('en-IN')}/hr • Peak: ₹
                      {(court.peakPriceMinor / 100).toLocaleString('en-IN')}/hr
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onOpenBooking(court.id)}
                    style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
                    className="shrink-0 gap-1 text-xs font-semibold"
                  >
                    <span>Book</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      );

    case 'catalog.service-list':
      return (
        <Card className="p-5 sm:p-6 space-y-4 h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Scissors className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', 'Treatments & Services')}</span>
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono">
              {catalog.services.length} Services
            </Badge>
          </div>

          <div className="space-y-3">
            {catalog.services.map((srv) => (
              <div
                key={srv.id}
                data-testid={`public-service-card-${srv.id}`}
                className="rounded-xl border border-border p-3.5 bg-muted/15 flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm text-foreground">{srv.name}</div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {srv.description}
                  </p>
                  <span className="inline-block text-[11px] font-mono text-muted-foreground">
                    {srv.durationMinutes} mins
                  </span>
                </div>
                <div className="text-right shrink-0 space-y-1.5">
                  <div className="font-mono font-bold text-sm text-foreground">
                    ₹{(srv.priceMinor / 100).toLocaleString('en-IN')}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onOpenBooking(srv.id)}
                    style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
                    className="h-7 px-3 text-xs font-semibold"
                  >
                    Select
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      );

    case 'booking.slot-picker':
      return (
        <Card className="p-5 sm:p-6 space-y-4 h-full flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
                <span>{str('heading', 'Instant Online Reservation')}</span>
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono">
                8-Min Hold Lock
              </Badge>
            </div>

            {bookingModel === 'capacity_session' && catalog.sessions.length > 0 ? (
              <div className="space-y-2.5">
                {catalog.sessions.map((sess) => {
                  const isFull = sess.remainingCapacity <= 0;
                  return (
                    <div
                      key={sess.id}
                      data-testid={`public-session-card-${sess.id}`}
                      className="rounded-xl border border-border p-3.5 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {sess.name}
                          </span>
                          <Badge
                            data-testid={`session-capacity-badge-${sess.id}`}
                            variant={isFull ? 'destructive' : 'outline'}
                            className="text-[10px] font-mono"
                          >
                            {isFull
                              ? 'SOLD OUT (0 left)'
                              : `${sess.remainingCapacity} / ${sess.maxCapacity} seats left`}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {sess.startTime} – {sess.endTime} • Coach {sess.instructorName}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={isFull}
                        data-testid={`book-session-btn-${sess.id}`}
                        onClick={() => onOpenBooking(sess.id)}
                        style={
                          isFull
                            ? undefined
                            : { backgroundColor: theme.brandAccentHex, color: '#ffffff' }
                        }
                        className="shrink-0 text-xs font-semibold"
                      >
                        {isFull ? 'Class Full' : `Book ₹${(sess.priceMinor / 100).toLocaleString('en-IN')}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : bookingModel === 'staff_appointment' && catalog.staffMembers.length > 0 ? (
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground">
                  Available Specialists & Practitioners:
                </p>
                {catalog.staffMembers.map((st) => (
                  <div
                    key={st.id}
                    className="rounded-xl border border-border p-3 bg-muted/15 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{st.displayName}</div>
                      <div className="text-muted-foreground">{st.specialty}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {st.workingStartHour}:00–{st.workingEndHour}:00
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Live slot availability synced with venue calendar</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Protected against simultaneous double-booking</span>
                </div>
              </div>
            )}
          </div>

          <Button
            size="lg"
            data-testid="slot-picker-open-btn"
            onClick={() => onOpenBooking()}
            style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
            className="w-full font-semibold gap-2 mt-4"
          >
            <Calendar className="h-4 w-4" />
            <span>Check Live Slots & Reserve</span>
          </Button>
        </Card>
      );

    case 'content.faq': {
      const items = Array.isArray(cfg.items)
        ? (cfg.items as Array<{ question?: string; answer?: string }>)
        : [];
      return (
        <Card className="p-5 sm:p-6 space-y-4 h-full">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5" style={{ color: theme.brandAccentHex }} />
            <span>{str('heading', 'Frequently Asked Questions')}</span>
          </h2>
          <div className="space-y-3">
            {(items.length > 0
              ? items
              : [
                  {
                    question: 'How does online slot locking work?',
                    answer:
                      'Selecting a slot locks it exclusively for 8 minutes while you complete UPI or card payment.',
                  },
                ]
            ).map((it, idx) => (
              <div key={idx} className="rounded-xl border border-border p-3.5 bg-muted/15">
                <h3 className="text-sm font-semibold text-foreground">{it.question}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{it.answer}</p>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    case 'location.map-hours':
      return (
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', locationLabel)}</span>
            </h3>
            <p className="text-xs text-muted-foreground">{locationLabel}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenBooking()}
            className="gap-1.5 text-xs shrink-0"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>View Today&apos;s Open Slots</span>
          </Button>
        </div>
      );

    default:
      return (
        <Card className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4" style={{ color: theme.brandAccentHex }} />
            <span>{str('heading') || widget.widgetType}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpenBooking()}>
            Book Now
          </Button>
        </Card>
      );
  }
}
