# 03 — Global State Management & Metabase-Inspired Visual Editor Architecture

## 1. Global State Management Strategy

We strictly avoid dumping server entities into a monolithic client store. Every piece of state is assigned to one of five canonical owners:

| State Category | Owner / Tool | What Lives Here | Caching & Invalidation Strategy |
| :--- | :--- | :--- | :--- |
| **1. Server-Rendered Read State (RSC)** | Next.js Server Components + `unstable_cache` | Published public SMB pages, SEO metadata, initial business dashboard KPIs, tenant settings | Cached per hostname tag (`website:{domain}`); invalidated atomically via `revalidateTag` on website publish or rollback |
| **2. Dynamic Async Server State** | **TanStack Query v5** (`@tanstack/react-query`) | Live slot availability matrices, active booking calendar views, customer search results | Short `staleTime` (`15s` for availability slots; `30s` for dashboard tables); invalidated on hold creation, booking status mutation, or window focus |
| **3. Complex Interactive Canvas State** | **Zustand v5 + Immer + Zundo** (scoped strictly to Editor route) | Active page `sections` draft, `theme` draft, selected widget ID, breakpoint toggle, drag/resize ghost box, 50-step **Undo/Redo** stack | Hydrated once from `page_layouts` on editor mount; debounced auto-save (`1500ms`) or explicit Save writes `draft_revision + 1` |
| **4. Shareable Navigation & Filter State** | **URL Search Params (`nuqs`)** | Selected booking date (`?date=2026-11-06`), selected location/resource, dashboard date range & status filters | Stored in URL query string so links are bookmarkable, shareable on WhatsApp, and survive browser refresh |
| **5. Local Ephemeral / Form State** | **React `useState` / React Hook Form + Zod** | Multi-step customer checkout inputs, widget property inspector inputs, modal open/close states | Validated synchronously via shared Zod schemas before dispatching mutations |

---

## 2. Metabase-Inspired Visual Website Editor Architecture

### 2.1 Sectioned 12-Column Grid Model
Inspired by Metabase's dashboard grid, each page is an ordered list of semantic **`PageSection`** blocks, and each section hosts a **discrete 2D coordinate grid**:
- **Desktop (`>= 1024px`)**: **12 columns**, `rowUnitPx = 48` (`grid-auto-rows: minmax(48px, auto)`), `gapPx = 16`.
- **Tablet (`768px – 1023px`)**: **8 columns**, automatically projected from desktop spans unless overridden in `placement.tablet`.
- **Mobile (`< 768px`)**: **4 columns**, automatically sorted in visual reading order `(rowStart ASC, colStart ASC)` and stacked full-width (`colSpan: 4`) unless overridden in `placement.mobile`.

### 2.2 Drag, Resize & Collision Strategy (`src/modules/website-builder/grid-engine.ts`)
1. **Drag-and-Drop (`@dnd-kit/core`)**:
   - Dragging a widget from the Palette or moving an existing widget translates pointer `(x, y)` deltas into discrete `(colStart, rowStart)` grid coordinates snapped to the 12-column overlay.
   - A live drop-preview shadow (`dragGhost`) shows exact snap placement before release.
2. **Resize Handles**:
   - Selected widgets expose East (width), South (height), and South-East (2D) pointer handles bounded by `widgetDefinition.sizing` (`minColSpan`, `maxColSpan`, `minRowSpan`).
3. **Collision & Reflow (`moveOrResizeWidget`)**:
   - **Zero-overlap invariant**: Widgets in the same section never overlap.
   - **Vertical Push-Down**: Moving or expanding widget `A` into widget `B`'s coordinates pushes `B` downward (`B.rowStart = A.rowStart + A.rowSpan`), cascading cleanly down the section.
   - **Vertical Compaction (`compactMode: 'vertical'`)**: Shrinking or deleting a widget pulls lower widgets upward to close unintended dead space (can be toggled to `'free'` when intentional vertical gaps are desired).

### 2.3 Draft, Preview & Publish Lifecycle
- **Drafts**: Edits mutate `page_layouts.sections_json` guarded by optimistic concurrency (`WHERE draft_revision = $expectedRevision`).
- **Preview**: Renders the working `page_layouts` + draft `theme_config` inside an isolated responsive viewport frame (`1280px` / `820px` / `390px`) using `renderMode = 'preview_draft'`.
- **Publish**: Validates all widget configs via `CORE_WIDGET_REGISTRY`, writes an immutable snapshot into `website_versions` (`version_number = max + 1`), updates `websites.published_version_id`, logs to `audit_logs`, and calls `revalidateTag`.

---

## 3. Illustrative Layout JSON (Sports Turf Business Homepage)

Demonstrates a full-width 12-column Hero (`row 1..8`) above two side-by-side 6-column widgets (`catalog.resource-grid` and `booking.slot-picker` on `row 9..17`), followed by a full-width location & timings strip:

```json
{
  "schemaVersion": 1,
  "draftRevision": 4,
  "sections": [
    {
      "id": "sec_hero_and_booking_01",
      "name": "Hero & Instant Turf Booking",
      "sortOrder": 0,
      "compactMode": "vertical",
      "rowUnitPx": 48,
      "gapPx": 16,
      "style": {
        "backgroundVariant": "default",
        "paddingY": "lg",
        "fullBleed": false
      },
      "widgets": [
        {
          "id": "wdg_hero_01",
          "widgetType": "hero.banner",
          "widgetVersion": 1,
          "placement": {
            "desktop": { "colStart": 1, "colSpan": 12, "rowStart": 1, "rowSpan": 8 }
          },
          "config": {
            "eyebrow": "FIFA Quality Pro Synthetic Turf • Indiranagar, Bengaluru",
            "headline": "Floodlit 5v5 & 7v7 Football Turfs — Book Instantly",
            "subheadline": "Check live court slots, lock your game time, and pay via UPI in under 30 seconds.",
            "primaryCtaLabel": "Check Live Slots",
            "primaryCtaHref": "#book",
            "alignment": "left"
          }
        },
        {
          "id": "wdg_turf_cards_02",
          "widgetType": "catalog.resource-grid",
          "widgetVersion": 1,
          "placement": {
            "desktop": { "colStart": 1, "colSpan": 6, "rowStart": 9, "rowSpan": 9 }
          },
          "config": {
            "heading": "Choose Your Arena",
            "columnsDesktop": "2",
            "showInstantBookButton": true
          }
        },
        {
          "id": "wdg_slot_picker_03",
          "widgetType": "booking.slot-picker",
          "widgetVersion": 1,
          "placement": {
            "desktop": { "colStart": 7, "colSpan": 6, "rowStart": 9, "rowSpan": 9 }
          },
          "config": {
            "heading": "Select Date & Time Slot",
            "bookingModel": "exclusive_resource",
            "showPricingSummary": true,
            "dateHorizonDays": 14
          }
        }
      ]
    },
    {
      "id": "sec_location_02",
      "name": "Location & Timings",
      "sortOrder": 1,
      "compactMode": "vertical",
      "rowUnitPx": 48,
      "gapPx": 16,
      "style": {
        "backgroundVariant": "muted",
        "paddingY": "md",
        "fullBleed": false
      },
      "widgets": [
        {
          "id": "wdg_location_04",
          "widgetType": "location.map-hours",
          "widgetVersion": 1,
          "placement": {
            "desktop": { "colStart": 1, "colSpan": 12, "rowStart": 1, "rowSpan": 5 }
          },
          "config": {
            "heading": "Location, Parking & Operating Hours (6:00 AM – 1:00 AM)",
            "showGoogleMapEmbed": true,
            "showWhatsappButton": true
          }
        }
      ]
    }
  ]
}
```
