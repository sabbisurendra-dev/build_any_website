## Summary of Changes

This Pull Request consolidates all 5 human-gated phases of the **"Build Any Website" Hardening Programme** (`sabbisurendra-dev/build_any_website`, base `main` @ `2acc195`), addressing all independent 3rd-party architectural findings and elevating the platform to production-grade reliability, security, and data integrity.

All 5 phases were sequentially reviewed, verified, and approved by the Founder:
1. **Phase 1: Security Hotfix (`fix/security-hotfix`)** — Approved
2. **Phase 2: Database Foundation (`feat/db-foundation`)** — Approved
3. **Phase 3: Postgres Repositories (`feat/postgres-repositories`)** — Approved
4. **Phase 4: Payments & Checkout Saga (`feat/payment-saga`)** — Approved
5. **Phase 5: Real, Small, Separate AI-COS (`feat/aicos-real-loop`)** — Approved

---

### Detailed Deliverables by Phase

#### Phase 1: Security Hotfix
- **Header Impersonation Immunity**: Hardened `resolve-actor.ts` so `x-actor-*` headers are strictly rejected in non-development/production environments. Removed hardcoded fallback admin/owner actors (`usr-business-owner`, `usr-platform-internal`).
- **Founder Route Authentication**: Enforced `requireFounder` guard across all AI-COS endpoints (`/api/cos/ceo`, `/api/cos/cycles`, `/api/cos/approvals`, `/api/cos/settings`, `/api/cos/state`).
- **Agent Self-Approval Prevention**: Blocked autonomous agents from approving their own actions in `PolicyEngineService`.
- **Public & Dashboard Tenant Isolation**: Replaced request-body tenant trusting in `/api/public/v1/holds` with host-derived resolution (`TenantResolver.resolvePublicTenant`) and session-derived resolution for dashboard APIs.
- **Verification**: 10 new security sweep tests in `tests/unit/route-auth-sweep.test.ts`.

#### Phase 2: Database Foundation
- **Reconciled Drizzle Migrations**: Created clean, linear migrations (`0000_schema_tables.sql` through `0003_row_level_security.sql`) matching the 75 Drizzle schema tables, PostgreSQL enums, and foreign keys with a valid `_journal.json`.
- **GiST Exclusion Constraints**: Applied PostgreSQL `btree_gist` exclusion constraints strictly to live allocations (`WHERE allocation_status = 'active'`), preventing double-bookings while allowing historical records.
- **Row-Level Security (RLS)**: Enforced `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` with `tenant_isolation_*` policies across all 43 tenant-owned tables using an unprivileged `app_runtime` database role.
- **PgBouncer Context Safety**: Replaced unsafe session-level state with transaction-scoped `set_config('app.current_tenant_id', $1, true)` (`is_local = true`).
- **Verification**: Added `docker-compose.test.yml`, PostgreSQL 16 test harness, 9 unit tests in `tests/unit/database-foundation.test.ts`, and 2 integration tests in `tests/integration/rls-tenant-isolation.test.ts`.

#### Phase 3: Postgres Repositories & Outbox Pattern
- **Domain Persistence Decoupling**: Implemented abstract ports (`BookingRepositoryPort`, `CommerceRepositoryPort`) and concrete implementations (`PostgresBookingRepository`, `PostgresCommerceRepository`, and hermetic in-memory test adapters).
- **Concurrency & Contention Handling**: Explicit row locks (`FOR UPDATE`) on resources, services, staff, and sessions; mapped PostgreSQL GiST exclusion (`23P01`), serialization failure (`40001`), and deadlock (`40P01`) errors to HTTP 409 `SlotUnavailableError`.
- **Atomic Checkout Saga**: Consolidated multi-engine checkout into a single database transaction coordinating inventory reservations (`quantity_on_hand - quantity_reserved >= qty`), booking holds, and order creation.
- **Transactional Outbox Pattern**: Implemented `outbox_events` table and `OutboxService` guaranteeing at-least-once event delivery for asynchronous integrations.
- **Verification**: 8 comprehensive error tests in `tests/unit/postgres-repository-errors.test.ts`.

#### Phase 4: Payments & Checkout Saga
- **Cryptographic Signature Verification**: Real constant-time HMAC-SHA256 signature verification for Razorpay and Stripe (`StripeGatewayAdapter` with `t=timestamp,v1=signature` scheme and 5-minute replay prevention).
- **Mock Payment Safety**: Simulated payments strictly gated behind `ENABLE_MOCK_PAYMENTS=true` (rejects mock checkout in production with HTTP 403 `FORBIDDEN`).
- **Webhook Idempotency**: Cryptographic verification prior to JSON parsing and idempotency deduplication via `payment_webhook_events`.
- **Atomic Two-Phase Saga Confirmation**: Atomic confirmation in `confirmBooking` claiming allocation, updating payment status, and publishing `booking.confirmed` outbox events in a single transaction; automatically rolls back with `HoldExpiredError` if holds have lapsed.
- **Hold Expiration Worker**: Created `HoldExpirationWorker` and cron endpoints (`/api/cron/expire-holds` supporting GET/POST and `/api/internal/cron/expire-holds`) guarded by `CRON_SECRET` Bearer token.
- **Verification**: 9 unit tests in `tests/unit/payment-saga.test.ts`.

#### Phase 5: Real, Small, Separate AI-COS
- **Design Gate Approved**: Authored `docs/aicos/ARCHITECTURE.md` establishing AI-COS as Priority 4, completely off the synchronous commerce hot path.
- **Real Department Agent**: Implemented `MarketingAgent` producing structured, schema-validated outputs adhering to `MarketingCopyOutputSchema` (`zod`).
- **Read-Only Commerce Bridge**: Created `CosCommerceReadBridge` (`CosCommerceReadPort`) granting AI-COS read access to catalogue items and storefront analytics while strictly blocking mutations to inventory, reservations, bookings, or prices.
- **Model Router**: Implemented `selectModelTier` supporting Tier 1 (fast/cheap) and Tier 2 (slow/capable), budget tracking, and global kill switch.
- **Human-in-the-Loop Approval Queue**: Created `ApprovalQueueService` computing SHA-256 proposal fingerprint hashes (`proposalHash`), preventing agent self-approval, non-founder approvals, and silent resubmissions of rejected proposals.
- **Verification**: 9 unit tests in `tests/unit/aicos-real-loop.test.ts`.

---

### Verification Results

- `pnpm typecheck`: **0 errors**
- `pnpm lint`: **0 errors, 0 warnings**
- `pnpm test`: **94 passed** across 13 test files (all 49 original tests preserved + 45 new hardening tests)
- `pnpm test:integration`: **2 passed** (RLS isolation on PostgreSQL 16)
- **Backward Compatibility**: Existing public API shapes (`/api/public/v1/holds`, `/api/public/v1/checkout`, `/api/public/v1/payments/verify`, `/api/dashboard/bookings`) are 100% preserved.
- **Minor Currency Units**: All monetary values strictly maintained in integer minor units (paise).
