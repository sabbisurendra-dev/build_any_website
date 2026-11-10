# Security Hardening & Hotfix Changes (Phase 1)

## Overview
Phase 1 eliminates critical authentication bypasses, header spoofing vulnerabilities, cross-tenant IDOR risks, unauthenticated AI-COS access, and unverified cron triggers without modifying the database schema or breaking existing public API request/response contracts.

---

## 1. Authentication & Session Resolution Hardening

### Files Changed:
- `src/modules/auth/session-provider.ts` (New file)
- `src/modules/auth/resolve-actor.ts` (Hardened)

### Changes:
1. **Simulation Header Lockdown**:
   - In `resolveRequestActor`, headers `x-actor-role`, `x-actor-tenant-id`, and `x-actor-user-id` are **strictly rejected and ignored** whenever `process.env.NODE_ENV === 'production'`.
   - Simulation headers are gated strictly to `process.env.NODE_ENV === 'test'` or (`process.env.TEST_ACTOR_HEADERS === '1'` in non-production).
2. **Default Admin / Owner Fallback Removal**:
   - Removed legacy fallback code that previously minted `usr-platform-internal` (super admin) or `usr-business-owner` (tenant owner) when unauthenticated.
   - Unauthenticated callers outside simulated test runs strictly resolve to `null`, triggering HTTP 401 across all protected routes.
3. **SessionProvider Port & Adapters**:
   - Defined `SessionProvider` interface with `resolveActor(request: NextRequest): Promise<AuthenticatedActor | null>`.
   - Implemented `SupabaseSessionProvider` utilizing `@supabase/ssr` `createServerClient` to authenticate sessions via verified cookies or `Authorization: Bearer <jwt>` tokens.
   - Implemented `TestSessionProvider` for unit and integration test harnesses.

---

## 2. AI-COS Control Plane & Founder Authorization

### Files Changed:
- `src/modules/auth/resolve-actor.ts` (`requireFounder` helper)
- `src/app/api/cos/ceo/route.ts`
- `src/app/api/cos/cycles/route.ts`
- `src/app/api/cos/approvals/route.ts`
- `src/app/api/cos/settings/route.ts`
- `src/app/api/cos/state/route.ts`
- `src/modules/ai-cos/core/cos.types.ts`
- `src/modules/ai-cos/policy/policy-engine.service.ts`

### Changes:
1. **Founder Guard (`requireFounder`)**:
   - Added `requireFounder(request: Request | NextRequest)` ensuring caller has `actor.platformRole === 'platform_super_admin'`. Unauthenticated callers receive 401; non-super-admins receive 403.
   - Applied `requireFounder` across all 5 AI-COS route handlers (`ceo`, `cycles`, `approvals`, `settings`, `state` [both `GET` and `POST`]).
2. **Self-Approval Prevention**:
   - Added `createdByUserId?: string` to `CosApprovalRecord` and `createApprovalRequest`.
   - In `policy-engine.service.ts` (`recordApprovalDecision`), verified that `input.actorIdentity` cannot match `approval.createdByUserId` or `approval.requestingDepartment`.
   - Attempted self-approval throws `PolicyScopeViolationError` with HTTP 403.

---

## 3. Tenant Trust & Cross-Tenant Isolation

### Files Changed:
- `src/modules/tenancy/tenant-resolver.ts` (New file)
- `src/app/api/public/v1/holds/route.ts`
- `src/app/api/public/v1/checkout/route.ts`
- `src/app/api/public/v1/payments/verify/route.ts`
- `src/app/api/public/v1/catalog/route.ts`
- `src/app/api/public/v1/availability/route.ts`
- `src/app/api/public/v1/orders/route.ts`
- `src/app/api/public/v1/entitlements/route.ts`
- `src/app/api/public/v1/bookings/[bookingId]/cancel/route.ts`
- `src/app/api/dashboard/bookings/route.ts`
- `src/app/api/dashboard/bookings/[bookingId]/route.ts`
- `src/app/api/dashboard/bookings/[bookingId]/reschedule/route.ts`
- `src/app/api/dashboard/inventory/route.ts`
- `src/app/api/platform/tenants/route.ts`
- `src/app/api/platform/builder/draft/route.ts`
- `src/app/api/platform/builder/state/route.ts`
- `src/app/api/platform/builder/publish/route.ts`

### Changes:
1. **Public API Host-Derived Tenant (`resolvePublicRequestTenantId`)**:
   - In all `/api/public/v1/*` routes, tenant context is derived server-side from request hostname/subdomain (e.g. `smilecraft-clinic.buildanywebsite.com`), custom domain, or `x-site-key` / `x-tenant-id` headers.
   - If a caller supplies a `tenantId` in the body or query parameter that conflicts with the host-derived tenant, the request is rejected with **403 FORBIDDEN** (`Cross-tenant mismatch`).
2. **Dashboard Session Derivation (`resolveAuthorizedDashboardTenant`)**:
   - In all `/api/dashboard/*` routes, the active tenant is strictly derived from verified session memberships (`actor.tenantMemberships`).
   - If an operator attempts to access or mutate resources of another tenant without membership, the request is rejected with **403 FORBIDDEN**.
   - Added authentication and tenant isolation checks to `/api/dashboard/inventory` which previously lacked auth guards.
3. **Platform Route Hardening**:
   - All `/api/platform/*` routes now `await resolveRequestActor(...)` and require explicit platform permissions (`platform_super_admin` or `internal_configurator`).

---

## 4. Internal Cron Housekeeping Authentication

### Files Changed:
- `src/app/api/internal/cron/expire-holds/route.ts`
- `tests/unit/route-auth-sweep.test.ts`

### Changes:
1. Verified constant-time `timingSafeEqual` comparison against `CRON_SECRET`.
2. Added automated unit tests verifying:
   - Missing `Authorization` header returns 401 `UNAUTHORIZED`.
   - Invalid bearer secret returns 401 `UNAUTHORIZED`.
   - Valid `Bearer ${CRON_SECRET}` returns 200 with released hold count.

---

## 5. Automated Verification & Route Auth Sweep

### Files Added:
- `tests/unit/route-auth-sweep.test.ts` (10 tests)

### Test Coverage:
1. `Production Mode Simulation Header Immunity`: verifies 401 when `x-actor-role` is supplied with `NODE_ENV === 'production'`.
2. `Internal Cron Secret Verification`: verifies 401 on missing/invalid secret and 200 on valid secret.
3. `AI-COS Founder Authorization`: verifies 401 on unauthenticated, 403 on non-founder, 200 on founder.
4. `Self-Approval Prevention`: verifies `PolicyScopeViolationError` when approver identity matches proposal creator.
5. `Cross-Tenant Isolation`: verifies 403 on dashboard cross-tenant read and 403 on public body/host tenant mismatch.
6. `Exhaustive Protected Route Sweep`: verifies 401 across all protected routes when unauthenticated.

---

## 6. Verification Results
- **TypeScript**: `npx tsc --noEmit` -> Clean (0 errors).
- **ESLint**: `npx eslint .` -> Clean (0 errors, 0 warnings).
- **Vitest**: `npx vitest run` -> 9 test files passed, 59 tests passed (49 existing + 10 new security sweep tests).
