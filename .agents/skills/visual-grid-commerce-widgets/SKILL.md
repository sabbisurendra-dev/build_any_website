---
name: visual-grid-commerce-widgets
description: >-
  Guide for building, extending, and configuring 12-column drag-and-drop Website
  Builder widgets for universal inventory, slot booking, digital courses, and
  mixed-cart checkout. Activate when working on widget-registry.ts, editor-canvas.tsx,
  editor-property-inspector.tsx, or public-site-view.tsx.
---

# Visual Grid & Universal Commerce Widgets Skill

## 1. 12-Column Responsive Grid Invariants
- **Desktop**: 12 columns (`GRID_COLUMNS.desktop = 12`).
- **Tablet**: 8 columns (`GRID_COLUMNS.tablet = 8`).
- **Mobile**: 4 columns (`GRID_COLUMNS.mobile = 4`), auto-stacking side-by-side desktop widgets vertically without overlap.
- **Collision Resolution**: Always use `moveOrResizeWidget()` and `compactVertically()` in [`src/modules/website-builder/grid-engine.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/website-builder/grid-engine.ts) when mutating widget coordinates.

## 2. Single-Slot Adaptive Inventory Rendering (`@container`)
A single UI slot on the 12-column canvas (e.g., `commerce.inventory-slot` placed in a 4-column, 6-column, or 12-column box) must be able to display available inventory items (Milk, Laptops, Turf Slots, Doctor Appointments, Yoga Classes, Courses, Subscriptions) cleanly:
- Apply CSS container queries (`@container`) or responsive column adaptation based on `box.colSpan` so:
  - `colSpan <= 4` (Compact Single Slot): Renders a vertical stack of inventory cards with live stock/availability pills and 1-click Add/Book buttons.
  - `colSpan 5..8` (Medium Slot): Renders a 2-column inventory grid.
  - `colSpan >= 9` (Wide / Full Slot): Renders a 3-column showcase grid or the full Master Inventory Matrix (`Entity | Sub-Entity | Category | Flags | Item | Timeslot | Status`).

## 3. Adding or Updating a Widget
1. Register the Zod schema, default config, sizing bounds (`defaultColSpan`, `defaultRowSpan`, `minColSpan`, `maxColSpan`), and `inspectorFields` in [`src/modules/website-builder/widget-registry.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/website-builder/widget-registry.ts).
2. Add the icon mapping and category entry in [`src/components/editor/editor-widget-palette.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/components/editor/editor-widget-palette.tsx).
3. Add the live editor preview case in `WidgetCanvasPreview` inside [`src/components/editor/editor-canvas.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/components/editor/editor-canvas.tsx).
4. Add property inspector controls in [`src/components/editor/editor-property-inspector.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/components/editor/editor-property-inspector.tsx).
5. Add the customer-facing interactive renderer in `PublishedWidgetRenderer` inside [`src/components/booking-flow/public-site-view.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/components/booking-flow/public-site-view.tsx).
