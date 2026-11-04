# Multi-Tenant SMB Website Builder & Slot Booking Platform

Production-ready multi-tenant SaaS platform enabling internal configurators to rapidly build, customise, publish, and operate booking-enabled websites for Indian SMBs (football turfs, racquet venues, healthcare clinics, salons, yoga studios, and appointment businesses) within a 1–2 day turnaround SLA.

---

## 🚀 Live Implemented Architecture (Prompts A, B, C & D Complete)

### 1. Multi-Tenant Subdomain & Path Routing
- **Platform Console & Metabase Visual Editor**: `/platform` & `/platform/builder`
- **Business Venue Dashboard & Court Timeline**: `/dashboard` & `/dashboard/bookings`
- **SSR Customer-Facing Websites**: `/s/[siteKey]` & custom domains (`kickoffturf.in`)
- **Interactive Gateway Hub**: `/` (zero dead links across all 28 routes)

### 2. Metabase-Inspired Visual Website Builder (`/platform/builder`)
- **12-Column Responsive Grid Canvas**: Pure math collision-compaction (`src/modules/website-builder/grid-engine.ts`) with zero editor JS runtime on public sites.
- **Undo / Redo History**: 25-step time-travel state manager (`src/components/editor/use-editor-state.ts`).
- **Breakpoint Previews**: Live instant switching between Desktop (12 cols), Tablet (8 cols), and Mobile (4 cols).
- **Core Component Palette**: 1-click placement for Hero Banner, Court/Arena Grid, Slot Picker, Facility Details, and FAQ.
- **Schema-Driven Property Inspector**: Visual configuration of typography, buttons, booking model switching (Model A/B/C), and responsive visibility.
- **Publishing Engine**: Atomic version freezing into immutable `website_versions` with optimistic revision locking (`draft_revision`).

### 3. Unified Booking Engine & Concurrency Locking
- **Model A (Exclusive Resource)**: Turfs, courts, rooms protected by PostgreSQL `EXCLUDE USING gist` on `tstzrange(buffer_starts_at, buffer_ends_at, '[)')`.
- **Model B (Staff Appointment)**: Doctors, stylists, consultants with schedule buffer management.
- **Model C (Capacity Session)**: Yoga, fitness classes, workshops with atomic seat reservation locking.
- **23-Simultaneous-Customer Concurrency Guarantee**:
  - Validated by automated test: 23 customers simultaneously attempting to reserve the exact same court and slot (`20:00 - 21:00`).
  - **Outcome**: Exactly **1** succeeds (`status: 'temporarily_held'`), exactly **22** receive HTTP 409 `SlotUnavailableError`. Zero duplicate or overlapping allocations.
- **8-Minute Temporary Hold**: Redis/DB hold TTL with live countdown timer and automatic lazy expiry.
- **Idempotency Protection**: Mutation endpoints strictly require `Idempotency-Key` (16–128 chars); replayed requests return original holds without duplicate allocations.

### 4. Indian Payment Reconciliation & Webhook Intake
- **Dual Adapter Architecture**: Razorpay primary (UPI Intent/QR, Cards, Netbanking) + Server-verified Simulated Gateway for dev/test.
- **Constant-Time HMAC Verification**: Webhooks verified via `timingSafeEqual` over raw text bodies *before* JSON parsing.
- **Delayed Callback & Hold Expiry Safety**: If payment webhook arrives after hold expiry and the court was claimed by another customer, the transaction automatically marks `conflict_auto_refund_queued` and enqueues a refund.
- **Webhook Deduplication**: Idempotent event tracking via `payment_webhook_events` returns `duplicate_ignored` on retries.

---

## 📁 Repository Structure

```
├── docs/
│   ├── architecture/          # ADR-001 through ADR-006 & technical specifications
│   │   ├── 01-tech-stack-and-adr.md
│   │   ├── 02-database-erd-and-concurrency.md
│   │   ├── 03-state-and-visual-editor.md
│   │   └── 04-api-security-and-roadmap.md
│   └── reference/             # Primary product specifications & market research
│       ├── prd.md             # Complete PRD v2.0
│       └── market-research.md # Detailed Indian SMB Market Research & Pricing
├── src/
│   ├── app/
│   │   ├── (platform)/        # Super Admin & Configurator views (/platform, /platform/builder)
│   │   ├── (dashboard)/       # Business owner operational dashboard (/dashboard, /dashboard/bookings)
│   │   ├── (public)/          # Public visitor SSR sites (/s/[siteKey])
│   │   └── api/               # 10 production API endpoints (availability, holds, checkout, webhooks)
│   ├── components/
│   │   ├── booking-flow/      # 5-step customer booking journey modal & public view
│   │   ├── editor/            # Metabase-inspired 12-column visual grid canvas & inspectors
│   │   ├── layout/            # Platform, Dashboard, and Public site shell layouts
│   │   └── ui/                # 14 foundational Tailwind v4 / Radix UI primitives
│   ├── db/
│   │   ├── schema/            # 34-table Drizzle PostgreSQL schema & relations
│   │   └── migrations/        # GiST exclusion constraints & database triggers
│   ├── lib/
│   │   └── mock-data/         # Realistic multi-tenant data (Kickoff Turf, Apex Badminton, etc.)
│   └── modules/
│       ├── booking/           # Availability & Booking lifecycle services
│       ├── tenancy/           # Multi-tenant provisioning & audit logs
│       ├── website-builder/   # Grid layout math & widget registry
│       ├── payments/          # Razorpay & Simulated payment adapters
│       ├── notifications/     # Outbox notification dispatcher
│       └── analytics/         # Revenue & court occupancy aggregation
└── tests/
    └── unit/                  # 17 automated tests (concurrency, grid engine, layouts, views)
```

---

## 🧪 Testing & Verification

1. **Run All Unit Tests (including the 23-customer race condition test)**
   ```bash
   pnpm test
   ```
   *Verified: 17/17 tests passing across 5 test suites.*

2. **TypeScript Strict Typecheck**
   ```bash
   pnpm typecheck
   ```
   *Verified: 0 errors under `noUncheckedIndexedAccess: true`.*

3. **ESLint 9 Flat Config**
   ```bash
   pnpm lint
   ```
   *Verified: 0 errors, 0 warnings.*

4. **Production Build**
   ```bash
   pnpm build
   ```
   *Verified: 28/28 static & dynamic routes compiled cleanly.*

---

## 🛠️ Developer Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure development environment
cp .env.example .env.local

# 3. Start local development server
pnpm dev
# Gateway Hub: http://localhost:3000
# Visual Builder: http://localhost:3000/platform/builder
# Venue Dashboard: http://localhost:3000/dashboard
# Customer Site: http://localhost:3000/s/kickoff-turf
```
