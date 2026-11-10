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
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MemoizedWidgetCanvasPreview } from './widget-canvas-preview';

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
  onInsertWidget?: (sectionId: string, widgetType: string) => void;
}

interface CanvasWidgetNodeProps {
  sectionId: string;
  widget: PlacedWidgetInstance;
  box: GridBox;
  isSelected: boolean;
  isPreview: boolean;
  breakpoint: ViewportBreakpoint;
  theme: WebsiteThemeConfig;
  onSelectWidget: (sectionId: string, widgetId: string) => void;
  onUpdatePlacement: (sectionId: string, widgetId: string, nextBox: GridBox) => void;
  onDeleteWidget: (sectionId: string, widgetId: string) => void;
  onDuplicateWidget: (sectionId: string, widgetId: string) => void;
  onDragStart: (sectionId: string, widgetId: string, colSpan: number, rowSpan: number) => void;
  onDragEnd: () => void;
}

const CanvasWidgetNode = React.memo(function CanvasWidgetNode({
  sectionId,
  widget,
  box,
  isSelected,
  isPreview,
  breakpoint,
  theme,
  onSelectWidget,
  onUpdatePlacement,
  onDeleteWidget,
  onDuplicateWidget,
  onDragStart,
  onDragEnd,
}: CanvasWidgetNodeProps) {
  return (
    <div
      data-testid={`canvas-widget-${widget.id}`}
      data-widget-type={widget.widgetType}
      data-col-start={box.colStart}
      data-col-span={box.colSpan}
      data-row-start={box.rowStart}
      data-row-span={box.rowSpan}
      draggable={!isPreview && breakpoint === 'desktop'}
      onDragStart={() => {
        onDragStart(
          sectionId,
          widget.id,
          widget.placement.desktop.colSpan,
          widget.placement.desktop.rowSpan,
        );
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onSelectWidget(sectionId, widget.id);
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
                    onUpdatePlacement(sectionId, widget.id, {
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
                    onUpdatePlacement(sectionId, widget.id, {
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
                    onUpdatePlacement(sectionId, widget.id, {
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
                    onUpdatePlacement(sectionId, widget.id, {
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
                onUpdatePlacement(sectionId, widget.id, {
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
                onUpdatePlacement(sectionId, widget.id, {
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
                onDuplicateWidget(sectionId, widget.id);
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
                onDeleteWidget(sectionId, widget.id);
              }}
              className="h-5 w-5 rounded hover:bg-rose-500 hover:text-white flex items-center justify-center text-rose-400"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* In-Canvas Component Preview Renderer (Size-Aware @container Slot) */}
      <div
        style={{ containerType: 'inline-size' }}
        className="flex-1 p-3 sm:p-4 overflow-y-auto flex flex-col justify-center"
      >
        <MemoizedWidgetCanvasPreview widget={widget} theme={theme} colSpan={box.colSpan} />
      </div>
    </div>
  );
});

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
  onInsertWidget,
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

  const handleDragStart = React.useCallback(
    (sectionId: string, widgetId: string, colSpan: number, rowSpan: number) => {
      setDraggingWidget({ sectionId, widgetId, colSpan, rowSpan });
    },
    [],
  );

  const handleDragEnd = React.useCallback(() => {
    setDraggingWidget(null);
  }, []);

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
                    {onInsertWidget && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInsertWidget(section.id, 'commerce.inventory-slot');
                        }}
                        data-testid={`quick-add-inventory-slot-${section.id}`}
                        className="h-6 px-2 text-[10px] gap-1 font-semibold border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <Package className="h-3 w-3" />
                        <span>+ Inventory Slot</span>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={secIdx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSection(section.id, 'up');
                      }}
                      className="h-6 w-6"
                      title="Move section up"
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
                      className="h-6 w-6"
                      title="Move section down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={sections.length <= 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSection(section.id);
                      }}
                      className="h-6 w-6 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* 12-Column Responsive CSS Grid Canvas */}
              <div
                data-testid={`grid-canvas-${section.id}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!draggingWidget || draggingWidget.sectionId !== section.id) {
                    return;
                  }
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = e.clientX - rect.left;
                  const relY = e.clientY - rect.top;
                  const colWidth = rect.width / gridColumnsCount;
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
                {resolvedWidgets.map(({ widget, box }) => (
                  <CanvasWidgetNode
                    key={widget.id}
                    sectionId={section.id}
                    widget={widget}
                    box={box}
                    isSelected={selectedWidgetId === widget.id && !isPreview}
                    isPreview={isPreview}
                    breakpoint={breakpoint}
                    theme={theme}
                    onSelectWidget={onSelectWidget}
                    onUpdatePlacement={onUpdatePlacement}
                    onDeleteWidget={onDeleteWidget}
                    onDuplicateWidget={onDuplicateWidget}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
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
