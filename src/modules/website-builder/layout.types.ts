import type { UUID } from '@/types/domain';

/**
 * Metabase-inspired Grid Layout Data Model.
 *
 * Desktop uses a 12-column discrete coordinate grid (`colStart: 1..12`, `colSpan: 1..12`).
 * Tablet uses an 8-column grid; Mobile uses a 4-column grid (defaulting to full-width stacked).
 */

export const GRID_COLUMNS = {
  desktop: 12,
  tablet: 8,
  mobile: 4,
} as const;

export type ViewportBreakpoint = keyof typeof GRID_COLUMNS;

export interface GridBox {
  readonly colStart: number; // 1-indexed inclusive (1..maxCols)
  readonly colSpan: number; // 1..maxCols, colStart + colSpan - 1 <= maxCols
  readonly rowStart: number; // 1-indexed inclusive (1..N)
  readonly rowSpan: number; // >= 1 (discrete row units, e.g. 48px min-height on desktop)
}

export interface ResponsiveGridPlacement {
  readonly desktop: GridBox;
  readonly tablet?: GridBox;
  readonly mobile?: GridBox;
}

export interface WidgetVisualStyle {
  readonly textAlign?: 'left' | 'center' | 'right';
  readonly padding?: 'none' | 'sm' | 'md' | 'lg';
  readonly backgroundHex?: string;
  readonly textColorHex?: string;
  readonly borderVariant?: 'none' | 'subtle' | 'strong';
  readonly borderRadius?: 'inherit' | 'none' | 'sm' | 'md' | 'lg';
}

export interface PlacedWidgetInstance<TConfig = Record<string, unknown>> {
  readonly id: UUID;
  readonly widgetType: string; // Matches WidgetRegistry key, e.g. 'hero.banner'
  readonly widgetVersion: number;
  readonly placement: ResponsiveGridPlacement;
  readonly config: TConfig;
  readonly style?: WidgetVisualStyle;
  readonly visibility?: {
    readonly hideOnMobile?: boolean;
    readonly hideOnTablet?: boolean;
    readonly hideOnDesktop?: boolean;
  };
  /** Supports nested section/container widgets (PRD §5.2) */
  readonly children?: PlacedWidgetInstance[];
}

export interface PageSection {
  readonly id: UUID;
  readonly name: string;
  readonly sortOrder: number;
  readonly compactMode: 'vertical' | 'free';
  readonly rowUnitPx: number; // Default 48px on desktop
  readonly gapPx: number; // Default 16px
  readonly style: {
    readonly backgroundVariant: 'default' | 'muted' | 'brand' | 'contrast' | 'image';
    readonly backgroundImageUrl?: string;
    readonly paddingY: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    readonly fullBleed?: boolean;
  };
  readonly widgets: PlacedWidgetInstance[];
}

export interface WebsiteThemeConfig {
  readonly brandPrimaryHex: string;
  readonly brandAccentHex: string;
  readonly backgroundHex: string;
  readonly foregroundHex: string;
  readonly fontHeading: string;
  readonly fontBody: string;
  readonly borderRadiusScale: 'sharp' | 'rounded' | 'pill';
  readonly colorScheme: 'light' | 'dark';
}
