# Phase 4: Repository Audit, Implementation Assessment & MVP Readiness

**Roles:** Senior Software Architect • Technical Product Manager • QA Lead  
**Workspace:** `/Users/sabbisurendra/Website Builder - Slot booking`  
**Connected GitHub Repository:** `https://github.com/sabbisurendra-dev/website_builder_slot_booking`  
**Primary Requirements Baseline:** [prd.md](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/docs/reference/prd.md) (PRD v2.0) & [market-research.md](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/docs/reference/market-research.md)

---

## 1. Executive Summary

The codebase is currently a **high-fidelity, end-to-end functional single-node prototype with production-grade domain logic and database DDL blueprints, but mocked/simulated external infrastructure**. It is **not yet ready for multi-user or public production deployment (`Not ready` for production; `Ready` only for internal single-instance demos)**.

### What Genuinely Works Today
- **Core Domain & Concurrency Logic:** All three PRD booking models (**Model A** Exclusive Resource, **Model B** Staff/Service Appointment with buffers and holiday exceptions, **Model C** Capacity Session with multi-seat reservation) execute end-to-end with lazy + cron hold expiration, idempotency replay protection, late-webhook conflict detection (`refund_pending`), and deterministic concurrency protection verified in automated tests (including **23 simultaneous customers** racing on a single final turf slot).
- **Metabase-Inspired 12-Column Visual Website Editor:** Genuinely renders a structured JSON layout (`12-col` desktop / `8-col` tablet / `4-col` mobile), supports widget insertion, HTML5 drag-and-drop repositioning, horizontal/vertical resizing, collision-free vertical compaction ([`compactLayout`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/website-builder/grid-engine.ts#L59-L108)), undo/redo, property inspection, draft persistence, and immutable published version snapshots (`v1`, `v2`, ...) isolated from subsequent drafts.
- **Static & Runtime Build Health:** `pnpm typecheck` (`0` errors), `pnpm lint` (`0` warnings/errors), `pnpm test` (`6/6` suites, `30/30` tests passing), and `pnpm build` (`23/23` Next.js routes) all pass cleanly.

### What Blocks Production MVP Launch (`P0` Gaps)
1. **Dual-Track Persistence Disconnect:** A complete 30+ table Drizzle PostgreSQL schema exists under [`src/db/schema/`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/db/schema/index.ts), **but zero runtime services query PostgreSQL**. Every service reads/writes [`RuntimeStateRepository`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/persistence/runtime-store.ts#L198-L263), which mutates an in-memory singleton backed by synchronous `fs.readFileSync`/`fs.writeFileSync` on `.runtime-state.json`. Furthermore, Drizzle table-creation migrations (`meta/_journal.json` + `CREATE TABLE` DDL) have never been generated.
2. **Simulated Authentication & Header Spoofing Vulnerability:** Supabase Auth packages are installed, **but zero login UI, session cookies, or auth middleware exist**. [`resolveRequestActor`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/auth/resolve-actor.ts#L29-L106) defaults unauthenticated requests to `platform_super_admin` or `business_owner` and honours client-supplied `x-actor-role` / `x-actor-tenant-id` headers without checking `NODE_ENV`. Additionally, [`POST /api/public/v1/bookings/[bookingId]/cancel`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/api/public/v1/bookings/%5BbookingId%5D/cancel/route.ts#L42-L48) cancels any booking without verifying caller identity or ownership.
3. **Cross-Tenant Data Leakage in 5 Server-Rendered Dashboard Sub-Pages:** While `/dashboard` and `/dashboard/bookings` filter by `tenantId`, the server components for [`/dashboard/customers`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/customers/page.tsx#L17-L22), [`/dashboard/reports`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/reports/page.tsx#L7-L20), [`/dashboard/resources`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/resources/page.tsx#L7-L23), [`/dashboard/services`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/services/page.tsx#L7-L40), and [`/dashboard/staff`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/staff/page.tsx#L7-L21) render `RuntimeStateRepository.getState()` **across all tenants with zero `tenantId` filter**.
4. **Read-Only Catalog & Schedule Views (Missing CRUD):** Neither internal configurators nor business owners can create, edit, or deactivate courts/resources, services, pricing rules, staff members, working hours, holidays, or class sessions through the UI or API—only seeded/default catalog records exist.
5. **Simulated External Integrations:** [`RazorpayGatewayAdapter.createOrder`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/payments/razorpay.adapter.ts#L55-L63) and `initiateRefund` throw `Not implemented`, [`NotificationDispatcherImpl`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/notifications/notification.impl.ts#L44-L61) marks outbox items `'sent'` in memory without calling Email/WhatsApp/SMS providers, and media/image uploads to Supabase Storage are missing.

> [!IMPORTANT]
> **Git Repository Sync Discrepancy:** Remote `origin/main` (`1dfbea0`) contains Prompts A–D. All Package 3 integration changes (`41` modified files and `7` untracked paths, including [`runtime-store.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/persistence/runtime-store.ts), [`resolve-actor.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/auth/resolve-actor.ts), `/api/dashboard/*`, and [`booking-stress-and-security.test.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/tests/unit/booking-stress-and-security.test.ts)) reside uncommitted in the local working tree. Per Phase 4 instructions, zero repository files or git commits were modified during this audit.

---

## 2. Architecture and Repository Assessment

### 2.1 Technology Stack & Framework Versions
Inspected from [package.json](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/package.json):
- **Core Runtime & Framework:** Next.js `15.5.29` (App Router, React `19.0.0`, TypeScript `5.8.2` with `strict: true` and `noUncheckedIndexedAccess: true`).
- **Styling & UI Primitives:** Tailwind CSS `4.0.14` (`@tailwindcss/postcss`), Radix UI primitives (`dialog`, `dropdown-menu`, `select`, `slot`, `switch`, `tabs`, `tooltip`), `lucide-react` `0.483.0`, `class-variance-authority`.
- **Database & ORM:** `drizzle-orm` `0.40.1`, `drizzle-kit` `0.30.6`, `postgres` (`postgres.js`) `3.4.5`.
- **Auth & Storage SDKs:** `@supabase/supabase-js` `2.49.1`, `@supabase/ssr` `0.6.1`.
- **Validation & Dates:** `zod` `3.24.2`, `date-fns` `4.1.0`, `@date-fns/tz` `1.2.0`.
- **Testing & Tooling:** Vitest `3.0.9`, ESLint `9.22.0` (`eslint-config-next`), Prettier `3.5.3`.

### 2.2 Architectural Inconsistencies & Unused Dependencies
Several packages were installed during Package 1 architecture setup **but bypassed during Package 2/3 implementation**:

| Installed Package | Intended Architectural Role | Actual Repository Usage |
|---|---|---|
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` | Pointer/touch drag-and-drop in visual editor | **Unused (`0` imports).** [`editor-canvas.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/components/editor/editor-canvas.tsx#L121-L157) uses native HTML5 `draggable`/`onDrop` + directional buttons. |
| `zustand` + `zundo` | Editor canvas store + temporal undo/redo | **Unused (`0` imports).** [`use-editor-state.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/components/editor/use-editor-state.ts#L50-L75) implements custom `React.useState` history arrays. |
| `@tanstack/react-query` | Client server-state caching & invalidation | **Mounted in [`QueryProvider`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/components/providers/query-provider.tsx), `0` `useQuery`/`useMutation` hooks used.** Components call raw `fetch()`. |
| `react-hook-form` + `@hookform/resolvers` | Validated forms | **Unused (`0` imports).** Forms use manual `React.useState` inputs. |
| `nuqs` | Type-safe URL query state | **Unused (`0` imports).** Components use `useSearchParams()`. |
| `@date-fns/tz` + `date-fns` | IANA timezone arithmetic | **Unused (`0` imports).** Components hardcode `+330 * 60_000` (`Asia/Kolkata`) offset math. |
| `drizzle-orm` + `postgres` | Relational persistence & ACID transactions | **Schema & helper defined in [`src/db/`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/db/index.ts), `0` runtime queries executed.** |

### 2.3 Frontend & Backend Architecture
- **Modular Monolith Structure:** Clean separation into three App Router route groups—[`(platform)`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(platform)/platform/layout.tsx), [`(dashboard)`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/layout.tsx), and [`(public)`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(public)/s/%5BsiteKey%5D/%5B%5B...slug%5D%5D/page.tsx)—backed by hexagonal ports (`*.port.ts`) and implementations (`*.impl.ts`) in `src/modules/*`.
- **Hostname Routing:** [`middleware.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/middleware.ts#L15-L75) cleanly routes `platform.{ROOT_DOMAIN}`, `app.{ROOT_DOMAIN}`, `{tenant}.{ROOT_DOMAIN}`, custom domains, and localhost `/platform`, `/dashboard`, `/s/{siteKey}` paths.

### 2.4 Database & Schema Assessment
- **Relational Schema Quality (Strong):** [`tenancy.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/db/schema/tenancy.ts), [`website-builder.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/db/schema/website-builder.ts), [`catalog-availability.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/db/schema/catalog-availability.ts), and [`bookings-payments.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/db/schema/bookings-payments.ts) model 30+ normalized tables with `tenant_id` foreign keys, integer minor-currency fields (`price_minor`), `jsonb` layout structures, idempotency tables, and [`withTenantTransaction`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/db/tenant-tx.ts#L16-L31) (`SET LOCAL app.current_tenant_id`).
- **Critical Migration & RLS Gaps:**
  1. [`src/db/migrations/`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/db/migrations/0000_foundation_constraints.sql) has **no `CREATE TABLE` DDL migration** and **no `meta/_journal.json`**. Running [`0000_foundation_constraints.sql`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/db/migrations/0000_foundation_constraints.sql#L26-L65) on a fresh Postgres database will immediately fail because `booking_items`, `booking_sessions`, `bookings`, and `audit_logs` do not exist yet.
  2. Row-Level Security (RLS) statements at [`0000_foundation_constraints.sql`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/db/migrations/0000_foundation_constraints.sql#L147-L150) are **commented out** (`-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;`).
  3. Runtime services completely bypass Drizzle in favour of [`RuntimeStateRepository`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/persistence/runtime-store.ts).

### 2.5 Authentication & Authorisation
- **RBAC Matrix (Well-Designed):** [`rbac.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/auth/rbac.ts#L13-L123) defines all 6 roles (`platform_super_admin`, `internal_configurator`, `client_manager`, `business_owner`, `business_staff`, `end_customer`) and 22 granular permissions with server-side `assertPlatformPermission` and `assertTenantPermission`.
- **Identity Layer (Mocked / Unsafe for Production):**
  - No login/registration/OTP screens, password reset flows, or Supabase cookie verification exist.
  - [`PlatformConsoleLayout`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(platform)/platform/layout.tsx#L9-L11) and [`BusinessDashboardLayout`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/layout.tsx#L9-L11) perform zero auth checks.
  - [`resolveRequestActor`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/auth/resolve-actor.ts#L35-L106) trusts `x-actor-role` / `x-actor-tenant-id` headers in all environments and falls back to an authenticated admin/owner when headers are absent.

### 2.6 Multi-Tenancy & Tenant Isolation
- **API Route Handlers:** Public availability/holds/checkout, builder state/draft/publish, and `/api/dashboard/bookings/*` enforce `tenantId` scoping and `assertTenantPermission` checks (verified against cross-tenant IDOR in unit tests).
- **Broken Isolation in Dashboard Server Pages (`P0`):** Five server components ([`resources/page.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/resources/page.tsx), [`services/page.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/services/page.tsx), [`staff/page.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/staff/page.tsx), [`customers/page.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/customers/page.tsx), [`reports/page.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/reports/page.tsx)) dump unfiltered `RuntimeStateRepository.getState()` collections across all tenants.

### 2.7 File & Asset Management
- **Status: `Missing`.** [`next.config.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/next.config.ts#L8-L14) whitelists `**.supabase.co/storage/v1/object/public/**` and [`env.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/lib/env.ts#L24-L25) defines bucket names, but zero upload APIs, signed-URL generators, image compression handlers, or media library UI components exist.

### 2.8 Payment & Notification Integrations
- **Payments (`Partially implemented` / `Mocked`):**
  - Constant-time HMAC-SHA256 verification works in both [`SimulatedPaymentGatewayAdapter`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/payments/simulated.adapter.ts) and [`RazorpayGatewayAdapter`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/payments/razorpay.adapter.ts#L30-L53), and [`POST /api/webhooks/razorpay`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/api/webhooks/razorpay/route.ts#L15-L49) verifies raw-body signatures and deduplicates `x-razorpay-event-id`.
  - However, [`RazorpayGatewayAdapter.createOrder`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/payments/razorpay.adapter.ts#L55-L63) and `initiateRefund` throw unimplemented errors, checkout hardcodes `SimulatedPaymentGatewayAdapter`, and pay-at-venue / partial-deposit configurable rules are not exposed in public checkout.
- **Notifications (`Mocked/placeholder`):**
  - [`NotificationDispatcherImpl`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/notifications/notification.impl.ts#L13-L61) records deduplicated outbox entries (`whatsapp`, `email`, `sms`), but no Resend/SES email adapter or Gupshup/MSG91/Meta WhatsApp/SMS adapter exists, and no scheduled reminder cron exists.

### 2.9 Environment Variables, Rate Limiting & Scalability
- **Environment Config:** Validated cleanly via Zod in [`env.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/lib/env.ts), separating `NEXT_PUBLIC_*` from server secrets. However, [`drizzle.config.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/drizzle.config.ts#L3) fails under `pnpm db:migrate` when only `.env.local` exists because `drizzle-kit` only auto-loads `.env`.
- **Scalability Bottlenecks:**
  1. [`RuntimeStateRepository.persist()`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/persistence/runtime-store.ts#L228-L246) performs synchronous `writeFileSync('.runtime-state.json')` on the main Node.js event loop and breaks completely on read-only/ephemeral serverless filesystems (Vercel/Cloud Run) or multi-instance horizontal scaling.
  2. [`checkRateLimit`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/lib/rate-limit.ts) uses an in-memory `Map` rather than Redis/Upstash (`UPSTASH_REDIS_REST_URL` is unused).

---

## 3. Feature-by-Feature Implementation Matrix

### Module A: Internal SaaS Platform (`/platform/*`)

| Feature Area | Status | What Works vs What Does Not |
|---|---|---|
| Admin Dashboard ([`/platform`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(platform)/platform/page.tsx)) | `Mocked/placeholder` | Renders polished UI cards, **but imports static `MOCK_TENANTS` and `MOCK_BOOKINGS`**, plus hardcoded telemetry strings (`"342 reservations"`). Newly provisioned tenants do not appear here (though `/platform/analytics` and `/platform/tenants` read live runtime state). |
| Tenant Creation & Management ([`/platform/tenants`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(platform)/platform/tenants/page.tsx)) | `Partially implemented` | Creating a tenant with business name, slug, vertical, city, and address works via `POST /api/platform/tenants`, seeds a starter 12-col website + default catalog, and opens the visual editor. **Missing:** editing tenant profile/status (suspend/reactivate), assigning client owner credentials, and configuring custom domains/SSL. |
| Business Configuration | `Missing` | No internal configurator UI or API to set up custom resources/courts, services, staff rosters, slot durations, pricing tiers, tax/GST rates, or cancellation policies per tenant. |
| Template Selection ([`/platform/templates`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(platform)/platform/templates/page.tsx)) | `Partially implemented` | Displays 4 vertical blueprint cards linking to sample tenants; `TenantServiceImpl.provisionTenant` auto-picks a starter layout by vertical. **Missing:** selecting a specific template during provisioning, saving a customized layout as a new reusable template, or editing master templates. |
| Preview & Publishing | `Implemented and verified` | Draft saving (`PUT /api/platform/builder/draft`), preview toggle, and immutable version publishing (`POST /api/platform/builder/publish` incrementing `v1 -> v2`) work and isolate un-published drafts from live `/s/{slug}` traffic. **Missing:** one-click rollback UI to a prior `WebsiteVersion`. |
| User Roles & Permissions | `Partially implemented` | Server-side RBAC matrix (`rbac.ts`) enforces role permissions on API routes, **but real user accounts, invitations, and session authentication are missing**. |

### Module B: Visual Website Editor — Critical Differentiator (`/platform/builder`)

| Editor Capability (PRD §5) | Status | Honest Technical Assessment |
|---|---|---|
| 12-Column Grid Layout | `Implemented and verified` | Genuine CSS Grid (`repeat(12, minmax(0, 1fr))` desktop, `8` cols tablet, `4` cols mobile) backed by [`grid-engine.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/website-builder/grid-engine.ts). |
| Drag-and-Drop Widgets | `Partially implemented` | **Works:** Existing widgets on the desktop canvas can be dragged (`draggable` + `onDrop`) to target `(col, row)` coordinates with automatic collision resolution. **Does not work:** Palette items use click-to-insert (`+`) rather than drag-from-palette; HTML5 drag-and-drop lacks live ghost drop-zone snapping previews and does not support touch devices; dragging is disabled in tablet/mobile modes. |
| Horizontal & Vertical Resizing | `Partially implemented` | **Works:** Width (`1..12` cols) and height (`rowSpan` `1..20` units) resize cleanly via canvas `-W`/`+W`/`-H`/`+H` controls and Inspector dropdowns/inputs, reflowing colliding widgets downward. **Does not work:** No interactive pointer drag-handles on widget edges/corners. |
| Widget Positioning & Ordering | `Implemented and verified` | Explicit `colStart`, `colSpan`, `rowStart`, `rowSpan` coordinates + directional nudge controls + deterministic top-to-bottom, left-to-right compaction (`compactLayout`). |
| Adding & Removing Sections | `Implemented and verified` | Add section, move section up/down, delete section, and switch section background variant (`default` / `muted` / `brand`) all work and persist. |
| Widget Properties Panel | `Partially implemented` | [`EditorPropertyInspector`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/components/editor/editor-property-inspector.tsx) edits headline, eyebrow, subheadline, CTA label, heading, booking model, visibility toggle, brand accent hex, and corner radius. **Missing:** image/logo uploaders, rich content lists (FAQs, gallery items, testimonials), SEO metadata fields, and per-widget spacing/style controls. |
| Responsive Layouts | `Partially implemented` | Viewport switcher (`Desktop 12` / `Tablet 8` / `Mobile 4`) clamps spans automatically via [`resolveWidgetsForBreakpoint`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/website-builder/grid-engine.ts#L172-L202). **Gaps:** Breakpoint-specific overrides (`placement.tablet` / `placement.mobile`) cannot be edited in the UI because canvas manipulation is locked when `breakpoint !== 'desktop'`; also [`PublicSiteView`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/components/booking-flow/public-site-view.tsx#L151-L158) applies `colStart`/`colSpan` on live sites but omits `rowStart`/`rowSpan` and uses client `window.innerWidth` (`useEffect`) rather than pure SSR-safe CSS media queries. |
| Structured Data Persistence | `Implemented and verified` | Layouts persist strictly as typed JSON (`PageSection[]`, `PlacedWidgetInstance`, `WebsiteThemeConfig`)—zero hardcoded HTML blobs. (Currently stored in `RuntimeStateRepository`; needs migration to Postgres `page_layouts` & `website_versions` tables.) |
| Widget Catalog Breadth & Multi-Page | `Partially implemented` | **7 widgets** exist in [`CORE_WIDGET_REGISTRY`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/website-builder/widget-registry.ts) vs ~25+ in PRD §5.5 (missing gallery, reviews/testimonials, pricing table, contact/lead form, staff profile cards, custom header/footer config). Multi-page management (Home, Services, About, Contact, Policy pages) and `beforeunload` unsaved-changes guard are missing. |

### Module C: Booking Engine (`src/modules/booking/*`)

| Booking Engine Capability | Status | Honest Technical Assessment |
|---|---|---|
| Model 1: Exclusive Resource (`exclusive_resource`) | `Implemented and verified` | Hourly turf/court slot generation, daytime vs peak (18:00+ IST) pricing, exclusive slot holds, double-booking rejection (`SLOT_UNAVAILABLE`), and 23-customer simultaneous race verified in memory. |
| Model 2: Staff/Service Appointment (`staff_appointment`) | `Implemented and verified` | Service duration + `bufferAfterMinutes` turnaround enforcement, eligible staff filtering, daily break hours, full-day holiday exceptions (`schedule_exceptions`), and overlapping appointment prevention work. **Gap:** `"Any available staff"` auto-assignment mode (PRD §6.2) is not implemented. |
| Model 3: Capacity Session (`capacity_session`) | `Implemented and verified` | Multi-seat quantity booking, atomic `bookedCount + heldCount + quantity <= maxCapacity` enforcement, live remaining seat count, and `CAPACITY_EXCEEDED` guard verified under concurrency. |
| Holds, Expiration & Lifecycle | `Implemented and verified` | 8-minute (`480s`) temporary holds (`booking_holds`), lazy sweep on every availability/hold/checkout call + Bearer-authenticated cron endpoint (`POST /api/internal/cron/expire-holds`), and lifecycle states (`temporarily_held`, `confirmed`, `completed`, `cancelled`, `expired`, `refund_pending`) work. **Gap:** `no_show` status action and minimum notice / max advance booking window rules are not enforced. |
| Concurrency, Transactions & Idempotency | `Partially implemented` | In-process concurrency + `Idempotency-Key` deduplication work cleanly in single-process Node.js. **Critical Gap:** Not yet wired to PostgreSQL `withTenantTransaction` + `EXCLUDE USING gist` / `SELECT ... FOR UPDATE`, so concurrency guarantees would **not** hold across multiple serverless instances. |
| Pricing & Payment Recovery | `Partially implemented` | Server-authoritative paise calculation and late-webhook conflict recovery (`refund_pending` + automatic refund record) work. **Missing:** GST/tax breakdown, discount/promo codes, weekend/holiday dynamic pricing rules, and real Razorpay Orders/Refunds API calls. |

### Module D: Business Owner Dashboard (`/dashboard/*`)

| Dashboard Sub-Module | Status | Honest Technical Assessment |
|---|---|---|
| Booking Management (`/dashboard`, `/dashboard/bookings`) | `Partially implemented` | List view, Court×Hour Day Matrix, status filter, search, walk-in creation (Model A), check-in (`completed`), cancellation (frees slot immediately), and atomic rescheduling work. **Gaps:** Hardcoded demo dates (`2026-11-04..07` in calendar, `2026-11-05` in walk-in), no Week view, no walk-in form for Model B/C, no CSV export. |
| Resources (`/dashboard/resources`) | `Partially implemented` | **Read-only card list** + **missing `tenantId` filter (cross-tenant leak)**. Cannot add, edit, or mark a court under maintenance. |
| Services & Sessions (`/dashboard/services`) | `Partially implemented` | **Read-only card list** + **missing `tenantId` filter (cross-tenant leak)**. Cannot add/edit services, durations, buffers, prices, or class sessions. |
| Staff & Schedules (`/dashboard/staff`) | `Partially implemented` | **Read-only card list** + **missing `tenantId` filter (cross-tenant leak)**. Cannot add/edit staff, working hours, breaks, or holiday/leave exceptions. |
| Customers (`/dashboard/customers`) | `Partially implemented` | **Read-only aggregated view** + **missing `tenantId` filter (cross-tenant PII leak)**. No search, customer booking history drawer, or notes. |
| Reports (`/dashboard/reports`) | `Partially implemented` | **Read-only KPI summary** + **missing `tenantId` filter (aggregates all tenants)**. No date-range filter, peak-hour utilization chart, or CSV export. |
| Settings (`/dashboard/settings`) | `Mocked/placeholder` | Displays two static informational policy cards; zero editable settings (business profile, logo, contact hours, cancellation policy, GST, payment keys). |

### Module E: Customer-Facing Website (`/s/[siteKey]/[[...slug]]`)

| Customer Website Area | Status | Honest Technical Assessment |
|---|---|---|
| Website Rendering & Mobile Responsiveness | `Implemented and verified` | Renders published tenant layouts and custom accent colours cleanly across Desktop (`1440px`), Tablet (`768px`), and Mobile (`375px`) with `0px` horizontal overflow (`24/24` Chrome viewport checks passed). Header includes WhatsApp click-to-chat and mobile drawer. |
| Multi-Model Booking Journeys | `Partially implemented` | End-to-end modal flow (`Offering -> Date & Live Slot -> Contact -> 8m Hold & Checkout -> Voucher`) works for all 3 models with live server availability and decline-retry UX. **Gaps:** Date picker in [`customer-booking-journey.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/components/booking-flow/customer-booking-journey.tsx#L123-L129) hardcodes `2026-11-05` to `2026-11-09` and `locationId: 'loc-01'`. |
| Customer Auth & Self-Service Portal | `Missing` | Guest checkout works, **but customer sign-up/OTP login, booking history, and authenticated self-service reschedule/cancel UI (PRD §10.1–10.2) do not exist**. |

---

## 4. Build and Runtime Verification Report

All available verification checks were executed directly against the workspace without modifying any repository files:

| Check | Command | Result | Details / Actual Error |
|---|---|---|---|
| Dependency Installation | Node resolution check against `package.json` | **PASS** | `46 / 46` declared `dependencies` and `devDependencies` installed and resolvable in `node_modules`. |
| TypeScript Type Check | `pnpm typecheck` (`tsc --noEmit`) | **PASS** | Exited `0` with zero type errors under strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`). |
| Linting | `pnpm lint` (`eslint .`) | **PASS** | Exited `0` with zero ESLint errors or warnings. |
| Production Build | `pnpm build` (`next build`) | **PASS** | Exited `0`. Compiled Next.js `15.5.29` production bundle (`23/23` static/dynamic pages + `34.5 kB` middleware). |
| Automated Unit & Stress Tests | `pnpm test` (`vitest run`) | **PASS** | Exited `0` in `582ms`. `6/6` test files (`30/30` tests) passed, including 23-customer simultaneous slot race, Model C capacity ceiling, hold expiry, late-webhook conflict refund, and RBAC/IDOR checks. |
| Database Migrations (Default CLI) | `pnpm db:migrate` (`drizzle-kit migrate`) | **FAIL (Exit 1)** | **Actual error:** `Error  Please provide required params for Postgres driver: [x] url: ''` — **Cause:** [`drizzle.config.ts`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/drizzle.config.ts#L3) does not load `.env.local` (`drizzle-kit` only auto-loads `.env`). |
| Database Migrations (With `.env.local`) | `node --env-file=.env.local ./node_modules/drizzle-kit/bin.cjs migrate` | **FAIL (Exit 1)** | **Actual error:** `Error: Can't find meta/_journal.json file` — **Cause:** `drizzle-kit generate` was never run to generate initial `CREATE TABLE` SQL migrations, and no live PostgreSQL server is running on this host. |
| Frontend, Backend & API Runtime | `next start` + Headless Chrome 149 CDP (`e2e-qa-results.json`) | **PASS (In-Memory Store)** | `/api/health` (`200 OK`), `/api/platform/*`, `/api/dashboard/*`, `/api/public/v1/*`, and all 5 browser journeys passed with `0` console/page errors against `RuntimeStateRepository`. |

### External Services & Credentials That Could Not Be Verified
- **PostgreSQL / Supabase Database (`DATABASE_URL`, `DIRECT_DATABASE_URL`):** Local `.env.local` contains development placeholder URLs; no reachable PostgreSQL instance is provisioned, so GiST exclusion constraints (`btree_gist`), `SELECT ... FOR UPDATE`, and RLS policies are **unverified at runtime**.
- **Supabase Auth & Supabase Storage (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`):** Placeholder credentials in `.env.local`; live JWT/cookie auth and bucket uploads could not be verified.
- **Razorpay Live/Sandbox API (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`):** Not set in `.env.local` (`PAYMENT_DEFAULT_PROVIDER=simulated`); real Razorpay Order creation, Checkout.js modal, and Refund REST APIs are unimplemented/unverified.
- **Email / WhatsApp / SMS Gateways (`RESEND_API_KEY`, `WHATSAPP_API_KEY`, `SMS_API_KEY`):** Not configured; external message delivery is unverified.
- **Upstash Redis (`UPSTASH_REDIS_REST_URL`):** Not configured; distributed rate limiting is unverified.

---

## 5. Critical Bugs and Risks

1. **[CRITICAL / P0 — Security] Unauthenticated Public Booking Cancellation Endpoint:**  
   [`POST /api/public/v1/bookings/[bookingId]/cancel`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/api/public/v1/bookings/%5BbookingId%5D/cancel/route.ts#L42-L48) hardcodes `actor: 'customer_verified_token'` without checking any session cookie, signed cancellation token, or phone OTP. Any anonymous caller with a `bookingId` and `tenantId` can cancel any customer's confirmed booking.
2. **[CRITICAL / P0 — Security] Unconditional Header Spoofing & Default Admin Fallback in `resolveRequestActor`:**  
   [`resolveRequestActor`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/auth/resolve-actor.ts#L35-L106) grants `platform_super_admin` or `business_owner` privileges by default when no auth headers are sent, and honours `x-actor-role: platform_super_admin` in **all** environments (`NODE_ENV === 'production'` is not blocked). Furthermore, `/platform/*` and `/dashboard/*` page routes have zero authentication guards.
3. **[CRITICAL / P0 — Tenant Isolation] Cross-Tenant Data & Customer PII Leakage on 5 Dashboard Pages:**  
   [`/dashboard/customers`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/customers/page.tsx#L21), [`/dashboard/reports`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/reports/page.tsx#L10), [`/dashboard/resources`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/resources/page.tsx#L22), [`/dashboard/services`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/services/page.tsx#L22), and [`/dashboard/staff`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/staff/page.tsx#L20) render global `RuntimeStateRepository` arrays with **no `tenantId` filter**, exposing every tenant's customer names, phone numbers, emails, and revenue.
4. **[CRITICAL / P0 — Data Integrity & Scalability] File-Backed In-Memory Store Instead of PostgreSQL:**  
   [`RuntimeStateRepository`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/modules/persistence/runtime-store.ts#L198-L246) blocks the Node.js event loop via `writeFileSync`, loses state across ephemeral serverless containers, and lacks cross-instance locking.
5. **[CRITICAL / P0 — Database Migrations] Broken Migration Sequence & Commented-Out RLS:**  
   [`0000_foundation_constraints.sql`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/db/migrations/0000_foundation_constraints.sql) runs `ALTER TABLE` before any `CREATE TABLE` migration exists, `meta/_journal.json` is missing, and PostgreSQL RLS policies are commented out.
6. **[HIGH / P0 — Functional Blocker] Hardcoded Demo Dates (`2026-11-05..09`) Across Booking & Dashboard Flows:**  
   [`customer-booking-journey.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/components/booking-flow/customer-booking-journey.tsx#L123-L129), [`dashboard/page.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/page.tsx#L236-L240), and [`dashboard/bookings/page.tsx`](file:///Users/sabbisurendra/Website%20Builder%20-%20Slot%20booking/src/app/(dashboard)/dashboard/bookings/page.tsx#L82-L130) hardcode November 2026 dates rather than computing live calendar dates in the venue's timezone.
7. **[HIGH / P0 — Operational Blocker] Zero CRUD for Catalog, Pricing & Schedules:**  
   Internal configurators cannot onboard a real SMB's custom courts, doctor roster, service durations, prices, or holiday exceptions without editing TypeScript seed files.
8. **[MEDIUM / P1 — Repository State] Uncommitted Package 3 Integration Code:**  
   48 local modifications/new files from Package 3 are not yet committed or pushed to `origin/main`.

---

## 6. PRD Gap Analysis

| Module | Requirement | Current status | Gap | Priority | Recommended action |
|---|---|---|---|---|---|
| Persistence & DB | PostgreSQL ACID persistence, Drizzle migrations & RLS (PRD §12, §14) | Partially implemented | Drizzle schemas & constraint SQL exist, but `meta/_journal.json` / `CREATE TABLE` DDL are missing, RLS is commented out, and all services use file-backed `RuntimeStateRepository`. | P0 | Load `.env.local` in `drizzle.config.ts`, run `drizzle-kit generate`, sequence `0000_foundation_constraints.sql` + active RLS after table creation, and port all `*.impl.ts` services to `withTenantTransaction`. |
| Auth & Security | Staff/Admin/Owner authentication & session management (PRD §3, §14) | Mocked/placeholder | No Supabase login UI, middleware session guard, or JWT verification; `resolveRequestActor` defaults to authenticated admin/owner and allows header spoofing. | P0 | Wire `@supabase/ssr` cookie auth in `middleware.ts` and `resolveRequestActor`, add `/login` + invite flow, and disable `x-actor-*` headers when `NODE_ENV === 'production'`. |
| Auth & Security | Secure customer booking cancellation & self-service auth (PRD §10.1–10.2) | Partially implemented | `POST /api/public/v1/bookings/[bookingId]/cancel` accepts unauthenticated requests; customer login/OTP, booking history, and self-service reschedule UI are missing. | P0 | Require a signed HMAC cancellation/manage token or verified Supabase/OTP customer session on public cancel/reschedule endpoints, and build customer booking lookup/manage UI. |
| Multi-Tenancy | Strict tenant data isolation across all views & APIs (PRD §12.1) | Partially implemented | API routes isolate tenants, but 5 server-rendered `/dashboard/*` sub-pages (`customers`, `reports`, `resources`, `services`, `staff`) omit `tenantId` filtering and leak cross-tenant PII. | P0 | Resolve authenticated tenant context in `BusinessDashboardLayout` and scope every dashboard query via `withTenantTransaction(tenantId, ...)`. |
| Internal Platform | Platform overview console (`/platform`) (PRD §4.1) | Mocked/placeholder | `/platform` imports static `MOCK_TENANTS` and `MOCK_BOOKINGS` instead of live database queries. | P1 | Replace static mock imports in `src/app/(platform)/platform/page.tsx` with live `TenantService` and platform telemetry queries. |
| Internal Platform | Tenant lifecycle, custom domains & SSL provisioning (PRD §4.1–4.2) | Partially implemented | Create & list tenants work; editing business details, suspending/reactivating tenants, and custom domain DNS verification UI/API are missing. | P1 | Add tenant edit/status mutation endpoints and custom domain mapping CRUD (`website_domains` table + middleware lookup). |
| Internal Platform | Template library, cloning & save-as-template (PRD §4.2, §5.8) | Partially implemented | Starter layouts auto-seed by vertical, and `/platform/templates` shows static cards; selecting a template on creation and saving a layout as a reusable template are missing. | P1 | Persist templates in `templates` table, add template selector to Create Tenant dialog, and add "Save as Template" in editor. |
| Website Editor | 12-column responsive grid, positioning, resizing & JSON persistence (PRD §5.2–5.4, §5.9) | Implemented and verified | 12/8/4-col grid, collision-free compaction, coordinate controls, and JSON layout snapshots work on desktop. Pointer resize handles, palette drag-in, touch DnD (`@dnd-kit`), and independent tablet/mobile override editing are missing. | P1 | Wire already-installed `@dnd-kit/core` for pointer/touch drag from palette & canvas, add edge resize handles, enable per-breakpoint override editing, and honour `rowStart`/`rowSpan` + CSS media queries in `PublicSiteView`. |
| Website Editor | Comprehensive SMB widget library & SEO settings (PRD §5.5–5.6, §14) | Partially implemented | 7 core widgets work; image gallery, testimonials, pricing table, contact/lead form, staff profile cards, custom header/footer config, and per-page SEO meta tags/sitemap are missing. | P1 | Expand `CORE_WIDGET_REGISTRY` and `PublishedWidgetRenderer` with gallery, testimonials, pricing, staff cards, contact form, header/footer config, and Next.js `generateMetadata` + `sitemap.ts`. |
| Website Editor | Multi-page management, version rollback & unsaved-changes guard (PRD §5.8) | Partially implemented | Single home page draft/publish works; creating/editing sub-pages (`[[...slug]]`), rolling back to a prior `WebsiteVersion`, and `beforeunload` warning are missing. | P1 | Wire multi-page switcher/CRUD in Studio, expose version history + rollback endpoint (`POST /api/platform/builder/rollback`), and add `beforeunload` dirty state listener. |
| Media & Assets | Logo, hero, gallery & service image uploads (PRD §2.2, §5.6, §14) | Missing | Supabase Storage buckets are referenced in env/config, but no upload API or image picker exists. | P1 | Implement authenticated signed-upload API to Supabase Storage with MIME/size validation and integrate an image uploader into editor & dashboard settings. |
| Booking Engine | Models A, B & C core availability, holds, expiry & concurrency (PRD §6.1–6.5, §7.2) | Implemented and verified | All 3 models, buffers, breaks, holiday exceptions, 8m holds, cron/lazy sweep, and 23-customer simultaneous race pass in memory, but are not yet backed by PostgreSQL GiST / row locks. | P0 | Migrate `BookingServiceImpl` and `AvailabilityServiceImpl` to PostgreSQL (`booking_items` GiST exclusion + `booking_sessions` `FOR UPDATE`), plus add `"Any available staff"` assignment, `no_show` status, and min-notice/advance-window checks. |
| Booking Engine | Real calendar dates & dynamic pricing/GST rules (PRD §6.4, §8.2) | Partially implemented | Base vs evening peak pricing works in paise; public & dashboard UIs hardcode `2026-11-05..09` dates, and weekend/holiday pricing, GST breakdown, and promo codes are missing. | P0 | Replace hardcoded date arrays with dynamic timezone-aware date pickers (`@date-fns/tz`), and add configurable weekend rates + optional GST calculation (`P1`) and promo codes (`P2`). |
| Payments | Razorpay live UPI/Card checkout, pay-at-venue & refunds (PRD §8.1–8.4) | Partially implemented | HMAC verification, webhook deduplication, and simulated gateway work; `RazorpayGatewayAdapter.createOrder`/`initiateRefund` throw `Not implemented`, and pay-at-venue/deposit options are missing in public checkout. | P0 | Implement Razorpay Orders & Refunds REST calls + Checkout.js integration, and support tenant-configurable `online_full`, `deposit`, and `pay_at_venue` checkout modes. |
| Notifications | Transactional Email, WhatsApp & SMS confirmations + reminders (PRD §11) | Mocked/placeholder | Outbox deduplication works in memory, but zero external Email/WhatsApp/SMS providers or pre-booking reminder crons are wired. | P1 | Implement `ResendEmailAdapter` (MVP baseline) + pluggable WhatsApp/SMS adapter (`Gupshup`/`MSG91`) driven by durable DB outbox worker + reminder cron. |
| Owner Dashboard | Self-service CRUD for resources, services, staff, schedules & settings (PRD §9.2–9.7) | Partially implemented | Booking list/calendar/walk-in/reschedule/cancel work; resources, services, staff, schedules, holidays, and business settings have zero create/edit forms or mutation APIs. | P0 | Build validated CRUD APIs (`/api/dashboard/resources`, `services`, `staff`, `schedules`, `sessions`, `settings`) and interactive management modals/forms in both `/dashboard/*` and `/platform/*`. |
| Owner Dashboard | Analytics date filters, utilization metrics & CSV export (PRD §9.7–9.8) | Partially implemented | Basic gross revenue & model counts exist; date-range filtering, peak-hour utilization, and booking/customer CSV export are missing. | P2 | Add date-range query params, slot utilization percentages, and CSV download endpoints. |

---

## 7. Prioritised Implementation Backlog & Testing Strategy

### 7.1 Prioritised Implementation Backlog

#### Tier `P0` — Mandatory Blockers for Safe, Functional MVP
1. **Commit Baseline & Provision PostgreSQL + Drizzle Migrations:** Load `.env.local` in `drizzle.config.ts`, generate initial `CREATE TABLE` DDL via `drizzle-kit generate`, apply `0000_foundation_constraints.sql` (`btree_gist` exclusion constraints, capacity checks, audit triggers) and enable PostgreSQL RLS policies on all tenant tables.
2. **Migrate Runtime Services from `RuntimeStateRepository` to PostgreSQL:** Replace in-memory/file state across `TenantServiceImpl`, `WebsiteServiceImpl`, `AvailabilityServiceImpl`, `BookingServiceImpl`, `BusinessDashboardServiceImpl`, `PaymentWebhookProcessorImpl`, and `NotificationDispatcherImpl` with Drizzle queries inside `withTenantTransaction`.
3. **Implement Real Authentication & Fix Authorization Vulnerabilities:**
   - Integrate Supabase Auth (`@supabase/ssr`) with `/login`, session cookies, and server layout/middleware guards for `/platform/*` and `/dashboard/*`.
   - Gate `x-actor-*` simulation headers strictly behind `NODE_ENV === 'test'`.
   - Secure `POST /api/public/v1/bookings/[bookingId]/cancel` with a cryptographically signed booking management token (or authenticated customer session).
   - Fix cross-tenant data leakage across `/dashboard/customers`, `/dashboard/reports`, `/dashboard/resources`, `/dashboard/services`, and `/dashboard/staff`.
4. **Build Catalog, Schedule & Business Settings CRUD:** Create API endpoints and UI forms (usable by both `internal_configurator` and `business_owner`) to create/edit/deactivate resources/courts, services, staff members, recurring weekly schedules, break windows, holiday/blockout dates, class sessions, and business settings.
5. **Replace Hardcoded Demo Dates & Wire Live Payment Modes:** Replace hardcoded `2026-11-05..09` dates in `customer-booking-journey.tsx`, `dashboard/page.tsx`, and `dashboard/bookings/page.tsx` with real venue-timezone dates (`@date-fns/tz`), implement `RazorpayGatewayAdapter.createOrder` / `initiateRefund` + Razorpay Checkout.js, and enable `pay_at_venue` bookings.

#### Tier `P1` — Required for Usable 1–2 Day Client Launches
6. **Transactional Notification Delivery:** Wire `Resend` (or SMTP/SES) email delivery + pluggable WhatsApp/SMS provider (`Gupshup` / `MSG91`) to the Postgres notification outbox, plus scheduled booking reminder cron.
7. **Media Upload & Asset Picker:** Add Supabase Storage upload API + image picker in editor Inspector (hero/logo/gallery) and dashboard settings.
8. **Visual Editor Production Polish:** Wire `@dnd-kit` for pointer/touch drag from palette & canvas, add edge/corner resize handles, enable per-breakpoint (`tablet`/`mobile`) layout overrides, enforce `rowStart`/`rowSpan` + pure CSS responsive grid on public sites, add multi-page CRUD, version rollback UI, save-as-template, and `beforeunload` warning.
9. **Expand SMB Widget Library & SEO:** Add Gallery, Testimonials, Pricing Table, Staff Profile Cards, Contact Form, Header/Footer config, `generateMetadata`, and `sitemap.ts`.
10. **Customer Self-Service Booking Lookup / OTP Portal:** Allow customers to view upcoming/past bookings and reschedule/cancel within tenant policy windows.

#### Tier `P2` — Post-Pilot Enhancements
11. **Promo/Discount Codes, GST Invoice Breakdown & CSV Exports:** Add coupon validation, tax line items, week calendar view, peak-hour utilization charts, and CSV exports.

---

### 7.2 Comprehensive Testing Strategy

To certify MVP readiness once `P0`/`P1` items are implemented, the test suite must validate three layers (**Vitest + Real Test PostgreSQL**, **API Integration**, and **Browser E2E**):

1. **Tenant Data Isolation:**
   - Verify Tenant A's `business_owner` and `business_staff` receive `403 FORBIDDEN` (at API layer) and `0` rows (under PostgreSQL RLS `app.current_tenant_id`) when querying or mutating Tenant B's bookings, customers, reports, resources, services, staff, or website drafts.
2. **Authentication & Permissions:**
   - Unauthenticated requests to `/platform/*`, `/dashboard/*`, `/api/platform/*`, and `/api/dashboard/*` redirect to `/login` or return `401`.
   - `x-actor-role` spoofing headers are ignored in `NODE_ENV=production`.
   - `business_staff` can view assigned bookings and check in customers (`bookings:update:status`), but cannot publish websites, issue refunds, or view other staff members' private revenue reports.
   - Public booking cancellation fails (`401`/`403`) without a valid signed management token or matching authenticated customer identity.
3. **Grid Editor Interactions, Layout Persistence & Responsive Rendering:**
   - Dragging from palette, repositioning on 12-col grid, horizontal/vertical resizing, collision reflow, section reorder/delete, undo/redo, draft save + hard reload, immutable publish (`vN`), draft-vs-live isolation, and rollback (`vN -> vN-1`).
   - Automated viewport assertions at `1440x900` (12-col), `768x1024` (8-col), and `375x812` (4-col / stacked) verifying `scrollWidth <= innerWidth` (`0px` overflow) and SSR-safe layout hydration.
4. **Booking Conflicts & Concurrency Protection (Against Real PostgreSQL):**
   - **23-Customer Simultaneous Exclusive Slot Race (Model A):** Spawn 23 parallel `Promise.allSettled` HTTP/service hold requests against the **exact same final available turf slot** (`20:00–21:00 IST`) backed by real PostgreSQL `booking_items` `EXCLUDE USING gist`. Assert **exactly `1` succeeds** and **exactly `22` fail** with `409 SLOT_UNAVAILABLE`, with `1` active row in `booking_items`.
   - **Model B Staff Overlap & Buffer Race:** Concurrent bookings overlapping a doctor's appointment or `bufferAfterMinutes` window allow only `1` reservation.
   - **Model C Capacity Ceiling Never Exceeded:** Fire `30` concurrent multi-seat (`1–3` seats each) requests against a `20`-seat yoga session (`SELECT ... FOR UPDATE` on `booking_sessions`). Assert `booked_count + held_count <= 20` at every instant and never exceeds `max_capacity`.
5. **Booking Hold Expiry:**
   - Verify expired holds (`expires_at <= now()`) immediately free exclusive slots (Model A/B) and decrement `held_count` (Model C) both lazily during availability/hold queries and via `POST /api/internal/cron/expire-holds`.
6. **Payment Failures, Retries, Duplicate Requests & Late-Webhook Recovery:**
   - **Payment Failure & Retry:** Gateway `payment.failed` keeps hold active until TTL so the customer can retry payment without losing the slot.
   - **Duplicate API & Webhook Requests:** Replaying identical `Idempotency-Key` headers on `/holds`, `/checkout`, `/cancel`, `/reschedule` and replaying identical `x-razorpay-event-id` webhooks returns idempotent responses with zero duplicate bookings, charges, or notifications.
   - **Payment Success + Booking Confirmation Failure (Late Webhook After Hold Expiry):** Hold expires at `T+8m`, Customer B books the slot at `T+9m`, and Customer A's delayed `payment.captured` webhook arrives at `T+10m`. Verify Customer B's confirmed booking remains intact, Customer A's booking transitions to `refund_pending`, an automated refund is initiated, and an urgent alert is queued.
7. **End-to-End Browser Journeys:**
   - **Journey 1 (Internal Admin/Configurator):** Login -> Provision tenant -> Configure courts/services/staff/hours -> Customize layout & theme in 12-col editor -> Preview -> Publish -> Verify live site.
   - **Journey 2 (Customer):** Open live mobile/desktop site -> Select offering & real calendar date -> Hold slot -> Pay via Razorpay Sandbox / Pay-at-Venue -> Receive confirmation voucher & email/WhatsApp -> Reschedule/cancel via signed link.
   - **Journey 3 (Business Owner):** Login to `/dashboard` -> View isolated tenant metrics & calendar -> Add walk-in booking -> Check in customer -> Add staff holiday exception -> Verify public availability updates immediately.

---

## 8. Recommended Sequence of Development Tasks

1. **Step 1 — Git Baseline & Database Foundation:** Commit/branch the current Package 3 working tree cleanly; fix `drizzle.config.ts` env loading; generate Drizzle `CREATE TABLE` migrations; attach `0000_foundation_constraints.sql` + active PostgreSQL RLS policies; verify `pnpm db:migrate` against a live Postgres/Supabase database.
2. **Step 2 — Persistence Cutover:** Port `TenantServiceImpl`, `WebsiteServiceImpl`, `AvailabilityServiceImpl`, `BookingServiceImpl`, `BusinessDashboardServiceImpl`, `PaymentWebhookProcessorImpl`, and `NotificationDispatcherImpl` from `RuntimeStateRepository` to Drizzle + `withTenantTransaction`, and re-run the 23-customer concurrency and capacity tests against real PostgreSQL.
3. **Step 3 — Authentication, RBAC Guards & Tenant Isolation Fixes:** Wire Supabase Auth (`@supabase/ssr`), protect `/platform/*` and `/dashboard/*`, lock down `resolveRequestActor` in production, secure `/api/public/v1/bookings/[bookingId]/cancel` with signed tokens, and add strict `tenantId` scoping to all 5 leaking `/dashboard/*` pages.
4. **Step 4 — Catalog, Schedule & Settings CRUD + Live Dates:** Build CRUD APIs and UI forms for resources, services, staff, weekly schedules, holiday exceptions, class sessions, and business settings; replace all hardcoded `2026-11-*` dates with live timezone-aware calendar dates; wire `/platform` overview to live DB metrics.
5. **Step 5 — Real Payments, Notifications & Media Uploads:** Implement Razorpay Orders/Refunds REST adapter + Checkout.js + pay-at-venue mode, Resend email + WhatsApp/SMS outbox delivery worker, and Supabase Storage media uploads.
6. **Step 6 — Visual Editor Polish, Expanded Widgets & Full E2E Regression:** Upgrade canvas/palette DnD (`@dnd-kit`) and resize handles, add multi-page + rollback + remaining SMB widgets (gallery, testimonials, pricing, contact, SEO), and run full PostgreSQL + browser E2E regression.

---

## 9. MVP Readiness Assessment

| Assessment Area | Classification | Evidence Summary |
|---|---|---|
| Build, Type Safety & Lint Health | `Ready` | `pnpm build`, `pnpm typecheck`, `pnpm lint`, and `30/30` unit tests pass with zero errors. |
| Core Booking Domain Logic (Models A, B, C) | `Needs improvement` | Availability, buffers, holds, expiry, idempotency, and 23-user race logic work in memory, but use hardcoded UI dates and lack PostgreSQL transaction cutover & catalog CRUD. |
| Visual Website Editor (12-Col Grid) | `Needs improvement` | 12/8/4-col JSON layout engine, desktop DnD/resize, draft/publish, and compaction work; lacks pointer resize handles, touch/palette DnD, media upload, rollback UI, multi-page, and full widget set. |
| Customer-Facing Website Rendering | `Needs improvement` | Fast, responsive (`0px` overflow across 24 viewport checks) and renders published JSON layouts; needs dynamic calendar dates, CSS-first responsive row/col grid, SEO tags, and customer manage-booking portal. |
| Database & Persistence Layer | `Not ready` | Drizzle schemas exist, but `CREATE TABLE` migrations are ungenerated, `pnpm db:migrate` fails, RLS is commented out, and runtime uses `.runtime-state.json`. |
| Authentication, Authorisation & Tenant Isolation | `Not ready` | No real login/session auth, `resolveRequestActor` permits header spoofing, public cancel route is unauthenticated, and 5 `/dashboard/*` pages leak cross-tenant data. |
| Business Owner & Configurator CRUD | `Not ready` | Booking actions work, but resources, services, staff, schedules, holidays, and business settings are read-only with zero CRUD forms/APIs. |
| Live Payments, Notifications & File Storage | `Not verified` | Razorpay order/refund REST calls throw `Not implemented`, notifications stay in memory, and Supabase Storage/Postgres/Razorpay credentials are unverified against live services. |

**Overall Verdict:** **`Not ready`** for external client pilot or production deployment until the `P0` persistence, authentication/isolation, catalog CRUD, dynamic date, and payment tasks are completed.

### Top 5 Most Important Next Actions (In Execution Order)

1. **Unify Persistence on PostgreSQL (`P0`):** Fix `drizzle.config.ts` env loading, generate initial Drizzle `CREATE TABLE` migrations alongside `0000_foundation_constraints.sql` (GiST exclusion + active RLS), connect a real PostgreSQL/Supabase instance, and port all runtime services off `.runtime-state.json` onto `withTenantTransaction`.
2. **Enforce Real Authentication & Eliminate Tenant/Auth Leaks (`P0`):** Wire `@supabase/ssr` login/session guards across `/platform/*` and `/dashboard/*`, disable `x-actor-*` header simulation outside `NODE_ENV === 'test'`, require signed tokens on public booking cancellation, and add mandatory `tenantId` filtering to `/dashboard/customers`, `/dashboard/reports`, `/dashboard/resources`, `/dashboard/services`, and `/dashboard/staff`.
3. **Implement Catalog, Schedule & Business Settings CRUD (`P0`):** Build server-validated CRUD APIs and UI forms for courts/resources, services, pricing tiers, staff rosters, working hours, holiday exceptions, class sessions, and venue settings so internal configurators can launch real SMBs in 1–2 days without code edits.
4. **Replace Hardcoded Demo Dates & Wire Live Razorpay + Pay-at-Venue Checkout (`P0`):** Replace static `2026-11-05..09` dates across customer booking and dashboard views with live timezone-aware calendars (`@date-fns/tz`), implement `RazorpayGatewayAdapter.createOrder` / `initiateRefund` + Checkout.js, and enable configurable pay-at-venue/deposit modes.
5. **Wire Transactional Notifications, Media Uploads & Editor Production Polish (`P1`):** Connect the database notification outbox to Resend (Email) + WhatsApp/SMS providers, add Supabase Storage image uploads for logos/heroes/galleries, and complete editor multi-page, version rollback, `@dnd-kit` pointer/touch interactions, and core marketing widgets.
