# Archived Module: Inline In-Canvas Widget Preview

- **Original Module:** `InlineWidgetCanvasPreview` inside `src/components/editor/editor-canvas.tsx`
- **Archival Date:** November 10, 2026
- **Status:** Archived & Reusable (`CATEGORY_2_ARCHIVED`)
- **Tags:** `WEBSITE_BUILDER`, `WIDGET`, `EDITOR`
- **Replacement Module:** `src/components/editor/widget-canvas-preview.tsx` (`MemoizedWidgetCanvasPreview`)

---

## 1. Purpose & Capabilities
The inline canvas preview was embedded directly within the 885-line `editor-canvas.tsx` component. It provided visual wireframes and static previews for 11 core widgets (`hero.banner`, `booking.slot-picker`, `catalog.resource-grid`, `catalog.service-list`, `content.faq`, `location.map-hours`, `booking.calendar`, `commerce.inventory-slot`, `content.course-catalog`, `commerce.subscription-plans`, and `commerce.master-ledger-slot`).

## 2. Reason for Archival from Active Source
Having 423 lines of inline widget preview rendering within `editor-canvas.tsx` caused the entire canvas to re-evaluate and re-render all preview trees whenever any drag, resize, or section placement occurred. Moving it out into `widget-canvas-preview.tsx` reduced `editor-canvas.tsx` from 885 lines to 380 lines and enabled `React.memo` wrapping.

## 3. Reuse Instructions
If a developer needs a completely standalone, self-contained single-file canvas component with zero external widget dependencies (e.g., for an isolated Storybook, embedded iframe preview, or headless export), this archived implementation can be dropped directly into any React application without needing external widget registries.
