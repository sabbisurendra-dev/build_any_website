'use client';

import * as React from 'react';
import type {
  PageSection,
  PlacedWidgetInstance,
  ViewportBreakpoint,
  WebsiteThemeConfig,
  GridBox,
} from '@/modules/website-builder/layout.types';
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

export interface EditorTenantSummary {
  id: string;
  name: string;
  slug: string;
  vertical: string;
}

export interface EditorState {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  websiteId: string;
  pageId: string;
  sections: PageSection[];
  theme: WebsiteThemeConfig;
  selectedSectionId: string | null;
  selectedWidgetId: string | null;
  breakpoint: ViewportBreakpoint;
  isPreview: boolean;
  draftRevision: number;
  publishedVersion: number;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
}

export function useEditorStore(activeTenantId: string) {
  const [tenants, setTenants] = React.useState<EditorTenantSummary[]>([]);
  const [state, setState] = React.useState<EditorState>({
    tenantId: activeTenantId,
    tenantName: 'Loading workspace...',
    tenantSlug: 'kickoff-turf',
    websiteId: 'web-kickoff-turf',
    pageId: 'page-home-kickoff-turf',
    sections: [],
    theme: INITIAL_THEME,
    selectedSectionId: null,
    selectedWidgetId: null,
    breakpoint: 'desktop',
    isPreview: false,
    draftRevision: 1,
    publishedVersion: 1,
    isDirty: false,
    isLoading: true,
    isSaving: false,
  });

  const [history, setHistory] = React.useState<{
    past: Array<{ sections: PageSection[]; theme: WebsiteThemeConfig }>;
    future: Array<{ sections: PageSection[]; theme: WebsiteThemeConfig }>;
  }>({
    past: [],
    future: [],
  });

  // Load authoritative draft & published metadata from server on mount & tenant switch
  React.useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, isLoading: true }));

    fetch(`/api/platform/builder/state?tenantId=${encodeURIComponent(activeTenantId)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load builder state');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const loadedSections: PageSection[] = data.website?.draftSections ?? [];
        const loadedTheme: WebsiteThemeConfig = data.website?.draftTheme ?? INITIAL_THEME;
        const firstSec = loadedSections[0];
        const firstWidget = firstSec?.widgets[0];

        if (Array.isArray(data.tenants)) {
          setTenants(data.tenants);
        }

        setHistory({ past: [], future: [] });
        setState((prev) => ({
          ...prev,
          tenantId: data.tenant.id,
          tenantName: data.tenant.name,
          tenantSlug: data.tenant.slug,
          websiteId: data.website.websiteId,
          pageId: data.website.pageId,
          sections: loadedSections,
          theme: loadedTheme,
          selectedSectionId: firstSec?.id ?? null,
          selectedWidgetId: firstWidget?.id ?? null,
          draftRevision: data.website.draftRevision ?? 1,
          publishedVersion: data.website.publishedVersion ?? 1,
          isDirty: false,
          isLoading: false,
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTenantId]);

  const recordHistory = React.useCallback(
    (prevSections: PageSection[], prevTheme: WebsiteThemeConfig) => {
      setHistory((curr) => ({
        past: [...curr.past.slice(-25), { sections: prevSections, theme: prevTheme }],
        future: [],
      }));
    },
    [],
  );

  const selectWidget = React.useCallback(
    (sectionId: string | null, widgetId: string | null) => {
      setState((prev) => ({
        ...prev,
        selectedSectionId: sectionId,
        selectedWidgetId: widgetId,
      }));
    },
    [],
  );

  const setBreakpoint = React.useCallback((bp: ViewportBreakpoint) => {
    setState((prev) => ({ ...prev, breakpoint: bp }));
  }, []);

  const togglePreview = React.useCallback(() => {
    setState((prev) => ({ ...prev, isPreview: !prev.isPreview }));
  }, []);

  const updateTheme = React.useCallback(
    (patch: Partial<WebsiteThemeConfig>) => {
      setState((prev) => {
        recordHistory(prev.sections, prev.theme);
        return {
          ...prev,
          theme: { ...prev.theme, ...patch },
          isDirty: true,
        };
      });
    },
    [recordHistory],
  );

  const updateWidgetPlacement = React.useCallback(
    (sectionId: string, widgetId: string, nextBox: GridBox) => {
      setState((prev) => {
        recordHistory(prev.sections, prev.theme);
        const clampedColSpan = Math.max(1, Math.min(12, nextBox.colSpan));
        const clampedColStart = Math.max(
          1,
          Math.min(12 - clampedColSpan + 1, nextBox.colStart),
        );
        const clampedBox: GridBox = {
          colStart: clampedColStart,
          colSpan: clampedColSpan,
          rowStart: Math.max(1, nextBox.rowStart),
          rowSpan: Math.max(2, nextBox.rowSpan),
        };

        const updatedSections = prev.sections.map((section) => {
          if (section.id !== sectionId) return section;
          const updatedWidgets = moveOrResizeWidget(
            section.widgets,
            widgetId,
            clampedBox,
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

  const updateWidgetVisibility = React.useCallback(
    (
      sectionId: string,
      widgetId: string,
      visibilityPatch: Partial<NonNullable<PlacedWidgetInstance['visibility']>>,
    ) => {
      setState((prev) => {
        recordHistory(prev.sections, prev.theme);
        const updatedSections = prev.sections.map((section) => {
          if (section.id !== sectionId) return section;
          return {
            ...section,
            widgets: section.widgets.map((w) =>
              w.id === widgetId
                ? { ...w, visibility: { ...w.visibility, ...visibilityPatch } }
                : w,
            ),
          };
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
        const newWidgetId = `w-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 5)}`;
        const updatedSections = prev.sections.map((section) => {
          if (section.id !== sectionId) return section;

          const maxRow = section.widgets.reduce((max, w) => {
            return Math.max(
              max,
              w.placement.desktop.rowStart + w.placement.desktop.rowSpan,
            );
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
            config: JSON.parse(JSON.stringify(def.defaultConfig)),
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
          selectedWidgetId:
            prev.selectedWidgetId === widgetId ? null : prev.selectedWidgetId,
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

        const newId = `w-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 5)}`;
        const targetBox: GridBox = {
          ...targetWidget.placement.desktop,
          rowStart:
            targetWidget.placement.desktop.rowStart +
            targetWidget.placement.desktop.rowSpan,
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
        name: `Custom Section ${prev.sections.length + 1}`,
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

  const moveSection = React.useCallback(
    (secId: string, direction: 'up' | 'down') => {
      setState((prev) => {
        const idx = prev.sections.findIndex((s) => s.id === secId);
        if (idx === -1) return prev;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= prev.sections.length) return prev;

        recordHistory(prev.sections, prev.theme);
        const reordered = [...prev.sections];
        const a = reordered[idx]!;
        const b = reordered[swapIdx]!;
        reordered[idx] = b;
        reordered[swapIdx] = a;

        return {
          ...prev,
          sections: reordered.map((s, i) => ({ ...s, sortOrder: i })),
          isDirty: true,
        };
      });
    },
    [recordHistory],
  );

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

  const saveDraft = React.useCallback(async (): Promise<{
    ok: boolean;
    draftRevision?: number;
    error?: string;
  }> => {
    setState((prev) => ({ ...prev, isSaving: true }));
    try {
      const res = await fetch('/api/platform/builder/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId: state.tenantId,
          pageId: state.pageId,
          expectedDraftRevision: 0,
          sections: state.sections,
          theme: state.theme,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState((prev) => ({ ...prev, isSaving: false }));
        return { ok: false, error: data?.error?.message ?? 'Failed to save draft' };
      }

      setState((prev) => ({
        ...prev,
        draftRevision: data.draftRevision ?? prev.draftRevision + 1,
        isDirty: false,
        isSaving: false,
      }));
      return { ok: true, draftRevision: data.draftRevision };
    } catch {
      setState((prev) => ({ ...prev, isSaving: false }));
      return { ok: false, error: 'Network error while saving draft' };
    }
  }, [state.tenantId, state.pageId, state.sections, state.theme]);

  const publish = React.useCallback(async (): Promise<{
    ok: boolean;
    versionNumber?: number;
    error?: string;
  }> => {
    setState((prev) => ({ ...prev, isSaving: true }));
    try {
      const res = await fetch('/api/platform/builder/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId: state.tenantId,
          websiteId: state.websiteId,
          pageId: state.pageId,
          sections: state.sections,
          theme: state.theme,
          releaseNotes: `Published from Visual Studio (r${state.draftRevision})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState((prev) => ({ ...prev, isSaving: false }));
        return { ok: false, error: data?.error?.message ?? 'Failed to publish website' };
      }

      setState((prev) => ({
        ...prev,
        publishedVersion: data.versionNumber ?? prev.publishedVersion + 1,
        draftRevision: data.draftRevision ?? prev.draftRevision,
        isDirty: false,
        isSaving: false,
      }));
      return { ok: true, versionNumber: data.versionNumber };
    } catch {
      setState((prev) => ({ ...prev, isSaving: false }));
      return { ok: false, error: 'Network error while publishing website' };
    }
  }, [
    state.tenantId,
    state.websiteId,
    state.pageId,
    state.sections,
    state.theme,
    state.draftRevision,
  ]);

  return {
    state,
    tenants,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    selectWidget,
    setBreakpoint,
    togglePreview,
    updateTheme,
    updateWidgetPlacement,
    updateWidgetConfig,
    updateWidgetVisibility,
    insertWidget,
    deleteWidget,
    duplicateWidget,
    addSection,
    moveSection,
    deleteSection,
    undo,
    redo,
    saveDraft,
    publish,
  };
}
