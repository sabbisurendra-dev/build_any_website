# Active Module Catalogue & Architectural Boundaries

**Project:** Build Any Website  
**Documentation Version:** 2.0 (Post-Optimization)  
**Maintained By:** Platform Architecture Team

---

## 1. Module Inventory & Ownership Matrix

### A. Website Builder & Visual Editor Subsystem
- `src/components/editor/editor-canvas.tsx`: 12-column responsive grid canvas with native HTML5 drag-and-drop, collision pushdown, and memoized widget nodes.
- `src/components/editor/widget-canvas-preview.tsx`: Size-aware, container-queried live visual wireframe preview for all 11 core widgets.
- `src/components/editor/editor-property-inspector.tsx`: Contextual inspector rendering dynamic form controls defined by Zod schemas in `widget-registry.ts`.
- `src/components/editor/use-editor-state.ts`: Visual builder state machine managing draft sections, themes, undo/redo history, and publishing.
- `src/modules/website-builder/grid-engine.ts`: Pure geometric calculation engine for 12-column collision detection, vertical pushdown compaction, and breakpoint resolution.
- `src/modules/website-builder/widget-registry.ts`: Declarative widget registry defining 11 core widgets, sizing boundaries, and inspector controls.

### B. Universal Commerce & Booking Subsystem
- `src/modules/commerce/commerce.service.ts`: Core orchestrator (`UniversalCommerceService`) coordinating physical products, multi-model bookings, 90-day digital entitlements, recurring subscriptions, and the flat `v_universal_commerce_master` projection.
- `src/modules/booking/booking.impl.ts`: Tri-model time-slot engine (`BookingServiceImpl`) enforcing GiST-style slot collision locks, 8-minute TTL holds, staff sterilization buffers, capacity counters, and Razorpay/simulated payment reconciliation.
- `src/components/booking-flow/public-site-view.tsx`: Lightweight storefront layout renderer. Dynamically imports `CustomerBookingJourney` on demand.
- `src/components/booking-flow/customer-booking-journey.tsx`: Modal booking journey wizard with live slot pickers, UPI QR payment simulator, and instant confirmation.

### C. Multi-Tenant SaaS Subsystem
- `src/middleware.ts`: Hostname router resolving `platform.*`, `app.*`, and `{tenant}.*` subdomains.
- `src/modules/auth/resolve-actor.ts`: Server-side actor resolver deriving permissions strictly from `ROLE_PERMISSION_MATRIX`.
- `src/modules/persistence/runtime-store.ts`: High-performance in-memory + debounced asynchronous persistence repository (`RuntimeStateRepository`).
- `src/app/(dashboard)/dashboard/*`: Tenant-isolated merchant operations (bookings, inventory, customers, reports, resources, services, staff).

### D. AI-COS (AI Company Operating System) Subsystem
- `src/modules/ai-cos/orchestrator/ceo-orchestrator.service.ts`: AI CEO engine handling fast-path direct questions, strategic challenges, DAG task planning, approval gating, and independent QA verification.
- `src/modules/ai-cos/persistence/cos-store.ts`: Debounced persistence repository (`CosStoreRepository`) for cycles, tasks, deliverables, and audit logs.
- `src/components/cos/founder-command-centre.tsx`: Founder command dashboard interface with 11 operational tabs.
- `src/components/cos/cos-ui-types.ts`: Shared UI types, workflow presets, and badge variant formatters.

---

## 2. Reusable Archive Cross-Reference

Any retired or superseded code is indexed in `archive/ARCHIVE_INDEX.md`. Always inspect the archive before authoring new standalone previews or legacy adapter logic.
