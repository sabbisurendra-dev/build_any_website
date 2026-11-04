'use client';

import * as React from 'react';
import type { PageSection, PlacedWidgetInstance, ViewportBreakpoint, WebsiteThemeConfig, GridBox } from '@/modules/website-builder/layout.types';
import { moveOrResizeWidget } from '@/modules/website-builder/grid-engine';
import { CORE_WIDGET_REGISTRY } from '@/modules/website-builder/widget-registry';

const INITIAL_THEME: WebsiteThemeConfig = {
  brandPrimaryHex: '#0f172a',
  brandAccentHex: '#16a34a',
  backgroundHex: '#ffffff',
  foregroundHex: '#090d16',
  fontHeading: 'system-ui',
  fontBody: 'system-ui',
  borderRadiusScale: 'rounded',
  colorScheme: 'light',
};

const INITIAL_SECTIONS: PageSection[] = [
  {
    id: 'sec-hero-booking-01',
    name: 'Hero Banner & Instant Turf Booking',
    sortOrder: 0,
    compactMode: 'vertical',
    rowUnitPx: 48,
    gapPx: 16,
    style: {
      backgroundVariant: 'default',
      paddingY: 'md',
      fullBleed: false,
    },
    widgets: [
      {
        id: 'w-hero-01',
        widgetType: 'hero.banner',
        widgetVersion: 1,
        placement: {
          desktop: { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 7 },
        },
        config: {
          eyebrow: 'FIFA Quality Pro Synthetic Turf • Indiranagar, Bengaluru',
          headline: 'Floodlit 5v5 & 7v7 Football Turfs — Book Online in Seconds',
          subheadline: 'Real-time availability, instant slot locking, and seamless UPI checkout with zero double bookings.',
          primaryCtaLabel: 'Select Date & Slot',
          primaryCtaHref: '#book',
          alignment: 'left',
        },
      },
      {
        id: 'w-turf-grid-02',
        widgetType: 'catalog.resource-grid',
        widgetVersion: 1,
        placement: {
          desktop: { colStart: 1, colSpan: 6, rowStart: 8, rowSpan: 8 },
        },
        config: {
          heading: 'Our Arenas & Courts',
          columnsDesktop: '2',
          showInstantBookButton: true,
        },
      },
      {
        id: 'w-slot-picker-03',
        widgetType: 'booking.slot-picker',
        widgetVersion: 1,
        placement: {
          desktop: { colStart: 7, colSpan: 6, rowStart: 8, rowSpan: 8 },
        },
        config: {
          heading: 'Reserve Your Game Slot',
          bookingModel: 'exclusive_resource',
          showPricingSummary: true,
          dateHorizonDays: 14,
        },
      },
    ],
  },
  {
    id: 'sec-location-02',
    name: 'Location, Parking & Timings',
    sortOrder: 1,
    compactMode: 'vertical',
    rowUnitPx: 48,
    gapPx: 16,
    style: {
      backgroundVariant: 'muted',
      paddingY: 'md',
      fullBleed: false,
    },
    widgets: [
      {
        id: 'w-loc-04',
        widgetType: 'location.map-hours',
        widgetVersion: 1,
        placement: {
          desktop: { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 5 },
        },
        config: {
          heading: 'Indiranagar Flagship Arena • Open 6:00 AM – 1:00 AM',
          showGoogleMapEmbed: true,
          showWhatsappButton: true,
        },
      },
    ],
  },
];

export interface EditorState {
  sections: PageSection[];
  theme: WebsiteThemeConfig;
  selectedSectionId: string | null;
  selectedWidgetId: string | null;
  breakpoint: ViewportBreakpoint;
  isPreview: boolean;
  draftRevision: number;
  publishedVersion: number;
  isDirty: boolean;
}

export function useEditorStore() {
  const [state, setState] = React.useState<EditorState>({
    sections: INITIAL_SECTIONS,
    theme: INITIAL_THEME,
    selectedSectionId: 'sec-hero-booking-01',
    selectedWidgetId: 'w-hero-01',
    breakpoint: 'desktop',
    isPreview: false,
    draftRevision: 1,
    publishedVersion: 4,
    isDirty: false,
  });

  // History stack for Undo / Redo
  const [history, setHistory] = React.useState<{
    past: Array<{ sections: PageSection[]; theme: WebsiteThemeConfig }>;
    future: Array<{ sections: PageSection[]; theme: WebsiteThemeConfig }>;
  }>({
    past: [],
    future: [],
  });

  const recordHistory = React.useCallback(
    (prevSections: PageSection[], prevTheme: WebsiteThemeConfig) => {
      setHistory((curr) => ({
        past: [...curr.past.slice(-25), { sections: prevSections, theme: prevTheme }],
        future: [],
      }));
    },
    [],
  );

  const selectWidget = React.useCallback((sectionId: string | null, widgetId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedSectionId: sectionId,
      selectedWidgetId: widgetId,
    }));
  }, []);

  const setBreakpoint = React.useCallback((bp: ViewportBreakpoint) => {
    setState((prev) => ({ ...prev, breakpoint: bp }));
  }, []);

  const togglePreview = React.useCallback(() => {
    setState((prev) => ({ ...prev, isPreview: !prev.isPreview }));
  }, []);

  const updateWidgetPlacement = React.useCallback(
    (sectionId: string, widgetId: string, nextBox: GridBox) => {
      setState((prev) => {
        recordHistory(prev.sections, prev.theme);
        const updatedSections = prev.sections.map((section) => {
          if (section.id !== sectionId) return section;
          const updatedWidgets = moveOrResizeWidget(
            section.widgets,
            widgetId,
            nextBox,
            section.compactMode,
          );
          return { ...section, widgets: updatedWidgets };
        });

        return {
          ...prev,
          sections: updatedSections,
          isDirty: true,
        };
      });
    },
    [recordHistory],
  );

  const updateWidgetConfig = React.useCallback(
    (sectionId: string, widgetId: string, patch: Record<string, unknown>) => {
      setState((prev) => {
        recordHistory(prev.sections, prev.theme);
        const updatedSections = prev.sections.map((section) => {
          if (section.id !== sectionId) return section;
          const updatedWidgets = section.widgets.map((widget) => {
            if (widget.id !== widgetId) return widget;
            return {
              ...widget,
              config: { ...widget.config, ...patch },
            };
          });
          return { ...section, widgets: updatedWidgets };
        });

        return {
          ...prev,
          sections: updatedSections,
          isDirty: true,
        };
      });
    },
    [recordHistory],
  );

  const insertWidget = React.useCallback(
    (sectionId: string, widgetType: string) => {
      const def = CORE_WIDGET_REGISTRY.get(widgetType);
      if (!def) return;

      setState((prev) => {
        recordHistory(prev.sections, prev.theme);
        const newWidgetId = `w-${Date.now().toString(36)}`;
        const updatedSections = prev.sections.map((section) => {
          if (section.id !== sectionId) return section;

          // Compute lowest unoccupied row
          const maxRow = section.widgets.reduce((max, w) => {
            return Math.max(max, w.placement.desktop.rowStart + w.placement.desktop.rowSpan);
          }, 1);

          const targetBox: GridBox = {
            colStart: 1,
            colSpan: def.sizing.defaultColSpan,
            rowStart: maxRow,
            rowSpan: def.sizing.defaultRowSpan,
          };

          const newInstance: PlacedWidgetInstance = {
            id: newWidgetId,
            widgetType: def.type,
            widgetVersion: def.version,
            placement: { desktop: targetBox },
            config: { ...def.defaultConfig },
          };

          const updatedWidgets = moveOrResizeWidget(
            [...section.widgets, newInstance],
            newWidgetId,
            targetBox,
            section.compactMode,
          );

          return { ...section, widgets: updatedWidgets };
        });

        return {
          ...prev,
          sections: updatedSections,
          selectedSectionId: sectionId,
          selectedWidgetId: newWidgetId,
          isDirty: true,
        };
      });
    },
    [recordHistory],
  );

  const deleteWidget = React.useCallback(
    (sectionId: string, widgetId: string) => {
      setState((prev) => {
        recordHistory(prev.sections, prev.theme);
        const updatedSections = prev.sections.map((section) => {
          if (section.id !== sectionId) return section;
          return {
            ...section,
            widgets: section.widgets.filter((w) => w.id !== widgetId),
          };
        });

        return {
          ...prev,
          sections: updatedSections,
          selectedWidgetId: null,
          isDirty: true,
        };
      });
    },
    [recordHistory],
  );

  const duplicateWidget = React.useCallback(
    (sectionId: string, widgetId: string) => {
      setState((prev) => {
        const targetSection = prev.sections.find((s) => s.id === sectionId);
        const targetWidget = targetSection?.widgets.find((w) => w.id === widgetId);
        if (!targetSection || !targetWidget) return prev;

        recordHistory(prev.sections, prev.theme);

        const newId = `w-${Date.now().toString(36)}`;
        const targetBox: GridBox = {
          ...targetWidget.placement.desktop,
          rowStart: targetWidget.placement.desktop.rowStart + targetWidget.placement.desktop.rowSpan,
        };

        const cloned: PlacedWidgetInstance = {
          ...targetWidget,
          id: newId,
          placement: { desktop: targetBox },
          config: JSON.parse(JSON.stringify(targetWidget.config)),
        };

        const updatedWidgets = moveOrResizeWidget(
          [...targetSection.widgets, cloned],
          newId,
          targetBox,
          targetSection.compactMode,
        );

        const updatedSections = prev.sections.map((s) =>
          s.id === sectionId ? { ...s, widgets: updatedWidgets } : s,
        );

        return {
          ...prev,
          sections: updatedSections,
          selectedWidgetId: newId,
          isDirty: true,
        };
      });
    },
    [recordHistory],
  );

  const addSection = React.useCallback(() => {
    setState((prev) => {
      recordHistory(prev.sections, prev.theme);
      const newSecId = `sec-${Date.now().toString(36)}`;
      const newSection: PageSection = {
        id: newSecId,
        name: `Section ${prev.sections.length + 1}`,
        sortOrder: prev.sections.length,
        compactMode: 'vertical',
        rowUnitPx: 48,
        gapPx: 16,
        style: {
          backgroundVariant: 'default',
          paddingY: 'md',
        },
        widgets: [],
      };

      return {
        ...prev,
        sections: [...prev.sections, newSection],
        selectedSectionId: newSecId,
        selectedWidgetId: null,
        isDirty: true,
      };
    });
  }, [recordHistory]);

  const deleteSection = React.useCallback(
    (secId: string) => {
      setState((prev) => {
        if (prev.sections.length <= 1) return prev;
        recordHistory(prev.sections, prev.theme);
        const remaining = prev.sections.filter((s) => s.id !== secId);
        return {
          ...prev,
          sections: remaining,
          selectedSectionId: remaining[0]?.id ?? null,
          selectedWidgetId: null,
          isDirty: true,
        };
      });
    },
    [recordHistory],
  );

  const undo = React.useCallback(() => {
    setHistory((curr) => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1]!;
      const newPast = curr.past.slice(0, -1);

      setState((s) => ({
        ...s,
        sections: previous.sections,
        theme: previous.theme,
        isDirty: true,
      }));

      return {
        past: newPast,
        future: [{ sections: state.sections, theme: state.theme }, ...curr.future],
      };
    });
  }, [state.sections, state.theme]);

  const redo = React.useCallback(() => {
    setHistory((curr) => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0]!;
      const newFuture = curr.future.slice(1);

      setState((s) => ({
        ...s,
        sections: next.sections,
        theme: next.theme,
        isDirty: true,
      }));

      return {
        past: [...curr.past, { sections: state.sections, theme: state.theme }],
        future: newFuture,
      };
    });
  }, [state.sections, state.theme]);

  const saveDraft = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      draftRevision: prev.draftRevision + 1,
      isDirty: false,
    }));
  }, []);

  const publish = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      publishedVersion: prev.publishedVersion + 1,
      isDirty: false,
    }));
  }, []);

  return {
    state,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    selectWidget,
    setBreakpoint,
    togglePreview,
    updateWidgetPlacement,
    updateWidgetConfig,
    insertWidget,
    deleteWidget,
    duplicateWidget,
    addSection,
    deleteSection,
    undo,
    redo,
    saveDraft,
    publish,
  };
}
