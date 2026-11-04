'use client';

import * as React from 'react';
import type { PageSection, PlacedWidgetInstance, ViewportBreakpoint, GridBox } from '@/modules/website-builder/layout.types';
import { resolveWidgetsForBreakpoint } from '@/modules/website-builder/grid-engine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GripVertical,
  Trash2,
  Copy,
  Plus,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  CalendarCheck2,
  Trophy,
  Scissors,
  MapPin,
  Clock,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorCanvasProps {
  sections: PageSection[];
  selectedSectionId: string | null;
  selectedWidgetId: string | null;
  breakpoint: ViewportBreakpoint;
  isPreview: boolean;
  onSelectWidget: (sectionId: string | null, widgetId: string | null) => void;
  onUpdatePlacement: (sectionId: string, widgetId: string, nextBox: GridBox) => void;
  onDeleteWidget: (sectionId: string, widgetId: string) => void;
  onDuplicateWidget: (sectionId: string, widgetId: string) => void;
  onAddSection: () => void;
  onDeleteSection: (sectionId: string) => void;
}

export function EditorCanvas({
  sections,
  selectedSectionId,
  selectedWidgetId,
  breakpoint,
  isPreview,
  onSelectWidget,
  onUpdatePlacement,
  onDeleteWidget,
  onDuplicateWidget,
  onAddSection,
  onDeleteSection,
}: EditorCanvasProps) {
  // Device viewport container width
  const containerWidthClass =
    breakpoint === 'desktop'
      ? 'max-w-[1200px]'
      : breakpoint === 'tablet'
      ? 'max-w-[768px]'
      : 'max-w-[390px]';

  return (
    <div className="flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-8 flex flex-col items-center select-none">
      <div className={cn('w-full transition-all duration-300 space-y-8', containerWidthClass)}>
        {sections.map((section, secIdx) => {
          // Resolve responsive coordinate placements
          const resolvedWidgets = resolveWidgetsForBreakpoint(section.widgets, breakpoint);
          const maxRows = Math.max(
            ...resolvedWidgets.map((rw) => rw.box.rowStart + rw.box.rowSpan - 1),
            8,
          );

          const gridColumnsCount = breakpoint === 'desktop' ? 12 : breakpoint === 'tablet' ? 8 : 4;

          return (
            <div
              key={section.id}
              onClick={() => onSelectWidget(section.id, null)}
              className={cn(
                'rounded-2xl border transition-all duration-200 overflow-hidden bg-background shadow-xs',
                selectedSectionId === section.id && !isPreview
                  ? 'border-primary ring-1 ring-primary/20'
                  : 'border-border',
              )}
            >
              {/* Section Header (Editor Mode only) */}
              {!isPreview && (
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      Section {secIdx + 1}: {section.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 font-mono">
                      {gridColumnsCount} Cols • {section.compactMode}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    {sections.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSection(section.id);
                        }}
                        aria-label="Delete section"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Grid Canvas Area */}
              <div
                className={cn(
                  'relative p-4 sm:p-6 grid gap-4 transition-all duration-200',
                  !isPreview && 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]',
                )}
                style={{
                  gridTemplateColumns: `repeat(${gridColumnsCount}, minmax(0, 1fr))`,
                  gridAutoRows: `${section.rowUnitPx}px`,
                  minHeight: `${maxRows * (section.rowUnitPx + section.gapPx)}px`,
                }}
              >
                {resolvedWidgets.map(({ widget, box }) => {
                  const isSelected = selectedWidgetId === widget.id && !isPreview;

                  return (
                    <div
                      key={widget.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWidget(section.id, widget.id);
                      }}
                      style={{
                        gridColumnStart: box.colStart,
                        gridColumnEnd: `span ${box.colSpan}`,
                        gridRowStart: box.rowStart,
                        gridRowEnd: `span ${box.rowSpan}`,
                      }}
                      className={cn(
                        'group relative flex flex-col rounded-xl overflow-hidden transition-all duration-150',
                        isPreview
                          ? 'border border-border/40 shadow-xs'
                          : isSelected
                          ? 'border-2 border-primary ring-4 ring-primary/10 shadow-md bg-card z-10'
                          : 'border border-border bg-card/90 hover:border-primary/50 shadow-xs',
                      )}
                    >
                      {/* Widget Editor Header Bar */}
                      {!isPreview && (
                        <div
                          className={cn(
                            'flex items-center justify-between px-2.5 py-1 text-[11px] border-b transition-colors',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/60 text-muted-foreground border-border',
                          )}
                        >
                          <div className="flex items-center gap-1.5 font-semibold truncate">
                            <GripVertical className="h-3.5 w-3.5 opacity-60" />
                            <span className="truncate">{widget.widgetType}</span>
                            <span className="text-[9px] opacity-80 font-mono">
                              ({box.colSpan}x{box.rowSpan})
                            </span>
                          </div>

                          {/* Widget Control Buttons */}
                          <div className="flex items-center gap-1">
                            {/* Width Resizers (Desktop 12-col) */}
                            {breakpoint === 'desktop' && (
                              <div className="flex items-center gap-0.5 mr-1">
                                <button
                                  type="button"
                                  title="Expand 1 col"
                                  disabled={box.colSpan >= 12}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdatePlacement(section.id, widget.id, {
                                      ...widget.placement.desktop,
                                      colSpan: Math.min(12, box.colSpan + 1),
                                    });
                                  }}
                                  className="h-5 w-5 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
                                >
                                  <Maximize2 className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Shrink 1 col"
                                  disabled={box.colSpan <= 3}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdatePlacement(section.id, widget.id, {
                                      ...widget.placement.desktop,
                                      colSpan: Math.max(3, box.colSpan - 1),
                                    });
                                  }}
                                  className="h-5 w-5 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
                                >
                                  <Minimize2 className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            )}

                            {/* Row Height Resizers */}
                            <button
                              type="button"
                              title="Increase row height"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdatePlacement(section.id, widget.id, {
                                  ...widget.placement.desktop,
                                  rowSpan: box.rowSpan + 1,
                                });
                              }}
                              className="h-5 w-5 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
                            >
                              <ArrowDown className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              title="Decrease row height"
                              disabled={box.rowSpan <= 3}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdatePlacement(section.id, widget.id, {
                                  ...widget.placement.desktop,
                                  rowSpan: Math.max(3, box.rowSpan - 1),
                                });
                              }}
                              className="h-5 w-5 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
                            >
                              <ArrowUp className="h-2.5 w-2.5" />
                            </button>

                            <button
                              type="button"
                              title="Duplicate widget"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateWidget(section.id, widget.id);
                              }}
                              className="h-5 w-5 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center ml-1"
                            >
                              <Copy className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete widget"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteWidget(section.id, widget.id);
                              }}
                              className="h-5 w-5 rounded hover:bg-rose-500 hover:text-white flex items-center justify-center text-rose-300"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* In-Canvas Component Preview Renderer */}
                      <div className="flex-1 p-4 overflow-hidden flex flex-col justify-center">
                        <WidgetCanvasPreview widget={widget} isPreview={isPreview} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Add Section Button (Editor Mode) */}
        {!isPreview && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={onAddSection}
              className="gap-2 border-dashed border-border hover:border-primary text-xs font-semibold py-5 px-6 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Layout Section</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Clean visual representations of widgets inside canvas
 */
function WidgetCanvasPreview({
  widget,
}: {
  widget: PlacedWidgetInstance;
  isPreview?: boolean;
}) {
  const config = widget.config as Record<string, string | number | boolean | undefined>;

  switch (widget.widgetType) {
    case 'hero.banner':
      return (
        <div className="space-y-3 text-left py-2">
          {config.eyebrow && (
            <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              {config.eyebrow}
            </Badge>
          )}
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground line-clamp-2">
            {config.headline || 'Hero Headline'}
          </h2>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {config.subheadline || 'Subheadline text describing your services.'}
          </p>
          <div className="pt-1">
            <Button size="sm" className="bg-brand-primary text-brand-fg font-semibold shadow-xs">
              {config.primaryCtaLabel || 'Book Now'}
            </Button>
          </div>
        </div>
      );

    case 'booking.slot-picker':
      return (
        <div className="space-y-3 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
              <span>{config.heading || 'Select Time Slot'}</span>
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono py-0">
              UPI Intent Active
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border p-2 bg-muted/30">
              <span className="block text-[10px] text-muted-foreground">Today Evening</span>
              <span className="font-semibold text-foreground">7:00 PM – 8:30 PM</span>
              <span className="block text-[10px] text-emerald-600 font-medium">₹1,800 • Available</span>
            </div>
            <div className="rounded-lg border border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 p-2">
              <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Selected Slot</span>
              <span className="font-semibold text-foreground">8:30 PM – 10:00 PM</span>
              <span className="block text-[10px] text-emerald-600 font-medium">₹2,200 • Instant Hold</span>
            </div>
          </div>
          <Button size="sm" className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
            Continue to Slot Lock & UPI Checkout
          </Button>
        </div>
      );

    case 'catalog.resource-grid':
      return (
        <div className="space-y-2.5 text-left">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-primary" />
            <span>{config.heading || 'Our Courts & Arenas'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border p-2.5 bg-card">
              <div className="font-semibold text-foreground">FIFA Turf 1 (7v7)</div>
              <p className="text-[10px] text-muted-foreground">Synthetic grass • Floodlights</p>
              <p className="text-[11px] font-mono font-semibold text-emerald-600 mt-1">From ₹1,200 / hr</p>
            </div>
            <div className="rounded-lg border border-border p-2.5 bg-card">
              <div className="font-semibold text-foreground">Fast Court 2 (5v5)</div>
              <p className="text-[10px] text-muted-foreground">Enclosed cage • Scoreboard</p>
              <p className="text-[11px] font-mono font-semibold text-emerald-600 mt-1">From ₹1,000 / hr</p>
            </div>
          </div>
        </div>
      );

    case 'catalog.service-list':
      return (
        <div className="space-y-2 text-left text-xs">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Scissors className="h-4 w-4 text-primary" />
            <span>{config.heading || 'Services & Consultations'}</span>
          </h3>
          <div className="space-y-1.5 border border-border rounded-lg p-2 bg-card">
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="font-medium text-foreground">Initial Consultation</span>
              <span className="font-mono font-semibold text-emerald-600">₹600</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-medium text-foreground">Full Session & Therapy</span>
              <span className="font-mono font-semibold text-emerald-600">₹1,500</span>
            </div>
          </div>
        </div>
      );

    case 'location.map-hours':
      return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left text-xs bg-muted/40 p-3 rounded-lg border border-border">
          <div className="space-y-1">
            <h4 className="font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>{config.heading || 'Location & Operating Hours'}</span>
            </h4>
            <p className="text-muted-foreground text-[11px]">Indiranagar 100 Feet Road, Bengaluru • Open 6:00 AM – 1:00 AM Daily</p>
          </div>
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
            <Clock className="h-3 w-3" />
            <span>Check All Timings</span>
          </Button>
        </div>
      );

    case 'booking.calendar':
      return (
        <div className="space-y-2 text-left text-xs">
          <h4 className="font-bold text-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>{config.heading || 'Select a Date'}</span>
          </h4>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <div className="rounded-md border border-primary bg-primary text-primary-foreground px-2.5 py-1 text-center font-medium">
              Today
            </div>
            <div className="rounded-md border border-border bg-card px-2.5 py-1 text-center">
              Fri, Nov 6
            </div>
            <div className="rounded-md border border-border bg-card px-2.5 py-1 text-center">
              Sat, Nov 7
            </div>
          </div>
        </div>
      );

    case 'booking.time-slots':
      return (
        <div className="space-y-2 text-left text-xs">
          <h4 className="font-bold text-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span>{config.heading || 'Available Slots'}</span>
          </h4>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-md border border-border px-2 py-1 bg-card">6:00 PM</span>
            <span className="rounded-md border border-emerald-500 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 font-semibold text-emerald-800 dark:text-emerald-300">
              7:30 PM (Selected)
            </span>
            <span className="rounded-md border border-border px-2 py-1 bg-card">9:00 PM</span>
          </div>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center p-4 text-xs text-muted-foreground border border-dashed rounded-lg">
          <Sparkles className="h-4 w-4 mr-2" />
          <span>{widget.widgetType}</span>
        </div>
      );
  }
}
