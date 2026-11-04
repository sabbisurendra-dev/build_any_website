import type { UUID } from '@/types/domain';
import type {
  GridBox,
  PageSection,
  ViewportBreakpoint,
  WebsiteThemeConfig,
} from './layout.types';

/**
 * Client-side Zustand + Zundo (temporal undo/redo) state contract dedicated
 * strictly to the Internal Visual Website Editor canvas.
 *
 * Separation of concerns:
 * - Tracked in temporal Undo/Redo history (`EditorDocumentSlice`): `sections`, `theme`.
 * - Ephemeral UI state excluded from Undo/Redo (`EditorUiSlice`): `selectedWidgetId`,
 *   `activeBreakpoint`, `isPreviewMode`, `dragGhost`, `saveState`.
 */

export interface EditorDocumentSlice {
  readonly websiteId: UUID;
  readonly pageId: UUID;
  readonly draftRevision: number;
  readonly theme: WebsiteThemeConfig;
  readonly sections: PageSection[];
}

export interface EditorUiSlice {
  readonly activeBreakpoint: ViewportBreakpoint;
  readonly isPreviewMode: boolean;
  readonly showGridOverlay: boolean;
  readonly selectedSectionId: UUID | null;
  readonly selectedWidgetId: UUID | null;
  readonly dragGhost: {
    readonly sectionId: UUID;
    readonly widgetId: UUID;
    readonly previewBox: GridBox;
  } | null;
  readonly saveStatus: 'saved' | 'dirty' | 'saving' | 'conflict_error';
}

export interface EditorActions {
  selectWidget(sectionId: UUID | null, widgetId: UUID | null): void;
  setBreakpoint(breakpoint: ViewportBreakpoint): void;
  togglePreviewMode(enabled?: boolean): void;
  addSection(afterSectionId?: UUID): void;
  removeSection(sectionId: UUID): void;
  reorderSections(orderedSectionIds: readonly UUID[]): void;
  insertWidget(sectionId: UUID, widgetType: string, targetBox?: GridBox): void;
  duplicateWidget(sectionId: UUID, widgetId: UUID): void;
  moveRow(sectionId: UUID, fromRowStart: number, toRowStart: number): void;
  moveOrResizeWidgetInSection(sectionId: UUID, widgetId: UUID, nextBox: GridBox): void;
  updateWidgetConfig(sectionId: UUID, widgetId: UUID, patch: Record<string, unknown>): void;
  removeWidget(sectionId: UUID, widgetId: UUID): void;
  updateTheme(patch: Partial<WebsiteThemeConfig>): void;
  markDraftSaved(nextRevision: number): void;
}

export type WebsiteEditorStore = EditorDocumentSlice & EditorUiSlice & EditorActions;
