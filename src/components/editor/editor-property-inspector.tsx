'use client';

import * as React from 'react';
import { Sliders, Eye, Trash2, Copy, Sparkles, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PageSection, GridBox } from '@/modules/website-builder/layout.types';
import { CORE_WIDGET_REGISTRY } from '@/modules/website-builder/widget-registry';

interface EditorPropertyInspectorProps {
  sections: PageSection[];
  selectedSectionId: string | null;
  selectedWidgetId: string | null;
  onUpdateConfig: (sectionId: string, widgetId: string, patch: Record<string, unknown>) => void;
  onUpdatePlacement: (sectionId: string, widgetId: string, nextBox: GridBox) => void;
  onDeleteWidget: (sectionId: string, widgetId: string) => void;
  onDuplicateWidget: (sectionId: string, widgetId: string) => void;
}

export function EditorPropertyInspector({
  sections,
  selectedSectionId,
  selectedWidgetId,
  onUpdateConfig,
  onUpdatePlacement,
  onDeleteWidget,
  onDuplicateWidget,
}: EditorPropertyInspectorProps) {
  const currentSection = sections.find((s) => s.id === selectedSectionId);
  const currentWidget = currentSection?.widgets.find((w) => w.id === selectedWidgetId);
  const widgetDef = currentWidget ? CORE_WIDGET_REGISTRY.get(currentWidget.widgetType) : null;

  if (!currentWidget || !currentSection) {
    return (
      <aside className="w-80 border-l border-border bg-card flex flex-col h-full p-6 text-center justify-center items-center select-none text-muted-foreground">
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Sliders className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Property Inspector</h3>
        <p className="text-xs mt-1 leading-relaxed max-w-[220px]">
          Click any widget on the canvas to visually customize its text, sizing, booking rules, and styling.
        </p>
      </aside>
    );
  }

  const config = currentWidget.config as Record<string, unknown>;
  const desktopBox = currentWidget.placement.desktop;
  const getStr = (key: string, fallback = '') => (typeof config[key] === 'string' ? (config[key] as string) : fallback);

  return (
    <aside className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
            {widgetDef?.name || currentWidget.widgetType}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Duplicate widget"
            onClick={() => onDuplicateWidget(currentSection.id, currentWidget.id)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Delete widget"
            onClick={() => onDeleteWidget(currentSection.id, currentWidget.id)}
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* 1. 12-Column Grid Sizing */}
        <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
          <h4 className="font-semibold text-foreground flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            <span>Grid Coordinates (12-Col Desktop)</span>
          </h4>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Column Span</Label>
              <Select
                value={desktopBox.colSpan.toString()}
                onValueChange={(val) =>
                  onUpdatePlacement(currentSection.id, currentWidget.id, {
                    ...desktopBox,
                    colSpan: parseInt(val, 10),
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 cols (Full Width)</SelectItem>
                  <SelectItem value="9">9 cols (Three Quarters)</SelectItem>
                  <SelectItem value="8">8 cols (Two Thirds)</SelectItem>
                  <SelectItem value="6">6 cols (Half Width)</SelectItem>
                  <SelectItem value="4">4 cols (One Third)</SelectItem>
                  <SelectItem value="3">3 cols (One Quarter)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Row Span (Height)</Label>
              <Select
                value={desktopBox.rowSpan.toString()}
                onValueChange={(val) =>
                  onUpdatePlacement(currentSection.id, currentWidget.id, {
                    ...desktopBox,
                    rowSpan: parseInt(val, 10),
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[4, 5, 6, 7, 8, 9, 10, 12, 14].map((r) => (
                    <SelectItem key={r} value={r.toString()}>
                      {r} rows ({r * 48}px)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 2. Dynamic Content Inputs based on Widget Type */}
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground uppercase text-[10px] tracking-wider text-muted-foreground">
            Content & Data Attributes
          </h4>

          {('eyebrow' in config || currentWidget.widgetType === 'hero.banner') && (
            <div className="space-y-1">
              <Label htmlFor="prop-eyebrow" className="text-[11px]">Eyebrow Badge</Label>
              <Input
                id="prop-eyebrow"
                value={getStr('eyebrow')}
                onChange={(e) => onUpdateConfig(currentSection.id, currentWidget.id, { eyebrow: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          )}

          {('headline' in config || 'heading' in config) && (
            <div className="space-y-1">
              <Label htmlFor="prop-heading" className="text-[11px]">Primary Heading</Label>
              <Input
                id="prop-heading"
                value={getStr('headline') || getStr('heading')}
                onChange={(e) =>
                  onUpdateConfig(currentSection.id, currentWidget.id, {
                    headline: e.target.value,
                    heading: e.target.value,
                  })
                }
                className="h-8 text-xs font-medium"
              />
            </div>
          )}

          {'subheadline' in config && (
            <div className="space-y-1">
              <Label htmlFor="prop-subheadline" className="text-[11px]">Subheadline</Label>
              <Textarea
                id="prop-subheadline"
                value={getStr('subheadline')}
                onChange={(e) => onUpdateConfig(currentSection.id, currentWidget.id, { subheadline: e.target.value })}
                className="text-xs min-h-[60px]"
              />
            </div>
          )}

          {'primaryCtaLabel' in config && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="prop-cta-label" className="text-[11px]">Button Label</Label>
                <Input
                  id="prop-cta-label"
                  value={getStr('primaryCtaLabel')}
                  onChange={(e) => onUpdateConfig(currentSection.id, currentWidget.id, { primaryCtaLabel: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prop-cta-href" className="text-[11px]">Button Target</Label>
                <Input
                  id="prop-cta-href"
                  value={getStr('primaryCtaHref')}
                  onChange={(e) => onUpdateConfig(currentSection.id, currentWidget.id, { primaryCtaHref: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Booking Model selection if slot picker */}
          {'bookingModel' in config && (
            <div className="space-y-1">
              <Label className="text-[11px]">Booking Engine Model</Label>
              <Select
                value={getStr('bookingModel', 'exclusive_resource')}
                onValueChange={(val) => onUpdateConfig(currentSection.id, currentWidget.id, { bookingModel: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive_resource">Model A: Exclusive Turf / Court</SelectItem>
                  <SelectItem value="staff_appointment">Model B: Staff / Clinic Appointment</SelectItem>
                  <SelectItem value="capacity_session">Model C: Yoga / Capacity Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 3. Responsive Visibility Controls */}
        <div className="space-y-3 pt-2 border-t border-border">
          <h4 className="font-semibold text-foreground uppercase text-[10px] tracking-wider text-muted-foreground flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>Responsive Visibility</span>
          </h4>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentWidget.visibility?.hideOnMobile || false}
                onChange={(e) =>
                  onUpdateConfig(currentSection.id, currentWidget.id, {
                    visibility: { ...currentWidget.visibility, hideOnMobile: e.target.checked },
                  })
                }
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="text-[11px] text-foreground">Hide on mobile screens (&lt;768px)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentWidget.visibility?.hideOnDesktop || false}
                onChange={(e) =>
                  onUpdateConfig(currentSection.id, currentWidget.id, {
                    visibility: { ...currentWidget.visibility, hideOnDesktop: e.target.checked },
                  })
                }
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="text-[11px] text-foreground">Hide on desktop screens (&ge;1024px)</span>
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
}
