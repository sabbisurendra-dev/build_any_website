'use client';

import * as React from 'react';
import {
  Package,
  ShoppingCart,
  GraduationCap,
  Repeat,
  TableProperties,
  CalendarCheck2,
  Trophy,
  Scissors,
  HelpCircle,
  MapPin,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  PlacedWidgetInstance,
  WebsiteThemeConfig,
} from '@/modules/website-builder/layout.types';

export interface WidgetCanvasPreviewProps {
  widget: PlacedWidgetInstance;
  theme: WebsiteThemeConfig;
  colSpan?: number;
}

export function WidgetCanvasPreview({
  widget,
  theme,
  colSpan = 6,
}: WidgetCanvasPreviewProps) {
  const config = widget.config as Record<string, unknown>;
  const str = (k: string, fb = '') => (typeof config[k] === 'string' ? (config[k] as string) : fb);

  switch (widget.widgetType) {
    case 'commerce.inventory-slot': {
      const filterType = str('filterItemType', 'all');
      const displayStyle = str('displayStyle', 'cards_grid');
      const previewItems = [
        {
          type: 'physical_product',
          title: 'Farm Fresh Organic Milk (1L)',
          sub: 'Physical Stock • 50L Available • Local Delivery',
          price: '₹75 / L',
          status: 'available',
          flag: 'perishable_daily',
        },
        {
          type: 'physical_product',
          title: 'ProBook Ultra 15 Laptop',
          sub: 'Physical SKU • 5 Units • 8-Min Stock Hold',
          price: '₹74,999',
          status: 'available',
          flag: 'electronics',
        },
        {
          type: 'bookable_resource',
          title: 'Cricket Turf 1 (7:00–8:00 PM)',
          sub: 'Exclusive Resource • GiST Overlap Lock',
          price: '₹1,500 / hr',
          status: 'available',
          flag: 'exclusive_slot',
        },
        {
          type: 'digital_content',
          title: 'AI & Python Bootcamp (90-Day Access)',
          sub: 'Digital Course • Auto-Expires After 90 Days',
          price: '₹2,999',
          status: 'available',
          flag: '90_day_window',
        },
        {
          type: 'capacity_session',
          title: 'Morning Yoga Batch (20-Seat Cap)',
          sub: 'Capacity Session • 19/20 Seats Booked',
          price: '₹499 / seat',
          status: 'available',
          flag: 'max_20_seats',
        },
        {
          type: 'subscription_plan',
          title: 'OmniPass Pro Monthly Membership',
          sub: 'Recurring Entitlement • Paid-Through Expiry',
          price: '₹1,999 / mo',
          status: 'ready_to_upgrade',
          flag: 'recurring_monthly',
        },
      ].filter((it) => filterType === 'all' || it.type === filterType);

      const gridColsClass =
        displayStyle === 'compact_list' || colSpan <= 4
          ? 'grid-cols-1'
          : colSpan >= 9
          ? 'grid-cols-1 sm:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2';

      return (
        <div className="space-y-2.5 text-left text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Package className="h-4 w-4 shrink-0" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', 'Live Inventory & Instant Order Slot')}</span>
            </h3>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-mono py-0">
                Filter: {filterType}
              </Badge>
              <Badge variant="success" className="text-[10px] py-0">
                Mixed Cart Ready
              </Badge>
            </div>
          </div>

          <div className={cn('grid gap-2', gridColsClass)}>
            {previewItems.slice(0, colSpan <= 4 ? 3 : 6).map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border p-2.5 bg-card flex flex-col justify-between gap-1.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-foreground truncate">{item.title}</span>
                    <Badge
                      variant={item.status === 'ready_to_upgrade' ? 'warning' : 'success'}
                      className="text-[9px] py-0 px-1.5 shrink-0"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{item.sub}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="font-mono font-bold text-[11px]" style={{ color: theme.brandAccentHex }}>
                    {item.price}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                    <ShoppingCart className="h-2.5 w-2.5" />
                    Add / Book
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'content.course-catalog':
      return (
        <div className="space-y-2.5 text-left text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', 'Courses & Time-Limited Content (90-Day Access)')}</span>
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono py-0">
              90-Day Entitlement
            </Badge>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Full-Stack AI & Python Masterclass (42 Modules)
              </span>
              <span className="font-mono font-bold" style={{ color: theme.brandAccentHex }}>
                ₹2,999
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Grants viewing permission from T0 to T0 + 90 days. Automatically expires on Day 90.
            </p>
          </div>
        </div>
      );

    case 'commerce.subscription-plans':
      return (
        <div className="space-y-2.5 text-left text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Repeat className="h-4 w-4" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', 'Recurring Memberships & Entitlement Plans')}</span>
            </h3>
            <Badge variant="warning" className="text-[10px] py-0">
              ready_to_upgrade
            </Badge>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                OmniPass Pro Monthly Membership
              </span>
              <span className="font-mono font-bold" style={{ color: theme.brandAccentHex }}>
                ₹1,999 / mo
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Auto-renews on billing cycle; retains access through paid period end upon cancellation.
            </p>
          </div>
        </div>
      );

    case 'commerce.master-ledger-slot':
      return (
        <div className="space-y-2 text-left text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <TableProperties className="h-4 w-4" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', 'Universal Master Inventory & Permission Timeslot Matrix')}</span>
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono py-0">
              v_universal_commerce_master
            </Badge>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-muted/60 text-muted-foreground border-b border-border font-mono">
                <tr>
                  <th className="p-1.5">Entity / Sub_entity</th>
                  <th className="p-1.5">Category</th>
                  <th className="p-1.5">Flag_1 / Flag_2</th>
                  <th className="p-1.5">Item_name</th>
                  <th className="p-1.5">Permission_timeslot</th>
                  <th className="p-1.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="p-1.5 font-medium">OmniMarket / Fresh Dairy</td>
                  <td className="p-1.5">Dairy</td>
                  <td className="p-1.5 font-mono">perishable_daily</td>
                  <td className="p-1.5">Farm Fresh Milk 1L</td>
                  <td className="p-1.5 font-mono">Stock: 50L</td>
                  <td className="p-1.5 text-emerald-600 font-semibold">available</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-medium">OmniMarket / Academy</td>
                  <td className="p-1.5">Courses</td>
                  <td className="p-1.5 font-mono">90_day_permission</td>
                  <td className="p-1.5">Python Masterclass</td>
                  <td className="p-1.5 font-mono">T0 → +90 Days</td>
                  <td className="p-1.5 text-amber-600 font-semibold">ready_to_upgrade</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    case 'hero.banner':
      return (
        <div className="space-y-3 text-left py-2">
          {str('eyebrow') && (
            <Badge
              variant="outline"
              style={{ borderColor: theme.brandAccentHex, color: theme.brandAccentHex }}
              className="text-[11px] font-semibold"
            >
              {str('eyebrow')}
            </Badge>
          )}
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground line-clamp-2">
            {str('headline', 'Hero Headline')}
          </h2>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {str('subheadline', 'Subheadline text describing your services.')}
          </p>
          <div className="pt-1">
            <Button
              size="sm"
              style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
              className="font-semibold shadow-xs"
            >
              {str('primaryCtaLabel', 'Book Now')}
            </Button>
          </div>
        </div>
      );

    case 'booking.slot-picker':
      return (
        <div className="space-y-3 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <CalendarCheck2 className="h-4 w-4" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', 'Select Time Slot')}</span>
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono py-0">
              {str('bookingModel', 'exclusive_resource')}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border p-2 bg-muted/30">
              <span className="block text-[10px] text-muted-foreground">Live Slot</span>
              <span className="font-semibold text-foreground">7:00 PM – 8:00 PM</span>
              <span
                className="block text-[10px] font-medium"
                style={{ color: theme.brandAccentHex }}
              >
                Available
              </span>
            </div>
            <div
              className="rounded-lg border p-2"
              style={{ borderColor: theme.brandAccentHex }}
            >
              <span
                className="block text-[10px] font-medium"
                style={{ color: theme.brandAccentHex }}
              >
                Selected Slot
              </span>
              <span className="font-semibold text-foreground">8:00 PM – 9:00 PM</span>
              <span className="block text-[10px] text-muted-foreground">8-Min Hold</span>
            </div>
          </div>
          <Button
            size="sm"
            style={{ backgroundColor: theme.brandAccentHex, color: '#ffffff' }}
            className="w-full text-xs font-semibold"
          >
            Continue to Slot Lock & UPI Checkout
          </Button>
        </div>
      );

    case 'catalog.resource-grid':
      return (
        <div className="space-y-2.5 text-left">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Trophy className="h-4 w-4" style={{ color: theme.brandAccentHex }} />
            <span>{str('heading', 'Our Courts & Arenas')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border p-2.5 bg-card">
              <div className="font-semibold text-foreground">Primary Arena 1</div>
              <p className="text-[10px] text-muted-foreground">Floodlights • Instant Book</p>
            </div>
            <div className="rounded-lg border border-border p-2.5 bg-card">
              <div className="font-semibold text-foreground">Arena Court 2</div>
              <p className="text-[10px] text-muted-foreground">Synthetic • Scoreboard</p>
            </div>
          </div>
        </div>
      );

    case 'catalog.service-list':
      return (
        <div className="space-y-2 text-left text-xs">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Scissors className="h-4 w-4" style={{ color: theme.brandAccentHex }} />
            <span>{str('heading', 'Services & Consultations')}</span>
          </h3>
          <div className="space-y-1.5 border border-border rounded-lg p-2 bg-card">
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="font-medium text-foreground">Specialist Consultation</span>
              <span className="font-mono font-semibold" style={{ color: theme.brandAccentHex }}>
                ₹800
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-medium text-foreground">Full Treatment Session</span>
              <span className="font-mono font-semibold" style={{ color: theme.brandAccentHex }}>
                ₹1,500
              </span>
            </div>
          </div>
        </div>
      );

    case 'content.faq': {
      const items = Array.isArray(config.items)
        ? (config.items as Array<{ question?: string; answer?: string }>)
        : [];
      return (
        <div className="space-y-2 text-left text-xs">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4" style={{ color: theme.brandAccentHex }} />
            <span>{str('heading', 'Frequently Asked Questions')}</span>
          </h3>
          <div className="space-y-1.5">
            {(items.length > 0
              ? items.slice(0, 2)
              : [{ question: 'Can I reschedule online?', answer: 'Yes, up to 4 hours prior.' }]
            ).map((it, i) => (
              <div key={i} className="rounded-lg border border-border p-2 bg-card">
                <p className="font-semibold text-foreground">{it.question}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{it.answer}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'location.map-hours':
      return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left text-xs bg-muted/40 p-3 rounded-lg border border-border">
          <div className="space-y-1">
            <h4 className="font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" style={{ color: theme.brandAccentHex }} />
              <span>{str('heading', 'Location & Operating Hours')}</span>
            </h4>
            <p className="text-muted-foreground text-[11px]">
              Google Maps Directions & WhatsApp Quick Support Enabled
            </p>
          </div>
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1 shrink-0">
            <Clock className="h-3 w-3" />
            <span>Timings</span>
          </Button>
        </div>
      );

    case 'booking.calendar':
      return (
        <div className="space-y-2 text-left text-xs">
          <h4 className="font-bold text-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" style={{ color: theme.brandAccentHex }} />
            <span>{str('heading', 'Select a Date')}</span>
          </h4>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <div
              style={{ backgroundColor: theme.brandAccentHex }}
              className="rounded-md text-white px-2.5 py-1 text-center font-medium"
            >
              Today
            </div>
            <div className="rounded-md border border-border bg-card px-2.5 py-1 text-center">
              Tomorrow
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center p-4 text-xs text-muted-foreground border border-dashed rounded-lg">
          <Sparkles className="h-4 w-4 mr-2" />
          <span>{str('heading') || widget.widgetType}</span>
        </div>
      );
  }
}

export const MemoizedWidgetCanvasPreview = React.memo(WidgetCanvasPreview);
