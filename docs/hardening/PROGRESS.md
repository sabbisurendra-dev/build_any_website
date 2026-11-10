# Hardening Programme Progress Tracker

**Repository:** `sabbisurendra-dev/build_any_website`  
**Current Active Branch:** `feat/aicos-real-loop`  
**Base Commit:** `ca8fd8d` (on `feat/payment-saga`)  
**Started At:** 2026-11-10T23:58:00+05:30  

---

## Phase Status Summary

| Phase | Title | Branch | Status | Commit SHA | Date | Open Issues |
|---|---|---|---|---|---|---|
| **Phase 1** | Security Hotfix | `fix/security-hotfix` | **COMPLETED** | `5b11f20` | 2026-11-11 | None. All 5 findings verified, fixed, and tested (59/59 tests green). Approved by Founder. |
| **Phase 2** | Database Foundation | `feat/db-foundation` | **COMPLETED** | `645d447` | 2026-11-11 | Clean Drizzle migrations, live row GiST exclusions, RLS on all 43 tenant tables, app_runtime role, PgBouncer transaction-scoped set_config, docker-compose.test.yml & integration test suite. Approved by Founder. |
| **Phase 3** | Postgres Repositories | `feat/postgres-repositories` | **COMPLETED** | `9c337f8` | 2026-11-11 | Replaced runtime memory maps with Postgres/Drizzle repositories (BookingRepositoryPort, CommerceRepositoryPort, PostgresBookingRepository, PostgresCommerceRepository, OutboxService), atomic checkout saga, GiST conflict catch -> 409 SlotUnavailableError, transactional outbox pattern, and comprehensive error tests (76/76 tests green). Approved by Founder. |
| **Phase 4** | Payments & Checkout Saga | `feat/payment-saga` | **COMPLETED** | `ca8fd8d` | 2026-11-11 | Real HMAC-SHA256 signature verification (Razorpay & Stripe), mock payments gated by ENABLE_MOCK_PAYMENTS, webhook idempotency via payment_webhook_events deduplication, atomic two-phase commit saga with automatic rollback on expired holds, and hold expiration worker protected by CRON_SECRET (85/85 tests green). Approved by Founder. |
| **Phase 5** | Real, Small, Separate AI-COS | `feat/aicos-real-loop` | **AWAITING_FOUNDER** | Pending commit | 2026-11-11 | Approved design gate (`docs/aicos/ARCHITECTURE.md`), real marketing copy agent with structured output (`MarketingCopyOutputSchema`), fast/cheap vs slow/capable model router, read-only commerce bridge, and human-in-the-loop approval queue with self-approval prevention (94/94 tests green). |

---

## Phase 1 Deliverables & Verification
- `SECURITY-CHANGES.md`: Full architectural log of security hardening.
- `src/modules/auth/resolve-actor.ts`: `x-actor-*` rejected in production; fallback admin/owner removed; `requireFounder` added.
- `src/modules/auth/session-provider.ts`: SessionProvider port + Supabase SSR and Test adapters.
- `src/modules/tenancy/tenant-resolver.ts`: Host-derived public tenant resolution and session-derived dashboard tenant resolution.
- `src/modules/ai-cos/policy/policy-engine.service.ts`: Self-approval blocked.
- `src/app/api/cos/*`: All 5 routes protected with `requireFounder`.
- `tests/unit/route-auth-sweep.test.ts`: 10 comprehensive tests verifying production header immunity, cron secret auth, AI-COS route guards, self-approval prevention, cross-tenant IDOR, and public tenant matching.
- **Verification Commands:**
  - `npx tsc --noEmit` -> PASS (0 errors)
  - `npx eslint .` -> PASS (0 problems)
  - `npx vitest run` -> PASS (59/59 tests passing in 9 files)

---

## Phase 2 Deliverables & Verification
- `src/db/migrations/0000_schema_tables.sql`: Reconciled 75 Drizzle schema tables, PostgreSQL enums, and foreign keys.
- `src/db/migrations/0001_foundation_constraints.sql`: Partial GiST exclusions (`WHERE allocation_status = 'active'`), buffer window check constraints, capacity bounds, audit log immutability triggers, and `app` schema isolation functions.
- `src/db/migrations/0002_universal_commerce_foundation.sql`: Non-negative inventory check constraints, entitlement access windows, subscription periods, price plan bounds, and `v_universal_commerce_master` view.
- `src/db/migrations/0003_row_level_security.sql`: `app_runtime` non-superuser role creation, grants, and `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` with `tenant_isolation_*` policies on all 43 tenant-owned tables.
- `src/db/tenant-tables.ts`: Authoritative runtime catalog of all 43 tenant-owned tables.
- `src/db/index.ts` & `src/lib/env.ts`: `withTenantContext` utilizing `set_config('app.current_tenant_id', $1, true)` for transaction-scoped tenant context (PgBouncer compatible) and `APP_RUNTIME_DATABASE_URL` runtime role support.
- `docker-compose.test.yml`: PostgreSQL 16 container with `btree_gist` and `pgcrypto` extensions and healthchecks for integration testing.
- `vitest.integration.config.ts`: Integration test runner configuration.
- `tests/unit/database-foundation.test.ts`: 9 unit tests verifying schema snapshot, partial GiST constraints on live rows only, RLS policy coverage on all 43 tenant tables, role permissions, and PgBouncer local scoping.
- `tests/integration/rls-tenant-isolation.test.ts`: Integration harness for testing live PostgreSQL 16 RLS enforcement.
- **Verification Commands:**
  - `npx tsc --noEmit` -> PASS (0 errors)
  - `npx eslint .` -> PASS (0 problems)
  - `npx vitest run` -> PASS (68/68 unit tests passing in 10 files)
  - `npx vitest run --config vitest.integration.config.ts` -> PASS (2/2 integration tests passing in 1 file)

---

## Phase 3 Deliverables & Verification
- `src/modules/booking/booking.repository.port.ts`: Abstract `BookingRepositoryPort` interface decoupling domain logic from persistence.
- `src/modules/booking/in-memory-booking.repository.ts`: State-backed repository adapter preserving backward-compatibility and zero-DB test isolation.
- `src/modules/booking/postgres-booking.repository.ts`: Production-grade Drizzle/Postgres repository with:
  - PgBouncer local tenant isolation (`set_config('app.current_tenant_id', $1, true)`).
  - Explicit row locks (`FOR UPDATE`) on resources, services, staff, sessions, and holds.
  - Full catch & translation of PostgreSQL GiST exclusion (`23P01`), serialization failure (`40001`), and deadlock (`40P01`) to HTTP 409 `SlotUnavailableError`.
  - Transactional hold claiming with atomic `allocation_status = 'consumed'` and optimistic/pessimistic hold expiry enforcement.
- `src/modules/commerce/commerce.repository.port.ts`: Abstract `CommerceRepositoryPort` interface for universal orders, inventory, catalogue, entitlements, and subscriptions.
- `src/modules/commerce/in-memory-commerce.repository.ts`: In-memory adapter for hermetic tests.
- `src/modules/commerce/postgres-commerce.repository.ts`: Transactional commerce repository implementing:
  - Atomic stock reservations (`quantity_reserved = quantity_reserved + $qty WHERE quantity_on_hand - quantity_reserved >= $qty`).
  - Single atomic checkout transaction spanning order creation, inventory hold, booking hold, and outbox event publishing.
  - Payment confirmation saga: hold consumption, inventory deduction, order state transition, entitlement activation, and subscription establishment.
- `src/modules/outbox/outbox.types.ts` & `src/modules/outbox/outbox.service.ts`: Transactional Outbox pattern (`outbox_events` table, `PostgresOutboxRepository`, `InMemoryOutboxRepository`, and `OutboxService`) ensuring at-least-once event delivery for downstream side-effects.
- `src/db/migrations/0004_outbox_events.sql`: Migration creating `outbox_events` table with RLS enabled/forced, `tenant_isolation_outbox_events` policy, `app_runtime` grants, and enum values (`'consumed'`, `'cancelled'`) for `allocation_status`.
- `tests/unit/postgres-repository-errors.test.ts`: 8 targeted unit tests validating GiST conflict translation (409), serialization failures (409), deadlocks (409), hold expiry on claim (410), insufficient stock during checkout (409), hold expiry during confirmation (410), atomic outbox publishing, and worker retry/error tracking.
- **Verification Commands:**
  - `npx tsc --noEmit` -> PASS (0 errors)
  - `pnpm lint` -> PASS (0 problems)
  - `npx vitest run` -> PASS (76/76 unit tests passing in 11 files)
  - `npx vitest run --config vitest.integration.config.ts` -> PASS (2/2 integration tests passing in 1 file)

---

## Phase 4 Deliverables & Verification
- `src/lib/env.ts`: Added `ENABLE_MOCK_PAYMENTS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and added `'stripe'` to supported payment provider enum.
- `src/modules/payments/stripe.adapter.ts`: Constant-time HMAC-SHA256 signature verification over Stripe webhook headers (`t=timestamp,v1=signature`) with 5-minute replay attack window check.
- `src/modules/payments/simulated.adapter.ts`: Enforced `assertMockPaymentsAllowed()` so simulated payments are strictly disabled in production unless `ENABLE_MOCK_PAYMENTS=true`.
- `src/modules/payments/webhook.impl.ts`: Webhook processor verifying cryptographic HMAC signatures prior to JSON parsing, with idempotent deduplication via `payment_webhook_events` table and memory state.
- `src/app/api/webhooks/stripe/route.ts`: New Stripe webhook route handler (`POST /api/webhooks/stripe`).
- `src/modules/booking/booking.impl.ts`: Wired `StripeGatewayAdapter` and ensured cryptographic verification executes prior to any state transition.
- `src/modules/booking/postgres-booking.repository.ts`: Full two-phase commit saga for `confirmBooking`:
  - Step a: Mark payment `captured`.
  - Step b: Transition booking items to `consumed` (atomically checking active hold; rolls back with `HoldExpiredError` if expired).
  - Step c: Convert hold status to `converted`, update booking to confirmed & paid.
  - Step d: Insert `booking.confirmed` outbox event in the same transaction.
  - Idempotent on redeliveries.
- `src/modules/booking/hold-expiration.worker.ts`: Background worker executing atomic hold expiration:
  - Sweeps expired `booking_holds` and releases associated `booking_items` (`allocation_status = 'released'`).
  - Decrements `held_count` on capacity `booking_sessions`.
  - Sweeps expired `inventory_reservations` and decrements `quantity_reserved` on `inventory_items`.
  - Emits `booking.hold_expired` and `inventory.reservation_expired` outbox events.
- `src/app/api/cron/expire-holds/route.ts`: Scheduled cron route (`POST` and `GET /api/cron/expire-holds`) guarded by `CRON_SECRET` Bearer token via constant-time comparison.
- `src/app/api/internal/cron/expire-holds/route.ts`: Updated to delegate to `HoldExpirationWorker` preserving existing response shape `{ ok: true, releasedCount }`.
- `tests/unit/payment-saga.test.ts`: 9 unit tests verifying HMAC verification, mock payment gating, webhook deduplication, atomic saga rollbacks, and cron authorization.
- **Verification Commands:**
  - `npx tsc --noEmit` -> PASS (0 errors)
  - `pnpm lint` -> PASS (0 problems)
  - `npx vitest run` -> PASS (85/85 unit tests passing in 12 files)
  - `npx vitest run --config vitest.integration.config.ts` -> PASS (2/2 integration tests passing in 1 file)

---

## Phase 5 Deliverables & Verification
- `docs/aicos/ARCHITECTURE.md`: Complete AI-COS architectural and design specification (approved at Phase 5 Design Gate).
- `src/modules/ai-cos/core/commerce-bridge.ts`: Read-only commerce observer (`CosCommerceReadBridge` / `CosCommerceReadPort`) giving AI-COS read access to catalogue items and storefront summaries while strictly prohibiting direct mutation of inventory, bookings, price plans, or orders.
- `src/modules/ai-cos/departments/marketing-agent.ts`: Real Marketing Growth & Copy Generator agent (`marketing_growth`) producing structured outputs adhering to `MarketingCopyOutputSchema` (`zod`: `suggestedAction`, `confidence`, `draftContent`, `targetAudience`, `reasoning`, `estimatedImpact`, `requiresHumanApproval`).
- `src/modules/ai-cos/runtime/model-router.service.ts`: Model router selecting between Tier 1 (fast/cheap: Gemini Flash / Claude Haiku / GPT-4o Mini) and Tier 2 (slow/capable: Claude Sonnet / GPT-4o / Gemini Pro), budget enforcement, reviewer separation, and global kill switch.
- `src/modules/ai-cos/policy/approval-queue.service.ts`: Human-in-the-loop pending actions queue (`ApprovalQueueService`) computing SHA-256 proposal hashes, strictly blocking agent self-approval and non-founder decisions (HTTP 403 `PolicyScopeViolationError`), and blocking silent resubmission of rejected hashes.
- `src/modules/ai-cos/index.ts`: Re-exported Phase 5 services and schemas.
- `tests/unit/aicos-real-loop.test.ts`: 9 unit tests verifying structured output schema conformity, fast/cheap vs slow/capable model tier routing, read-only commerce isolation, human-in-the-loop approval workflows, and self-approval prevention.
- **Verification Commands:**
  - `npx tsc --noEmit` -> PASS (0 errors)
  - `pnpm lint` -> PASS (0 problems)
  - `npx vitest run` -> PASS (94/94 unit tests passing in 13 files)
  - `npx vitest run --config vitest.integration.config.ts` -> PASS (2/2 integration tests passing in 1 file)

---

## Session Log

- **2026-11-10:** Hardening programme initialized from base commit `2acc195`. Branch `fix/security-hotfix` created. Phase 1 started.
- **2026-11-11:** Phase 1 implementation completed. All 5 findings confirmed and fixed. 10 new security sweep tests created and passing alongside all 49 existing tests. Phase 1 marked AWAITING_FOUNDER.
- **2026-11-11:** Founder approved Phase 1 (`APPROVED PHASE 1`). Branch `feat/db-foundation` created. Phase 2 database foundation implemented: clean Drizzle migrations, live row GiST exclusion, universal commerce constraints, RLS on all 43 tenant tables with `app_runtime` non-superuser role, transaction-scoped PgBouncer context, and unit/integration test harnesses. Phase 2 marked AWAITING_FOUNDER.
- **2026-11-11:** Founder approved Phase 2 (`APPROVED PHASE 2`). Branch `feat/postgres-repositories` created. Phase 3 Postgres repositories implemented: abstract repository ports, Postgres & in-memory adapters, transactional booking holds with GiST 409 translation, transactional multi-engine checkout with atomic inventory holds, transactional outbox pattern, and error suite (76/76 tests green). Phase 3 marked AWAITING_FOUNDER.
- **2026-11-11:** Founder approved Phase 3 (`APPROVED PHASE 3`). Branch `feat/payment-saga` created. Phase 4 Payments & Checkout Saga implemented: real HMAC verification (Razorpay & Stripe), mock payments gated by `ENABLE_MOCK_PAYMENTS`, webhook deduplication, atomic confirmation saga with automatic rollback on expired holds, hold expiration worker guarded by `CRON_SECRET`, and payment saga test suite (85/85 unit tests green). Phase 4 marked AWAITING_FOUNDER.
- **2026-11-11:** Founder approved Phase 4 (`APPROVED PHASE 4`). Branch `feat/aicos-real-loop` created. Phase 5 design specification `docs/aicos/ARCHITECTURE.md` submitted for Design Gate review.
- **2026-11-11:** Founder approved Phase 5 Design Gate (`APPROVED AICOS DESIGN`). Phase 5 implementation completed: real marketing copy agent with structured output, fast/cheap vs slow/capable model router, read-only commerce bridge, human-in-the-loop approval queue with self-approval prevention, and AI-COS test suite (94/94 unit tests green). Phase 5 marked AWAITING_FOUNDER.
