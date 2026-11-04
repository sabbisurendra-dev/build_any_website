'use client';

import * as React from 'react';
import { MOCK_TENANTS } from '@/lib/mock-data/mock-tenants';
import { useEditorStore } from '@/components/editor/use-editor-state';
import { EditorTopbar } from '@/components/editor/editor-topbar';
import { EditorWidgetPalette } from '@/components/editor/editor-widget-palette';
import { EditorCanvas } from '@/components/editor/editor-canvas';
import { EditorPropertyInspector } from '@/components/editor/editor-property-inspector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, SlidersHorizontal, Sparkles } from 'lucide-react';

export default function PlatformBuilderPage() {
  const [selectedTenantId, setSelectedTenantId] = React.useState<string>(MOCK_TENANTS[0]?.id ?? 't-kickoff-01');

  const selectedTenant = React.useMemo(() => {
    return MOCK_TENANTS.find((t) => t.id === selectedTenantId) ?? MOCK_TENANTS[0]!;
  }, [selectedTenantId]);

  const {
    state,
    canUndo,
    canRedo,
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
  } = useEditorStore();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[680px] -m-4 sm:-m-6 lg:-m-8">
      {/* Platform Builder Sub-Header: Active Client Tenant Context & Switcher */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuring Client:</span>
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger className="h-8 w-64 text-xs font-medium">
                <SelectValue placeholder="Select business tenant" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_TENANTS.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id} className="text-xs">
                    <span className="font-medium">{tenant.name}</span>
                    <span className="text-muted-foreground ml-1.5">({tenant.slug})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">Metabase Grid v2.1</span>
          </span>
          <span>•</span>
          <span>SLA Target: 1–2 Day Launch</span>
        </div>
      </div>

      {/* Editor Main Topbar */}
      <EditorTopbar
        tenantName={selectedTenant.name}
        tenantSlug={selectedTenant.slug}
        breakpoint={state.breakpoint}
        onBreakpointChange={setBreakpoint}
        isPreview={state.isPreview}
        onTogglePreview={togglePreview}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        draftRevision={state.draftRevision}
        publishedVersion={state.publishedVersion}
        isDirty={state.isDirty}
        onSaveDraft={saveDraft}
        onPublish={publish}
      />

      {/* Builder 3-Column Studio Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Widget Palette (hidden in preview) */}
        {!state.isPreview && (
          <aside className="w-64 border-r border-border bg-card/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Components</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <EditorWidgetPalette
                selectedSectionId={state.selectedSectionId}
                onInsertWidget={(widgetType) => {
                  const targetSecId = state.selectedSectionId ?? state.sections[0]?.id;
                  if (targetSecId) insertWidget(targetSecId, widgetType);
                }}
              />
            </div>
          </aside>
        )}

        {/* Center: Interactive Canvas */}
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6 flex flex-col items-center">
          <div className="w-full max-w-6xl">
            <EditorCanvas
              sections={state.sections}
              selectedSectionId={state.selectedSectionId}
              selectedWidgetId={state.selectedWidgetId}
              breakpoint={state.breakpoint}
              isPreview={state.isPreview}
              onSelectWidget={selectWidget}
              onUpdatePlacement={updateWidgetPlacement}
              onDeleteWidget={deleteWidget}
              onDuplicateWidget={duplicateWidget}
              onAddSection={addSection}
              onDeleteSection={deleteSection}
            />
          </div>
        </main>

        {/* Right: Property Inspector (hidden in preview) */}
        {!state.isPreview && (
          <aside className="w-80 border-l border-border bg-card flex flex-col shrink-0">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Properties</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <EditorPropertyInspector
                sections={state.sections}
                selectedSectionId={state.selectedSectionId}
                selectedWidgetId={state.selectedWidgetId}
                onUpdateConfig={updateWidgetConfig}
                onUpdatePlacement={updateWidgetPlacement}
                onDeleteWidget={deleteWidget}
                onDuplicateWidget={duplicateWidget}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
