'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MOCK_TENANTS } from '@/lib/mock-data/mock-tenants';
import { useEditorStore } from '@/components/editor/use-editor-state';
import { EditorTopbar } from '@/components/editor/editor-topbar';
import { EditorWidgetPalette } from '@/components/editor/editor-widget-palette';
import { EditorCanvas } from '@/components/editor/editor-canvas';
import { EditorPropertyInspector } from '@/components/editor/editor-property-inspector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Building2, SlidersHorizontal, Sparkles, PlusSquare } from 'lucide-react';

function PlatformBuilderWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTenant = searchParams.get('tenant') ?? 't-kickoff-01';

  const [selectedTenantId, setSelectedTenantId] = React.useState<string>(queryTenant);
  const [mobileDrawer, setMobileDrawer] = React.useState<'none' | 'palette' | 'inspector'>(
    'none',
  );

  React.useEffect(() => {
    if (queryTenant && queryTenant !== selectedTenantId) {
      setSelectedTenantId(queryTenant);
    }
  }, [queryTenant, selectedTenantId]);

  const handleSwitchTenant = (nextTenantId: string) => {
    setSelectedTenantId(nextTenantId);
    router.replace(`/platform/builder?tenant=${encodeURIComponent(nextTenantId)}`);
  };

  const {
    state,
    tenants,
    canUndo,
    canRedo,
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
  } = useEditorStore(selectedTenantId);

  const tenantOptions = tenants.length > 0 ? tenants : MOCK_TENANTS;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-8rem)] -m-4 sm:-m-6 lg:-m-8 overflow-x-clip">
      {/* Platform Builder Sub-Header: Active Client Tenant Context & Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:inline">
              Configuring Client:
            </span>
            <Select value={state.tenantId || selectedTenantId} onValueChange={handleSwitchTenant}>
              <SelectTrigger
                data-testid="builder-tenant-select"
                className="h-8 w-52 sm:w-64 text-xs font-medium"
              >
                <SelectValue placeholder="Select business tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenantOptions.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id} className="text-xs">
                    <span className="font-medium">{tenant.name}</span>
                    <span className="text-muted-foreground ml-1.5">({tenant.slug})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile/Tablet Studio Panel Toggles */}
        <div className="flex items-center gap-2">
          {!state.isPreview && (
            <div className="flex lg:hidden items-center gap-1.5">
              <Button
                size="sm"
                variant={mobileDrawer === 'palette' ? 'default' : 'outline'}
                onClick={() =>
                  setMobileDrawer((cur) => (cur === 'palette' ? 'none' : 'palette'))
                }
                className="h-7 px-2 text-xs gap-1"
              >
                <PlusSquare className="h-3.5 w-3.5" />
                <span>Widgets</span>
              </Button>
              <Button
                size="sm"
                variant={mobileDrawer === 'inspector' ? 'default' : 'outline'}
                onClick={() =>
                  setMobileDrawer((cur) => (cur === 'inspector' ? 'none' : 'inspector'))
                }
                className="h-7 px-2 text-xs gap-1"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Inspector</span>
              </Button>
            </div>
          )}

          <div className="hidden xl:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground">Metabase Grid v2.1</span>
            </span>
            <span>•</span>
            <span>SLA Target: 1–2 Day Launch</span>
          </div>
        </div>
      </div>

      {/* Editor Main Topbar */}
      <EditorTopbar
        tenantName={state.tenantName}
        tenantSlug={state.tenantSlug}
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
        isSaving={state.isSaving}
        onSaveDraft={saveDraft}
        onPublish={publish}
      />

      {/* Responsive Mobile/Tablet Collapsible Panel */}
      {!state.isPreview && mobileDrawer !== 'none' && (
        <div className="lg:hidden border-b border-border bg-card max-h-80 overflow-y-auto">
          {mobileDrawer === 'palette' ? (
            <EditorWidgetPalette
              selectedSectionId={state.selectedSectionId}
              onInsertWidget={(widgetType) => {
                const targetSecId = state.selectedSectionId ?? state.sections[0]?.id;
                if (targetSecId) insertWidget(targetSecId, widgetType);
                setMobileDrawer('none');
              }}
            />
          ) : (
            <EditorPropertyInspector
              sections={state.sections}
              theme={state.theme}
              selectedSectionId={state.selectedSectionId}
              selectedWidgetId={state.selectedWidgetId}
              onUpdateTheme={updateTheme}
              onUpdateConfig={updateWidgetConfig}
              onUpdateVisibility={updateWidgetVisibility}
              onUpdatePlacement={updateWidgetPlacement}
              onDeleteWidget={deleteWidget}
              onDuplicateWidget={duplicateWidget}
            />
          )}
        </div>
      )}

      {/* Builder 3-Column Studio Workspace */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Widget Palette (Desktop) */}
        {!state.isPreview && (
          <aside className="hidden lg:flex w-64 border-r border-border bg-card/50 flex-col shrink-0">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Components
              </span>
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
        <main className="flex-1 overflow-y-auto bg-muted/20 p-2 sm:p-6 flex flex-col items-center min-w-0">
          <div className="w-full max-w-6xl">
            <EditorCanvas
              sections={state.sections}
              theme={state.theme}
              selectedSectionId={state.selectedSectionId}
              selectedWidgetId={state.selectedWidgetId}
              breakpoint={state.breakpoint}
              isPreview={state.isPreview}
              onSelectWidget={selectWidget}
              onUpdatePlacement={updateWidgetPlacement}
              onDeleteWidget={deleteWidget}
              onDuplicateWidget={duplicateWidget}
              onAddSection={addSection}
              onMoveSection={moveSection}
              onDeleteSection={deleteSection}
            />
          </div>
        </main>

        {/* Right: Property Inspector (Desktop) */}
        {!state.isPreview && (
          <aside className="hidden lg:flex w-80 border-l border-border bg-card flex-col shrink-0">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Properties & Theme
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <EditorPropertyInspector
                sections={state.sections}
                theme={state.theme}
                selectedSectionId={state.selectedSectionId}
                selectedWidgetId={state.selectedWidgetId}
                onUpdateTheme={updateTheme}
                onUpdateConfig={updateWidgetConfig}
                onUpdateVisibility={updateWidgetVisibility}
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

export default function PlatformBuilderPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          Loading visual website studio...
        </div>
      }
    >
      <PlatformBuilderWorkspace />
    </React.Suspense>
  );
}
