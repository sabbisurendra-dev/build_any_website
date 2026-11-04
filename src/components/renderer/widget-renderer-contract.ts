import type { ReactNode } from 'react';
import type { PlacedWidgetInstance } from '@/modules/website-builder/layout.types';
import type { TenantContext } from '@/types/domain';

/**
 * Shared Widget Rendering Contract.
 *
 * Ensures every registered widget renders identically inside:
 * 1. Public Customer Websites (React Server Components, zero editor JS shipped)
 * 2. Internal Visual Website Editor Canvas (`renderMode: 'editor_canvas' | 'preview'`)
 */

export type WidgetRenderMode = 'published_live' | 'preview_draft' | 'editor_canvas';

export interface WidgetRendererProps<TConfig = Record<string, unknown>> {
  readonly tenant: TenantContext;
  readonly instance: PlacedWidgetInstance<TConfig>;
  readonly renderMode: WidgetRenderMode;
}

export type WidgetComponent<TConfig = Record<string, unknown>> = (
  props: WidgetRendererProps<TConfig>,
) => ReactNode | Promise<ReactNode>;
