import {
  GRID_COLUMNS,
  type GridBox,
  type PlacedWidgetInstance,
  type ViewportBreakpoint,
} from './layout.types';

/**
 * Pure, deterministic 2D Grid Layout Engine powering the Metabase-inspired Visual Editor.
 *
 * Guarantees:
 * 1. Bounds clamping: widgets never exceed column limits (12 desktop / 8 tablet / 4 mobile).
 * 2. Overlap-free invariant: dragging or resizing an active widget pushes colliding
 *    widgets vertically downward (`resolveCollisionsWithPushDown`) without mutating inputs.
 * 3. Vertical gravity compaction (`compactVertically`) eliminates dead vertical gaps
 *    when `section.compactMode === 'vertical'`.
 * 4. Responsive projection (`resolvePlacementForBreakpoint`) derives tablet & mobile
 *    grid coordinates automatically when explicit per-breakpoint overrides are omitted.
 */

export function clampGridBox(
  box: GridBox,
  breakpoint: ViewportBreakpoint = 'desktop',
  minColSpan = 1,
  minRowSpan = 1,
): GridBox {
  const maxCols = GRID_COLUMNS[breakpoint];
  const clampedColSpan = Math.max(minColSpan, Math.min(maxCols, Math.round(box.colSpan)));
  const maxColStart = maxCols - clampedColSpan + 1;
  const clampedColStart = Math.max(1, Math.min(maxColStart, Math.round(box.colStart)));
  const clampedRowStart = Math.max(1, Math.round(box.rowStart));
  const clampedRowSpan = Math.max(minRowSpan, Math.round(box.rowSpan));

  return {
    colStart: clampedColStart,
    colSpan: clampedColSpan,
    rowStart: clampedRowStart,
    rowSpan: clampedRowSpan,
  };
}

export function gridBoxesOverlap(a: GridBox, b: GridBox): boolean {
  const aColEnd = a.colStart + a.colSpan;
  const bColEnd = b.colStart + b.colSpan;
  const aRowEnd = a.rowStart + a.rowSpan;
  const bRowEnd = b.rowStart + b.rowSpan;

  const colsOverlap = a.colStart < bColEnd && b.colStart < aColEnd;
  const rowsOverlap = a.rowStart < bRowEnd && b.rowStart < aRowEnd;
  return colsOverlap && rowsOverlap;
}

/**
 * Places or moves/resizes `activeWidgetId` to `nextDesktopBox` and resolves all
 * cascading collisions by pushing colliding widgets downward (Metabase card push behavior).
 */
export function moveOrResizeWidget(
  widgets: readonly PlacedWidgetInstance[],
  activeWidgetId: string,
  nextDesktopBox: GridBox,
  compactMode: 'vertical' | 'free' = 'vertical',
): PlacedWidgetInstance[] {
  const clampedTarget = clampGridBox(nextDesktopBox, 'desktop');

  const working: PlacedWidgetInstance[] = widgets.map((w) =>
    w.id === activeWidgetId
      ? { ...w, placement: { ...w.placement, desktop: clampedTarget } }
      : { ...w, placement: { ...w.placement, desktop: { ...w.placement.desktop } } },
  );

  // Sort by rowStart ASC, colStart ASC, keeping active widget anchored first among collisions
  const queue: string[] = [activeWidgetId];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const blockerId = queue.shift();
    if (!blockerId) break;
    processed.add(blockerId);

    const blocker = working.find((w) => w.id === blockerId);
    if (!blocker) continue;

    for (let i = 0; i < working.length; i += 1) {
      const candidate = working[i];
      if (!candidate || candidate.id === blocker.id || candidate.id === activeWidgetId) {
        continue;
      }

      if (gridBoxesOverlap(blocker.placement.desktop, candidate.placement.desktop)) {
        const pushedRowStart =
          blocker.placement.desktop.rowStart + blocker.placement.desktop.rowSpan;
        working[i] = {
          ...candidate,
          placement: {
            ...candidate.placement,
            desktop: {
              ...candidate.placement.desktop,
              rowStart: pushedRowStart,
            },
          },
        };
        if (!processed.has(candidate.id)) {
          queue.push(candidate.id);
        }
      }
    }
  }

  return compactMode === 'vertical' ? compactVertically(working, activeWidgetId) : working;
}

/**
 * Pulls widgets upward to the highest unoccupied row while preserving relative vertical order.
 */
export function compactVertically(
  widgets: readonly PlacedWidgetInstance[],
  pinnedWidgetId?: string,
): PlacedWidgetInstance[] {
  const sorted = [...widgets].sort((a, b) => {
    if (a.placement.desktop.rowStart !== b.placement.desktop.rowStart) {
      return a.placement.desktop.rowStart - b.placement.desktop.rowStart;
    }
    return a.placement.desktop.colStart - b.placement.desktop.colStart;
  });

  const settled: PlacedWidgetInstance[] = [];

  for (const item of sorted) {
    if (item.id === pinnedWidgetId) {
      settled.push(item);
      continue;
    }

    let candidateBox: GridBox = { ...item.placement.desktop };
    while (candidateBox.rowStart > 1) {
      const shiftedUp: GridBox = { ...candidateBox, rowStart: candidateBox.rowStart - 1 };
      const collides = settled.some((placed) =>
        gridBoxesOverlap(shiftedUp, placed.placement.desktop),
      );
      if (collides) {
        break;
      }
      candidateBox = shiftedUp;
    }

    // Also ensure it doesn't overlap a pinned widget that moved upward into its original spot
    while (settled.some((placed) => gridBoxesOverlap(candidateBox, placed.placement.desktop))) {
      candidateBox = { ...candidateBox, rowStart: candidateBox.rowStart + 1 };
    }

    settled.push({
      ...item,
      placement: { ...item.placement, desktop: candidateBox },
    });
  }

  return settled;
}

/**
 * Resolves responsive coordinates for tablet (8-col) and mobile (4-col) when explicit
 * breakpoint overrides are absent.
 */
export function resolveWidgetsForBreakpoint(
  widgets: readonly PlacedWidgetInstance[],
  breakpoint: ViewportBreakpoint,
): Array<{ widget: PlacedWidgetInstance; box: GridBox }> {
  if (breakpoint === 'desktop') {
    return widgets.map((widget) => ({ widget, box: widget.placement.desktop }));
  }

  const ordered = [...widgets].sort((a, b) => {
    if (a.placement.desktop.rowStart !== b.placement.desktop.rowStart) {
      return a.placement.desktop.rowStart - b.placement.desktop.rowStart;
    }
    return a.placement.desktop.colStart - b.placement.desktop.colStart;
  });

  if (breakpoint === 'mobile') {
    let cursorRow = 1;
    return ordered.map((widget) => {
      if (widget.placement.mobile) {
        const clamped = clampGridBox(widget.placement.mobile, 'mobile');
        cursorRow = Math.max(cursorRow, clamped.rowStart + clamped.rowSpan);
        return { widget, box: clamped };
      }
      const stackedBox: GridBox = {
        colStart: 1,
        colSpan: GRID_COLUMNS.mobile,
        rowStart: cursorRow,
        rowSpan: widget.placement.desktop.rowSpan,
      };
      cursorRow += stackedBox.rowSpan;
      return { widget, box: stackedBox };
    });
  }

  // Tablet (8-column proportional projection with collision-free packing)
  const placedBoxes: GridBox[] = [];
  return ordered.map((widget) => {
    if (widget.placement.tablet) {
      const clamped = clampGridBox(widget.placement.tablet, 'tablet');
      placedBoxes.push(clamped);
      return { widget, box: clamped };
    }

    const desktop = widget.placement.desktop;
    const scaledSpan =
      desktop.colSpan >= 9 ? 8 : desktop.colSpan >= 5 ? 4 : Math.max(4, Math.round((desktop.colSpan / 12) * 8));
    const scaledStart = desktop.colStart >= 7 && scaledSpan <= 4 ? 5 : 1;

    let candidate: GridBox = clampGridBox(
      {
        colStart: scaledStart,
        colSpan: scaledSpan,
        rowStart: desktop.rowStart,
        rowSpan: desktop.rowSpan,
      },
      'tablet',
    );

    while (placedBoxes.some((existing) => gridBoxesOverlap(candidate, existing))) {
      candidate = { ...candidate, rowStart: candidate.rowStart + 1 };
    }
    placedBoxes.push(candidate);
    return { widget, box: candidate };
  });
}
