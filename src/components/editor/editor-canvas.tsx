'use client';

import * as React from 'react';
import type {
  PageSection,
  PlacedWidgetInstance,
  ViewportBreakpoint,
  GridBox,
  WebsiteThemeConfig,
} from '@/modules/website-builder/layout.types';
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
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  CalendarCheck2,
  Trophy,
  Scissors,
  MapPin,
  Clock,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorCanvasProps {
  sections: PageSection[];
  theme: WebsiteThemeConfig;
  selectedSectionId: string | null;
  selectedWidgetId: string | null;
  breakpoint: ViewportBreakpoint;
  isPreview: boolean;
  onSelectWidget: (sectionId: string | null, widgetId: string | null) => void;
  onUpdatePlacement: (sectionId: string, widgetId: string, nextBox: GridBox) => void;
  onDeleteWidget: (sectionId: string, widgetId: string) => void;
  onDuplicateWidget: (sectionId: string, widgetId: string) => void;
  onAddSection: () => void;
  onMoveSection: (sectionId: string, direction: 'up' | 'down') => void;
  onDeleteSection: (sectionId: string) => void;
}

export function EditorCanvas({
  sections,
  theme,
  selectedSectionId,
  selectedWidgetId,
  breakpoint,
  isPreview,
  onSelectWidget,
  onUpdatePlacement,
  onDeleteWidget,
  onDuplicateWidget,
  onAddSection,
  onMoveSection,
  onDeleteSection,
}: EditorCanvasProps) {
  const [draggingWidget, setDraggingWidget] = React.useState<{
    sectionId: string;
    widgetId: string;
    colSpan: number;
    rowSpan: number;
  } | null>(null);

  const containerWidthClass =
    breakpoint === 'desktop'
      ? 'max-w-[1200px]'
      : breakpoint === 'tablet'
      ? 'max-w-[768px]'
      : 'max-w-[390px]';

  return (
    <div className="flex-1 bg-muted/20 p-3 sm:p-6 flex flex-col items-center select-none">
      <div className={cn('w-full transition-all duration-300 space-y-6', containerWidthClass)}>
        {sections.map((section, secIdx) => {
          const resolvedWidgets = resolveWidgetsForBreakpoint(section.widgets, breakpoint);
          const maxRows = Math.max(
            ...resolvedWidgets.map((rw) => rw.box.rowStart + rw.box.rowSpan - 1),
            8,
          );

          const gridColumnsCount =
            breakpoint === 'desktop' ? 12 : breakpoint === 'tablet' ? 8 : 4;

          return (
            <div
              key={section.id}
              data-testid={`editor-section-${section.id}`}
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
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 sm:px-4 py-2 text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-foreground truncate">
                      Section {secIdx + 1}: {section.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 font-mono shrink-0">
                      {gridColumnsCount} Cols
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={secIdx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSection(section.id, 'up');
                      }}
                      title="Move section up"
                      aria-label="Move section up"
                      className="h-6 w-6"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={secIdx === sections.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSection(section.id, 'down');
                      }}
                      title="Move section down"
                      aria-label="Move section down"
                      className="h-6 w-6"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
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

              {/* Grid Canvas Area with HTML5 Drop Target */}
              <div
                onDragOver={(e) => {
                  if (draggingWidget && draggingWidget.sectionId === section.id && breakpoint === 'desktop') {
                    e.preventDefault();
                  }
                }}
                onDrop={(e) => {
                  if (!draggingWidget || draggingWidget.sectionId !== section.id || breakpoint !== 'desktop') {
                    return;
                  }
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = Math.max(0, e.clientX - rect.left);
                  const relY = Math.max(0, e.clientY - rect.top);
                  const colWidth = rect.width / 12;
                  const rowHeight = section.rowUnitPx + section.gapPx;

                  const targetCol = Math.max(
                    1,
                    Math.min(13 - draggingWidget.colSpan, Math.floor(relX / colWidth) + 1),
                  );
                  const targetRow = Math.max(1, Math.floor(relY / rowHeight) + 1);

                  onUpdatePlacement(section.id, draggingWidget.widgetId, {
                    colStart: targetCol,
                    colSpan: draggingWidget.colSpan,
                    rowStart: targetRow,
                    rowSpan: draggingWidget.rowSpan,
                  });
                  setDraggingWidget(null);
                }}
                className={cn(
                  'relative p-3 sm:p-6 grid gap-4 transition-all duration-200',
                  !isPreview &&
                    'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]',
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
                      data-testid={`canvas-widget-${widget.id}`}
                      data-widget-type={widget.widgetType}
                      data-col-start={box.colStart}
                      data-col-span={box.colSpan}
                      data-row-start={box.rowStart}
                      data-row-span={box.rowSpan}
                      draggable={!isPreview && breakpoint === 'desktop'}
                      onDragStart={() => {
                        setDraggingWidget({
                          sectionId: section.id,
                          widgetId: widget.id,
                          colSpan: widget.placement.desktop.colSpan,
                          rowSpan: widget.placement.desktop.rowSpan,
                        });
                      }}
                      onDragEnd={() => setDraggingWidget(null)}
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
                            'flex items-center justify-between px-2 py-1 text-[11px] border-b transition-colors gap-1',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/60 text-muted-foreground border-border',
                          )}
                        >
                          <div className="flex items-center gap-1 font-semibold truncate min-w-0">
                            <GripVertical className="h-3.5 w-3.5 opacity-60 shrink-0 cursor-grab" />
                            <span className="truncate">{widget.widgetType}</span>
                            <span className="text-[9px] opacity-80 font-mono shrink-0">
                              (c{box.colStart}:{box.colSpan}x{box.rowSpan})
                            </span>
                          </div>

                          {/* Widget Control Buttons */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            {breakpoint === 'desktop' && (
                              <>
                                {/* Move Left / Right */}
                                <button
                                  type="button"
                                  title="Move left 1 col"
                                  disabled={box.colStart <= 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdatePlacement(section.id, widget.id, {
                                      ...widget.placement.desktop,
                                      colStart: Math.max(1, box.colStart - 1),
                                    });
                                  }}
                                  className="h-5 w-5 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
                                >
                                  <ArrowLeft className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Move right 1 col"
                                  disabled={box.colStart + box.colSpan - 1 >= 12}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdatePlacement(section.id, widget.id, {
                                      ...widget.placement.desktop,
                                      colStart: Math.min(13 - box.colSpan, box.colStart + 1),
                                    });
                                  }}
                                  className="h-5 w-5 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
                                >
                                  <ArrowRight className="h-2.5 w-2.5" />
                                </button>

                                {/* Width Resizers */}
                                <button
                                  type="button"
                                  title="Expand 1 col"
                                  disabled={box.colSpan >= 12}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextSpan = Math.min(12, box.colSpan + 1);
                                    onUpdatePlacement(section.id, widget.id, {
                                      ...widget.placement.desktop,
                                      colStart: Math.min(box.colStart, 13 - nextSpan),
                                      colSpan: nextSpan,
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
                              </>
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
                              className="h-5 w-5 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
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
                              className="h-5 w-5 rounded hover:bg-rose-500 hover:text-white flex items-center justify-center text-rose-400"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* In-Canvas Component Preview Renderer */}
                      <div className="flex-1 p-3 sm:p-4 overflow-hidden flex flex-col justify-center">
                        <WidgetCanvasPreview widget={widget} theme={theme} />
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
              data-testid="editor-add-section-btn"
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

function WidgetCanvasPreview({
  widget,
  theme,
}: {
  widget: PlacedWidgetInstance;
  theme: WebsiteThemeConfig;
}) {
  const config = widget.config as Record<string, unknown>;
  const str = (k: string, fb = '') => (typeof config[k] === 'string' ? (config[k] as string) : fb);

  switch (widget.widgetType) {
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
