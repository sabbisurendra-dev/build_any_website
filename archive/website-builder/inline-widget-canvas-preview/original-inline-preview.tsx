/**
 * PRESERVED ARCHIVE: Original Inline Canvas Preview Component
 * Original Location: src/components/editor/editor-canvas.tsx (lines 462-885)
 * Status: Preserved for historical provenance and standalone headless reuse.
 */
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

export function InlineWidgetCanvasPreview({
  widget,
  theme,
  colSpan = 6,
}: {
  widget: PlacedWidgetInstance;
  theme: WebsiteThemeConfig;
  colSpan?: number;
}) {
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

    default:
      return (
        <div className="flex items-center justify-center p-4 text-xs text-muted-foreground border border-dashed rounded-lg">
          <Sparkles className="h-4 w-4 mr-2" />
          <span>{str('heading') || widget.widgetType}</span>
        </div>
      );
  }
}
