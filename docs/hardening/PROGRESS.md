# Hardening Programme Progress Tracker

**Repository:** `sabbisurendra-dev/build_any_website`  
**Current Active Branch:** `feat/db-foundation`  
**Base Commit:** `5b11f20` (on `fix/security-hotfix`)  
**Started At:** 2026-11-10T23:58:00+05:30  

---

## Phase Status Summary

| Phase | Title | Branch | Status | Commit SHA | Date | Open Issues |
|---|---|---|---|---|---|---|
| **Phase 1** | Security Hotfix | `fix/security-hotfix` | **COMPLETED** | `5b11f20` | 2026-11-11 | None. All 5 findings verified, fixed, and tested (59/59 tests green). Approved by Founder. |
| **Phase 2** | Database Foundation | `feat/db-foundation` | **AWAITING_FOUNDER** | `38518e0` | 2026-11-11 | Clean Drizzle migrations, live row GiST exclusions, RLS on all 43 tenant tables, app_runtime role, PgBouncer transaction-scoped set_config, docker-compose.test.yml & integration test suite. |
| **Phase 3** | Postgres Repositories | `feat/postgres-repositories` | **NOT_STARTED** | — | — | Awaiting Founder approval of Phase 2. |
| **Phase 4** | Payments & Checkout Saga | `feat/payment-saga` | **NOT_STARTED** | — | — | Awaiting Founder approval of Phase 3. |
| **Phase 5** | Real, Small, Separate AI-COS | `feat/aicos-real-loop` | **NOT_STARTED** | — | — | Awaiting Founder approval of Phase 4 & Phase 5 Design Gate. |

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

## Session Log

- **2026-11-10:** Hardening programme initialized from base commit `2acc195`. Branch `fix/security-hotfix` created. Phase 1 started.
- **2026-11-11:** Phase 1 implementation completed. All 5 findings confirmed and fixed. 10 new security sweep tests created and passing alongside all 49 existing tests. Phase 1 marked AWAITING_FOUNDER.
- **2026-11-11:** Founder approved Phase 1 (`APPROVED PHASE 1`). Branch `feat/db-foundation` created. Phase 2 database foundation implemented: clean Drizzle migrations, live row GiST exclusion, universal commerce constraints, RLS on all 43 tenant tables with `app_runtime` non-superuser role, transaction-scoped PgBouncer context, and unit/integration test harnesses. Phase 2 marked AWAITING_FOUNDER.
