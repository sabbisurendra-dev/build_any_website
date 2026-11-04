import { describe, expect, it } from 'vitest';
import {
  gridBoxesOverlap,
  moveOrResizeWidget,
  resolveWidgetsForBreakpoint,
} from '@/modules/website-builder/grid-engine';
import type { PlacedWidgetInstance } from '@/modules/website-builder/layout.types';

describe('Metabase-inspired 12-column Grid Engine', () => {
  const baseWidgets: PlacedWidgetInstance[] = [
    {
      id: 'w-hero',
      widgetType: 'hero.banner',
      widgetVersion: 1,
      placement: { desktop: { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 8 } },
      config: {},
    },
    {
      id: 'w-left',
      widgetType: 'catalog.resource-grid',
      widgetVersion: 1,
      placement: { desktop: { colStart: 1, colSpan: 6, rowStart: 9, rowSpan: 6 } },
      config: {},
    },
    {
      id: 'w-right',
      widgetType: 'booking.slot-picker',
      widgetVersion: 1,
      placement: { desktop: { colStart: 7, colSpan: 6, rowStart: 9, rowSpan: 6 } },
      config: {},
    },
  ];

  it('pushes side-by-side widgets downward without overlap when hero expands vertically', () => {
    const updated = moveOrResizeWidget(
      baseWidgets,
      'w-hero',
      { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 10 },
      'vertical',
    );

    const hero = updated.find((w) => w.id === 'w-hero')!;
    const left = updated.find((w) => w.id === 'w-left')!;
    const right = updated.find((w) => w.id === 'w-right')!;

    expect(hero.placement.desktop.rowSpan).toBe(10);
    expect(left.placement.desktop.rowStart).toBe(11);
    expect(right.placement.desktop.rowStart).toBe(11);
    expect(gridBoxesOverlap(hero.placement.desktop, left.placement.desktop)).toBe(false);
    expect(gridBoxesOverlap(left.placement.desktop, right.placement.desktop)).toBe(false);
  });

  it('stacks side-by-side desktop widgets cleanly into 4-column full-width mobile order', () => {
    const mobileLayout = resolveWidgetsForBreakpoint(baseWidgets, 'mobile');

    expect(mobileLayout).toHaveLength(3);
    expect(mobileLayout[0]?.box).toEqual({ colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 8 });
    expect(mobileLayout[1]?.box).toEqual({ colStart: 1, colSpan: 4, rowStart: 9, rowSpan: 6 });
    expect(mobileLayout[2]?.box).toEqual({ colStart: 1, colSpan: 4, rowStart: 15, rowSpan: 6 });
  });
});
