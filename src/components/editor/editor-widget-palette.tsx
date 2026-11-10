'use client';

import * as React from 'react';
import {
  Sparkles,
  CalendarCheck,
  Trophy,
  Scissors,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Layers,
  Package,
  GraduationCap,
  Repeat,
  TableProperties,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CORE_WIDGET_REGISTRY } from '@/modules/website-builder/widget-registry';

interface EditorWidgetPaletteProps {
  onInsertWidget: (widgetType: string) => void;
  selectedSectionId: string | null;
}

const WIDGET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'hero.banner': Sparkles,
  'booking.slot-picker': CalendarCheck,
  'catalog.resource-grid': Trophy,
  'catalog.service-list': Scissors,
  'location.map-hours': MapPin,
  'booking.calendar': Calendar,
  'booking.time-slots': Clock,
  'commerce.inventory-slot': Package,
  'content.course-catalog': GraduationCap,
  'commerce.subscription-plans': Repeat,
  'commerce.master-ledger-slot': TableProperties,
};

export function EditorWidgetPalette({ onInsertWidget, selectedSectionId }: EditorWidgetPaletteProps) {
  const widgetList = Array.from(CORE_WIDGET_REGISTRY.values());

  const categories: Array<{ id: string; name: string }> = [
    { id: 'catalog', name: 'Universal Inventory & Catalog' },
    { id: 'booking', name: 'Live Booking Engine' },
    { id: 'marketing', name: 'Header & Marketing' },
    { id: 'location', name: 'Venue & Location' },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full overflow-hidden select-none">
      <div className="p-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Widget Palette</h3>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono py-0">
          {widgetList.length} Slots
        </Badge>
      </div>

      <div className="px-3.5 py-2 bg-primary/5 border-b border-border text-[11px] text-muted-foreground leading-snug">
        Click <span className="font-semibold text-foreground">+</span> or drag any slot onto the 12-column canvas.
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {categories.map((cat) => {
          const items = widgetList.filter((w) => w.category === cat.id);
          if (items.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                {cat.name}
              </h4>

              <div className="space-y-1.5">
                {items.map((widget) => {
                  const Icon = WIDGET_ICONS[widget.type] ?? Sparkles;
                  const isUniversalNew =
                    widget.type.startsWith('commerce.') || widget.type === 'content.course-catalog';

                  return (
                    <div
                      key={widget.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-widget-type', widget.type);
                        e.dataTransfer.effectAllowed = 'copyMove';
                      }}
                      data-testid={`palette-widget-${widget.type}`}
                      className="group flex flex-col rounded-lg border border-border p-2.5 bg-background hover:border-primary/60 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-foreground block truncate">
                              {widget.name}
                            </span>
                            {isUniversalNew && (
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                Single-Slot Adaptive
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onInsertWidget(widget.type)}
                          disabled={!selectedSectionId}
                          aria-label={`Insert ${widget.name}`}
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
                        <span>
                          Slot: {widget.sizing.minColSpan}–{widget.sizing.maxColSpan} cols (def{' '}
                          {widget.sizing.defaultColSpan})
                        </span>
                        <span className="capitalize">{widget.dataRequirement.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
