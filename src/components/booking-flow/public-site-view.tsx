'use client';

import * as React from 'react';
import {
  Calendar,
  MapPin,
  Trophy,
  ShieldCheck,
  Users,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MOCK_RESOURCES } from '@/lib/mock-data/mock-resources';
import { CustomerBookingJourney } from './customer-booking-journey';

interface PublicSiteViewProps {
  siteKey: string;
  businessName: string;
  tagline: string;
}

export function PublicSiteView({ siteKey, businessName, tagline }: PublicSiteViewProps) {
  const [bookingModalOpen, setBookingModalOpen] = React.useState(false);

  return (
    <>
      <div className="flex flex-col items-center">
        {/* HERO SECTION */}
        <section className="w-full py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/5 via-background to-background text-center">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Real-Time Online Slot Booking Active</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground">
              {businessName}
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {tagline}. Book 5v5 and 7v7 artificial turfs or box cricket cages with instant lock & zero double booking.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                size="lg"
                onClick={() => setBookingModalOpen(true)}
                className="gap-2 h-12 px-8 text-base font-semibold shadow-md"
              >
                <Calendar className="h-5 w-5" />
                <span>Book a Slot Now</span>
              </Button>

              <Button size="lg" variant="outline" asChild className="h-12 px-6 text-base">
                <a href="#courts">
                  <Trophy className="h-5 w-5 mr-2" />
                  <span>View Arenas & Rates</span>
                </a>
              </Button>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 border-t border-border/80 max-w-3xl mx-auto text-left">
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">50mm</div>
                <div className="text-xs text-muted-foreground">FIFA Pro Infill Turf</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">350 Lux</div>
                <div className="text-xs text-muted-foreground">LED Stadium Floodlights</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">8 Mins</div>
                <div className="text-xs text-muted-foreground">Redis Hold Protection</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">100%</div>
                <div className="text-xs text-muted-foreground">Instant UPI Confirmation</div>
              </div>
            </div>
          </div>
        </section>

        {/* ARENAS & COURTS CATALOG */}
        <section id="courts" className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Available Arenas & Time Slots</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Select any court below to inspect hourly rates, stadium features, and reserve your time slot online.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_RESOURCES.map((court) => (
              <Card key={court.id} className="overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-md">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider">
                      {court.type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Open Today
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-2">{court.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {court.description}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-border text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Off-peak daytime:</span>
                      <span className="font-mono font-semibold text-foreground">
                        ₹{(court.basePriceMinor / 100).toLocaleString('en-IN')}/hr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Peak floodlit evening:</span>
                      <span className="font-mono font-semibold text-foreground">
                        ₹{(court.peakPriceMinor / 100).toLocaleString('en-IN')}/hr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operating hours:</span>
                      <span className="font-mono text-foreground">{court.operatingHours}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/20 border-t border-border">
                  <Button
                    onClick={() => setBookingModalOpen(true)}
                    className="w-full gap-2 text-xs font-semibold"
                  >
                    <span>Book This Arena</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* AMENITIES & FEATURES */}
        <section className="w-full py-16 px-4 sm:px-6 lg:px-8 bg-muted/30 border-y border-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-2 mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Venue Amenities & Standards</h2>
              <p className="text-sm text-muted-foreground">Built for competitive matches, weekend corporate leagues, and training sessions.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 rounded-xl border border-border bg-card">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">Zero Double-Booking</h4>
                <p className="text-xs text-muted-foreground mt-1">Guaranteed slot concurrency locking with automated SMS voucher delivery.</p>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
                  <Zap className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">Night Floodlights</h4>
                <p className="text-xs text-muted-foreground mt-1">High-lumen glare-free stadium lighting for uninterrupted evening play.</p>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card">
                <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center mb-3">
                  <Users className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">Changing Rooms & Showers</h4>
                <p className="text-xs text-muted-foreground mt-1">Clean lockers, filtered drinking water dispensers, and spectator seating.</p>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-3">
                  <MapPin className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">Prime Bengaluru Location</h4>
                <p className="text-xs text-muted-foreground mt-1">Located in Indiranagar with dedicated parking for two-wheelers and cars.</p>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA BANNER */}
        <section className="w-full py-16 px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto p-8 rounded-2xl bg-primary text-primary-foreground space-y-4 shadow-lg">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to Play? Reserve Your Slot in 60 Seconds
            </h3>
            <p className="text-sm opacity-90 max-w-xl mx-auto">
              Choose your court, lock your slot, and receive instant confirmation directly on WhatsApp.
            </p>
            <div className="pt-2">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setBookingModalOpen(true)}
                className="gap-2 font-bold shadow-md"
              >
                <Calendar className="h-4 w-4" />
                <span>Open Instant Booking</span>
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Interactive Booking Flow Modal */}
      <CustomerBookingJourney
        isOpen={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        siteKey={siteKey}
        businessName={businessName}
      />
    </>
  );
}
