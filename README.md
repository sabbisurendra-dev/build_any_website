# Multi-Tenant SMB Website Builder & Slot Booking Platform

Production-ready architectural foundation for a multi-tenant SaaS platform enabling internal configurators to build, customise, publish, and operate booking-enabled websites for Indian SMBs (sports turfs, racquet venues, clinics, salons, fitness studios, and appointment businesses) in 1–2 days.

---

## Core Architecture Pillars

1. **Multi-Tenant Single-Codebase Modular Monolith (Next.js 15 App Router + TypeScript 5.8)**
   - `platform.{domain}` → Internal SaaS Console & Metabase-inspired Visual Website Editor
   - `app.{domain}` → SMB Business Owner & Staff Operational Portal
   - `{tenant}.{domain}` & verified custom domains (`kickoffturf.in`) → Fast SSR Public Customer Websites
2. **Metabase-Inspired 12-Column Visual Website Editor Engine**
   - Data-driven JSON layout model (`PageSection` + `PlacedWidgetInstance`) rendered via native CSS Grid on public websites (zero editor JS overhead, zero CLS) and edited interactively via `@dnd-kit` + pure TypeScript collision/compaction math (`src/modules/website-builder/grid-engine.ts`).
   - Draft optimistic concurrency (`draft_revision`), immutable versioned publishing (`website_versions`), and instant tag-based cache invalidation.
3. **Concurrency-Safe Unified Booking Engine (PostgreSQL 16 + Drizzle ORM)**
   - **Model A (Exclusive Resource)** & **Model B (Staff Appointment)**: Protected at the database index level via PostgreSQL `btree_gist` `EXCLUDE USING gist` constraints on `tstzrange(buffer_starts_at, buffer_ends_at, '[)')`.
   - **Model C (Capacity Session)**: Protected via `SELECT ... FOR UPDATE` row locking paired with `CHECK (booked_count + held_count <= max_capacity)`.
   - **Idempotent Payments & Webhooks**: Razorpay primary gateway (UPI Intent/QR, Cards, Netbanking) + Cashfree readiness, constant-time HMAC verification, `payment_webhook_events` deduplication, and `SAVEPOINT` reconciliation for delayed UPI callbacks.

---

## Architecture & Product Reference Index

- [`docs/reference/prd.md`](./docs/reference/prd.md) — **Primary Product Source of Truth**: Complete PRD v2.0 (roles, Metabase builder, 3 booking models, P0/P1/P2 scope, acceptance criteria).
- [`docs/reference/market-research.md`](./docs/reference/market-research.md) — **Strategic Context**: Indian SMB landscape, UPI velocity, competitor benchmarks (TurfBox, Playo, Practo, Zenoti, Duda, GoHighLevel), and commercial pricing.
- [`docs/architecture/01-tech-stack-and-adr.md`](./docs/architecture/01-tech-stack-and-adr.md) — Stack comparisons, trade-offs, definitive selections, and Architecture Decision Records (ADRs).
- [`docs/architecture/02-database-erd-and-concurrency.md`](./docs/architecture/02-database-erd-and-concurrency.md) — Complete 34-table relational ERD, constraints, timezone/cross-midnight design, and concurrency proof.
- [`docs/architecture/03-state-and-visual-editor.md`](./docs/architecture/03-state-and-visual-editor.md) — Global state strategy, Metabase-inspired grid specification, widget registry, and sample layout JSON.
- [`docs/architecture/04-api-security-and-roadmap.md`](./docs/architecture/04-api-security-and-roadmap.md) — API/Server Action boundaries, RBAC & security controls, P0/P1/P2 roadmap, and PRD reconciliations.

---

## Getting Started (Developer Setup)

1. **Install dependencies**
   ```bash
   pnpm install
   ```
2. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Populate `DATABASE_URL`, `DIRECT_DATABASE_URL`, Supabase keys, Razorpay test keys, and a 32+ char `CRON_SECRET`.
3. **Generate & apply database migrations**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   # Ensure supplemental GiST exclusion constraints & triggers in
   # src/db/migrations/0000_foundation_constraints.sql are applied to PostgreSQL.
   ```
4. **Verify types, lint, and unit tests**
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```
5. **Start local dev server**
   ```bash
   pnpm dev
   ```
