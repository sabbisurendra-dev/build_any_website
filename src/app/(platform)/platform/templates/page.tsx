import Link from 'next/link';
import { PanelsTopLeft, CheckCircle2, Layers } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STARTER_TEMPLATES = [
  {
    id: 'tmpl-sports-turf',
    name: 'Floodlit Sports Turf & Box Cricket Blueprint',
    vertical: 'Model A • Exclusive Resource',
    sampleSlug: 'kickoff-turf',
    widgetsCount: 4,
    features: ['12-Col Hero Banner', 'Multi-Arena Rate Cards', 'Peak/Off-Peak Slot Picker', 'Maps & WhatsApp CTA'],
  },
  {
    id: 'tmpl-clinic-care',
    name: 'Specialist Healthcare & Dental Clinic Blueprint',
    vertical: 'Model B • Staff Appointment',
    sampleSlug: 'smilecraft-clinic',
    widgetsCount: 4,
    features: ['Treatment Duration & Buffer Matrix', 'Doctor Roster Selector', 'Holiday Exception Support', 'Clinic Timings'],
  },
  {
    id: 'tmpl-yoga-fitness',
    name: 'Yoga Studio & Group Fitness Batch Blueprint',
    vertical: 'Model C • Capacity Session',
    sampleSlug: 'prana-yoga',
    widgetsCount: 4,
    features: ['Live Remaining Seats Badge', 'Multi-Seat Reservation', 'Studio Guidelines FAQ', 'Location & Directions'],
  },
  {
    id: 'tmpl-salon-luxe',
    name: 'Luxury Salon, Spa & Wellness Blueprint',
    vertical: 'Model B • Staff Appointment',
    sampleSlug: 'aura-salon',
    widgetsCount: 4,
    features: ['Service Menu & Pricing', 'Senior Stylist Selection', 'Turnaround Buffer Protection', 'Brand Accent Theme'],
  },
];

export default function PlatformTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Vertical Website Blueprints
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pre-engineered 12-column responsive starter templates enabling 1–2 day SMB website launches.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {STARTER_TEMPLATES.map((tmpl) => (
          <Card key={tmpl.id} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-mono">
                  {tmpl.vertical}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  {tmpl.widgetsCount} Grid Widgets
                </span>
              </div>
              <CardTitle className="text-base">{tmpl.name}</CardTitle>
              <CardDescription>
                Responsive 12/8/4-column Metabase layout ready for tenant cloning.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                {tmpl.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="border-t border-border pt-3 flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" asChild className="text-xs">
                <Link href={`/s/${tmpl.sampleSlug}`} target="_blank">
                  Live Demo Site
                </Link>
              </Button>
              <Button size="sm" asChild className="text-xs gap-1.5">
                <Link href={`/platform/builder?tenant=${tmpl.sampleSlug}`}>
                  <PanelsTopLeft className="h-3.5 w-3.5" />
                  <span>Inspect in Studio</span>
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
